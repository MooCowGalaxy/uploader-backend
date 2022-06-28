const checkNS = require('../util/checkCFPending')

module.exports = ({cf, prisma}) => {
    return {
        task: () => {
            checkNS({cf, prisma}).then()
        },
        time: '0 * * * *'
    }
}