process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Give the server a moment to finish in-flight requests before exiting
    setTimeout(() => process.exit(1), 1000);
});
process.on('unhandledRejection', (reason) => {
    // Log but do NOT exit — a single unhandled rejection in a background job
    // should not kill the entire HTTP server and cause 502s for all users.
    console.error('Unhandled Rejection (non-fatal):', reason);
});

console.log('Starting server...');

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';

console.log('Core modules loaded');

import { config } from './config.js';

console.log('Config loaded, port:', config.port);

import { router as api } from './routes/index';
import { stripeWebhookHandler } from './routes/payments.js';
import { syncInventoryDip, syncCatalogSDL } from './vendors/sanmar-sftp.js';

console.log('Routes loaded');

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.corsOrigins, credentials: true }));

// Stripe webhook MUST receive the raw body — register before express.json()
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(express.json());
app.use(morgan('dev'));

// Serve uploaded product images as static files
const uploadsDir = process.env.UPLOADS_DIR ?? path.join(__dirname, '../../public/uploads');
app.use('/uploads', express.static(uploadsDir));

app.use('/api', api);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(config.port, '0.0.0.0', () => {
    console.log(`server listening on port ${config.port}`);
    scheduleInventorySync();
    scheduleCatalogSync();
});

/* ─── SanMar hourly inventory DIP sync ───────────────────────────────────── */
// sanmar_dip.txt is updated hourly by SanMar — we mirror that cadence.

function scheduleInventorySync() {
    if (!config.sanmar.sftp.enable) return;

    // Delay first run by 5 minutes to let the server fully stabilize after boot,
    // then repeat every hour. Running immediately on boot caused OOM on 512MB instances.
    setTimeout(() => {
        runInventorySync();
        setInterval(runInventorySync, 60 * 60 * 1000);
    }, 5 * 60 * 1000);
}

async function runInventorySync() {
    try {
        console.log('[SanMar] Starting hourly inventory DIP sync…');
        const result = await syncInventoryDip();
        if (result.status === 'SUCCESS') {
            console.log(`[SanMar] Inventory sync complete — ${result.rowsProcessed} keys updated in ${result.durationMs}ms`);
        } else {
            console.error('[SanMar] Inventory sync failed:', result.error);
        }
    } catch (err) {
        console.error('[SanMar] Inventory sync threw:', err);
    }
}

/* ─── SanMar weekly product catalog sync ─────────────────────────────────── */
// Names/prices/colors used to require someone to remember to click "Sync
// Catalog" in the admin — this had gone 115+ days stale before. PO submission
// no longer depends on this being fresh (buildPOEnvelope in vendors/sanmar.ts
// self-heals any single missing variant via a live per-style lookup), but the
// bulk cache still needs to stay reasonably current for browsing/search/pricing
// and to minimize how often that live-lookup fallback has to fire at all.
// Staggered well clear of the inventory sync's post-boot window, and run at
// most weekly since this is a ~185MB streamed file with a lot of DB upserts —
// running it too often just adds load for no benefit on a 512MB instance.

function scheduleCatalogSync() {
    if (!config.sanmar.sftp.enable) return;

    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    setTimeout(() => {
        runCatalogSync();
        setInterval(runCatalogSync, ONE_WEEK_MS);
    }, 20 * 60 * 1000); // 20 minutes after boot — after the first inventory sync has settled
}

async function runCatalogSync() {
    try {
        console.log('[SanMar] Starting weekly product catalog sync…');
        const result = await syncCatalogSDL();
        if (result.status === 'SUCCESS') {
            console.log(`[SanMar] Catalog sync complete — ${result.rowsProcessed} rows in ${result.durationMs}ms`);
        } else {
            console.error('[SanMar] Catalog sync failed:', result.error);
        }
    } catch (err) {
        console.error('[SanMar] Catalog sync threw:', err);
    }
}
