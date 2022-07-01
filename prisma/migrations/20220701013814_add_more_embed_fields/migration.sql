/*
  Warnings:

  - You are about to alter the column `embedSiteDescription` on the `Settings` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(255)`.

*/
-- AlterTable
ALTER TABLE `Settings` ADD COLUMN `embedSiteAuthor` VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN `embedSiteAuthorLink` VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN `embedSiteNameLink` VARCHAR(100) NOT NULL DEFAULT '',
    MODIFY `embedSiteDescription` VARCHAR(255) NOT NULL DEFAULT '';
