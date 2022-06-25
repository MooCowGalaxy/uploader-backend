-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(255) NOT NULL,
    `discordId` BIGINT NOT NULL,
    `discordTag` VARCHAR(255) NOT NULL,
    `apiKey` VARCHAR(20) NOT NULL,
    `domain` VARCHAR(20) NOT NULL DEFAULT 'is-trolli.ng',
    `storageQuota` INTEGER NOT NULL DEFAULT 10,
    `uploadLimit` INTEGER NOT NULL DEFAULT 100,
    `uploadCount` INTEGER NOT NULL DEFAULT 0,
    `bytesUsed` BIGINT NOT NULL DEFAULT 0,
    `createdAt` BIGINT NOT NULL,

    UNIQUE INDEX `User_discordId_key`(`discordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `linkType` INTEGER NOT NULL DEFAULT 0,
    `embedSiteName` VARCHAR(255) NOT NULL DEFAULT '',
    `embedSiteTitle` VARCHAR(255) NOT NULL DEFAULT '',
    `embedSiteDescription` VARCHAR(500) NOT NULL DEFAULT '',
    `embedColor` VARCHAR(7) NOT NULL DEFAULT '#000000',
    `embedEnabled` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Settings_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Image` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fileId` VARCHAR(255) NOT NULL,
    `originalName` TEXT NOT NULL,
    `size` BIGINT NOT NULL,
    `timestamp` BIGINT NOT NULL,
    `extension` VARCHAR(10) NOT NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `ownerId` INTEGER NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `domain` VARCHAR(255) NOT NULL DEFAULT 'is-trolli.ng',
    `alias` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Stats` (
    `timestamp` BIGINT NOT NULL,
    `users` INTEGER NOT NULL,
    `bytesUsed` BIGINT NOT NULL,
    `imagesUploaded` BIGINT NOT NULL,

    PRIMARY KEY (`timestamp`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Domain` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `domain` VARCHAR(255) NOT NULL,
    `ownerId` INTEGER NOT NULL,
    `public` BOOLEAN NOT NULL,
    `created` BIGINT NOT NULL,

    UNIQUE INDEX `Domain_domain_key`(`domain`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subdomain` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `domainName` VARCHAR(255) NOT NULL,
    `subdomain` VARCHAR(20) NOT NULL,
    `ownerId` INTEGER NOT NULL,

    UNIQUE INDEX `Subdomain_ownerId_key`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Token` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` BIGINT NOT NULL,
    `token` TEXT NOT NULL,
    `bearerToken` TEXT NOT NULL,
    `expires` INTEGER NOT NULL,
    `cache` TEXT NOT NULL,
    `lastUpdated` INTEGER NOT NULL,

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
ALTER TABLE `Subdomain` ADD CONSTRAINT `Subdomain_domainName_fkey` FOREIGN KEY (`domainName`) REFERENCES `Domain`(`domain`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Token` ADD CONSTRAINT `Token_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`discordId`) ON DELETE RESTRICT ON UPDATE CASCADE;
