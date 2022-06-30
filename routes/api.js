const express = require("express");
const {humanReadableBytes, createTokenString, createEmojiString, createZWSString, decodeZWSString} = require("../util/functions");
const sizeOfImage = require("image-size");
const config = require('../config.json')
const upload = require('multer')()
let fileTypeFromBuffer;
import('file-type').then(module => {
    fileTypeFromBuffer = module.fileTypeFromBuffer
})

const namespace = '/api'

function getRouter({checkForDomain, getUser, prisma, saveFile, deleteFile, consumeRatelimit, cf}) {
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

        try {
            await consumeRatelimit(req.path, user.id)
        } catch {
            return res.status(429).send({success: false, error: 'You are being ratelimited.'})
        }
        res.send({success: true, data: user.data, user: {type: user.user.role, storageQuota: user.user.storageQuota, uploadLimit: user.user.uploadLimit, uploadCount: user.user.uploadCount, bytesUsed: parseInt(user.user.bytesUsed), bytesHuman: humanReadableBytes(user.user.bytesUsed), domain: user.user.domain, apiKey: user.user.apiKey, settings: user.user.settings}})
    })
    api.post('/user/regenerate', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        try {
            await consumeRatelimit(req.path, user.id)
        } catch {
            return res.status(429).send({success: false, error: 'You are being ratelimited.'})
        }
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
        try {
            await consumeRatelimit(req.path, user.id)
        } catch {
            return res.status(429).send({success: false, error: 'You are being ratelimited.'})
        }
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

        try {
            await consumeRatelimit(req.path, user.id)
        } catch {
            return res.status(429).send({success: false, error: 'You are being ratelimited.'})
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
                userId: user.user.id
            },
            data: user.user.settings
        })
        res.send({success: true})
    })
    api.get('/user/images', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        try {
            await consumeRatelimit(req.path, user.id)
        } catch {
            return res.status(429).send({success: false, error: 'You are being ratelimited.'})
        }
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
            if (result.alias.startsWith('z:')) result.alias = decodeZWSString(result.alias)
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
            await consumeRatelimit('/user/image/delete', user.id)
        } catch {
            return res.status(429).send({success: false, error: 'You are being ratelimited.'})
        }
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
    api.get('/checkDomains', async (req, res) => {
        const user = await getUser(req)
        if (!user || user.user.id !== 1) return res.status(401).send({success: false, error: 'Unauthorized'})
        const checkNS = require('../util/checkCFPending')
        try {
            await checkNS({cf, prisma})
        } catch (e) {
            return res.send({success: false, error: e.toString(), stack: e.stack})
        }
        res.send({success: true})
    })
    api.get('/domains', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        const domainList = await prisma.domain.findMany({
            where: {
                OR: [
                    {public: true},
                    {ownerId: user.user.id}
                ],
                AND: [
                    {status: 'ACTIVE'}
                ]
            }
        })
        let domains = []
        for (let domain of domainList) {
            domains.push({
                id: domain.id,
                domain: domain.domain,
                ownerId: domain.ownerId,
                public: domain.public,
                created: parseInt(domain.created)
            })
        }
        res.send({success: true, domains})
    })

    api.get('/domains/self', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        const privateDomainList = await prisma.domain.findMany({
            where: {
                ownerId: user.user.id
            }
        })
        let domains = []
        for (let domain of privateDomainList) {
            domains.push({
                id: domain.id,
                domain: domain.domain,
                status: domain.status,
                ownerId: domain.ownerId,
                public: domain.public,
                created: parseInt(domain.created)
            })
        }
        res.send({success: true, domains})
    })
    api.post('/domains/self/visibility', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        if (req.body.constructor !== Object) return res.status(400).send({success: false, error: 'Invalid body'})

        const domainId = req.body.domainId
        if (typeof domainId !== 'number' ||
            domainId < 1) return res.status(400).send({success: false, error: 'Invalid body'})
        const domain = await prisma.domain.findUnique({
            where: {
                id: domainId
            }
        })
        if (domain === null) return res.status(404).send({success: false, error: 'Domain not found'})
        if (domain.status !== 'ACTIVE') return res.status(400).send({success: false, error: 'Domain is not active'})
        if (domain.ownerId !== user.user.id) return res.status(400).send({success: false, error: 'Missing permissions to edit domain'})

        const isPublic = req.body.public
        if (typeof isPublic !== 'boolean') return res.status(400).send({success: false, error: 'Invalid body'})
        if (domain.public === isPublic) return res.send({success: true})

        try {
            await consumeRatelimit(req.path, user.id)
        } catch {
            return res.status(429).send({success: false, error: 'You are being ratelimited.'})
        }

        await prisma.domain.update({
            where: {
                id: domainId
            },
            data: {
                public: isPublic
            }
        })
        if (!isPublic) {
            /* await prisma.subdomain.deleteMany({
                where: {
                    domain: {
                        is: {
                            id: domainId
                        }
                    },
                    owner: {
                        isNot: {
                            id: user.user.id
                        }
                    }
                }
            }) */
            await prisma.user.updateMany({
                where: {
                    OR: [
                        {domain: domain.domain},
                        {domain: {endsWith: `.${domain.domain}`}}
                    ],
                    NOT: {
                        id: user.user.id
                    }
                },
                data: {
                    domain: 'is-trolli.ng'
                }
            })
        }
        res.send({success: true})
    })

    api.post('/user/domains/delete', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        if (req.body.constructor !== Object) return res.status(400).send({success: false, error: 'Invalid body'})

        const domainId = req.body.domainId
        if (typeof domainId !== 'number' ||
            domainId < 1) return res.status(400).send({success: false, error: 'Invalid body'})
        const domain = await prisma.domain.findUnique({
            where: {
                id: domainId
            }
        })
        if (domain === null) return res.status(404).send({success: false, error: 'Domain not found'})
        // if (domain.status !== 'ACTIVE') return res.status(400).send({success: false, error: 'Domain is not active'})
        if (domain.ownerId !== user.user.id) return res.status(400).send({success: false, error: 'Missing permissions to edit domain'})

        if (domain.id === 1) {
            return res.status(400).send({success: false, error: `silly you can't delete the main domain!!`})
        }

        try {
            await consumeRatelimit(req.path, user.id)
        } catch {
            return res.status(429).send({success: false, error: 'You are being ratelimited.'})
        }

        if (config.production) await cf.zones.del(domain.cloudflareId)
        /* await prisma.subdomain.deleteMany({
            where: {
                domain: {
                    is: {
                        id: domainId
                    }
                }
            }
        }) */
        await prisma.user.updateMany({
            where: {
                OR: [
                    {domain: domain.domain},
                    {domain: {endsWith: `.${domain.domain}`}}
                ]
            },
            data: {
                domain: 'is-trolli.ng'
            }
        })
        await prisma.domain.delete({
            where: {
                id: domainId
            }
        })
        res.send({success: true})
    })

    api.post('/user/domains/create', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        if (req.body.constructor !== Object) return res.status(400).send({success: false, error: 'Invalid body type'})
        const domain = req.body.domain
        if (typeof domain !== 'string' ||
            domain.length < 4 ||
            domain.length > 200) return res.status(400).send({success: false, error: 'Invalid body'})
        const regexp = /^([a-zA-Z0-9][\-a-zA-Z0-9]*\.)+[\-a-zA-Z0-9]{2,20}$/
        if (!regexp.test(domain)) return res.status(400).send({success: false, error: 'Invalid domain'})
        const duplicateDomain = await prisma.domain.findUnique({
            where: {
                domain
            }
        })
        if (duplicateDomain !== null) return res.status(400).send({success: false, error: 'Domain is already registered'})

        try {
            await consumeRatelimit(req.path, user.id)
        } catch {
            return res.status(429).send({success: false, error: 'You are being ratelimited.'})
        }

        let cfRes;
        const cfReq = {name: domain, account: {id: config.cloudflare.accountId}, jump_start: false, type: 'full'}
        try {
            cfRes = await cf.zones.add(cfReq)
        } catch (e) {
            console.error(e)
            console.error(cfReq)
            return res.status(400).send({success: false, error: 'Domain processing failed'})
        }
        if (!cfRes.success) {
            console.error(cfRes.errors)
            return res.status(400).send({success: false, error: 'Domain processing failed'})
        }
        await prisma.domain.create({
            data: {
                domain,
                owner: {
                    connect: {
                        id: user.user.id
                    }
                },
                public: false,
                created: Date.now(),
                status: 'PENDING_NS',
                cloudflareId: cfRes.result.id
            }
        })
        res.send({
            success: true,
            originalNS: cfRes.result.original_name_servers,
            newNS: cfRes.result.name_servers
        })
    })

    api.post('/user/domains/domain', async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.status(401).send({success: false, error: 'Unauthorized'})
        if (req.body.constructor !== Object) return res.status(400).send({success: false, error: 'Invalid body type'})
        const domainName = req.body.domain
        if (typeof domainName !== 'string' ||
            domainName.length < 4 || domainName.length > 200) return res.status(400).send({success: false, error: 'Invalid body'})
        const domain = await prisma.domain.findUnique({
            where: {
                domain: domainName
            }
        })
        if (domain === null) return res.status(404).send({success: false, error: 'Domain not found'})
        if (domain.status !== 'ACTIVE') return res.status(400).send({success: false, error: 'Domain is not active'})
        if (!domain.public && domain.ownerId !== user.user.id) return res.status(400).send({success: false, error: 'Missing permissions to use domain'})

        // valid domain -------------------------------------------

        const subdomain = req.body.subdomain
        if ((!subdomain && subdomain !== '') || typeof subdomain !== 'string' || subdomain.length > 20) return res.status(400).send({success: false, error: 'Invalid subdomain'})
        let allowed = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split('')
        for (let character of subdomain) {
            if (!allowed.includes(character)) {
                return res.status(400).send({success: false, error: 'Invalid subdomain characters'})
            }
        }
        /* let result = await prisma.subdomain.findFirst({
            where: {
                domainName: domain.domain,
                subdomain
            }
        })
        if (result !== null) {
            if (result.ownerId !== user.user.id) return res.send({success: true})
            else return res.status(400).send({success: false, error: 'Subdomain taken'})
        } */

        // valid subdomain ----------------------------------------

        try {
            await consumeRatelimit(req.path, user.id)
        } catch {
            return res.status(429).send({success: false, error: 'You are being ratelimited.'})
        }

        /* try {
            await prisma.subdomain.delete({
                where: {
                    ownerId: user.user.id
                }
            })
        } catch {}
        if (subdomain.length > 0) {
            await prisma.subdomain.create({
                data: {
                    domain: {
                        connect: {
                            domain: domain.domain
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
        } */
        await prisma.user.update({
            where: {
                id: user.user.id
            },
            data: {
                domain: subdomain.length > 0 ? `${subdomain}.${domain.domain}` : domain.domain
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
        if (user === null) return res.status(401).json({success: false, error: "Invalid key"})

        userCache[user.id] = {
            data: user,
            lastUpdated: Date.now()
        }

        // check: file in body
        if (file.fieldname !== "file") return res.status(400).json({success: false, error: "Invalid file name"})
        if (file.originalname.length > 255) return res.status(400).json({success: false, error: 'File name too long'})

        let mimetype = await fileTypeFromBuffer(file.buffer)

        // check: valid file types
        if (mimetype === undefined) return res.status(400).json({success: false, error: 'Invalid file type'})
        if (!['png', 'jpg', 'jpeg', 'gif', 'mp4'].includes(mimetype.ext)) return res.status(400).json({success: false, error: 'Invalid file type'})

        // check: user quotas - upload limit
        if (file.size > user.uploadLimit * 1000 * 1000) return res.status(400).json({success: false, error: 'Upload size limit exceeded'})
        // check: user quotas - storage limit
        if (parseInt(user.bytesUsed) + file.size > user.storageQuota * 1000 * 1000 * 1000) return res.status(400).json({success: false, error: 'Storage quota exceeded'})

        let extension = file.originalname.split('.').slice(-1)
        if (extension.length > 0) extension = extension[0]
        else return res.status(400).json({success: false, error: 'Invalid file extension'})

        // check: ratelimits
        try {
            await consumeRatelimit(req.path, user.id)
        } catch {
            return res.status(429).send({success: false, error: 'You are being ratelimited.'})
        }

        let fileId = createTokenString(9)
        let fileName = `${fileId}.${extension}`
        let fileAlias = [fileId, createEmojiString(4), createZWSString(20)][user.settings.linkType]
        await saveFile(`${user.id}/${fileName}`, file.buffer)

        let url = `https://${user.domain}/${user.settings.linkType === 2 ? decodeZWSString(fileAlias) : fileAlias}`
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
