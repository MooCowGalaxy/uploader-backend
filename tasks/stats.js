module.exports = ({prisma}) => {
    return {
        task: () => {
            (async () => {
                await prisma.$queryRaw`INSERT INTO Stats (timestamp, users, bytesUsed, imagesUploaded) VALUES (${Math.round(Date.now() / 1000)}, (SELECT COUNT(*) AS result FROM User), (SELECT SUM(size) AS result FROM Image), (SELECT COUNT(*) AS result FROM Image))`
            })()
        },
        time: '0 * * * *' // cron format
    }
}