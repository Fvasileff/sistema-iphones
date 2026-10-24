-- CreateTable
CREATE TABLE "VentaIphone" (
    "id" TEXT NOT NULL,
    "codigoOperacion" TEXT NOT NULL,
    "clienteId" TEXT,
    "iphoneId" TEXT NOT NULL,
    "precioVenta" DECIMAL(65,30) NOT NULL,
    "metodoPago" TEXT NOT NULL DEFAULT 'efectivo',
    "observaciones" TEXT,
    "fechaVenta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anulada" BOOLEAN NOT NULL DEFAULT false,
    "motivoAnulacion" TEXT,
    "fechaAnulacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentaIphone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VentaIphone_codigoOperacion_key" ON "VentaIphone"("codigoOperacion");

-- CreateIndex
CREATE INDEX "VentaIphone_fechaVenta_idx" ON "VentaIphone"("fechaVenta");

-- CreateIndex
CREATE INDEX "VentaIphone_clienteId_idx" ON "VentaIphone"("clienteId");

-- CreateIndex
CREATE INDEX "VentaIphone_iphoneId_idx" ON "VentaIphone"("iphoneId");

-- AddForeignKey
ALTER TABLE "VentaIphone" ADD CONSTRAINT "VentaIphone_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaIphone" ADD CONSTRAINT "VentaIphone_iphoneId_fkey" FOREIGN KEY ("iphoneId") REFERENCES "iPhone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
