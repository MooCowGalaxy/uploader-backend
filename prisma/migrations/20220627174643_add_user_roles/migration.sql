-- AlterTable
ALTER TABLE `User` ADD COLUMN `role` ENUM('USER', 'DONATOR', 'DEVELOPER') NOT NULL DEFAULT 'USER';
