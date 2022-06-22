const express = require("express");
const {humanReadableBytes, createTokenString, createEmojiString, createZWSString} = require("../util/functions");
const sizeOfImage = require("image-size");
const upload = require('multer')()
let fileTypeFromBuffer;
import('file-type').then(module => {
    fileTypeFromBuffer = module.fileTypeFromBuffer
})

const namespace = '/api'

function getRouter({checkForDomain, getUser, query, saveFile, deleteFile}) {
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
        res.send({success: true, data: user.data, user: {storageQuota: user.user.storage_quota, uploadLimit: user.user.upload_limit, uploadCount: user.user.upload_count, bytesUsed: parseInt(user.user.bytes_used), bytesHuman: humanReadableBytes(user.user.bytes_used), domain: user.user.domain, apiKey: user.user.api_key, linkType: user.user.link_type}})
    })
    api.post('/user/regenerate', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        let apiKey = createTokenString(20)
        await query(`UPDATE users SET api_key = ? WHERE id = ?`, [apiKey, user.user.id])
        res.send({success: true, apiKey})
    })
    api.post('/user/link', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        const body = req.body
        if (typeof body !== "object") return res.status(400).send({success: false, error: 'Bad Request'})
        if (typeof body.type !== 'number') return res.status(400).send({success: false, error: 'Bad Request'})
        if (body.type > 2 || body.type < 0) return res.status(400).send({success: false, error: 'Bad Request'})
        await query(`UPDATE users SET link_type = ? WHERE id = ?`, [body.type, user.user.id])
        res.send({success: true})
    })
    api.get('/user/embed', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        res.send({
            success: true,
            data: user.user.settings
        })
    })
    api.post('/user/embed', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        const body = req.body
        if (typeof body !== "object") return res.status(400).send({success: false, error: 'Bad Request'})
        for (let key of Object.keys(body)) {
            if (!['name', 'title', 'description', 'color', 'enabled'].includes(key)) return res.status(400).send({success: false, error: 'Bad Request'})
            if (key !== 'enabled' && typeof body[key] !== "string") return res.status(400).send({success: false, error: 'Bad Request'})
            if (key === 'enabled' && typeof body[key] !== "boolean") return res.status(400).send({success: false, error: 'Bad Request'})
        }

        if ((body.name && body.name.length > 255) ||
            (body.title && body.title.length > 255) ||
            (body.description && body.description.length > 500) ||
            (body.color && body.color.length !== 7)) return res.status(400).send({success: false, error: 'Bad Request'})

        if (body.color !== undefined) {
            if (body.color.length !== 7) return res.status(400).send({success: false, error: 'Bad Request'})
            if (isNaN(parseInt(body.color.slice(1), 16))) return res.status(400).send({success: false, error: 'Bad Request'})
        }

        user.user.settings.color = body.color !== undefined ? body.color : user.user.settings.color
        if (typeof user.user.settings.embed === 'undefined') user.user.settings.embed = {}
        user.user.settings.embed.enabled = body.enabled !== undefined ? body.enabled : user.user.settings.embed.enabled
        user.user.settings.embed.siteName = body.name !== undefined ? body.name : user.user.settings.embed.siteName
        user.user.settings.embed.title = body.title !== undefined ? body.title : user.user.settings.embed.title
        user.user.settings.embed.description = body.description !== undefined ? body.description : user.user.settings.embed.description
        await query(`UPDATE users SET settings = ? WHERE id = ?`, [JSON.stringify(user.user.settings), user.user.id])
        res.send({success: true})
    })
    api.get('/user/images', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        let page = parseInt(req.query.page) ? parseInt(req.query.page) : 1
        let sort = parseInt(req.query.sort) ? parseInt(req.query.sort) : 0
        // 0: date (new to old)
        // 1: date (old to new)
        // 2: file name (A-Z)
        // 3: file name (Z-A)
        // 4: file size (small to large)
        // 5: file size (large to small)
        if (sort > 5) sort = 0
        let sortQuery = ['ORDER BY id DESC', 'ORDER BY id', 'ORDER BY fileId', 'ORDER BY fileId DESC', 'ORDER BY size', 'ORDER BY size DESC'][sort]
        const rowLimit = 25
        let total = await query(`SELECT COUNT(*) AS total FROM images WHERE ownerId = ?`, [user.user.id])
        let limit = Math.ceil(parseInt(total[0].total) / rowLimit)
        if (limit < page) return res.send({success: true, pages: {total: parseInt(total[0].total), page, limit}, sort, data: []})
        let results = await query(`SELECT fileId, originalName, size, timestamp, extension, viewCount, domain FROM images WHERE ownerId = ? ${sortQuery} LIMIT ?, ?`,
            [user.user.id, rowLimit * (page - 1), rowLimit])
        res.json({success: true, pages: {total: parseInt(total[0].total), page, limit}, sort, data: results})
    })
    api.post('/user/image/delete/:id', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        const id = req.params.id
        if (!id) return res.status(400).send({success: false, error: 'Bad Request'})
        let results = await query(`SELECT * FROM images WHERE fileId = ? AND ownerId = ? LIMIT 1`, [id, user.user.id])
        if (results.length === 0) return res.status(400).send({success: false, error: 'Image not found'})
        let image = results[0]
        try {
            await deleteFile(`${id}.${image.extension}`)
        } catch {}
        await query(`DELETE FROM images WHERE fileId = ?`, [id])

        await query(`UPDATE users SET upload_count = upload_count - 1, bytes_used = bytes_used - ? WHERE id = ?`, [parseInt(image.size), user.user.id])

        res.send({success: true})
    })
    /* api.get('/domains', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        res.send({success: true, domains: ['is-trolli.ng']})
    }) */
    api.post('/user/domains', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        const subdomain = req.body.subdomain
        if (!subdomain || typeof subdomain !== 'string' || subdomain.length === 0 || subdomain.length > 20) return res.status(400).send({success: false, error: 'Bad Request'})
        let allowed = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split('')
        for (let character of subdomain) {
            if (!allowed.includes(character)) {
                return res.status(400).send({success: false, error: 'Bad Request'})
            }
        }
        let results = await query(`SELECT * FROM subdomains WHERE domain = 'is-trolli.ng' AND subdomain = ?`, [subdomain])
        if (results.length > 0 && results[0].ownerId !== user.user.id) return res.status(400).send({success: false, error: 'Subdomain taken'})
        await query(`DELETE FROM subdomains WHERE ownerId = ?`, [user.user.id])
        await query(`INSERT INTO subdomains (domain, subdomain, ownerId) VALUES (?, ?, ?)`, ['is-trolli.ng', subdomain, user.user.id])
        await query(`UPDATE users SET domain = ? WHERE id = ?`, [`${subdomain}.is-trolli.ng`, user.user.id])
        res.send({success: true})
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
        let fileId = createTokenString(9)
        let fileName = `${fileId}.${extension}`
        let fileAlias = [fileId, createEmojiString(4), createZWSString(20)][user.link_type]
        await saveFile(fileName, file.buffer)

        let url = `https://${user.domain}/${fileAlias}`
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
            `INSERT INTO images (fileId, originalName, size, timestamp, extension, ownerId, width, height, domain, alias) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.fileId, data.originalName, data.size, data.timestamp, data.extension, data.ownerId, data.width, data.height, user.domain, fileAlias]
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
