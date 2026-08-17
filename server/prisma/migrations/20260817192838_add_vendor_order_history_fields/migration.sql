-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VendorOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "externalOrderNumber" TEXT,
    "status" TEXT NOT NULL,
    "rawResponse" TEXT,
    "shopId" TEXT,
    "linesJson" TEXT,
    "totalUnits" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VendorOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VendorOrder_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_VendorOrder" ("createdAt", "externalOrderNumber", "id", "orderId", "rawResponse", "status", "vendor") SELECT "createdAt", "externalOrderNumber", "id", "orderId", "rawResponse", "status", "vendor" FROM "VendorOrder";
DROP TABLE "VendorOrder";
ALTER TABLE "new_VendorOrder" RENAME TO "VendorOrder";
CREATE INDEX "VendorOrder_externalOrderNumber_idx" ON "VendorOrder"("externalOrderNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
