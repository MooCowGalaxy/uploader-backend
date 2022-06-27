const {getCookie, createTokenString} = require('./functions');
const discordOauth2 = require("discord-oauth2");
const config = require("../config.json");

const oauth = new discordOauth2({
    clientId: config.discord.clientId,
    clientSecret: config.discord.clientSecret,
    redirectUri: config.production ? config.discord.prodCallbackURL : config.discord.devCallbackURL,
    version: config.discord.version
})

module.exports = (prisma) => {
    async function getUserData(accessToken) {
        try {
            let user = await oauth.getUser(accessToken)
            let tag = `${user.username}#${user.discriminator}`
            let now = Date.now()
            let u = await prisma.user.upsert({
                where: {
                    discordId: BigInt(user.id)
                },
                update: {
                    username: tag,
                    discordTag: tag
                },
                create: {
                    username: tag,
                    discordId: BigInt(user.id),
                    discordTag: tag,
                    apiKey: createTokenString(20),
                    settings: {
                        create: {}
                    },
                    createdAt: now
                },
                include: {
                    settings: true
                }
            })
            if (parseInt(u.createdAt) === now) {
                global.totalUsers++
            }
            return user
        } catch (e) {
            console.error(e)
            console.error(e.stack)
            return null
        }
    }

    async function getUser(req) {
        const cookies = getCookie(req)
        if (!cookies.token) return null
        const token = cookies.token
        let u = await prisma.token.findUnique({
            where: {
                token
            }
        })
        if (u === null) return null
        if (u.expires < Math.floor(Date.now() / 1000)) {
            await prisma.token.delete({where: {token}})
            return null
        }
        if (u.lastUpdated + config.discord.userCacheThreshold < Math.floor(Date.now() / 1000)) {
            let data = await getUserData(u.bearerToken)
            if (!data) {
                await prisma.token.delete({where: {token}})
                return null
            }
            await prisma.token.update({
                where: {
                    id: u.id
                },
                data: {
                    cache: JSON.stringify(data),
                    lastUpdated: Math.floor(Date.now() / 1000)
                }
            })
            u.cache = JSON.stringify(data)
            u.lastUpdated = Math.floor(Date.now() / 1000)
        }
        let cache = JSON.parse(u.cache)
        let userData = await prisma.user.findUnique({
            where: {discordId: u.userId},
            include: {settings: true}
        })
        return {userId: u.userId, data: cache, user: userData}
    }

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
            // console.log(data)
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
