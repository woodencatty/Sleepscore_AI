var brain = require('brain.js');

    var User_Number = 139;

const dbPoolByMySql2Module = require('mysql2/promise').createPool({
    host : "sleepcaredb.cehn5ondbm2b.ap-northeast-2.rds.amazonaws.com",
    user : "sleepcareAdmin",
    password : "nyt00630",
    database : "sleepcareDB"
})

var rf = new RandomForestClassifier({
    n_estimators: 10
});

var traindata=[];

const selectsleepdataByMySql2Module = async () => {
    console.log("MySql2 Module을 이용한 Query")

    const dbConnectionByMySql2Module = await dbPoolByMySql2Module.getConnection(async conn => conn)
    try {
        let [traindata_sleepscore] = await dbConnectionByMySql2Module.query(
                'SELECT temperature,humidity,light,sound,vibartion,posture,movementCount,snoringCount FROM sleep_info WHERE userInfo_id LIKE ? limit 1000',[User_Number]) // 10개만
      //  console.log(traindata_sleepscore);

        //data to data
        traindata = traindata_sleepscore;

         //FileWrite
    /*  fs.writeFile('data.txt', data+'\n', (err) => {
            if (err) throw err;
            console.log('The file has been saved!');
          });
    */
    } catch(selectionError) {
        console.log(selectionError)
    }
    finally {
        dbPoolByMySql2Module.end();
        console.log("done");
    }
}

var testdata = [{"temperature":"36.0","humidity":"34.0","light":1686,"vibartion":"0","posture":4,"movementCount":1,"snoringCount":0}];

const train_test = ()=>{
    try{
        rf.fit(traindata, ["light"], "sound", function(err, predictSleepScore){
        //    console.log(traindata);
          //console.log(JSON.stringify(trees, null, 4));
          var pred = rf.predict(testdata, predictSleepScore);
          console.log(pred);
        });
    }
    catch(error){
        console.log(error);
    }

}

const all_to_do = async ()=>{
    await selectsleepdataByMySql2Module();
   // await console.log(traindata);
    await train_test();
}

all_to_do();
