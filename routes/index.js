const express = require("express");
const {renderFile} = require("../util/functions");
const config = require('../config.json')

const namespace = '/'

function getRouter({query, checkForDomain, getUser}) {
    const mainRouter = express.Router()

    mainRouter.use(checkForDomain)

    mainRouter.get('/', async (req, res) => {
        res.send(await renderFile('index'))
    })
    mainRouter.get(/^\/dashboard(\/[a-zA-Z0-9\/]*)?$/, async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.redirect('/auth/login')
        if (!config.whitelist) {
            res.send(await renderFile('dashboard', {user: user.data}))
        } else {
            let result = await query(`SELECT * FROM whitelist WHERE id = ?`, [user.userId])
            if (result.length === 0) res.send(await renderFile('whitelistOnly', {user: user.data}))
            else res.send(await renderFile('dashboard', {user: user.data}))
        }
    })

    return mainRouter
}

module.exports = {
    getRouter,
    namespace
}