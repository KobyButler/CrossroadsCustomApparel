import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();

// SQLite tuning, applied once per process on this shared client. Default
// rollback-journal mode blocks readers for the duration of any write, which
// makes the whole app feel stalled under concurrent admin + storefront
// traffic; WAL lets reads continue alongside an in-progress write. NORMAL
// synchronous is the standard safe pairing with WAL (still durable against
// app crashes, only risks loss on an OS-level power failure). busy_timeout
// makes a writer that does hit real contention retry for a bit instead of
// failing immediately with "database is locked". Idempotent/harmless to run
// on every boot — WAL mode persists in the database file itself once set.
// $queryRawUnsafe, not $executeRawUnsafe — several of these PRAGMAs return
// the resulting value as a result row (journal_mode always does), and
// Prisma's $executeRawUnsafe rejects any statement that returns rows.
for (const pragma of ['PRAGMA journal_mode = WAL;', 'PRAGMA synchronous = NORMAL;', 'PRAGMA busy_timeout = 5000;']) {
    prisma.$queryRawUnsafe(pragma).catch(err => console.error(`[prisma] failed to run "${pragma}":`, err));
}
