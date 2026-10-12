-- AlterTable
ALTER TABLE `playerstats` ADD COLUMN `bestStreak` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `streak` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX `User_name_key` ON `User`(`name`);

