-- AlterTable
ALTER TABLE `User` ADD COLUMN `donationTier` ENUM('NONE', 'GOLD', 'PLATINUM', 'DIAMOND') NOT NULL DEFAULT 'NONE';
