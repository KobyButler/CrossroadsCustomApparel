import { Router } from 'express';
import { quoteShipping } from '../utils/shippingCalc.js';

export const router = Router();

// POST /api/shipping/rate — public, used by checkout to preview a shipping cost
// before the customer commits. The real charge is always recomputed server-side
// again at order-creation time, so this is purely a UI preview.
router.post('/rate', async (req, res) => {
    const { items, shipCity, shipState, shipZip, residential } = req.body as {
        items?: { productId: string; quantity: number }[];
        shipCity?: string; shipState?: string; shipZip?: string; residential?: boolean;
    };

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'items are required' });
    }
    if (!shipCity || !shipState || !shipZip) {
        return res.status(400).json({ error: 'shipCity, shipState, and shipZip are required' });
    }

    try {
        const quote = await quoteShipping(items, { city: shipCity, state: shipState, zip: shipZip, residential });
        res.json(quote);
    } catch (err: any) {
        res.status(500).json({ error: err.message ?? 'Failed to calculate shipping' });
    }
});
