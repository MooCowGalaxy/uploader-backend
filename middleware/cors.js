const config = require('../config.json')

module.exports = {
    middleware: (req, res, next) => {
        res.header("Access-Control-Allow-Origin", config.production ? "*" : 'http://localhost:3000')
        res.header("Access-Control-Allow-Credentials", "true")
        res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT")
        res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers")
        next()
    },
    type: 0
}