-- Remove Collection entirely; Shop<->Product grouping now lives solely in the
-- _ShopProducts join table (added in the previous migration). Products/Shops
-- keep their data; only the collectionId link and the Collection table go.

PRAGMA foreign_keys=off;
DROP TABLE "Collection";
PRAGMA foreign_keys=on;

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Product" ("id","name","sku","vendor","vendorIdentifier","brand","description","priceCents","imagesJson","sizesJson","colorsJson","upchargeEnabled","upchargeCents","createdAt")
SELECT "id","name","sku","vendor","vendorIdentifier","brand","description","priceCents","imagesJson","sizesJson","colorsJson","upchargeEnabled","upchargeCents","createdAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

CREATE TABLE "new_Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Shop" ("id","name","slug","active","expiresAt","notes","createdAt")
SELECT "id","name","slug","active","expiresAt","notes","createdAt" FROM "Shop";
DROP TABLE "Shop";
ALTER TABLE "new_Shop" RENAME TO "Shop";
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
