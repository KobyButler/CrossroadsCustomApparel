-- CreateTable
CREATE TABLE "ProductStyle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "styleProductId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductStyle_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductStyle_styleProductId_fkey" FOREIGN KEY ("styleProductId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProductStyle_styleProductId_idx" ON "ProductStyle"("styleProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStyle_productId_styleProductId_key" ON "ProductStyle"("productId", "styleProductId");

