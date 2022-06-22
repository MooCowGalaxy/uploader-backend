module.exports = {
    middleware: (err, req, res, next) => {
        console.error(err.stack)
        res.status(500).send('Internal Server Error')
    },
    type: 1
}