const objectStorage = require('@relaycorp/object-storage')
const config = require('../config.json')
const fs = require('fs')

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
            await fs.promises.writeFile(`${config.savePath}/${fileName}`, buffer)
        },
        async downloadFile(fileName) {
            try {
                return await fs.promises.readFile(fileName)
            } catch {
                return null
            }
        },
        async deleteFile(fileName) {
            return await fs.promises.rm(`${config.savePath}/${fileName}`)
        }
    }
}