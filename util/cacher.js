const fs = require('fs')
const config = require('../config.json')

const fileMap = {} // {fileName: {created: timestamp, size: bytes}}
const deleteAfter = 1000 * 60 * 60 * 24 // 1 day
const maxCacheSize = 1000 * 1000 * 1000 * 25 // GB

function clearCache() {
    return new Promise((resolve, reject) => {
        fs.rm(config.cachePath, {recursive: true}, (err) => {
            for (let key of Object.keys(fileMap)) delete fileMap[key]
            fs.mkdir(config.cachePath, (err) => {
                if (err) reject(err);
                resolve()
            })
        })
    })
}
function getAllCachedFiles() {
    return new Promise((resolve, reject) => {
        fs.readdir(`${config.cachePath}`, (err, data) => {
            if (err) reject(err);
            resolve(data)
        })
    })
}
function createInterval() {
    return setInterval(() => {
        (async () => {
            for (let file of await getAllCachedFiles()) {
                if (fileMap[file] === undefined) await deleteCacheFile(file)
            }
            let files = await getAllCachedFiles()
            let totalBytes = 0
            let sortList = []
            for (const [key, value] of Object.entries(fileMap)) {
                if (!files.includes(key)) {
                    delete fileMap[key]
                    continue
                } else if (Date.now() - value.created > deleteAfter) {
                    await deleteCacheFile(key)
                    continue
                }
                totalBytes += value.size
                sortList.push({file: key, size: value.size, created: value.created})
            }
            if (totalBytes > maxCacheSize) {
                sortList.sort((a, b) => {
                    return a.created - b.created
                })
                while (totalBytes > maxCacheSize) {
                    let item = sortList.shift()
                    await deleteCacheFile(item.file)
                    totalBytes -= item.size
                }
            }
        })()
    }, 1000 * 60 * 5) // every 5 minutes
}
async function setupCache() {
    await clearCache()
    createInterval()
}
function addCacheFile(fileName, buffer) {
    return new Promise((resolve, reject) => {
        if (fileMap[fileName] !== undefined) return resolve();
        fs.writeFile(`${config.cachePath}/${fileName}`, buffer, (err) => {
            if (err) reject(err);
            fileMap[fileName] = {created: Date.now(), size: buffer.byteLength}
            resolve()
        })
    })
}
function getCacheFile(fileName) {
    return new Promise((resolve, reject) => {
        if (fileMap[fileName] === undefined) return resolve(null);
        fs.readFile(`${config.cachePath}/${fileName}`, (err, data) => {
            if (err) reject(err);
            resolve(data)
        })
    })
}
function deleteCacheFile(fileName) {
    return new Promise((resolve, reject) => {
        if (fileMap[fileName] === undefined) return resolve();
        fs.rm(`${config.cachePath}/${fileName}`, (err, data) => {
            if (err) reject(err);
            resolve(data)
        })
    })
}

module.exports = {
    setupCache,
    addCacheFile,
    getCacheFile,
    deleteCacheFile
}
