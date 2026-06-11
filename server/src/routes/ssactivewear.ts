import { Router } from 'express';
import axios, { AxiosError } from 'axios';
import { config } from '../config.js';

export const router = Router();

const SS_BASE = 'https://api.ssactivewear.com/v2';
const TIMEOUT = 10000; // 10s

function authHeader() {
    const basic = Buffer.from(`${config.ss.user}:${config.ss.apiKey}`).toString('base64');
    return { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' };
}

function credentialsConfigured(): boolean {
    return Boolean(config.ss.user && config.ss.apiKey);
}

function normalizeProducts(products: any[]): any[] {
    const seen = new Set<string>();
    const out: any[] = [];

    for (const p of products) {
        const sku = p.sku ?? p.style ?? '';
        if (!sku || seen.has(sku)) continue;
        seen.add(sku);

        const colors: string[] = Array.isArray(p.colors)
            ? p.colors.map((c: any) => (typeof c === 'string' ? c : c.colorName ?? c.name ?? '')).filter(Boolean)
            : [];
        const sizes: string[] = Array.isArray(p.sizes)
            ? p.sizes.map((s: any) => (typeof s === 'string' ? s : s.sizeName ?? s.name ?? '')).filter(Boolean)
            : [];
        const priceCents = p.piecePrice
            ? Math.round(parseFloat(p.piecePrice) * 100)
            : p.price ? Math.round(parseFloat(p.price) * 100) : 0;

        out.push({
            sku, style: sku,
            title:       p.title ?? p.name ?? sku,
            brand:       p.brandName ?? p.brand ?? '',
            description: p.description ?? '',
            colors, sizes, priceCents,
        });
    }
    return out;
}

function isAxiosError(err: unknown): err is AxiosError {
    return (err as any)?.isAxiosError === true;
}

/* ─── Search S&S products by style # or keyword ──────────────────────────── */

router.get('/search', async (req, res) => {
    const q = ((req.query.q as string) ?? '').trim();
    if (!q) return res.json({ products: [] });

    if (!config.ss.enable || !credentialsConfigured()) {
        // Return empty results with a hint — don't block the UI with a 503
        return res.json({ products: [], notice: 'S&S search is not configured (SS_ENABLE / SS_USER / SS_API_KEY).' });
    }

    try {
        const resp = await axios.get(`${SS_BASE}/products/`, {
            headers: authHeader(),
            params: { style: q, fields: 'sku,title,brandName,description,colors,sizes,piecePrice' },
            timeout: TIMEOUT,
            // Treat 404 as empty results, not an error
            validateStatus: (s) => s < 500,
        });

        if (resp.status === 401) {
            return res.status(401).json({ error: 'S&S API authentication failed — check SS_USER and SS_API_KEY' });
        }

        const raw: any[] = Array.isArray(resp.data) ? resp.data : [];
        return res.json({ products: normalizeProducts(raw).slice(0, 20) });
    } catch (err: any) {
        if (isAxiosError(err) && err.code === 'ECONNABORTED') {
            return res.status(504).json({ error: 'S&S API timed out. The service may be temporarily unavailable.' });
        }
        if (isAxiosError(err) && err.response?.status === 401) {
            return res.status(401).json({ error: 'S&S API authentication failed — check SS_USER and SS_API_KEY' });
        }
        return res.status(502).json({ error: 'S&S API is unreachable. Check network/credentials.' });
    }
});

/* ─── Get single S&S style details ──────────────────────────────────────── */

router.get('/products/:sku', async (req, res) => {
    if (!config.ss.enable || !credentialsConfigured()) {
        return res.status(503).json({ error: 'S&S Activewear integration is not configured' });
    }

    try {
        const resp = await axios.get(`${SS_BASE}/products/`, {
            headers: authHeader(),
            params: { style: req.params.sku },
            timeout: TIMEOUT,
        });

        const items: any[] = Array.isArray(resp.data) ? resp.data : [];
        if (!items.length) return res.status(404).json({ error: 'Style not found in S&S catalog' });

        const colors = [...new Set(items.map((i: any) => i.colorName ?? i.color ?? '').filter(Boolean))];
        const sizes  = [...new Set(items.map((i: any) => i.sizeName  ?? i.size  ?? '').filter(Boolean))];
        const first  = items[0];
        const prices = items.map((i: any) => parseFloat(i.piecePrice ?? i.price ?? '0')).filter(x => x > 0);
        const minPrice = prices.length ? Math.min(...prices) : 0;

        return res.json({
            sku:         first.sku ?? req.params.sku,
            title:       first.title ?? first.name ?? req.params.sku,
            brand:       first.brandName ?? first.brand ?? '',
            description: first.description ?? '',
            colors, sizes,
            priceCents: Math.round(minPrice * 100),
        });
    } catch (err: any) {
        if (isAxiosError(err) && err.code === 'ECONNABORTED') {
            return res.status(504).json({ error: 'S&S API timed out' });
        }
        return res.status(500).json({ error: err.message ?? 'Failed to fetch S&S product' });
    }
});
