import { Router } from 'express';
import axios, { AxiosError } from 'axios';
import { config } from '../config.js';
import { isUpchargeSize } from '../utils/pricing.js';

export const router = Router();

const SS_BASE = 'https://api.ssactivewear.com/v2';
const SS_CDN = 'https://cdn.ssactivewear.com/';
const TIMEOUT = 10000; // 10s

function authHeader() {
    const basic = Buffer.from(`${config.ss.user}:${config.ss.apiKey}`).toString('base64');
    return { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' };
}

function credentialsConfigured(): boolean {
    return Boolean(config.ss.user && config.ss.apiKey);
}

function isAxiosError(err: unknown): err is AxiosError {
    return (err as any)?.isAxiosError === true;
}

function resolveImage(path?: string | null): string | undefined {
    if (!path) return undefined;
    return `${SS_CDN}${String(path).replace(/^\/+/, '')}`;
}

function priceOf(row: any): number {
    // customerPrice reflects this account's negotiated/sale price; piecePrice is the fallback list price
    const v = Number(row.customerPrice ?? row.piecePrice ?? 0);
    return Number.isFinite(v) ? v : 0;
}

/* ─── Search S&S styles by style # or keyword ────────────────────────────────
 * The S&S catalog is organized as Styles (one row per style, e.g. "Gildan 18500")
 * and Products (one row per style+color+size SKU). Searching has to go through
 * /v2/styles (the "search" filter only exists there) — hitting /v2/products
 * without a real filter silently falls through to S&S's heavily-throttled
 * "unfiltered" mode, which is what caused inconsistent/empty results before. */
router.get('/search', async (req, res) => {
    const q = ((req.query.q as string) ?? '').trim();
    if (!q) return res.json({ products: [] });

    if (!config.ss.enable || !credentialsConfigured()) {
        // Return empty results with a hint — don't block the UI with a 503
        return res.json({ products: [], notice: 'S&S search is not configured (SS_ENABLE / SS_USER / SS_API_KEY).' });
    }

    try {
        const resp = await axios.get(`${SS_BASE}/styles/`, {
            headers: authHeader(),
            params: { search: q },
            timeout: TIMEOUT,
            // Treat 4xx as empty results, not an error
            validateStatus: (s) => s < 500,
        });

        if (resp.status === 401) {
            return res.status(401).json({ error: 'S&S API authentication failed — check SS_USER and SS_API_KEY' });
        }
        if (resp.status >= 400 || !Array.isArray(resp.data)) {
            return res.json({ products: [] });
        }

        const products = resp.data.slice(0, 20).map((s: any) => ({
            styleId: s.styleID,
            style: s.styleName,
            title: s.title ?? s.styleName,
            brand: s.brandName ?? '',
            image: resolveImage(s.styleImage),
        }));
        return res.json({ products });
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

/* ─── Get full style detail (colors/sizes/prices/images) by numeric styleId ── */

router.get('/styles/:styleId', async (req, res) => {
    if (!config.ss.enable || !credentialsConfigured()) {
        return res.status(503).json({ error: 'S&S Activewear integration is not configured' });
    }

    const styleId = Number(req.params.styleId);
    if (!Number.isFinite(styleId)) return res.status(400).json({ error: 'invalid style id' });

    try {
        const [styleResp, productsResp] = await Promise.all([
            axios.get(`${SS_BASE}/styles/`, { headers: authHeader(), params: { styleID: styleId }, timeout: TIMEOUT }),
            axios.get(`${SS_BASE}/products/`, { headers: authHeader(), params: { styleID: styleId }, timeout: TIMEOUT }),
        ]);

        const styleMeta = Array.isArray(styleResp.data) ? styleResp.data[0] : undefined;
        const rows: any[] = Array.isArray(productsResp.data) ? productsResp.data : [];
        if (!rows.length) return res.status(404).json({ error: 'Style not found in S&S catalog' });

        const first = rows[0];
        const colors = [...new Set(rows.map(r => r.colorName).filter(Boolean))];
        const sizes = [...new Set(rows.map((r: any) => r.sizeName).filter(Boolean))];
        const prices = rows.map(priceOf).filter(p => p > 0);
        const minPrice = prices.length ? Math.min(...prices) : 0;

        const colorImages: Record<string, string> = {};
        for (const r of rows) {
            const img = r.colorFrontImage || r.colorSideImage || r.colorBackImage;
            if (r.colorName && img && !colorImages[r.colorName]) {
                colorImages[r.colorName] = resolveImage(img)!;
            }
        }
        const images = [...new Set(Object.values(colorImages))];

        const basePrices = rows.filter(r => !isUpchargeSize(r.sizeName)).map(priceOf).filter(p => p > 0);
        const bigPrices = rows.filter(r => isUpchargeSize(r.sizeName)).map(priceOf).filter(p => p > 0);
        const baseMin = basePrices.length ? Math.min(...basePrices) : 0;
        const bigMax = bigPrices.length ? Math.max(...bigPrices) : 0;
        const upchargeDetected = baseMin > 0 && bigMax > baseMin;

        res.json({
            styleId,
            sku: styleMeta?.styleName ?? first.styleName,
            style: styleMeta?.styleName ?? first.styleName,
            title: styleMeta?.title ?? first.styleName,
            brand: styleMeta?.brandName ?? first.brandName ?? '',
            description: (styleMeta?.description ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
            colors, sizes,
            priceCents: Math.round(minPrice * 100),
            images, colorImages, upchargeDetected,
        });
    } catch (err: any) {
        if (isAxiosError(err) && err.code === 'ECONNABORTED') {
            return res.status(504).json({ error: 'S&S API timed out' });
        }
        if (isAxiosError(err) && err.response?.status === 401) {
            return res.status(401).json({ error: 'S&S API authentication failed — check SS_USER and SS_API_KEY' });
        }
        return res.status(500).json({ error: err.message ?? 'Failed to fetch S&S product' });
    }
});
