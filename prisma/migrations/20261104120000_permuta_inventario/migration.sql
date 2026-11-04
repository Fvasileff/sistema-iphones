-- AlterTable
ALTER TABLE "Producto"
  ADD COLUMN "condicion" TEXT NOT NULL DEFAULT 'nuevo',
  ADD COLUMN "modelo" TEXT,
  ADD COLUMN "capacidad" TEXT,
  ADD COLUMN "color" TEXT,
  ADD COLUMN "imei" TEXT,
  ADD COLUMN "estadoEquipo" TEXT,
  ADD COLUMN "ventaOrigenId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Producto_imei_key" ON "Producto"("imei");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_ventaOrigenId_key" ON "Producto"("ventaOrigenId");

-- AddForeignKey
ALTER TABLE "Producto"
  ADD CONSTRAINT "Producto_ventaOrigenId_fkey"
  FOREIGN KEY ("ventaOrigenId") REFERENCES "Venta"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
