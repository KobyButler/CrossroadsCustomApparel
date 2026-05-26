import { Router } from 'express';
import axios from 'axios';
import { config } from '../config.js';

export const router = Router();

function authHeader() {
    const basic = Buffer.from(`${config.ss.user}:${config.ss.apiKey}`).toString('base64');
    return { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' };
}

/* ─── Search S&S products by style # or keyword ──────────────────────────── */

router.get('/search', async (req, res) => {
    const q = ((req.query.q as string) ?? '').trim();
    if (!q) return res.json({ products: [] });

    if (!config.ss.enable) {
        return res.status(503).json({ error: 'S&S Activewear integration is not enabled (SS_ENABLE=false)' });
    }

    try {
        // Try style-number lookup first (exact match)
        const byStyle = await axios.get('https://api.ssactivewear.com/v2/products/', {
            headers: authHeader(),
            params: { style: q, fields: 'sku,title,brandName,description,colors,sizes,piecePrice' },
            timeout: 10000,
        }).catch(() => null);

        let products: any[] = [];

        if (byStyle?.data && Array.isArray(byStyle.data) && byStyle.data.length > 0) {
            products = byStyle.data;
        } else {
            // Fall back to keyword search
            const byKw = await axios.get('https://api.ssactivewear.com/v2/products/', {
                headers: authHeader(),
                params: { keywords: q, fields: 'sku,title,brandName,description,colors,sizes,piecePrice' },
                timeout: 10000,
            });
            products = Array.isArray(byKw.data) ? byKw.data : [];
        }

        // Normalize into a consistent shape, deduplicating by style/sku
        const seen = new Set<string>();
        const normalized: any[] = [];

        for (const p of products) {
            const sku = p.sku ?? p.style ?? '';
            if (!sku || seen.has(sku)) continue;
            seen.add(sku);

            // S&S products come back with colors/sizes as arrays or nested objects
            const colors: string[] = Array.isArray(p.colors)
                ? p.colors.map((c: any) => (typeof c === 'string' ? c : c.colorName ?? c.name ?? ''))
                    .filter(Boolean)
                : [];
            const sizes: string[] = Array.isArray(p.sizes)
                ? p.sizes.map((s: any) => (typeof s === 'string' ? s : s.sizeName ?? s.name ?? ''))
                    .filter(Boolean)
                : [];

            const priceCents = p.piecePrice
                ? Math.round(parseFloat(p.piecePrice) * 100)
                : p.price
                    ? Math.round(parseFloat(p.price) * 100)
                    : 0;

            normalized.push({
                sku,
                style: sku,
                title: p.title ?? p.name ?? sku,
                brand: p.brandName ?? p.brand ?? '',
                description: p.description ?? '',
                colors,
                sizes,
                priceCents,
            });
        }

        res.json({ products: normalized.slice(0, 20) });
    } catch (err: any) {
        if (err.response?.status === 401) {
            return res.status(401).json({ error: 'S&S API authentication failed — check SS_USER and SS_API_KEY' });
        }
        res.status(500).json({ error: err.message ?? 'S&S search failed' });
    }
});

/* ─── Get single S&S style details ──────────────────────────────────────── */

router.get('/products/:sku', async (req, res) => {
    if (!config.ss.enable) {
        return res.status(503).json({ error: 'S&S Activewear integration is not enabled' });
    }

    try {
        const resp = await axios.get('https://api.ssactivewear.com/v2/products/', {
            headers: authHeader(),
            params: { style: req.params.sku },
            timeout: 10000,
        });

        const items: any[] = Array.isArray(resp.data) ? resp.data : [];
        if (!items.length) return res.status(404).json({ error: 'Style not found in S&S catalog' });

        const colors = [...new Set(items.map((i: any) => i.colorName ?? i.color ?? '').filter(Boolean))];
        const sizes  = [...new Set(items.map((i: any) => i.sizeName  ?? i.size  ?? '').filter(Boolean))];
        const first  = items[0];
        const prices = items.map((i: any) => parseFloat(i.piecePrice ?? i.price ?? '0')).filter(x => x > 0);
        const minPrice = prices.length ? Math.min(...prices) : 0;

        res.json({
            sku:         first.sku ?? req.params.sku,
            title:       first.title ?? first.name ?? req.params.sku,
            brand:       first.brandName ?? first.brand ?? '',
            description: first.description ?? '',
            colors,
            sizes,
            priceCents:  Math.round(minPrice * 100),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message ?? 'Failed to fetch S&S product' });
    }
});
