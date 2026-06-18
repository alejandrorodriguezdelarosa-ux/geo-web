-- CreateTable
CREATE TABLE "ShopifyConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretEnc" TEXT NOT NULL,
    "accessTokenEnc" TEXT,
    "scopes" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "installedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ShopifyConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopifyConnection_shopDomain_idx" ON "ShopifyConnection"("shopDomain");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyConnection_userId_shopDomain_key" ON "ShopifyConnection"("userId", "shopDomain");

-- AddForeignKey
ALTER TABLE "ShopifyConnection" ADD CONSTRAINT "ShopifyConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
