const express = require('express')
const oauth = require('./util/discordAuth')
const {humanReadableBytes} = require('./util/functions')
const {setupCache, addCacheFile} = require('./util/cacher')
const {uploadFile, deleteFile} = require('./util/storage')
const sizeOfImage = require('image-size')
const path = require('path')
const nodeSchedule = require('node-schedule')
const {PrismaClient} = require('@prisma/client')
const {consumeRatelimit} = require('./util/ratelimits')
const fs = require('fs')

const config = require('./config.json')
config.database.supportBigNumbers = true // support discord IDs
config.database.bigNumberStrings = true // convert BIGINT types to string

const app = express()
global.totalBytes = 0
global.totalFiles = 0
global.totalUsers = 0
// SELECT SUM(size) AS total FROM images;

global.userCache = {} // {userId: {data: RowResult, lastUpdated: Date.now()}}
const storageType = config.storageType
if (storageType === 'minio') setupCache().then(() => console.log('Cache set up successfully.'))

const prisma = new PrismaClient()
const {getUser} = require('./util/authFunctions')(prisma)

app.use(express.json())

app.use('/static', express.static('static'))
app.use('/dist', express.static('dist'))
app.get('/dist/tw/index.min.js', (req, res) => {
    res.sendFile(path.resolve('./node_modules/tw-elements/dist/js/index.min.js'))
})
app.use(oauth.namespace, oauth.getRouter({prisma}))

process.on('unhandledRejection', reason => {
    console.error(`Unhandled rejection: ${reason}`)
    console.error(reason.stack)
})

// TODO: implement upload queue

async function saveFile(fileName, buffer) {
    await uploadFile(fileName, buffer)
    if (storageType === 'minio') await addCacheFile(fileName, buffer)
}
async function resolvePlaceholders(text = "", user = {}, image = {}) {
    let newText = text;
    newText = newText.replaceAll('[date]', new Date(image.timestamp).toUTCString().split(' ').slice(0, 4).join(' '))
    newText = newText.replaceAll('[datetime]', new Date(image.timestamp).toUTCString())
    newText = newText.replaceAll('[filesize]', humanReadableBytes(image.size))
    newText = newText.replaceAll('[name]', `${image.fileId}.${image.extension}`)
    if (newText.includes("[dimensions]")) {
        if (image.width === null) {
            let dimensions = sizeOfImage(`${config.production ? config.savePathProd : config.savePathTest}/${image.fileId}.${image.extension}`)
            await prisma.image.update({
                where: {
                    fileId: image.fileId
                },
                data: {
                    width: dimensions.width,
                    height: dimensions.height
                }
            })
        }
        newText = newText.replaceAll('[dimensions]', `${image.width} x ${image.height}`)
    }
    return newText
}
function checkForDomain(req, res, next) {
    if (req.hostname !== config.mainDomain && config.production) return res.redirect(`https://${config.mainDomain}${req.originalUrl}`)
    next()
}

const options = {
    checkForDomain,
    getUser,
    prisma,
    saveFile,
    resolvePlaceholders,
    deleteFile,
    consumeRatelimit,
}

let middlewareCount = 0
let routeCount = 0
let taskCount = 0

let beforeMiddleware = []
let afterMiddleware = []

for (let file of fs.readdirSync('./middleware')) {
    let middleware = require(`./middleware/${file}`)
    if (middleware.type === 0) { // beforeMiddleware
        beforeMiddleware.push(middleware.middleware)
    } else if (middleware.type === 1) {
        afterMiddleware.push(middleware.middleware)
    }
    middlewareCount++
}

for (let middleware of beforeMiddleware) {
    app.use(middleware)
}

for (let file of fs.readdirSync('./routes')) {
    const route = require(`./routes/${file}`)
    const router = route.getRouter(options)

    app.use(route.namespace, router)
    routeCount++
}

for (let middleware of afterMiddleware) {
    app.use(middleware)
}

for (let file of fs.readdirSync('./tasks')) {
    const task = require(`./tasks/${file}`)(prisma)
    nodeSchedule.scheduleJob(task.time, task.task)
    taskCount++
}

console.log(`Loaded ${middlewareCount} middleware functions, ${routeCount} routes and ${taskCount} tasks.`)

app.listen(config.port, () => {
    console.log(`Image server running at port ${config.port}.`)
    prisma.image.aggregate({
        _sum: {
            size: true
        }
    }).then(r => {
        global.totalBytes += parseInt(r._sum.size)
    })
    prisma.image.aggregate({
        _count: {
            size: true
        }
    }).then(r => {
        global.totalFiles += parseInt(r._count.size)
    })
    prisma.user.aggregate({
        _count: {
            id: true
        }
    }).then(r => {
        global.totalUsers += parseInt(r._count.id)
    })
})