const USER_INFO_TABLE = "user_info"

const dbPoolByMySql2Module = require('mysql2/promise').createPool({
    host : "sleepcaredb.cehn5ondbm2b.ap-northeast-2.rds.amazonaws.com",
    user : "sleepcareAdmin",
    password : "nyt00630",
    database : "sleepcareDB"
})

const selectSangHunByMySql2Module = async () => {
    console.log("MySql2 Module을 이용한 Query")
    const dbConnectionByMySql2Module = await dbPoolByMySql2Module.getConnection(async conn => conn)
    try {
        let [userInfoOfSangHun] = await dbConnectionByMySql2Module.query(
                `SELECT * FROM ${USER_INFO_TABLE}
                WHERE userName LIKE ?`,
                ['이상훈%']
            )
        console.log(userInfoOfSangHun)
        
    } catch(selectionError) {
        console.log(selectionError)
    }
}

selectSangHunByMySql2Module(()=>{
    //connection.release()
}) // <- 2. mysql2
