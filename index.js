const express = require('express')
const sizeOfImage = require('image-size')
const path = require('path')
const upload = require('multer')()
const mysql = require('mysql2')
const ejs = require('ejs')
const fs = require('fs')

const config = require('./config.json')

const app = express()

app.use(express.json())
app.use('/static', express.static(path.resolve('./static')))
app.use('/dist', express.static(path.resolve('./dist')))

const userCache = {} // {userId: {data: RowResult, lastUpdated: Date.now()}}

const pool = mysql.createPool(config.database)

function query(statement, placeholders = []) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) { reject(err); return }
            connection.query(statement, placeholders, (err, results) => {
                connection.release()
                if (err) { reject(err); return }
                resolve(results)
            })
        })
    })
}

/* function uploadFile(fileName, file) {
    return new Promise((resolve, reject) => {
        minio.putObject(config.minioBucket, fileName, file, function(err) {
            if (err) reject(err)
            resolve()
        })
    })
} */
function uploadFile(fileName, file) {
    return new Promise((resolve, reject) => {
        fs.writeFile(`${config.savePath}/${fileName}`, file, (err) => {
            if (err) reject(err);
            resolve()
        })
    })
}
function renderFile(filename, data = {}) {
    return new Promise((resolve, reject) => {
        filename = `templates/${filename}.ejs`
        ejs.renderFile(filename, data, {}, function (err, str) {
            if (err) { reject(err); return }
            resolve(str)
        })
    })
}

function humanReadableBytes(bytes = 0) {
    if (bytes >= 1000 * 1000 * 1000) {
        return `${Math.round(bytes / (1000 * 1000 * 10)) / 100} GB`
    }
    if (bytes >= 1000 * 1000) {
        return `${Math.round(bytes / (1000 * 10)) / 100} MB`
    } else if (bytes >= 1000) {
        return `${Math.round(bytes / 10) / 100} KB`
    } else {
        return `${bytes} B`
    }
}

function createTokenString(length = 6) {
    let base62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890".split('')
    let token = ""
    for (let i = 0; i < length; i++) {
        token = `${token}${base62[Math.floor(Math.random() * base62.length)]}`
    }
    return token
}
async function resolvePlaceholders(text = "", user = {}, image = {}) {
    let newText = text
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

app.get('/api/embed', async (req, res) => {
    res.send({type: 'link', version: '1.0'})
})
app.post('/api/upload', upload.single('sharex'), async (req, res) => {
    let key = req.header("key")
    let file = req.file;

    let results = await query('SELECT * FROM users WHERE api_key = ?', [key])
    if (results.length === 0) return res.json({error: true, message: "Invalid key"})
    let user = results[0]
    user.settings = JSON.parse(user.settings)
    userCache[user.id] = {
        data: user,
        lastUpdated: Date.now()
    }

    if (file.fieldname !== "sharex") return res.json({error: true, message: "Invalid file"})

    let extension = file.originalname.split('.').slice(-1)
    let fileId = createTokenString(7)
    let fileName = `${fileId}.${extension}`
    await uploadFile(fileName, file.buffer)

    let url = `https://${user.domain}/${fileName}`
    let dimensions = ['png', 'jpg', 'gif'].includes(extension[0]) ? sizeOfImage(file.buffer) : {width: 0, height: 0}
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
        `INSERT INTO images (fileId, originalName, size, timestamp, extension, ownerId, width, height) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.fileId, data.originalName, data.size, data.timestamp, data.extension, data.ownerId, data.width, data.height]
    )

    res.json({error: false, message: "Uploaded!", url: url})
})
app.get('/:id', async (req, res) => {
    let fileName = req.params.id;
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

    let user = userCache[result.ownerId]
    if (!user || user.lastUpdated < (Date.now() - 1000 * 60 * 5)) {
        let results = await query(`SELECT * FROM users WHERE id = ?`, [result.ownerId])
        if (results.length === 0) return res.status(404).send(await renderFile('notFound'))
        user = results[0]
        user.settings = JSON.parse(user.settings)
        userCache[user.id] = {
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
app.get('/raw/:id', async (req, res) => {
    let fileName = req.params.id
    let fileId = fileName.split('.').slice(0, -1).join(".")

    let results = await query(`SELECT * FROM images WHERE fileId = ?`, [fileId])
    if (results.length === 0) return res.status(404).send(await renderFile('notFound'))

    res.header("Access-Control-Allow-Origin", "*")
    try {
        res.sendFile(path.resolve(`${config.savePath}/${fileName}`))
    } catch (e) {
        res.send(await renderFile('notFound'))
    }
})
app.get('/', async (req, res) => {
    res.send("your mom")
})

app.listen(config.port, () => {
    console.log(`Image server running at port ${config.port}.`)
})