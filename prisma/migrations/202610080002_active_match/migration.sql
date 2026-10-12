-- AlterTable
ALTER TABLE `playerprofile` ADD COLUMN `equippedEffect` VARCHAR(80) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `activeMatchId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_activeMatchId_fkey` FOREIGN KEY (`activeMatchId`) REFERENCES `Match`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

