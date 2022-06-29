const objectStorage = require('@relaycorp/object-storage')
const config = require('../config.json')
const arrayBufferToBuffer = require('arraybuffer-to-buffer')
const fs = require('fs')
let fetch;
import('node-fetch').then(mod => fetch = mod.default);

if (config.storageType === 'minio') {
    const client = new objectStorage.initObjectStoreClient('minio', config.storage.endpoint, config.storage.accessKey, config.storage.secretKey, true)

    module.exports = {
        async uploadFile(fileName, buffer) {
            await client.putObject({
                body: buffer,
                metadata: {}
            }, fileName, config.storage.bucket)
        },
        async downloadFile(fileName) {
            let start = Date.now()
            let object = await client.getObject(fileName, config.storage.bucket)
            if (object === null) return null
            console.log(`Took ${Date.now() - start}ms to download ${object.body.byteLength} bytes.`)
            return object.body
        },
        async deleteFile(fileName) {
            await client.deleteObject(fileName, config.storage.bucket)
        }
    }
} else if (config.storageType === 'local') {
    module.exports = {
        async uploadFile(fileName, buffer) {
            await fs.promises.writeFile(`${config.production ? config.savePathProd : config.savePathTest}/${fileName}`, buffer)
        },
        async downloadFile(fileName) {
            try {
                return await fs.promises.readFile(fileName)
            } catch {
                return null
            }
        },
        async deleteFile(fileName) {
            return await fs.promises.rm(`${config.production ? config.savePathProd : config.savePathTest}/${fileName}`)
        }
    }
} else if (config.storageType === 'bunny') {
    module.exports = {
        async uploadFile(fileName, buffer) {
            const options = {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/octet-stream',
                    AccessKey: config.storage.bunny.apiKey
                },
                body: buffer
            }
            const res = await fetch(`https://la.storage.bunnycdn.com/${config.storage.bunny.zoneName}/${fileName}`, options)
            if (res.status !== 201) throw res;
            return {res, url: `https://cdn.${config.mainDomain}/${fileName}`}
        },
        async downloadFile(fileName) {
            const res = await fetch(`https://cdn.${config.mainDomain}/${fileName}`)
            const arrayBuffer = await res.arrayBuffer()
            return arrayBufferToBuffer(arrayBuffer)
        },
        async deleteFile(fileName) {
            const options = {
                method: 'DELETE',
                headers: {
                    AccessKey: config.storage.bunny.apiKey
                }
            }
            const res = await fetch(`https://la.storage.bunnycdn.com/${config.storage.bunny.zoneName}/${fileName}`, options)
            if (res.status !== 200) throw res;
        }
    }
}