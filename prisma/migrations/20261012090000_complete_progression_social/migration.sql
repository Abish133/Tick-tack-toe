ALTER TABLE `PlayerProfile`
  ADD COLUMN `equippedFrame` VARCHAR(80) NULL,
  ADD COLUMN `equippedBanner` VARCHAR(80) NULL,
  ADD COLUMN `equippedArena` VARCHAR(80) NULL,
  ADD COLUMN `equippedEmote` VARCHAR(80) NULL;
ALTER TABLE `PlayerSettings`
  ADD COLUMN `allowFriendRequests` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `showOnline` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `SeasonParticipation` ADD COLUMN `xp` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `DailyMission` ADD COLUMN `period` VARCHAR(10) NOT NULL DEFAULT 'daily';
ALTER TABLE `Notification` ADD COLUMN `metadata` JSON NULL;

-- Preserve existing season standings, deriving earned seasonal XP from settled matches.
INSERT INTO `SeasonParticipation` (`id`, `seasonId`, `userId`, `cups`, `wins`, `played`, `xp`)
SELECT CONCAT('xp-', SHA2(CONCAT(m.`seasonId`, ':', p.`userId`), 256)), m.`seasonId`, p.`userId`, 0, 0, 0, SUM(p.`xpReward`)
FROM `MatchParticipant` p JOIN `Match` m ON m.`id` = p.`matchId`
WHERE m.`seasonId` IS NOT NULL AND m.`settledAt` IS NOT NULL AND p.`userId` IS NOT NULL
GROUP BY m.`seasonId`, p.`userId`
ON DUPLICATE KEY UPDATE `xp` = VALUES(`xp`);
