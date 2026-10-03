-- CreateTable
CREATE TABLE "wallet_top_up" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "bkashPaymentID" TEXT,
    "bkashTrxID" TEXT,
    "checkoutURL" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_top_up_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_top_up_userId_idx" ON "wallet_top_up"("userId");

-- AddForeignKey
ALTER TABLE "wallet_top_up" ADD CONSTRAINT "wallet_top_up_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
