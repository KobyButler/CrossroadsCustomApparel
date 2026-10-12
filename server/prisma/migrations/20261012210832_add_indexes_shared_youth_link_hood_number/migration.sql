-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "size" TEXT,
    "color" TEXT,
    "quantity" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "hoodNumberRequested" BOOLEAN NOT NULL DEFAULT false,
    "hoodNumberText" TEXT,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("color", "id", "orderId", "priceCents", "productId", "quantity", "size") SELECT "color", "id", "orderId", "priceCents", "productId", "quantity", "size" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
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
    "youthPriceCents" INTEGER,
    "hoodNumberEnabled" BOOLEAN NOT NULL DEFAULT false,
    "hoodNumberPriceCents" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Product_youthProductId_fkey" FOREIGN KEY ("youthProductId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("brand", "colorsJson", "createdAt", "description", "id", "imagesJson", "name", "priceCents", "sizeChartUrl", "sizesJson", "sku", "upchargeCents", "upchargeEnabled", "vendor", "vendorIdentifier", "weightOz", "youthPriceCents", "youthProductId") SELECT "brand", "colorsJson", "createdAt", "description", "id", "imagesJson", "name", "priceCents", "sizeChartUrl", "sizesJson", "sku", "upchargeCents", "upchargeEnabled", "vendor", "vendorIdentifier", "weightOz", "youthPriceCents", "youthProductId" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_vendor_idx" ON "Product"("vendor");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Checkout_shopId_idx" ON "Checkout"("shopId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_orderId_idx" ON "FinanceTransaction"("orderId");

-- CreateIndex
CREATE INDEX "Order_shopId_idx" ON "Order"("shopId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
