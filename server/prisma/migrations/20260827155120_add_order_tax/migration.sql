-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT,
    "orderGroupId" TEXT,
    "customerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNFULFILLED',
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paymentMethod" TEXT,
    "stripePaymentIntentId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "shippingMethod" TEXT NOT NULL DEFAULT 'PICKUP',
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "stripeTaxCalculationId" TEXT,
    "stripeTaxTransactionId" TEXT,
    "shipAddress1" TEXT,
    "shipAddress2" TEXT,
    "shipCity" TEXT,
    "shipState" TEXT,
    "shipZip" TEXT,
    "residential" BOOLEAN NOT NULL DEFAULT true,
    "specialInstructions" TEXT,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shippingLabelUrl" TEXT,
    "shippingLabelPurchasedAt" DATETIME,
    "shippingTrackingNumber" TEXT,
    "shippingCarrier" TEXT,
    "shippingService" TEXT,
    "shippingTransactionId" TEXT,
    "discountCodeId" TEXT,
    CONSTRAINT "Order_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("createdAt", "customerEmail", "customerId", "customerName", "discountCodeId", "id", "orderGroupId", "paymentMethod", "paymentStatus", "residential", "shipAddress1", "shipAddress2", "shipCity", "shipState", "shipZip", "shippingCarrier", "shippingCents", "shippingLabelPurchasedAt", "shippingLabelUrl", "shippingMethod", "shippingService", "shippingTrackingNumber", "shippingTransactionId", "shopId", "specialInstructions", "status", "stripePaymentIntentId", "totalCents") SELECT "createdAt", "customerEmail", "customerId", "customerName", "discountCodeId", "id", "orderGroupId", "paymentMethod", "paymentStatus", "residential", "shipAddress1", "shipAddress2", "shipCity", "shipState", "shipZip", "shippingCarrier", "shippingCents", "shippingLabelPurchasedAt", "shippingLabelUrl", "shippingMethod", "shippingService", "shippingTrackingNumber", "shippingTransactionId", "shopId", "specialInstructions", "status", "stripePaymentIntentId", "totalCents" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
