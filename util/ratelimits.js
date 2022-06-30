const {RateLimiterMemory} = require("rate-limiter-flexible")

const routes = [
    ['/user', [4, 1]], // 4 times per 1 second
    ['/user/regenerate', [10, 60]],
    ['/user/link', [8, 60]],
    ['/user/embed', [10, 60]],
    ['/user/images', [20, 60]],
    ['/user/image/delete', [15, 60]],
    ['/user/domains/create', [3, 600]],
    ['/user/domains/delete', [1, 120]],
    ['/user/domains/domain', [8, 60]],
    ['/domains/self/visibility', [8, 120]],
    ['/upload', [300, 3600]]
]
const ratelimits = {}
for (let route of routes) {
    ratelimits[route[0]] = new RateLimiterMemory({points: route[1][0], duration: route[1][1]})
}

function consumeRatelimit(path, userId) {
    return new Promise((resolve, reject) => {
        if (ratelimits[path] === undefined) resolve()
        ratelimits[path].consume(userId)
            .then(resolve)
            .catch(reject)
    })
}

module.exports = {
    consumeRatelimit
}
