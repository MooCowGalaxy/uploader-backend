/*
  Warnings:

  - You are about to drop the `subdomain` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Subdomain` DROP FOREIGN KEY `Subdomain_domainName_fkey`;

-- DropForeignKey
ALTER TABLE `Subdomain` DROP FOREIGN KEY `Subdomain_ownerId_fkey`;

-- DropTable
DROP TABLE `Subdomain`;
