let pool;

module.exports = (pool) => {
    return {
        query(statement, placeholders = []) {
            return new Promise((resolve, reject) => {
                pool.getConnection((err, connection) => {
                    if (err) { reject(err); return }
                    connection.query(statement, placeholders, (err, results) => {
                        connection.release()
                        if (err) { reject(err); return }
                        resolve(results)
                    })
                })
            })
        }
    }
}