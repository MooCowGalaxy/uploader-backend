function discordAuth(pool) {
    const express = require('express')
    const {renderFile, getCookie, createTokenString} = require('./functions')
    const {getUser, getUserData, generateURL, getBearerToken} = require('./authFunctions')(pool)

    const router = express.Router()

    const {query} = require('./database')(pool)

    router.get('/login', async (req, res) => {
        const user = await getUser(req)
        if (user !== null) res.redirect('/dashboard')
        else res.redirect(generateURL())
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
        let token = createTokenString(64)
        await query(`INSERT INTO tokens (user_id, token, bearer_token, expires, cache, last_updated) VALUES (?, ?, ?, ?, ?, ?)`, [userId, token, accessToken, expiresIn, JSON.stringify(userData), lastUpdated])
        res.cookie('token', token, {expires: new Date(expiresIn * 1000)})
        res.send(await renderFile('callback', {valid: true}))
    })
    router.get('/logout', async (req, res) => {
        const cookies = getCookie(req)
        if (cookies.token) await query(`DELETE FROM tokens WHERE token = ?`, [cookies.token])
        res.cookie('token', '')
        res.redirect('/')
    })

    return router
}

module.exports = discordAuth
