module.exports = (prisma) => {
    return {
        task: () => {
            (async () => {
                await prisma.$queryRaw`INSERT INTO stats (timestamp, users, bytesUsed, imagesUploaded) VALUES (${Math.round(Date.now() / 1000)}, (SELECT COUNT(*) AS result FROM user), (SELECT SUM(size) AS result FROM image), (SELECT COUNT(*) AS result FROM image))`
            })()
        },
        time: '0 * * * *' // cron format
    }
}