/*
  Warnings:

  - A unique constraint covering the columns `[businessId,id]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('RECEIPT', 'ISSUE', 'ADJUSTMENT', 'TRANSFER');

-- CreateTable
CREATE TABLE "stock_locations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_stocks" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_locations_businessId_idx" ON "stock_locations"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_locations_businessId_id_key" ON "stock_locations"("businessId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_locations_businessId_name_key" ON "stock_locations"("businessId", "name");

-- CreateIndex
CREATE INDEX "product_stocks_businessId_locationId_idx" ON "product_stocks"("businessId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "product_stocks_businessId_productId_locationId_key" ON "product_stocks"("businessId", "productId", "locationId");

-- CreateIndex
CREATE INDEX "stock_movements_businessId_productId_createdAt_idx" ON "stock_movements"("businessId", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_businessId_fromLocationId_idx" ON "stock_movements"("businessId", "fromLocationId");

-- CreateIndex
CREATE INDEX "stock_movements_businessId_toLocationId_idx" ON "stock_movements"("businessId", "toLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "products_businessId_id_key" ON "products"("businessId", "id");

-- AddForeignKey
ALTER TABLE "stock_locations" ADD CONSTRAINT "stock_locations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_stocks" ADD CONSTRAINT "product_stocks_businessId_productId_fkey" FOREIGN KEY ("businessId", "productId") REFERENCES "products"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_stocks" ADD CONSTRAINT "product_stocks_businessId_locationId_fkey" FOREIGN KEY ("businessId", "locationId") REFERENCES "stock_locations"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_stocks" ADD CONSTRAINT "product_stocks_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_businessId_productId_fkey" FOREIGN KEY ("businessId", "productId") REFERENCES "products"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_businessId_fromLocationId_fkey" FOREIGN KEY ("businessId", "fromLocationId") REFERENCES "stock_locations"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_businessId_toLocationId_fkey" FOREIGN KEY ("businessId", "toLocationId") REFERENCES "stock_locations"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
