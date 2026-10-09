-- CONTENT-02: persist contact-form submissions. The API previously returned a
-- fabricated success without storing or sending anything.

-- CreateTable
CREATE TABLE "contact_message" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_message_status_idx" ON "contact_message"("status");

-- CreateIndex
CREATE INDEX "contact_message_createdAt_idx" ON "contact_message"("createdAt");
