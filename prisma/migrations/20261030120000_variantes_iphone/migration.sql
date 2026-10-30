-- CreateTable
CREATE TABLE "IphoneVariant" (
    "id" TEXT NOT NULL,
    "iphoneId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IphoneVariant_pkey" PRIMARY KEY ("id")
);

-- Copiar el color y stock actuales de cada iPhone a su primera variante
INSERT INTO "IphoneVariant" ("id", "iphoneId", "color", "stock")
SELECT gen_random_uuid()::text, "id", "color", "stock"
FROM "iPhone";

-- AlterTable
ALTER TABLE "iPhone" DROP COLUMN "color",
DROP COLUMN "stock";

-- Integridad de la variante del producto principal
UPDATE "iPhone" SET "variante" = '' WHERE "variante" IS NULL;
ALTER TABLE "iPhone" ALTER COLUMN "variante" SET DEFAULT '',
ALTER COLUMN "variante" SET NOT NULL;

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN "colorId" TEXT;

-- AlterTable
ALTER TABLE "VentaProductoItem" ADD COLUMN "colorId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "IphoneVariant_iphoneId_color_key" ON "IphoneVariant"("iphoneId", "color");

-- CreateIndex
CREATE INDEX "IphoneVariant_iphoneId_idx" ON "IphoneVariant"("iphoneId");

-- CreateIndex
CREATE UNIQUE INDEX "iPhone_modelo_variante_almacenamiento_key" ON "iPhone"("modelo", "variante", "almacenamiento");

-- CreateIndex
CREATE INDEX "Venta_colorId_idx" ON "Venta"("colorId");

-- CreateIndex
CREATE INDEX "VentaProductoItem_colorId_idx" ON "VentaProductoItem"("colorId");

-- AddForeignKey
ALTER TABLE "IphoneVariant" ADD CONSTRAINT "IphoneVariant_iphoneId_fkey" FOREIGN KEY ("iphoneId") REFERENCES "iPhone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "IphoneVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaProductoItem" ADD CONSTRAINT "VentaProductoItem_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "IphoneVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Integridad de las variantes
ALTER TABLE "IphoneVariant" ADD CONSTRAINT "IphoneVariant_color_no_vacio" CHECK (btrim("color") <> '');
ALTER TABLE "IphoneVariant" ADD CONSTRAINT "IphoneVariant_stock_no_negativo" CHECK ("stock" >= 0);
