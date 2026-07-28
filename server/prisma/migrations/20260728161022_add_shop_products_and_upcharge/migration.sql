-- AlterTable
ALTER TABLE "Order" ADD COLUMN "orderGroupId" TEXT;

-- CreateTable
CREATE TABLE "_ShopProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ShopProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ShopProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "vendor" TEXT NOT NULL DEFAULT 'OTHER',
    "vendorIdentifier" TEXT,
    "brand" TEXT,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "imagesJson" TEXT,
    "sizesJson" TEXT,
    "colorsJson" TEXT,
    "upchargeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "upchargeCents" INTEGER NOT NULL DEFAULT 300,
    "collectionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("brand", "collectionId", "colorsJson", "createdAt", "description", "id", "imagesJson", "name", "priceCents", "sizesJson", "sku", "vendor", "vendorIdentifier") SELECT "brand", "collectionId", "colorsJson", "createdAt", "description", "id", "imagesJson", "name", "priceCents", "sizesJson", "sku", "vendor", "vendorIdentifier" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE TABLE "new_Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "collectionId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Shop_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Shop" ("active", "collectionId", "createdAt", "expiresAt", "id", "name", "notes", "slug") SELECT "active", "collectionId", "createdAt", "expiresAt", "id", "name", "notes", "slug" FROM "Shop";
DROP TABLE "Shop";
ALTER TABLE "new_Shop" RENAME TO "Shop";
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_ShopProducts_AB_unique" ON "_ShopProducts"("A", "B");

-- CreateIndex
CREATE INDEX "_ShopProducts_B_index" ON "_ShopProducts"("B");
