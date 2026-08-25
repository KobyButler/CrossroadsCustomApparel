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
    "sizeChartUrl" TEXT,
    "upchargeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "upchargeCents" INTEGER NOT NULL DEFAULT 300,
    "weightOz" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "youthProductId" TEXT,
    CONSTRAINT "Product_youthProductId_fkey" FOREIGN KEY ("youthProductId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("brand", "colorsJson", "createdAt", "description", "id", "imagesJson", "name", "priceCents", "sizeChartUrl", "sizesJson", "sku", "upchargeCents", "upchargeEnabled", "vendor", "vendorIdentifier", "weightOz") SELECT "brand", "colorsJson", "createdAt", "description", "id", "imagesJson", "name", "priceCents", "sizeChartUrl", "sizesJson", "sku", "upchargeCents", "upchargeEnabled", "vendor", "vendorIdentifier", "weightOz" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE UNIQUE INDEX "Product_youthProductId_key" ON "Product"("youthProductId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
