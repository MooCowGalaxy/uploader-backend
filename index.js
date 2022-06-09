const express = require('express')
const sizeOfImage = require('image-size')
const path = require('path')
const upload = require('multer')();
const redis = require('redis')
const mysql = require('mysql2')
const ejs = require('ejs')
const fs = require('fs')

const config = require('./config.json')

const app = express()

app.use(express.json())
app.use('/static', express.static('static'))
app.use('/dist', express.static('dist'))

const client = redis.createClient()
client.connect().then()

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
    return new Promise(((resolve, reject) => {
        minio.putObject(config.minioBucket, fileName, file, function(err) {
            if (err) reject(err)
            resolve()
        })
    }))
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
        if (!image.dimensions) {
            image.dimensions = sizeOfImage(`${config.savePath}/${image.fileId}.${image.extension}`)
            await client.json.set(`image-${image.fileId}`, '$', image)
            await client.json.set(`image-id-${image.id}`, '$', image)
        }
        newText = newText.replaceAll('[dimensions]', `${image.dimensions.width} x ${image.dimensions.height}`)
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
    let count = await client.get('image-counter')
    count++;
    let data = {
        id: count,
        fileId,
        extension,
        originalName: file.originalname,
        size: file.size,
        timestamp: Date.now(),
        viewCount: 0,
        ownerId: user.id,
        dimensions: ['png', 'jpg', 'gif'].includes(extension[0]) ? sizeOfImage(file.buffer) : {width: 0, height: 0}
    }

    await client.json.set(`image-${fileId}`, '$', data)
    await client.json.set(`image-id-${count}`, '$', data)
    await client.incr('image-counter')

    res.json({error: false, message: "Uploaded!", url: url})
})
app.get('/:id', async (req, res) => {
    let fileName = req.params.id;
    let fileId = fileName.split('.').slice(0, -1).join(".")

    let result = await client.json.get(`image-${fileId}`)
    if (result === null) return res.status(404).send(await renderFile('notFound'))
    if (!(['png', 'jpg', 'gif'].includes(`${result.extension}`))) {
        return res.sendFile(path.resolve(`${config.savePath}/${fileName}`))
    }
    if (!result.viewCount) result.viewCount = 0
    result.viewCount++
    if (!result.dimensions) {
        result.dimensions = sizeOfImage(`${config.savePath}/${result.fileId}.${result.extension}`)
    }

    await client.json.set(`image-${fileId}`, '$', result)
    await client.json.set(`image-${result.id}`, '$', result)

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
    let embedSettings = {}
    for (let entry of Object.entries(user.settings.embed ? user.settings.embed : {})) {
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

    let result = await client.json.get(`image-${fileId}`)
    if (result === null) return res.status(404).send(await renderFile('notFound'))

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