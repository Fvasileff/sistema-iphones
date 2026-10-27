-- AlterTable
ALTER TABLE "MovimientoCaja"
ADD COLUMN     "montoEfectivo" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "montoTransferencia" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "montoTarjeta" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "VentaProducto"
ADD COLUMN     "montoEfectivo" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "montoTransferencia" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "montoTarjeta" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "VentaIphone"
ADD COLUMN     "montoEfectivo" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "montoTransferencia" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "montoTarjeta" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- Backfill: movimientos existentes conservan su método único
UPDATE "MovimientoCaja" SET
  "montoEfectivo" = CASE WHEN "metodoPago" = 'efectivo' THEN "monto" ELSE 0 END,
  "montoTransferencia" = CASE WHEN "metodoPago" = 'transferencia' THEN "monto" ELSE 0 END,
  "montoTarjeta" = CASE WHEN "metodoPago" = 'tarjeta' THEN "monto" ELSE 0 END;

-- Backfill: ventas de productos existentes
UPDATE "VentaProducto" SET
  "montoEfectivo" = CASE WHEN "metodoPago" = 'efectivo' THEN "total" ELSE 0 END,
  "montoTransferencia" = CASE WHEN "metodoPago" = 'transferencia' THEN "total" ELSE 0 END,
  "montoTarjeta" = CASE WHEN "metodoPago" = 'tarjeta' THEN "total" ELSE 0 END;

-- Backfill: ventas de iPhone existentes
UPDATE "VentaIphone" SET
  "montoEfectivo" = CASE WHEN "metodoPago" = 'efectivo' THEN "precioVenta" ELSE 0 END,
  "montoTransferencia" = CASE WHEN "metodoPago" = 'transferencia' THEN "precioVenta" ELSE 0 END,
  "montoTarjeta" = CASE WHEN "metodoPago" = 'tarjeta' THEN "precioVenta" ELSE 0 END;
