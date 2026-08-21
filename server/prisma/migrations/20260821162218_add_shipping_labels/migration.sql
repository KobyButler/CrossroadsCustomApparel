-- AlterTable
ALTER TABLE "Order" ADD COLUMN "shippingCarrier" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingLabelPurchasedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "shippingLabelUrl" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingService" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingTrackingNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingTransactionId" TEXT;
