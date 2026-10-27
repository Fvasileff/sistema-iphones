-- CreateIndex
CREATE INDEX "Cliente_apellido_nombre_idx" ON "Cliente"("apellido", "nombre");

-- CreateIndex
CREATE INDEX "Cuota_ventaId_idx" ON "Cuota"("ventaId");

-- CreateIndex
CREATE INDEX "Cuota_estado_fechaVencimiento_idx" ON "Cuota"("estado", "fechaVencimiento");

-- CreateIndex
CREATE INDEX "Cuota_fechaPago_idx" ON "Cuota"("fechaPago");

-- CreateIndex
CREATE INDEX "Venta_fechaVenta_idx" ON "Venta"("fechaVenta");

-- CreateIndex
CREATE INDEX "Venta_clienteId_idx" ON "Venta"("clienteId");

-- CreateIndex
CREATE INDEX "Venta_anulada_fechaVenta_idx" ON "Venta"("anulada", "fechaVenta");
