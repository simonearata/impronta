CREATE TYPE "MovementType" AS ENUM ('in', 'out', 'adjustment');

CREATE TABLE "InventoryMovement" (
    "id"                 TEXT NOT NULL,
    "wineId"             TEXT,
    "wineName"           TEXT NOT NULL,
    "type"               "MovementType" NOT NULL,
    "quantity"           DOUBLE PRECISION NOT NULL,
    "unitPriceCents"     INTEGER,
    "invoiceNumber"      TEXT,
    "invoiceDate"        TEXT,
    "supplierOrCustomer" TEXT,
    "invoiceFileUrl"     TEXT,
    "notes"              TEXT,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_wineId_fkey"
    FOREIGN KEY ("wineId") REFERENCES "Wine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
