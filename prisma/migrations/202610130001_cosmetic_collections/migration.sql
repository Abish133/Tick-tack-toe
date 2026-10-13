ALTER TABLE `CommerceOrder` ADD COLUMN `cosmeticIds` JSON NULL;
ALTER TABLE `PlayerInventory` ADD COLUMN `cashCreated` BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE `CommerceCosmeticGrant` (
    `orderId` VARCHAR(191) NOT NULL,
    `cosmeticId` VARCHAR(80) NOT NULL,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `CommerceCosmeticGrant_cosmeticId_idx` (`cosmeticId`),
    PRIMARY KEY (`orderId`, `cosmeticId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `CommerceCosmeticGrant` ADD CONSTRAINT `CommerceCosmeticGrant_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `CommerceOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CommerceCosmeticGrant` ADD CONSTRAINT `CommerceCosmeticGrant_cosmeticId_fkey` FOREIGN KEY (`cosmeticId`) REFERENCES `CosmeticItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
