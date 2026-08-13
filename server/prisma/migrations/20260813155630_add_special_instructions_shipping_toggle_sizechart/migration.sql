-- AlterTable
ALTER TABLE "Order" ADD COLUMN "specialInstructions" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "sizeChartUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "shippingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Shop" ("active", "createdAt", "expiresAt", "id", "name", "notes", "slug") SELECT "active", "createdAt", "expiresAt", "id", "name", "notes", "slug" FROM "Shop";
DROP TABLE "Shop";
ALTER TABLE "new_Shop" RENAME TO "Shop";
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
