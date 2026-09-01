import { Router } from 'express';
import { prisma } from '../prisma.js';
import { getStripeOrNull } from '../utils/stripeClient.js';

export const router = Router();

const STRIPE_NOT_CONFIGURED = 'Stripe is not configured (STRIPE_SECRET_KEY not set).';

// Financial summary (gross revenue from orders + net after finance transactions)
// Sales tax collected is excluded from revenue — it's collected on behalf of
// the state and owed back to them, not income to the business.
router.get('/summary', async (_req, res) => {
    const [orders, txs] = await Promise.all([
        prisma.order.findMany({ where: { status: { in: ['UNFULFILLED', 'FULFILLED'] } } }),
        prisma.financeTransaction.findMany()
    ]);
    const gross = orders.reduce((a, b) => a + (b.totalCents - b.taxCents), 0);
    const net = gross + txs.reduce((a, b) => a + b.amountCents, 0);
    res.json({ grossCents: gross, netCents: net, orders: orders.length });
});

// GET /finance/stripe/summary?days=90 — real Stripe numbers: current account
// balance (available to pay out vs. still pending/clearing) plus totals over
// a trailing window, walked from Stripe's own balance-transaction ledger
// rather than derived from our Order table, so it reflects exactly what
// Stripe itself thinks happened (including its own processing fees, which
// nothing in our DB knows about). Note this is real Stripe data either way —
// in test mode it reflects test-mode activity only, same as everywhere else
// Stripe is used in this app (see stripeClient.ts).
router.get('/stripe/summary', async (req, res) => {
    const stripe = getStripeOrNull();
    if (!stripe) return res.status(400).json({ error: STRIPE_NOT_CONFIGURED });

    const days = Math.min(Math.max(parseInt(req.query.days as string ?? '90', 10) || 90, 1), 365);
    const since = Math.floor(Date.now() / 1000) - days * 86400;

    try {
        const balance = await stripe.balance.retrieve();
        const availableCents = balance.available.reduce((a, b) => a + b.amount, 0);
        const pendingCents = balance.pending.reduce((a, b) => a + b.amount, 0);

        // Walk every balance transaction in the window, summing by type.
        // Stripe pages at 100/request; capped at 20 pages (2,000 rows) as a
        // defensive limit so an unusually high-volume window can't hang this
        // request indefinitely — a business this size shouldn't come close.
        let grossCents = 0, feeCents = 0, netCents = 0, refundedCents = 0, chargeCount = 0, refundCount = 0;
        let startingAfter: string | undefined;
        for (let page = 0; page < 20; page++) {
            const chunk: any = await stripe.balanceTransactions.list({
                limit: 100, starting_after: startingAfter, created: { gte: since }
            });
            for (const bt of chunk.data) {
                feeCents += bt.fee;
                netCents += bt.net;
                if (bt.type === 'charge') { grossCents += bt.amount; chargeCount++; }
                else if (bt.type === 'refund') { refundedCents += Math.abs(bt.amount); refundCount++; }
            }
            if (!chunk.has_more || chunk.data.length === 0) break;
            startingAfter = chunk.data[chunk.data.length - 1].id;
        }

        res.json({ days, availableCents, pendingCents, grossCents, feeCents, netCents, refundedCents, chargeCount, refundCount });
    } catch (err: any) {
        res.status(502).json({ error: err.message ?? 'Failed to reach Stripe' });
    }
});

// GET /finance/stripe/transactions?limit=&startingAfter=&days= — a page of
// Stripe's own balance-transaction ledger (every charge/refund/payout/
// adjustment that moved the account balance), each matched back to the
// internal Order it paid for via Order.stripePaymentIntentId where
// possible. Cursor-paginated the same way Stripe itself paginates
// (startingAfter = the last row's id). `days`, when given, matches the
// same trailing window /stripe/summary uses — the two are meant to be
// viewed together, so a KPI reading "last 90 days" shouldn't sit above a
// transaction list quietly showing unrelated older activity instead.
router.get('/stripe/transactions', async (req, res) => {
    const stripe = getStripeOrNull();
    if (!stripe) return res.status(400).json({ error: STRIPE_NOT_CONFIGURED });

    const limit = Math.min(Math.max(parseInt(req.query.limit as string ?? '50', 10) || 50, 1), 100);
    const startingAfter = (req.query.startingAfter as string) || undefined;
    const days = req.query.days ? Math.min(Math.max(parseInt(req.query.days as string, 10) || 0, 1), 365) : undefined;
    const created = days ? { gte: Math.floor(Date.now() / 1000) - days * 86400 } : undefined;

    try {
        const page: any = await stripe.balanceTransactions.list({
            limit, starting_after: startingAfter, expand: ['data.source'], ...(created ? { created } : {})
        });

        // Charges and refunds carry a payment_intent on their expanded source —
        // collect every id referenced in this page and resolve them to Orders
        // in one batch query rather than one lookup per row.
        const piIds = new Set<string>();
        for (const bt of page.data) {
            const src = bt.source as any;
            if (!src || (bt.type !== 'charge' && bt.type !== 'refund')) continue;
            const pi = typeof src.payment_intent === 'string' ? src.payment_intent : src.payment_intent?.id;
            if (pi) piIds.add(pi);
        }
        const orders = piIds.size
            ? await prisma.order.findMany({
                where: { stripePaymentIntentId: { in: [...piIds] } },
                select: { id: true, customerName: true, stripePaymentIntentId: true }
            })
            : [];
        const orderByPI = new Map(orders.map(o => [o.stripePaymentIntentId as string, o]));

        const rows = page.data.map((bt: any) => {
            const src = bt.source as any;
            const pi = src && (bt.type === 'charge' || bt.type === 'refund')
                ? (typeof src.payment_intent === 'string' ? src.payment_intent : src.payment_intent?.id ?? null)
                : null;
            const order = pi ? orderByPI.get(pi) : undefined;
            return {
                id: bt.id, type: bt.type, description: bt.description ?? src?.description ?? null,
                grossCents: bt.amount, feeCents: bt.fee, netCents: bt.net,
                createdAt: new Date(bt.created * 1000).toISOString(),
                orderId: order?.id ?? null, orderCustomerName: order?.customerName ?? null
            };
        });

        res.json({
            data: rows, hasMore: page.has_more,
            nextCursor: page.data.length ? page.data[page.data.length - 1].id : null
        });
    } catch (err: any) {
        res.status(502).json({ error: err.message ?? 'Failed to reach Stripe' });
    }
});

// GET /finance/stripe/payouts?limit= — recent Stripe payouts (money Stripe has
// actually sent, or is about to send, to the connected bank account). Kept
// separate from the transaction ledger above rather than merged into it —
// a payout doesn't represent new revenue, it's Stripe moving money that the
// charge/fee balance transactions already accounted for, so folding it into
// the same list would double-count activity.
router.get('/stripe/payouts', async (req, res) => {
    const stripe = getStripeOrNull();
    if (!stripe) return res.status(400).json({ error: STRIPE_NOT_CONFIGURED });

    const limit = Math.min(Math.max(parseInt(req.query.limit as string ?? '20', 10) || 20, 1), 100);

    try {
        const list = await stripe.payouts.list({ limit });
        res.json({
            data: list.data.map(p => ({
                id: p.id, amountCents: p.amount, currency: p.currency, status: p.status, method: p.method,
                arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
                createdAt: new Date(p.created * 1000).toISOString(),
                description: p.description ?? null
            })),
            hasMore: list.has_more
        });
    } catch (err: any) {
        res.status(502).json({ error: err.message ?? 'Failed to reach Stripe' });
    }
});

// List all finance transactions
router.get('/transactions', async (_req, res) => {
    const txs = await prisma.financeTransaction.findMany({
        include: { order: { select: { id: true, customerName: true } } },
        orderBy: { createdAt: 'desc' }
    });
    res.json(txs);
});

// Create a finance transaction
router.post('/transactions', async (req, res) => {
    const { type, amountCents, note, orderId } = req.body;

    if (!type || amountCents === undefined) {
        return res.status(400).json({ error: 'type and amountCents are required' });
    }

    const validTypes = ['INCOME', 'EXPENSE', 'REFUND', 'FEE'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    }

    // If an orderId is provided, verify it exists
    if (orderId) {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) return res.status(400).json({ error: 'order not found' });
    }

    const tx = await prisma.financeTransaction.create({
        data: {
            type,
            amountCents: Number(amountCents),
            note: note ?? null,
            orderId: orderId ?? null
        },
        include: { order: { select: { id: true, customerName: true } } }
    });
    res.json(tx);
});
