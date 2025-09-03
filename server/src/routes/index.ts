import { Router } from 'express';
import { router as products } from './products';
import { router as collections } from './collections';
import { router as shops } from './shops';
import { router as orders } from './orders';
import { router as discounts } from './discounts';
import { router as content } from './content';
import { router as finance } from './finance';
import { router as customers } from './customers';
import { router as checkouts } from './checkouts';
import { router as analytics } from './analytics';

export const router = Router();

router.use('/products', products);
router.use('/collections', collections);
router.use('/shops', shops);
router.use('/orders', orders);
router.use('/discounts', discounts);
router.use('/content', content);
router.use('/finance', finance);
router.use('/customers', customers);
router.use('/checkouts', checkouts);
router.use('/analytics', analytics);
