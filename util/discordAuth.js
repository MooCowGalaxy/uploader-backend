const discordOauth2 = require('discord-oauth2')
const express = require('express')
const config = require('../config.json')
const {renderFile, getCookie} = require('./functions')

const router = express.Router()

let pool;
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
const oauth = new discordOauth2({
    clientId: config.discord.clientId,
    clientSecret: config.discord.clientSecret,
    redirectUri: config.production ? config.discord.prodCallbackURL : config.discord.devCallbackURL,
    version: config.discord.version
})
function generateURL() {
    return oauth.generateAuthUrl({
        scope: "identify",
        prompt: "none"
    })
}
async function getBearerToken(code) {
    try {
        return await oauth.tokenRequest({
            code,
            grantType: "authorization_code",
            scope: "identify"
        })
    } catch {
        return null
    }
}
async function getUserData(accessToken) {
    try {
        return await oauth.getUser(accessToken)
    } catch {
        return null
    }
}
function createTokenString() {
    let base62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890".split('')
    let token = ""
    for (let i = 0; i < 21; i++) {
        token = `${token}${base62[Math.floor(Math.random() * base62.length)]}`
    }
    return token
}
router.get('/login', (req, res) => {
    res.redirect(generateURL())
})
router.get('/callback', async (req, res) => {
    const callbackCode = req.query.code
    if (!callbackCode) return res.send(await renderFile('callback', {valid: false, error: 'No callback code provided.'}))
    let tokenData = await getBearerToken(callbackCode)
    if (tokenData === null) return res.send(await renderFile('callback', {valid: false, error: 'Callback code was invalid.'}))
    let accessToken = tokenData.access_token
    let expiresIn = Math.floor(Date.now() / 1000) + tokenData.expires_in
    let userData = await getUserData(accessToken)
    if (userData === null) return res.send(await renderFile('callback', {valid: false, error: 'Failed to fetch user info.'}))
    let lastUpdated = Math.floor(Date.now() / 1000)
    let userId = userData.id
    let token = createTokenString()
    await query(`INSERT INTO tokens (user_id, token, bearer_token, expires, cache, last_updated) VALUES (?, ?, ?, ?, ?, ?)`, [userId, token, accessToken, expiresIn, JSON.stringify(userData), lastUpdated])
    res.cookie('token', token, {expires: new Date(expiresIn * 1000)})
    res.send(await renderFile('callback', {valid: true}))
})
router.get('/logout', async (req, res) => {
    const cookies = getCookie(req)
    if (cookies.token) await query(`DELETE FROM tokens WHERE token = ${escape(cookies.token)}`)
    res.cookie('token', '')
    res.redirect('/')
})

module.exports = (databasePool) => {pool = databasePool; return router;}
