const express = require('express')
const oauth = require('./util/discordAuth')
const {renderFile, humanReadableBytes} = require('./util/functions')
const {setupCache, addCacheFile, getCacheFile} = require('./util/cacher')
const {uploadFile, downloadFile, deleteFile} = require('./util/storage')
const sizeOfImage = require('image-size')
const path = require('path')
const nodeSchedule = require('node-schedule')
const mysql = require('mysql2')
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

const pool = mysql.createPool(config.database)

const {query} = require('./util/database')(pool)
const {getUser} = require('./util/authFunctions')(pool)

app.use(express.json())

app.use('/static', express.static('static'))
app.use('/dist', express.static('dist'))
app.get('/dist/tw/index.min.js', (req, res) => {
    res.sendFile(path.resolve('./node_modules/tw-elements/dist/js/index.min.js'))
})
app.use('/auth', oauth(pool))

process.on('unhandledRejection', reason => {
    console.error(`Unhandled rejection: ${reason}`)
    console.error(reason.stack)
})

const uploadQueue = []

// TODO: implement upload queue

async function saveFile(fileName, buffer) {
    await uploadFile(fileName, buffer)
    if (storageType === 'minio') await addCacheFile(fileName, buffer)
}
async function getFile(fileName) {
    if (storageType === 'minio') {
        let buffer = await getCacheFile(fileName)
        if (buffer === null) {
            buffer = await downloadFile(fileName)
            if (buffer === null) return null;
            await addCacheFile(fileName, buffer)
            return buffer
        } else return buffer
    } else {
        return await downloadFile(fileName)
    }
}
async function resolvePlaceholders(text = "", user = {}, image = {}) {
    let newText = text;
    newText = newText.replaceAll('[date]', new Date(image.timestamp).toUTCString().split(' ').slice(0, 4).join(' '))
    newText = newText.replaceAll('[datetime]', new Date(image.timestamp).toUTCString())
    newText = newText.replaceAll('[filesize]', humanReadableBytes(image.size))
    newText = newText.replaceAll('[name]', `${image.fileId}.${image.extension}`)
    if (newText.includes("[dimensions]")) {
        if (image.width === null) {
            let dimensions = sizeOfImage(`${config.savePath}/${image.fileId}.${image.extension}`)
            await query(`UPDATE images SET width = ?, height = ? WHERE fileId = ?`, [dimensions.width, dimensions.height, image.fileId])
        }
        newText = newText.replaceAll('[dimensions]', `${image.width} x ${image.height}`)
    }
    return newText
}
function checkForDomain(req, res, next) {
    if (req.hostname !== 'mooi.ng' && config.production) return res.redirect(`https://mooi.ng${req.originalUrl}`)
    next()
}

const options = {
    checkForDomain,
    getUser,
    query,
    saveFile,
    resolvePlaceholders,
    deleteFile,
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
    const task = require(`./tasks/${file}`)(query)
    nodeSchedule.scheduleJob(task.time, task.task)
    taskCount++
}

console.log(`Loaded ${middlewareCount} middleware functions, ${routeCount} routes and ${taskCount} tasks.`)

app.listen(config.port, () => {
    console.log(`Image server running at port ${config.port}.`)
    query(`SELECT SUM(size) AS total FROM images`).then(r => {
        global.totalBytes += parseInt(r[0].total)
    })
    query(`SELECT COUNT(*) AS total FROM images`).then(r => {
        global.totalFiles += parseInt(r[0].total)
    })
    query(`SELECT COUNT(*) AS total FROM users`).then(r => {
        global.totalUsers += parseInt(r[0].total)
    })
})