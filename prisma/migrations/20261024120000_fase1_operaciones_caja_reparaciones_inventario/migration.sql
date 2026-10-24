-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "anulada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "codigoOperacion" TEXT,
ADD COLUMN     "fechaAnulacion" TIMESTAMP(3),
ADD COLUMN     "motivoAnulacion" TEXT;

-- AlterTable
ALTER TABLE "iPhone" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Secuencia" (
    "clave" TEXT NOT NULL,
    "valor" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Secuencia_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT NOT NULL DEFAULT 'accesorio',
    "sku" TEXT,
    "precioCompra" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "precioVenta" DECIMAL(65,30) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoStock" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "motivo" TEXT,
    "referenciaTipo" TEXT,
    "referenciaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaProducto" (
    "id" TEXT NOT NULL,
    "codigoOperacion" TEXT NOT NULL,
    "clienteId" TEXT,
    "total" DECIMAL(65,30) NOT NULL,
    "metodoPago" TEXT NOT NULL DEFAULT 'efectivo',
    "observaciones" TEXT,
    "fechaVenta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anulada" BOOLEAN NOT NULL DEFAULT false,
    "motivoAnulacion" TEXT,
    "fechaAnulacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentaProducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaProductoItem" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(65,30) NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "VentaProductoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reparacion" (
    "id" TEXT NOT NULL,
    "codigoOperacion" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "equipo" TEXT NOT NULL,
    "imei" TEXT,
    "color" TEXT,
    "almacenamiento" TEXT,
    "accesoriosRecibidos" TEXT,
    "estadoFisico" TEXT,
    "falla" TEXT NOT NULL,
    "diagnostico" TEXT,
    "presupuesto" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "montoFinal" DECIMAL(65,30),
    "estado" TEXT NOT NULL DEFAULT 'recibido',
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaPromesa" TIMESTAMP(3),
    "fechaEntrega" TIMESTAMP(3),
    "observaciones" TEXT,
    "anulada" BOOLEAN NOT NULL DEFAULT false,
    "motivoAnulacion" TEXT,
    "fechaAnulacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reparacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialReparacion" (
    "id" TEXT NOT NULL,
    "reparacionId" TEXT NOT NULL,
    "estadoAnterior" TEXT,
    "estadoNuevo" TEXT NOT NULL,
    "nota" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialReparacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReparacionProducto" (
    "id" TEXT NOT NULL,
    "reparacionId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(65,30) NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "anulada" BOOLEAN NOT NULL DEFAULT false,
    "motivoAnulacion" TEXT,
    "fechaAnulacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReparacionProducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoReparacion" (
    "id" TEXT NOT NULL,
    "codigoOperacion" TEXT NOT NULL,
    "reparacionId" TEXT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "metodoPago" TEXT NOT NULL DEFAULT 'efectivo',
    "concepto" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,
    "anulada" BOOLEAN NOT NULL DEFAULT false,
    "motivoAnulacion" TEXT,
    "fechaAnulacion" TIMESTAMP(3),

    CONSTRAINT "PagoReparacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoCuota" (
    "id" TEXT NOT NULL,
    "codigoOperacion" TEXT NOT NULL,
    "cuotaId" TEXT NOT NULL,
    "monto" DECIMAL(65,30) NOT NULL,
    "montoMora" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "metodoPago" TEXT NOT NULL DEFAULT 'efectivo',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,
    "anulada" BOOLEAN NOT NULL DEFAULT false,
    "motivoAnulacion" TEXT,
    "fechaAnulacion" TIMESTAMP(3),

    CONSTRAINT "PagoCuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CajaDiaria" (
    "id" TEXT NOT NULL,
    "fechaDia" TIMESTAMP(3) NOT NULL,
    "montoInicial" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "abiertaAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaAt" TIMESTAMP(3),
    "montoEsperadoEfectivo" DECIMAL(65,30),
    "montoContadoEfectivo" DECIMAL(65,30),
    "diferenciaEfectivo" DECIMAL(65,30),
    "montoEsperadoTransferencia" DECIMAL(65,30),
    "montoContadoTransferencia" DECIMAL(65,30),
    "diferenciaTransferencia" DECIMAL(65,30),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CajaDiaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoCaja" (
    "id" TEXT NOT NULL,
    "cajaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "metodoPago" TEXT NOT NULL DEFAULT 'efectivo',
    "monto" DECIMAL(65,30) NOT NULL,
    "descripcion" TEXT,
    "codigoOperacion" TEXT,
    "referenciaTipo" TEXT,
    "referenciaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anulada" BOOLEAN NOT NULL DEFAULT false,
    "motivoAnulacion" TEXT,
    "fechaAnulacion" TIMESTAMP(3),

    CONSTRAINT "MovimientoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Producto_sku_key" ON "Producto"("sku");

-- CreateIndex
CREATE INDEX "Producto_categoria_activo_idx" ON "Producto"("categoria", "activo");

-- CreateIndex
CREATE INDEX "Producto_stock_idx" ON "Producto"("stock");

-- CreateIndex
CREATE INDEX "MovimientoStock_productoId_createdAt_idx" ON "MovimientoStock"("productoId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VentaProducto_codigoOperacion_key" ON "VentaProducto"("codigoOperacion");

-- CreateIndex
CREATE INDEX "VentaProducto_fechaVenta_idx" ON "VentaProducto"("fechaVenta");

-- CreateIndex
CREATE INDEX "VentaProducto_clienteId_idx" ON "VentaProducto"("clienteId");

-- CreateIndex
CREATE INDEX "VentaProductoItem_ventaId_idx" ON "VentaProductoItem"("ventaId");

-- CreateIndex
CREATE INDEX "VentaProductoItem_productoId_idx" ON "VentaProductoItem"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "Reparacion_codigoOperacion_key" ON "Reparacion"("codigoOperacion");

-- CreateIndex
CREATE INDEX "Reparacion_estado_fechaIngreso_idx" ON "Reparacion"("estado", "fechaIngreso");

-- CreateIndex
CREATE INDEX "Reparacion_clienteId_idx" ON "Reparacion"("clienteId");

-- CreateIndex
CREATE INDEX "HistorialReparacion_reparacionId_fecha_idx" ON "HistorialReparacion"("reparacionId", "fecha");

-- CreateIndex
CREATE INDEX "ReparacionProducto_reparacionId_idx" ON "ReparacionProducto"("reparacionId");

-- CreateIndex
CREATE INDEX "ReparacionProducto_productoId_idx" ON "ReparacionProducto"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "PagoReparacion_codigoOperacion_key" ON "PagoReparacion"("codigoOperacion");

-- CreateIndex
CREATE INDEX "PagoReparacion_reparacionId_fecha_idx" ON "PagoReparacion"("reparacionId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "PagoCuota_codigoOperacion_key" ON "PagoCuota"("codigoOperacion");

-- CreateIndex
CREATE INDEX "PagoCuota_cuotaId_fecha_idx" ON "PagoCuota"("cuotaId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "CajaDiaria_fechaDia_key" ON "CajaDiaria"("fechaDia");

-- CreateIndex
CREATE INDEX "CajaDiaria_estado_idx" ON "CajaDiaria"("estado");

-- CreateIndex
CREATE INDEX "MovimientoCaja_cajaId_metodoPago_idx" ON "MovimientoCaja"("cajaId", "metodoPago");

-- CreateIndex
CREATE INDEX "MovimientoCaja_codigoOperacion_idx" ON "MovimientoCaja"("codigoOperacion");

-- CreateIndex
CREATE UNIQUE INDEX "Venta_codigoOperacion_key" ON "Venta"("codigoOperacion");

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaProducto" ADD CONSTRAINT "VentaProducto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaProductoItem" ADD CONSTRAINT "VentaProductoItem_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "VentaProducto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaProductoItem" ADD CONSTRAINT "VentaProductoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reparacion" ADD CONSTRAINT "Reparacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialReparacion" ADD CONSTRAINT "HistorialReparacion_reparacionId_fkey" FOREIGN KEY ("reparacionId") REFERENCES "Reparacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReparacionProducto" ADD CONSTRAINT "ReparacionProducto_reparacionId_fkey" FOREIGN KEY ("reparacionId") REFERENCES "Reparacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReparacionProducto" ADD CONSTRAINT "ReparacionProducto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoReparacion" ADD CONSTRAINT "PagoReparacion_reparacionId_fkey" FOREIGN KEY ("reparacionId") REFERENCES "Reparacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuota" ADD CONSTRAINT "PagoCuota_cuotaId_fkey" FOREIGN KEY ("cuotaId") REFERENCES "Cuota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "CajaDiaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
