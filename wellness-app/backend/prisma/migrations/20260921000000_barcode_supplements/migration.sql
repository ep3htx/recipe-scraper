-- AlterTable
ALTER TABLE "foods" ADD COLUMN "barcode" TEXT;

-- CreateTable
CREATE TABLE "supplements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "barcode" TEXT,
    "serving_size" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplement_logs" (
    "id" TEXT NOT NULL,
    "supplement_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplement_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "foods_user_id_barcode_idx" ON "foods"("user_id", "barcode");

-- CreateIndex
CREATE INDEX "supplements_user_id_barcode_idx" ON "supplements"("user_id", "barcode");

-- CreateIndex
CREATE INDEX "supplement_logs_user_id_taken_at_idx" ON "supplement_logs"("user_id", "taken_at");

-- CreateIndex
CREATE INDEX "supplement_logs_supplement_id_idx" ON "supplement_logs"("supplement_id");

-- AddForeignKey
ALTER TABLE "supplements" ADD CONSTRAINT "supplements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplement_logs" ADD CONSTRAINT "supplement_logs_supplement_id_fkey" FOREIGN KEY ("supplement_id") REFERENCES "supplements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplement_logs" ADD CONSTRAINT "supplement_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
