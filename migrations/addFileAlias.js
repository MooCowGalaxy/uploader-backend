const mysql = require('mysql2')
const config = require('../config.json')

const pool = mysql.createPool(config.database)
const {query} = require('../util/database')(pool)

async function main() {
    let results = await query(`SELECT * FROM images WHERE alias IS NULL`)

    for (let result of results) {
        await query(`UPDATE images SET alias = ? WHERE id = ?`, [result.fileId, result.id])
    }
    console.log(`Migrated ${results.length} rows.`)
}
main().then(() => process.exit(0))