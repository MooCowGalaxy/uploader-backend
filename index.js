const express = require('express')
const upload = require('multer')
const mysql = require('mysql')
const mimeDB = require('mime-db')
const Minio = require('minio')

const config = require('./config.json')

const app = express()
const minio = new Minio.Client(config.minio)
const pool = mysql.createPool(config.database)

function query(statement) {
    return new Promise((resolve, reject) => {
        pool.getConnection(function (err, connection) {
            if (err) { reject(err); return }
            connection.query(statement, function (err, results) {
                connection.release()
                if (err) { reject(err); return }
                resolve(results)
            })
        })
    })
}
const escape = mysql.escape

function uploadFile(fileName, file) {
    return new Promise(((resolve, reject) => {
        minio.putObject('malimages', fileName, file, function(err) {
            if (err) reject(err)
            resolve()
        })
    }))
}

function getExtension(mimetype) {
    return mimeDB[mimetype].extensions[0]
}

function createTokenString() {
    let base62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890".split('')
    let token = ""
    for (let i = 0; i < 6; i++) {
        token = `${token}${base62[Math.floor(Math.random() * base62.length)]}`
    }
    return token
}

app.post('/api/upload', upload.single('sharex'), async (req, res) => {
    let key = req.header("key")
    let file = req.file;

    if (key !== config.key) return res.json({error: true, message: "Invalid key"})

    if (file.fieldname !== "sharex") return res.json({error: true, message: "Invalid file"})

    let extension = getExtension(file.mimetype)
    let fileId = createTokenString()
    let fileName = `${fileId}.${extension}`
    await uploadFile(fileName, file.buffer)

    let url = `https://i.moocow.dev/${fileName}`

    await query(`INSERT INTO images (fileId, extension, originalName, size, timestamp) VALUES (${fileId}, ${extension}, ${escape(file.originalname)}, ${file.size}, ${Date.now()})`)

    res.json({error: false, message: "Uploaded!", url: url})
})
app.get('/:id', async (req, res) => {
    let fileName = req.params.id;
    let fileId = fileName.split('.').slice(0, -1).join(".")
    let extension = fileName.split('.').slice(-1)

    let results = await query(`SELECT * FROM images WHERE fileId = ${escape(fileId)} AND extension = ${escape(extension)}`)
    if (results.length === 0) return res.status(404).send("File not found")

    res.sendFile(`/mnt/data/i.moocow.dev/${fileName}`)
})
app.get('/', async (req, res) => {
    res.send("your mom")
})

app.listen(config.port, () => {
    console.log(`Image server running at port ${config.port}.`)
})