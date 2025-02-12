const ejs = require("ejs")
const config = require('../config.json')

const featureMap = {
    'HEIC_IMAGES': 0
}

function decimalToBinary(dec) {
    return (dec >>> 0).toString(2);
}

function setCharAt(str,index,chr) {
    if (index > str.length-1) return str;
    return str.substring(0,index) + chr + str.substring(index+1);
}

module.exports = {
    featureMap,
    renderFile(filename, data = {}) {
        data.discordInvite = config.discord.invite
        data.production = config.production
        return new Promise((resolve, reject) => {
            filename = `templates/${filename}.ejs`
            ejs.renderFile(filename, data, {}, function (err, str) {
                if (err) { reject(err); return }
                resolve(str)
            })
        })
    },
    humanReadableBytes(bytes = 0) {
        if (typeof bytes === 'bigint') bytes = parseInt(bytes)
        if (isNaN(bytes)) bytes = 0;
        if (bytes >= 1000 * 1000 * 1000 * 1000) {
            return `${Math.round(bytes / (1000 * 1000 * 1000 * 10)) / 100}TB`
        }
        if (bytes >= 1000 * 1000 * 1000) {
            return `${Math.round(bytes / (1000 * 1000 * 10)) / 100}GB`
        }
        if (bytes >= 1000 * 1000) {
            return `${Math.round(bytes / (1000 * 10)) / 100}MB`
        } else if (bytes >= 1000) {
            return `${Math.round(bytes / 10) / 100}KB`
        } else {
            return `${bytes}B`
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
    },
    createTokenString(num = 21) {
        let base62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890".split('')
        let token = ""
        for (let i = 0; i < num; i++) {
            token = `${token}${base62[Math.floor(Math.random() * base62.length)]}`
        }
        return token
    },
    createEmojiString(num = 4) {
        const emojis = require('emojis-list')
        let str = ''
        for (let i = 0; i < num; i++) {
            str = `${str}${emojis[Math.floor(Math.random() * emojis.length)]}`
        }
        return str
    },
    createZWSString(num = 20) {
        const zws = '0123'.split('')
        let str = ''
        for (let i = 0; i < num; i++) {
            str = `${str}${zws[Math.floor(Math.random() * zws.length)]}`
        }
        return `z:${str}`
    },
    decodeZWSString(str) { // z:0123 => ````
        const zws = '\u200B\u200C\u200D\u2060'
        let s = ''
        for (let i = 2; i < str.length; i++) {
            s = `${s}${zws[parseInt(str[i])]}`
        }
        return s
    },
    encodeZWSString(str) { // ```` => z:0123
        const zws = '\u200B\u200C\u200D\u2060'
        let s = ''
        for (let i = 0; i < str.length; i++) {
            s = `${s}${zws.indexOf(str[i])}`
        }
        return `z:${s}`
    },
    isZWSString(str) {
        const zws = '\u200B\u200C\u200D\u2060'
        let incl = true
        for (let i = 0; i < str.length; i++) {
            if (!zws.includes(str[i])) incl = false
        }
        return incl;
    },
    checkFeaturePermission(integer, feature) {
        if (featureMap[feature] === undefined) throw new Error('Feature not found')
        let binary = decimalToBinary(integer)
        while (binary.length < 31) {
            binary = `0${binary}`
        }
        return binary[featureMap[feature]] === '1'
    },
    addFeaturePermission(integer, feature) {
        if (featureMap[feature] === undefined) throw new Error('Feature not found')
        let binary = decimalToBinary(integer)
        while (binary.length < 31) {
            binary = `0${binary}`
        }
        binary = setCharAt(binary, featureMap[feature], '1')
        return parseInt(binary, 2)
    },
    removeFeaturePermission(integer, feature) {
        if (featureMap[feature] === undefined) throw new Error('Feature not found')
        let binary = decimalToBinary(integer)
        while (binary.length < 31) {
            binary = `0${binary}`
        }
        binary = setCharAt(binary, featureMap[feature], '0')
        return parseInt(binary, 2)
    }
}