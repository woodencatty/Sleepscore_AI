module.exports = require('mysql2/promise').createPool({
    host: "sleepcaredb.cehn5ondbm2b.ap-northeast-2.rds.amazonaws.com",
    user: "sleepcareAdmin",
    password: "nyt00630",
    database: "sleepcareDB"
})