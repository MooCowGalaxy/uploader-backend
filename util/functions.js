const ejs = require("ejs");
module.exports = {
    renderFile(filename, data = {}) {
        return new Promise((resolve, reject) => {
            filename = `templates/${filename}.ejs`
            ejs.renderFile(filename, data, {}, function (err, str) {
                if (err) { reject(err); return }
                resolve(str)
            })
        })
    },
    humanReadableBytes(bytes = 0) {
        if (bytes >= 1000 * 1000 * 1000 * 1000) {
            return `${Math.round(bytes / (1000 * 1000 * 1000 * 10)) / 100} TB`
        }
        if (bytes >= 1000 * 1000 * 1000) {
            return `${Math.round(bytes / (1000 * 1000 * 10)) / 100} GB`
        }
        if (bytes >= 1000 * 1000) {
            return `${Math.round(bytes / (1000 * 10)) / 100} MB`
        } else if (bytes >= 1000) {
            return `${Math.round(bytes / 10) / 100} KB`
        } else {
            return `${bytes} B`
        }
    },
    getCookie(req) {
        if (req.headers.cookie === undefined) {
            return {}
        }
        const cookie = req.headers.cookie;
        // user=someone; session=QyhYzXhkTZawIb5qSl3KKyPVN
        let cookies = cookie.split('; ');
        let cookieDict = {}
        let current;
        for (let i = 0; i < cookies.length; i++) {
            current = cookies[i]
            cookieDict[current.split('=')[0]] = current.split('=').splice(1).join('=')
        }
        return cookieDict
    }
}