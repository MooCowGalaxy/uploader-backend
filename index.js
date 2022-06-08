const express = require('express')
const upload = require('multer')();
const redis = require('redis')
const fs = require('fs')

const config = require('./config.json')

const app = express()
const client = redis.createClient()
client.connect().then()

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
        fs.writeFile(`/mnt/data/images/${fileName}`, file, (err) => {
            if (err) reject(err);
            resolve()
        })
    })
}

function createTokenString(length = 6) {
    let base62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890".split('')
    let token = ""
    for (let i = 0; i < length; i++) {
        token = `${token}${base62[Math.floor(Math.random() * base62.length)]}`
    }
    return token
}

app.post('/api/upload', upload.single('sharex'), async (req, res) => {
    let key = req.header("key")
    let file = req.file;

    if (key !== config.key) return res.json({error: true, message: "Invalid key"})

    if (file.fieldname !== "sharex") return res.json({error: true, message: "Invalid file"})

    let extension = file.originalname.split('.').slice(-1)
    let fileId = createTokenString()
    let fileName = `${fileId}.${extension}`
    await uploadFile(fileName, file.buffer)

    let url = `https://mooi.ng/${fileName}`
    let count = await client.get('image-counter')
    count++;
    let data = {
        id: count,
        fileId,
        extension,
        originalName: file.originalname,
        size: file.size,
        timestamp: Date.now()
    }

    await client.json.set(`image-${fileId}`, '$', data)
    await client.json.set(`image-id-${count}`, '$', data)
    await client.incr('image-counter')

    res.json({error: false, message: "Uploaded!", url: url})
})
app.get('/:id', async (req, res) => {
    let fileName = req.params.id;
    let fileId = fileName.split('.').slice(0, -1).join(".")
    let extension = fileName.split('.').slice(-1)

    let result = await client.json.get(`image-${fileId}`)
    if (result === null) return res.status(404).send("File not found")

    res.header("Access-Control-Allow-Origin", "*")
    res.sendFile(`/mnt/data/images/${fileName}`)
})
app.get('/', async (req, res) => {
    res.send("your mom")
})

app.listen(config.port, () => {
    console.log(`Image server running at port ${config.port}.`)
})