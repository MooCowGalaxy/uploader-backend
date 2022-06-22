const {renderFile} = require('../util/functions')

module.exports = {
    middleware: async (req, res, next) => {
        res.status(404).send(await renderFile('notFound'))
    },
    type: 1
}