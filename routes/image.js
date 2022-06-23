const express = require("express");
const config = require("../config.json");
const {renderFile, humanReadableBytes} = require("../util/functions");
const path = require("path");
const sizeOfImage = require("image-size");

const namespace = '/'

function getRouter({query, resolvePlaceholders}) {
    const imageRouter = express.Router()
    imageRouter.get('/i/:id', async (req, res, next) => {
        if (req.hostname !== config.mainDomain && config.production) return next();
        const fileId = req.params.id

        let results = await query(`SELECT * FROM images WHERE fileId = ?`, [fileId])
        if (results.length === 0) return res.send(await renderFile('notFound'))
        let result = results[0]
        let fileName = `${result.fileId}.${result.extension}`

        if (!(['png', 'jpg', 'gif'].includes(`${result.extension}`))) {
            return res.sendFile(path.resolve(`${config.production ? config.savePathProd : config.savePathTest}/${fileName}`))
        }
        if (result.width === null) {
            let dimensions = sizeOfImage(`${config.production ? config.savePathProd : config.savePathTest}/${result.fileId}.${result.extension}`)
            await query(`UPDATE images SET width = ?, height = ? WHERE fileId = ?`, [dimensions.width, dimensions.height, result.fileId])
        }
        await query(`UPDATE images SET viewCount = viewCount + 1 WHERE fileId = ?`, [result.fileId])
        result.viewCount++;

        let user = global.userCache[result.ownerId]
        if (!user || user.lastUpdated < (Date.now() - 1000 * 60 * 5)) {
            let results = await query(`SELECT * FROM users WHERE id = ?`, [result.ownerId])
            if (results.length === 0) return res.status(404).send(await renderFile('notFound'))
            user = results[0]
            user.settings = JSON.parse(user.settings)
            global.userCache[user.id] = {
                data: user,
                lastUpdated: Date.now()
            }
        } else {
            user = user.data
        }
        if (!user.settings.embed) user.settings.embed = {}
        let embedSettings = {}
        for (let entry of Object.entries(user.settings.embed)) {
            if (entry[0] !== 'enabled') embedSettings[entry[0]] = await resolvePlaceholders(entry[1], user, result)
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
        let results;

        if (config.production) results = await query(`SELECT * FROM images WHERE alias = ? AND domain = ?`, [fileAlias, req.hostname])
        else results = await query(`SELECT * FROM images WHERE alias = ?`, [fileAlias])
        if (results.length === 0) return res.status(404).send(await renderFile('notFound'))
        let result = results[0]

        res.redirect(`${config.production ? `https://${config.mainDomain}` : ''}/i/${result.fileId}`)
    })

    return imageRouter
}

module.exports = {
    getRouter,
    namespace
}
