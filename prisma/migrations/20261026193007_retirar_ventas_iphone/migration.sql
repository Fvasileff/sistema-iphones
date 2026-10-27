/*
  Warnings:

  - You are about to drop the `VentaIphone` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "VentaIphone" DROP CONSTRAINT "VentaIphone_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "VentaIphone" DROP CONSTRAINT "VentaIphone_iphoneId_fkey";

-- DropTable
DROP TABLE "VentaIphone";
