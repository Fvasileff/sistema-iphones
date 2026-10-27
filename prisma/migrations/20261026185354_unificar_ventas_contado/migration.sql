-- DropForeignKey
ALTER TABLE "VentaProductoItem" DROP CONSTRAINT "VentaProductoItem_productoId_fkey";

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "metodoAnticipo" TEXT NOT NULL DEFAULT 'efectivo';

-- AlterTable
ALTER TABLE "VentaProductoItem" ADD COLUMN     "iphoneId" TEXT,
ALTER COLUMN "productoId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "MovimientoCaja_anulada_createdAt_idx" ON "MovimientoCaja"("anulada", "createdAt");

-- CreateIndex
CREATE INDEX "PagoCuota_anulada_fecha_idx" ON "PagoCuota"("anulada", "fecha");

-- CreateIndex
CREATE INDEX "PagoReparacion_anulada_fecha_idx" ON "PagoReparacion"("anulada", "fecha");

-- CreateIndex
CREATE INDEX "ReparacionProducto_anulada_createdAt_idx" ON "ReparacionProducto"("anulada", "createdAt");

-- CreateIndex
CREATE INDEX "VentaProducto_anulada_fechaVenta_idx" ON "VentaProducto"("anulada", "fechaVenta");

-- CreateIndex
CREATE INDEX "VentaProductoItem_iphoneId_idx" ON "VentaProductoItem"("iphoneId");

-- AddForeignKey
ALTER TABLE "VentaProductoItem" ADD CONSTRAINT "VentaProductoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaProductoItem" ADD CONSTRAINT "VentaProductoItem_iphoneId_fkey" FOREIGN KEY ("iphoneId") REFERENCES "iPhone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Reconstruir método del anticipo histórico desde caja
UPDATE "Venta" v
SET "metodoAnticipo" = m."metodoPago"
FROM "MovimientoCaja" m
WHERE m."referenciaTipo" = 'venta'
  AND m."referenciaId" = v."id"
  AND m."tipo" = 'venta_financiada'
  AND m."anulada" = false;

-- Cada ítem debe ser de producto o de iPhone, nunca ambos ni ninguno
ALTER TABLE "VentaProductoItem"
ADD CONSTRAINT "VentaProductoItem_producto_o_iphone_check"
CHECK (("productoId" IS NOT NULL) <> ("iphoneId" IS NOT NULL));

-- Vista unificada de operaciones para reportes
CREATE VIEW "reporte_operaciones" AS
SELECT
  'venta_contado'::text AS "tipo",
  v."id"::text AS "id",
  v."fechaVenta" AS "fecha",
  v."codigoOperacion" AS "codigo",
  v."clienteId"::text AS "clienteId",
  c."nombre" AS "clienteNombre",
  c."apellido" AS "clienteApellido",
  c."dni" AS "clienteDni",
  'Venta'::text AS "resumen",
  v."metodoPago" AS "metodoPago",
  v."total" AS "monto",
  v."montoEfectivo" AS "montoEfectivo",
  v."montoTransferencia" AS "montoTransferencia",
  v."montoTarjeta" AS "montoTarjeta",
  v."anulada" AS "anulada",
  'venta_contado'::text AS "referenciaTipo",
  v."id"::text AS "referenciaId",
  v."fechaVenta" AS "createdAt"
FROM "VentaProducto" v
LEFT JOIN "Cliente" c ON c."id" = v."clienteId"

UNION ALL

SELECT
  'venta_financiada'::text,
  v."id"::text,
  v."fechaVenta",
  v."codigoOperacion",
  v."clienteId"::text,
  c."nombre",
  c."apellido",
  c."dni",
  'Venta financiada'::text,
  NULL::text,
  v."precioVenta",
  0::numeric,
  0::numeric,
  0::numeric,
  v."anulada",
  'venta'::text,
  v."id"::text,
  v."fechaVenta"
FROM "Venta" v
LEFT JOIN "Cliente" c ON c."id" = v."clienteId"

UNION ALL

SELECT
  'anticipo_financiacion'::text,
  v."id"::text,
  v."fechaVenta",
  v."codigoOperacion",
  v."clienteId"::text,
  c."nombre",
  c."apellido",
  c."dni",
  'Anticipo financiación'::text,
  v."metodoAnticipo",
  v."anticipoEfectivo",
  CASE WHEN v."metodoAnticipo" = 'efectivo' THEN v."anticipoEfectivo" ELSE 0 END,
  CASE WHEN v."metodoAnticipo" = 'transferencia' THEN v."anticipoEfectivo" ELSE 0 END,
  CASE WHEN v."metodoAnticipo" = 'tarjeta' THEN v."anticipoEfectivo" ELSE 0 END,
  v."anulada",
  'venta'::text,
  v."id"::text,
  v."fechaVenta"
FROM "Venta" v
LEFT JOIN "Cliente" c ON c."id" = v."clienteId"
WHERE v."anticipoEfectivo" > 0

UNION ALL

SELECT
  'pago_cuota'::text,
  p."id"::text,
  p."fecha",
  p."codigoOperacion",
  v."clienteId"::text,
  c."nombre",
  c."apellido",
  c."dni",
  ('Cuota ' || cu."numeroCuota" || '/' || v."totalCuotas")::text,
  p."metodoPago",
  (p."monto" + p."montoMora"),
  CASE WHEN p."metodoPago" = 'efectivo' THEN (p."monto" + p."montoMora") ELSE 0 END,
  CASE WHEN p."metodoPago" = 'transferencia' THEN (p."monto" + p."montoMora") ELSE 0 END,
  CASE WHEN p."metodoPago" = 'tarjeta' THEN (p."monto" + p."montoMora") ELSE 0 END,
  p."anulada",
  'pago_cuota'::text,
  p."id"::text,
  p."fecha"
FROM "PagoCuota" p
JOIN "Cuota" cu ON cu."id" = p."cuotaId"
JOIN "Venta" v ON v."id" = cu."ventaId"
LEFT JOIN "Cliente" c ON c."id" = v."clienteId"

UNION ALL

SELECT
  'pago_reparacion'::text,
  p."id"::text,
  p."fecha",
  p."codigoOperacion",
  r."clienteId"::text,
  c."nombre",
  c."apellido",
  c."dni",
  ('Cobro reparación ' || r."codigoOperacion")::text,
  p."metodoPago",
  p."monto",
  CASE WHEN p."metodoPago" = 'efectivo' THEN p."monto" ELSE 0 END,
  CASE WHEN p."metodoPago" = 'transferencia' THEN p."monto" ELSE 0 END,
  CASE WHEN p."metodoPago" = 'tarjeta' THEN p."monto" ELSE 0 END,
  p."anulada",
  'pago_reparacion'::text,
  p."id"::text,
  p."fecha"
FROM "PagoReparacion" p
JOIN "Reparacion" r ON r."id" = p."reparacionId"
LEFT JOIN "Cliente" c ON c."id" = r."clienteId"

UNION ALL

SELECT
  'repuesto_reparacion'::text,
  rp."id"::text,
  rp."createdAt",
  r."codigoOperacion",
  r."clienteId"::text,
  c."nombre",
  c."apellido",
  c."dni",
  ('Repuesto: ' || pr."nombre")::text,
  NULL::text,
  rp."subtotal",
  0::numeric,
  0::numeric,
  0::numeric,
  rp."anulada",
  'reparacion_producto'::text,
  rp."id"::text,
  rp."createdAt"
FROM "ReparacionProducto" rp
JOIN "Reparacion" r ON r."id" = rp."reparacionId"
JOIN "Producto" pr ON pr."id" = rp."productoId"
LEFT JOIN "Cliente" c ON c."id" = r."clienteId"

UNION ALL

SELECT
  'movimiento_caja'::text,
  m."id"::text,
  m."createdAt",
  m."codigoOperacion",
  NULL::text,
  NULL::text,
  NULL::text,
  NULL::text,
  COALESCE(m."descripcion", CASE m."tipo" WHEN 'ingreso' THEN 'Ingreso manual' WHEN 'egreso' THEN 'Egreso manual' ELSE 'Ajuste de caja' END)::text,
  m."metodoPago",
  m."monto",
  m."montoEfectivo",
  m."montoTransferencia",
  m."montoTarjeta",
  m."anulada",
  'movimiento_caja'::text,
  m."id"::text,
  m."createdAt"
FROM "MovimientoCaja" m
WHERE m."tipo" IN ('ingreso', 'egreso', 'ajuste');
