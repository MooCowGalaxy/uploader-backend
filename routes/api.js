const express = require("express");
const {humanReadableBytes, createTokenString} = require("../util/functions");
const sizeOfImage = require("image-size");
const upload = require('multer')()
let fileTypeFromBuffer;
import('file-type').then(module => {
    fileTypeFromBuffer = module.fileTypeFromBuffer
})

const namespace = '/api'

function getRouter({checkForDomain, getUser, query, saveFile}) {
    const api = express.Router()

    const statsHistoryCache = {
        lastUpdated: 0,
        data: null
    }

    async function getStats() {
        if (statsHistoryCache.lastUpdated + 30 * 60 * 1000 < Date.now()) {
            let results = await query(`SELECT * FROM stats ORDER BY timestamp DESC LIMIT 72`)
            results.reverse()
            statsHistoryCache.lastUpdated = Date.now()
            statsHistoryCache.data = results
        }
        return statsHistoryCache.data
    }

    api.use(checkForDomain)

    api.get('/embed', async (req, res) => {
        res.send({type: 'link', version: '1.0'})
    })
    api.get('/user', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        res.send({success: true, data: user.data, user: {storageQuota: user.user.storage_quota, uploadLimit: user.user.upload_limit, uploadCount: user.user.upload_count, bytesUsed: parseInt(user.user.bytes_used), bytesHuman: humanReadableBytes(user.user.bytes_used), domain: user.user.domain, apiKey: user.user.api_key}})
    })
    api.post('/user/regenerate', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        let apiKey = createTokenString(20)
        await query(`UPDATE users SET api_key = ? WHERE id = ?`, [apiKey, user.user.id])
        res.send({success: true, apiKey})
    })
    api.get('/stats', async (req, res) => {
        res.json({
            dataUsed: humanReadableBytes(global.totalBytes),
            fileCount: global.totalFiles,
            userCount: global.totalUsers
        })
    })
    api.get('/stats/history', async (req, res) => {
        res.json(await getStats())
    })

    api.get('/config/sharex', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        res.setHeader('Content-Disposition', 'attachment; filename=mooing.sxcu')
        res.send({
            Version: "13.7.0",
            Name: "mooi.ng image uploader",
            DestinationType: "ImageUploader, FileUploader",
            RequestMethod: "POST",
            RequestURL: "https://mooi.ng/api/upload",
            Headers: {
                key: user.user.api_key
            },
            Body: "MultipartFormData",
            FileFormName: "file",
            URL: "$json:url$",
            ErrorMessage: "$json:message$"
        })
    })

    api.post('/upload', upload.single('file'), async (req, res) => {
        let key = req.header("key")
        let file = req.file;

        let results = await query('SELECT * FROM users WHERE api_key = ?', [key])

        // check: API key
        if (results.length === 0) return res.status(401).json({error: true, message: "Invalid key"})
        let user = results[0]
        user.settings = JSON.parse(user.settings)
        user.bytes_used = parseInt(user.bytes_used)
        userCache[user.id] = {
            data: user,
            lastUpdated: Date.now()
        }

        // check: file in body
        if (file.fieldname !== "file") return res.status(400).json({error: true, message: "Invalid file"})

        let mimetype = await fileTypeFromBuffer(file.buffer)

        // check: valid file types
        if (mimetype === undefined) return res.status(400).json({error: true, message: 'Invalid file'})
        if (!['png', 'jpg', 'jpeg', 'gif'].includes(mimetype.ext)) return res.status(400).json({error: true, message: 'Invalid file'})

        // check: user quotas - upload limit
        if (file.size > user.upload_limit * 1000 * 1000) return res.status(400).json({error: true, message: 'File too large'})
        // check: user quotas - storage limit
        if (user.bytes_used + file.size > user.storage_quota * 1000 * 1000 * 1000) return res.status(400).json({error: true, message: 'Storage quota exceeded'})

        let extension = file.originalname.split('.').slice(-1)
        let fileId = createTokenString(8)
        let fileName = `${fileId}.${extension}`
        await saveFile(fileName, file.buffer)

        let url = `https://${user.domain}/${fileName}`
        let dimensions = ['png', 'jpg', 'jpeg', 'gif'].includes(extension[0]) ? sizeOfImage(file.buffer) : {width: 0, height: 0}
        let data = {
            fileId,
            extension,
            originalName: file.originalname,
            size: file.size,
            timestamp: Date.now(),
            viewCount: 0,
            ownerId: user.id,
            width: dimensions.width,
            height: dimensions.height
        }

        await query(
            `INSERT INTO images (fileId, originalName, size, timestamp, extension, ownerId, width, height, domain) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.fileId, data.originalName, data.size, data.timestamp, data.extension, data.ownerId, data.width, data.height, user.domain]
        )
        global.totalFiles++;
        global.totalBytes += data.size;

        await query(
            `UPDATE users SET upload_count = upload_count + 1, bytes_used = bytes_used + ? WHERE id = ?`,
            [data.size, user.id]
        )

        res.json({error: false, message: "Uploaded!", url: url})
    })

    return api
}

module.exports = {
    getRouter,
    namespace
}
