const storage = require('../util/storage')
const config = require('../config.json')
const {PrismaClient} = require('@prisma/client')
const fs = require('fs').promises

const prisma = new PrismaClient()

async function main() {
    const images = await prisma.image.findMany()
    let i = 0;
    console.log(`Starting task.`)
    for (let image of images) {
        let buffer;
        try {
            buffer = await fs.readFile(`${config.production ? config.savePathProd : config.savePathTest}/${image.fileId}.${image.extension}`)
        } catch {
            console.log(`${image.fileId} was not found on disk, skipping.`)
            i++
            continue
        }
        await storage.uploadFile(`${image.ownerId}/${image.fileId}.${image.extension}`, buffer)
        i++
        if (i % 10 === 0 && i !== 0) console.log(`(${`00${i}`.slice(-3)} / ${images.length})`)
    }
    console.log('Done.')
    process.exit()
}
main().then()
