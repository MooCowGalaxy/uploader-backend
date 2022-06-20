module.exports = (query) => {
    return {
        task: () => {
            (async () => {
                await query(`INSERT INTO stats (timestamp, users, bytes_used, images_uploaded) VALUES (?, (SELECT COUNT(*) AS result FROM users), (SELECT SUM(size) AS result FROM images), (SELECT COUNT(*) AS result FROM images))`,
                    [Math.round(Date.now() / 1000)])
            })()
        },
        time: '0 * * * *' // cron format
    }
}