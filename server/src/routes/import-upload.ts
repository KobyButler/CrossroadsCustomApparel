/**
 * TEMPORARY upload endpoint for Shopify CSV import.
 * DELETE THIS FILE after import is complete.
 */
import { Router } from 'express';
import fs from 'fs';
import { requireAuth } from '../middleware/auth.js';

export const router = Router();

// POST /api/import-upload  { filename: "p.csv", content: "<base64>" }
router.post('/', requireAuth, (req, res) => {
    const { filename, content } = req.body;
    if (!filename || !content) return res.status(400).json({ error: 'filename and content required' });
    const allowed = ['p.csv', 'c.csv', 'o.csv'];
    if (!allowed.includes(filename)) return res.status(400).json({ error: 'invalid filename' });
    const buf = Buffer.from(content, 'base64');
    fs.writeFileSync(`/tmp/${filename}`, buf);
    res.json({ ok: true, bytes: buf.length });
});
