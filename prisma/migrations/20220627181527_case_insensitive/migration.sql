/*
  Warnings:

  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.

*/
set FOREIGN_KEY_CHECKS=0;
-- DropIndex
ALTER TABLE `Domain` DROP FOREIGN KEY `Domain_ownerId_fkey`;
DROP INDEX `Domain_ownerId_fkey` ON `Domain`;

-- DropIndex
ALTER TABLE `Image` DROP FOREIGN KEY `Image_ownerId_fkey`;
DROP INDEX `Image_ownerId_fkey` ON `Image`;

-- DropIndex
ALTER TABLE `Token` DROP FOREIGN KEY `Token_userId_fkey`;
DROP INDEX `Token_userId_fkey` ON `Token`;

-- DropIndex
ALTER TABLE `Settings` DROP FOREIGN KEY `Settings_userId_fkey`;

-- DropIndex
ALTER TABLE `Subdomain` DROP FOREIGN KEY `Subdomain_ownerId_fkey`;

-- DropTable
DROP TABLE IF EXISTS `user`;
DROP TABLE IF EXISTS `User`;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(255) NOT NULL,
    `discordId` BIGINT NOT NULL,
    `discordTag` VARCHAR(255) NOT NULL,
    `apiKey` VARCHAR(20) NOT NULL,
    `domain` VARCHAR(255) NOT NULL DEFAULT 'is-trolli.ng',
    `storageQuota` INTEGER NOT NULL DEFAULT 10,
    `uploadLimit` INTEGER NOT NULL DEFAULT 100,
    `uploadCount` INTEGER NOT NULL DEFAULT 0,
    `bytesUsed` BIGINT NOT NULL DEFAULT 0,
    `createdAt` BIGINT NOT NULL,
    `role` ENUM('USER', 'DONATOR', 'DEVELOPER') NOT NULL DEFAULT 'USER',

    UNIQUE INDEX `User_discordId_key`(`discordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Settings` ADD CONSTRAINT `Settings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Image` ADD CONSTRAINT `Image_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Domain` ADD CONSTRAINT `Domain_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subdomain` ADD CONSTRAINT `Subdomain_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Token` ADD CONSTRAINT `Token_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`discordId`) ON DELETE RESTRICT ON UPDATE CASCADE;
set FOREIGN_KEY_CHECKS=1;