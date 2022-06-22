const express = require("express");
const {renderFile} = require("../util/functions");
const config = require("../config.json");
let fileTypeFromBuffer;
import('file-type').then(module => {
    fileTypeFromBuffer = module.fileTypeFromBuffer
})

const namespace = '/raw'

function getRouter({checkForDomain, query, getFile}) {
    const rawImageRouter = express.Router()

    rawImageRouter.use(checkForDomain)

    rawImageRouter.get('/:id', async (req, res) => {
        if (config.production && req.hostname !== 'mooi.ng') return res.redirect(`https://mooi.ng${req.originalUrl}`)
        let fileName = req.params.id
        let fileId = fileName.split('.').slice(0, -1).join(".")

        let results = await query(`SELECT * FROM images WHERE fileId = ?`, [fileId])
        if (results.length === 0) return res.status(404).send(await renderFile('notFound'))

        if (config.storageType === 'minio') {
            let buffer = await getFile(fileName)
            if (buffer === null) return res.send(await renderFile('notFound'))

            let fileType = await fileTypeFromBuffer(buffer)

            if (fileType !== undefined) res.header('Content-Type', fileType.mime)
            else res.header('Content-Type', 'application/octet-stream')
            try {
                res.send(buffer)
            } catch (e) {
                res.status(404).send(await renderFile('notFound'))
            }
        } else {
            try {
                res.sendFile(`${config.savePath}/${fileName}`)
            } catch {
                res.status(404).send(await renderFile('notFound'))
            }
        }
    })

    return rawImageRouter
}

module.exports = {
    getRouter,
    namespace
}
