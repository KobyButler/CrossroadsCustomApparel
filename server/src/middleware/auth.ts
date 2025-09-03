import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
    const token = h.slice('Bearer '.length);
    try {
        const payload = jwt.verify(token, config.jwtSecret) as { sub: string; role: string };
        (req as any).user = payload;
        next();
    } catch {
        res.status(401).json({ error: 'invalid token' });
    }
}
