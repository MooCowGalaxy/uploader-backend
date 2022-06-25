function discordAuth({prisma}) {
    const express = require('express')
    const {renderFile, getCookie, createTokenString} = require('./functions')
    const {getUser, getUserData, generateURL, getBearerToken} = require('./authFunctions')(prisma)

    const router = express.Router()

    function isLoggedIn(user) {
        return user !== null
    }

    router.get('/login', async (req, res) => {
        const user = await getUser(req)
        if (isLoggedIn(user)) res.redirect('/dashboard')
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
        await prisma.token.create({
            data: {
                user: {
                    connect: {
                        discordId: BigInt(userId)
                    }
                },
                token,
                bearerToken: accessToken,
                expires: expiresIn,
                cache: JSON.stringify(userData),
                lastUpdated
            }
        })
        res.cookie('token', token, {expires: new Date(expiresIn * 1000)})
        res.send(await renderFile('callback', {valid: true}))
    })
    router.get('/logout', async (req, res) => {
        const cookies = getCookie(req)
        if (cookies.token) await prisma.token.delete({
            where: {
                token: cookies.token
            }
        })
        res.cookie('token', '')
        res.redirect('/')
    })

    return router
}

module.exports = {
    getRouter: discordAuth,
    namespace: '/auth'
}
