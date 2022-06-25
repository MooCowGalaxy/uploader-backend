const express = require("express");
const {humanReadableBytes, createTokenString, createEmojiString, createZWSString} = require("../util/functions");
const sizeOfImage = require("image-size");
const upload = require('multer')()
let fileTypeFromBuffer;
import('file-type').then(module => {
    fileTypeFromBuffer = module.fileTypeFromBuffer
})

const namespace = '/api'

function getRouter({checkForDomain, getUser, prisma, saveFile, deleteFile}) {
    const api = express.Router()

    const statsHistoryCache = {
        lastUpdated: 0,
        data: null
    }

    async function getStats() {
        if (statsHistoryCache.lastUpdated + 30 * 60 * 1000 < Date.now()) {
            let results = await prisma.stats.findMany({
                orderBy: [
                    {timestamp: 'desc'}
                ],
                take: 72
            })
            results.reverse()
            statsHistoryCache.lastUpdated = Date.now()
            statsHistoryCache.data = []
            for (let result of results) {
                statsHistoryCache.data.push({timestamp: parseInt(result.timestamp), users: result.users, bytesUsed: parseInt(result.bytesUsed), imagesUploaded: parseInt(result.imagesUploaded)})
            }
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
        res.send({success: true, data: user.data, user: {storageQuota: user.user.storageQuota, uploadLimit: user.user.uploadLimit, uploadCount: user.user.uploadCount, bytesUsed: parseInt(user.user.bytesUsed), bytesHuman: humanReadableBytes(user.user.bytesUsed), domain: user.user.domain, apiKey: user.user.apiKey, settings: user.user.settings}})
    })
    api.post('/user/regenerate', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        let apiKey = createTokenString(20)
        await prisma.user.update({
            where: {
                id: user.user.id
            },
            data: {
                apiKey
            }
        })
        res.send({success: true, apiKey})
    })
    api.post('/user/link', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        const body = req.body
        if (typeof body !== "object") return res.status(400).send({success: false, error: 'Bad Request'})
        if (typeof body.type !== 'number') return res.status(400).send({success: false, error: 'Bad Request'})
        if (body.type > 2 || body.type < 0) return res.status(400).send({success: false, error: 'Bad Request'})
        await prisma.settings.update({
            where: {
                userId: user.user.id
            },
            data: {
                linkType: body.type
            }
        })
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

        user.user.settings.embedColor = body.color !== undefined ? body.color : user.user.settings.embedColor
        user.user.settings.embedEnabled = body.enabled !== undefined ? body.enabled : user.user.settings.embedEnabled
        user.user.settings.embedSiteName = body.name !== undefined ? body.name : user.user.settings.embedSiteName
        user.user.settings.embedSiteTitle = body.title !== undefined ? body.title : user.user.settings.embedSiteTitle
        user.user.settings.embedSiteDescription = body.description !== undefined ? body.description : user.user.settings.embedSiteDescription
        delete user.user.settings.id
        delete user.user.settings.userId
        delete user.user.settings.linkType
        await prisma.settings.update({
            where: {
                id: user.user.id
            },
            data: user.user.settings
        })
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
        let sortQuery = [{id: 'desc'}, {id: 'asc'}, {fileId: 'asc'}, {fileId: 'desc'}, {size: 'asc'}, {size: 'desc'}][sort]
        const rowLimit = 25
        let total = await prisma.image.aggregate({
            _count: {
                size: true
            }
        })
        let limit = Math.ceil(parseInt(total._count.size) / rowLimit)
        if (limit < page) return res.send({success: true, pages: {total: parseInt(total._count.size), page, limit}, sort, data: []})
        let results = await prisma.image.findMany({
            skip: rowLimit * (page - 1),
            take: rowLimit,
            where: {
                ownerId: user.user.id
            },
            select: {
                fileId: true,
                originalName: true,
                size: true,
                timestamp: true,
                extension: true,
                viewCount: true,
                domain: true,
                alias: true
            },
            orderBy: sortQuery
        })
        let finalResult = []
        for (let result of results) {
            result.size = parseInt(result.size)
            result.timestamp = parseInt(result.timestamp)
            finalResult.push(result)
        }
        res.json({success: true, pages: {total: parseInt(total._count.size), page, limit}, sort, data: finalResult})
    })
    api.post('/user/image/delete/:id', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        const id = req.params.id
        if (!id) return res.status(400).send({success: false, error: 'Bad Request'})
        let image = await prisma.image.findFirst({
            where: {
                fileId: id,
                ownerId: user.user.id
            }
        })
        if (image === null) return res.status(400).send({success: false, error: 'Image not found'})
        try {
            await deleteFile(`${id}.${image.extension}`)
        } catch {}
        await prisma.image.delete({
            where: {
                fileId: id
            }
        })

        await prisma.user.update({
            where: {
                id: user.user.id
            },
            data: {
                uploadCount: {
                    increment: -1
                },
                bytesUsed: {
                    increment: 0 - parseInt(image.size)
                }
            }
        })

        global.totalFiles -= 1;
        global.totalBytes -= parseInt(image.size);

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
        let result = await prisma.subdomain.findFirst({
            where: {
                domainName: 'is-trolli.ng',
                subdomain
            }
        })
        if (result !== null) {
            if (result.ownerId !== user.user.id) return res.send({success: true})
            else return res.status(400).send({success: false, error: 'Subdomain taken'})
        }
        try {
            await prisma.subdomain.delete({
                where: {
                    ownerId: user.user.id
                }
            })
        } catch {}
        await prisma.subdomain.create({
            data: {
                domain: {
                    connect: {
                        domain: 'is-trolli.ng'
                    }
                },
                subdomain,
                owner: {
                    connect: {
                        id: user.user.id
                    }
                }
            }
        })
        await prisma.user.update({
            where: {
                id: user.user.id
            },
            data: {
                domain: `${subdomain}.is-trolli.ng`
            }
        })
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
        res.setHeader('Content-Disposition', 'attachment; filename=uploader.tech.sxcu')
        res.send({
            Version: "13.7.0",
            Name: "uploader.tech image uploader",
            DestinationType: "ImageUploader, FileUploader",
            RequestMethod: "POST",
            RequestURL: "https://uploader.tech/api/upload",
            Headers: {
                key: user.user.apiKey
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

        let user = await prisma.user.findFirst({
            where: {
                apiKey: key
            },
            include: {
                settings: true
            }
        })

        // check: API key
        if (user === null) return res.status(401).json({error: true, message: "Invalid key"})
        userCache[user.id] = {
            data: user,
            lastUpdated: Date.now()
        }

        // check: file in body
        if (file.fieldname !== "file") return res.status(400).json({error: true, message: "Invalid file name"})
        if (file.originalname.length > 255) return res.status(400).json({error: true, message: 'File name too long'})

        let mimetype = await fileTypeFromBuffer(file.buffer)

        // check: valid file types
        if (mimetype === undefined) return res.status(400).json({error: true, message: 'Invalid file type'})
        if (!['png', 'jpg', 'jpeg', 'gif', 'mp4'].includes(mimetype.ext)) return res.status(400).json({error: true, message: 'Invalid file type'})

        // check: user quotas - upload limit
        if (file.size > user.uploadLimit * 1000 * 1000) return res.status(400).json({error: true, message: 'Upload size limit exceeded'})
        // check: user quotas - storage limit
        if (parseInt(user.bytesUsed) + file.size > user.storageQuota * 1000 * 1000 * 1000) return res.status(400).json({error: true, message: 'Storage quota exceeded'})

        let extension = file.originalname.split('.').slice(-1)
        if (extension.length > 0) extension = extension[0]
        else return res.status(400).json({error: true, message: 'Invalid file extension'})
        let fileId = createTokenString(9)
        let fileName = `${fileId}.${extension}`
        let fileAlias = [fileId, createEmojiString(4), createZWSString(20)][user.settings.linkType]
        await saveFile(fileName, file.buffer)

        let url = `https://${user.domain}/${fileAlias}`
        let dimensions = ['png', 'jpg', 'jpeg', 'gif'].includes(extension) ? sizeOfImage(file.buffer) : {width: 0, height: 0}

        await prisma.image.create({
            data: {
                fileId,
                originalName: file.originalname,
                size: file.size,
                timestamp: Date.now(),
                extension,
                ownerId: user.id,
                width: dimensions.width,
                height: dimensions.height,
                domain: user.domain,
                alias: fileAlias
            }
        })
        global.totalFiles++;
        global.totalBytes += file.size;

        await prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                uploadCount: {increment: 1},
                bytesUsed: {increment: file.size}
            }
        })

        res.json({error: false, message: "Uploaded!", url: url})
    })

    return api
}

module.exports = {
    getRouter,
    namespace
}
