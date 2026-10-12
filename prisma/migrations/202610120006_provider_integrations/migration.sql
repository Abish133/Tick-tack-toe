CREATE TABLE `CommerceOrder` (
 `id` VARCHAR(191) NOT NULL, `userId` VARCHAR(191) NOT NULL,
 `requestId` VARCHAR(80) NOT NULL, `sku` VARCHAR(40) NOT NULL,
 `amount` INTEGER NOT NULL, `currency` VARCHAR(3) NOT NULL, `coins` INTEGER NOT NULL DEFAULT 0,
 `seasonId` VARCHAR(80) NULL, `providerOrderId` VARCHAR(80) NULL, `providerPaymentId` VARCHAR(80) NULL,
 `status` VARCHAR(20) NOT NULL DEFAULT 'pending', `fulfilledAt` DATETIME(3) NULL, `refundedAt` DATETIME(3) NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
 PRIMARY KEY (`id`), UNIQUE INDEX `CommerceOrder_userId_requestId_key` (`userId`,`requestId`),
 UNIQUE INDEX `CommerceOrder_providerOrderId_key` (`providerOrderId`), UNIQUE INDEX `CommerceOrder_providerPaymentId_key` (`providerPaymentId`),
 INDEX `CommerceOrder_userId_createdAt_idx` (`userId`,`createdAt`),
 CONSTRAINT `CommerceOrder_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `ProviderEvent` (
 `id` VARCHAR(191) NOT NULL, `provider` VARCHAR(30) NOT NULL, `type` VARCHAR(80) NOT NULL,
 `processedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `AdRewardSession` (
 `id` VARCHAR(191) NOT NULL, `userId` VARCHAR(191) NOT NULL, `tokenHash` VARCHAR(64) NOT NULL,
 `adUnit` VARCHAR(100) NOT NULL, `coins` INTEGER NOT NULL, `expiresAt` DATETIME(3) NOT NULL,
 `grantedAt` DATETIME(3) NULL, `transactionId` VARCHAR(100) NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`),
 UNIQUE INDEX `AdRewardSession_tokenHash_key` (`tokenHash`), UNIQUE INDEX `AdRewardSession_transactionId_key` (`transactionId`),
 INDEX `AdRewardSession_userId_createdAt_idx` (`userId`,`createdAt`),
 CONSTRAINT `AdRewardSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
