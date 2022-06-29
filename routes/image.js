const express = require("express");
const config = require("../config.json");
const {renderFile, humanReadableBytes, isZWSString, encodeZWSString} = require("../util/functions");
const path = require("path");
const sizeOfImage = require("image-size");

const namespace = '/'

function getRouter({prisma, resolvePlaceholders}) {
    const imageRouter = express.Router()
    imageRouter.get('/i/:id', async (req, res, next) => {
        if (req.hostname !== config.mainDomain && config.production) return next();
        const fileId = req.params.id

        let result = await prisma.image.findFirst({
            where: {
                fileId
            }
        })
        if (result === null) return res.send(await renderFile('notFound'))
        let fileName = `${result.fileId}.${result.extension}`

        if (!(['png', 'jpg', 'gif'].includes(`${result.extension}`))) {
            return res.redirect(`https://cdn.uploader.tech/${result.ownerId}/${fileName}`)
        }
        /* if (result.width === null) {
            let dimensions = sizeOfImage(`${config.production ? config.savePathProd : config.savePathTest}/${result.fileId}.${result.extension}`)
            await prisma.image.update({
                where: {
                    fileId
                },
                data: {
                    width: dimensions.width,
                    height: dimensions.height,
                    viewCount: {increment: 1}
                }
            })
        } else { */
        await prisma.image.update({
            where: {
                fileId
            },
            data: {
                viewCount: {increment: 1}
            }
        })
        // }
        result.viewCount++;

        let user = global.userCache[result.ownerId]
        if (!user || user.lastUpdated < (Date.now() - 1000 * 60 * 5)) {
            let r = await prisma.user.findUnique({
                where: {
                    id: result.ownerId
                },
                include: {
                    settings: true
                }
            })
            if (r === null) return res.status(404).send(await renderFile('notFound'))
            user = r
            global.userCache[user.id] = {
                data: user,
                lastUpdated: Date.now()
            }
        } else {
            user = user.data
        }
        if (!user.settings.embed) user.settings.embed = {}
        let embedSettings = {}
        for (let entry of Object.entries(user.settings)) {
            if (!entry[0].startsWith('embed')) continue;
            if (entry[0] !== 'embedEnabled') embedSettings[entry[0]] = await resolvePlaceholders(entry[1], user, result)
            else embedSettings.enabled = entry[1]
        }

        let data = {
            user,
            image: result,
            humanReadableSize: humanReadableBytes(result.size),
            embedSettings
        }

        res.send(await renderFile('image', data))
    })

    imageRouter.get('/:id', async (req, res, next) => {
        if (req.hostname === config.mainDomain && config.production) return next();

        let fileAlias = req.params.id;
        if (fileAlias.includes('/')) return next();
        if (fileAlias.startsWith('dashboard')) return next();
        if (isZWSString(fileAlias)) fileAlias = encodeZWSString(fileAlias)
        let result;

        if (config.production) result = await prisma.image.findFirst({where: {alias: fileAlias, domain: req.hostname}})
        else result = await prisma.image.findFirst({where: {alias: fileAlias}})
        if (result === null) return res.status(404).send(await renderFile('notFound'))

        res.redirect(`${config.production ? `https://${config.mainDomain}` : ''}/i/${result.fileId}`)
    })

    return imageRouter
}

module.exports = {
    getRouter,
    namespace
}
