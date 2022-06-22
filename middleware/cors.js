module.exports = {
    middleware: (req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*")
        next()
    },
    type: 0
}