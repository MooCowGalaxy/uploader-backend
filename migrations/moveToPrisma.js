const fs = require('fs').promises
const {PrismaClient} = require('@prisma/client')
const mysql = require('mysql2')
const config = require("../config.json");
config.database.supportBigNumbers = true // support discord IDs
config.database.bigNumberStrings = true // convert BIGINT types to string

const pool = mysql.createPool(config.database)
const {query} = require('../util/database')(pool)

async function getJSON() {
    let finalData = {}
    finalData.users = await query(`SELECT * FROM users`)
    finalData.tokens = await query(`SELECT * FROM tokens`)
    finalData.images = await query(`SELECT * FROM images`)
    finalData.stats = await query(`SELECT * FROM stats`)
    finalData.domains = await query(`SELECT * FROM domains`)
    finalData.subdomains = await query(`SELECT * FROM subdomains`)
    return finalData
}
function getDefault(val, def) {
    if (!val || val === undefined || val === null || (typeof val === 'string' && val.length === 0)) {
        return def
    }
    return val
}
async function main(fetchData = true) {
    let data;
    if (fetchData) {
        data = await getJSON()
        await fs.writeFile(`./data-${Date.now()}.json`, JSON.stringify(data))
    } else {
        let buffer = await fs.readFile(`./data-1656109461963.json`)
        data = JSON.parse(buffer.toString())
    }
    if (fetchData) return;

    const prisma = new PrismaClient()

    for (let user of data.users) {
        let settings = JSON.parse(user.settings)
        await prisma.user.create({
            data: {
                id: user.id,
                username: user.username,
                discordId: BigInt(user.discord),
                apiKey: user.api_key,
                settings: {
                    create: {
                        linkType: user.link_type,
                        embedSiteName: getDefault(settings.embed.siteName, ''),
                        embedSiteTitle: getDefault(settings.embed.title, ''),
                        embedSiteDescription: getDefault(settings.embed.description, ''),
                        embedColor: getDefault(settings.color, '#000000'),
                        embedEnabled: getDefault(settings.embed.enabled, false)
                    }
                },
                domain: user.domain,
                storageQuota: user.storage_quota,
                uploadLimit: user.upload_limit,
                uploadCount: user.upload_count,
                bytesUsed: BigInt(user.bytes_used),
                discordTag: getDefault(user.tag, user.username),
                createdAt: BigInt(user.created)
            }
        })
    }
    for (let token of data.tokens) {
        await prisma.token.create({
            data: {
                userId: BigInt(token.user_id),
                token: token.token,
                bearerToken: token.bearer_token,
                expires: token.expires,
                cache: token.cache,
                lastUpdated: token.last_updated
            }
        })
    }
    for (let image of data.images) {
        await prisma.image.create({
            data: {
                fileId: image.fileId,
                originalName: image.originalName,
                size: BigInt(image.size),
                timestamp: BigInt(image.timestamp),
                extension: image.extension,
                viewCount: image.viewCount,
                owner: {
                    connect: {
                        id: image.ownerId
                    }
                },
                width: image.width,
                height: image.height,
                domain: image.domain,
                alias: image.alias
            }
        })
    }
    for (let stat of data.stats) {
        await prisma.stats.create({
            data: {
                timestamp: BigInt(stat.timestamp),
                users: stat.users,
                bytesUsed: BigInt(stat.bytes_used),
                imagesUploaded: BigInt(stat.images_uploaded)
            }
        })
    }
    for (let domain of data.domains) {
        await prisma.domain.create({
            data: {
                domain: domain.domain,
                owner: {
                    connect: {
                        id: domain.owner_id
                    }
                },
                public: domain.public === 1,
                created: BigInt(domain.created)
            }
        })
    }
    for (let subdomain of data.subdomains) {
        await prisma.subdomain.create({
            data: {
                domain: {
                    connect: {
                        domain: subdomain.domain
                    }
                },
                subdomain: subdomain.subdomain,
                owner: {
                    connect: {
                        id: subdomain.ownerId
                    }
                }
            }
        })
    }
    console.log(`Migration successful.`)

    return prisma
}
main().then((prisma) => {
    prisma.$disconnect().then(process.exit())
})