const express = require("express");
const {renderFile} = require("../util/functions");

const namespace = '/'

function getRouter({checkForDomain, getUser}) {
    const mainRouter = express.Router()

    mainRouter.use(checkForDomain)

    mainRouter.get('/', async (req, res) => {
        res.send(await renderFile('index'))
    })
    mainRouter.get(/^\/dashboard(\/[a-zA-Z0-9\/]*)?$/, async (req, res) => {
        const user = await getUser(req)
        if (!user) return res.redirect('/auth/login')
        res.send(await renderFile('dashboard', {user: user.data}))
    })

    return mainRouter
}

module.exports = {
    getRouter,
    namespace
}