const {getCookie, createTokenString} = require('./functions');
const discordOauth2 = require("discord-oauth2");
const config = require("../config.json");

const oauth = new discordOauth2({
    clientId: config.discord.clientId,
    clientSecret: config.discord.clientSecret,
    redirectUri: config.production ? config.discord.prodCallbackURL : config.discord.devCallbackURL,
    version: config.discord.version
})

module.exports = (pool) => {
    const {query} = require('./database')(pool)

    async function getUserData(accessToken) {
        try {
            return await oauth.getUser(accessToken)
        } catch {
            return null
        }
    }

    async function getUser(req) {
        const cookies = getCookie(req)
        if (!cookies.token) return null
        const token = cookies.token
        let q = await query(`SELECT * FROM tokens WHERE token = ?`, [token])
        if (q.length === 0) return null
        let u = q[0]
        if (u.expires < Math.floor(Date.now() / 1000)) {
            await query(`DELETE FROM tokens WHERE id = ?`, [u.id])
            return null
        }
        if (u.last_updated + config.discord.userCacheThreshold < Math.floor(Date.now() / 1000)) {
            let data = await getUserData(u.bearer_token)
            if (!data) {
                await query(`DELETE FROM tokens WHERE id = ?`, [u.id])
                return null
            }
            await query(`UPDATE tokens SET cache = ?, last_updated = ? WHERE id = ?`, [JSON.stringify(data), Math.floor(Date.now() / 1000), u.id])
            u.cache = JSON.stringify(data)
            u.lastUpdated = Math.floor(Date.now() / 1000)
        }
        let cache = JSON.parse(u.cache)
        let userData;
        let result = await query(`SELECT * FROM users WHERE discord = ?`, [u.user_id])
        if (result.length > 0) {
            userData = result[0]
        } else {
            await query(`INSERT INTO users (username, discord, api_key, tag) VALUES (?, ?, ?, ?)`, [`${cache.username}#${cache.discriminator}`, cache.id, createTokenString(20), `${cache.username}#${cache.discriminator}`])
            userData = (await query(`SELECT * FROM users WHERE discord = ?`, [u.user_id]))[0]
        }
        userData.settings = JSON.parse(userData.settings)
        return {userId: u.user_id, data: cache, user: userData}
    }

    function generateURL() {
        return oauth.generateAuthUrl({
            scope: "identify",
            prompt: "none"
        })
    }

    async function getBearerToken(code) {
        try {
            let data = await oauth.tokenRequest({
                code,
                grantType: "authorization_code",
                scope: "identify"
            })
            // console.log(data)
            return data
        } catch {
            return null
        }
    }
    return {
        getUserData,
        getUser,
        generateURL,
        getBearerToken
    }
}
