const express = require("express");
const config = require("../config.json");
const {renderFile, humanReadableBytes} = require("../util/functions");
const path = require("path");
const sizeOfImage = require("image-size");

const namespace = '/'

function getRouter({query, resolvePlaceholders}) {
    const imageRouter = express.Router()

    imageRouter.get('/:id', async (req, res, next) => {
        if (req.hostname === 'mooi.ng' && !config.production) return next();

        let fileName = req.params.id;
        if (!config.production && !fileName.includes('.')) return next();
        let fileId = fileName.split('.').slice(0, -1).join(".")

        let results = await query(`SELECT * FROM images WHERE fileId = ?`, [fileId])
        if (results.length === 0) return res.status(404).send(await renderFile('notFound'))
        let result = results[0]
        if (!(['png', 'jpg', 'gif'].includes(`${result.extension}`))) {
            return res.sendFile(path.resolve(`${config.savePath}/${fileName}`))
        }
        if (result.width === null) {
            let dimensions = sizeOfImage(`${config.savePath}/${result.fileId}.${result.extension}`)
            await query(`UPDATE images SET width = ?, height = ? WHERE fileId = ?`, [dimensions.width, dimensions.height, result.fileId])
        }
        await query(`UPDATE images SET viewCount = viewCount + 1 WHERE fileId = ?`, [result.fileId])
        result.viewCount++;

        res.header("Access-Control-Allow-Origin", "*")

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
            embedSettings[entry[0]] = await resolvePlaceholders(entry[1], user, result)
        }

        let data = {
            user,
            image: result,
            humanReadableSize: humanReadableBytes(result.size),
            embedSettings
        }

        res.send(await renderFile('image', data))
    })

    return imageRouter
}

module.exports = {
    getRouter,
    namespace
}
