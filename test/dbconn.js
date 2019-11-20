var User_Number = 139;
const fs = require('fs');

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
        let [traindata_sleepscore] = await dbConnectionByMySql2Module.query(
                'SELECT temperature,humidity,light,sound,vibartion,posture,movementCount,snoringCount FROM sleep_info WHERE userInfo_id LIKE ?',[User_Number]) // 10개만
        console.log(traindata_sleepscore);

        //FileWrite
        const data = JSON.stringify(traindata_sleepscore);
        fs.writeFile('data.txt', data+'\n', (err) => {
            if (err) throw err;
            console.log('The file has been saved!');
          });

    } catch(selectionError) {
        console.log(selectionError)
    }
    finally {
        dbPoolByMySql2Module.end();
        console.log("done");
    }
}

selectSangHunByMySql2Module();