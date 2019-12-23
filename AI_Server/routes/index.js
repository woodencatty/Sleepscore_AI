var express = require('express');
var router = express.Router();

//----------------------------------------------------------------------------------------------------------------값 정의
var brain = require("brain.js");
const fs = require('fs');

`use strict`
const databasePool = require('./databasePool.js')

// 사용할 테이블 명들, 그냥 리터럴 스트링으로 써도 무관
const SLEEP_INFO_TABLE = "sleep_info"
const USER_ANALYZED_SLEEP_INFO_TABLE = "user_analyzed_sleep_info"

// 테이블 내 속성 명들
// 키 속성
const USER_INFO_ID_COLUMN = "userInfo_id"
const ANALYSIS_DATE_COLUMN = "analysisDate"
const QUERY_DATE_COLUMN = "queryDate"

// 조회 값 속성
const TEMPERATURE_COLUMN = "temperature"
const HUMIDITY_COLUMN = "humidity"
const LIGHT_COLUMN = "light"
const SOUND_COLUMN = "sound"
const MOVEMENT_COUNT_COLUMN = "movementCount"
const SNORING_COUNT_COLUMN = "snoringCount"
const SLEEP_SCORE_COLUMN = "sleepScore"

/**
 * @param userInfo_id : Number -- DB 측에서 지정한 사용자 고유정보 번호
 * @param dateFrom : String | Date -- 조회 시작 일자
 * @param dateTo : String | Date -- 조회 종료 일자
 */

//----------------------------------------------------------------------------------------------------------------수면데이터 DB함수
const fetchSleepData_move = async (userInfoId) => {
  const databaseConnection = await databasePool.getConnection(async conn => conn)
  try {
    var [selectionResult] = await databaseConnection.query(
      `SELECT ${TEMPERATURE_COLUMN}, ${HUMIDITY_COLUMN}, ${LIGHT_COLUMN}, ${SOUND_COLUMN}, ${MOVEMENT_COUNT_COLUMN}, ${SNORING_COUNT_COLUMN}, ${SLEEP_SCORE_COLUMN}
          FROM ${USER_ANALYZED_SLEEP_INFO_TABLE} A
          INNER JOIN ${SLEEP_INFO_TABLE} B
          ON A.${ANALYSIS_DATE_COLUMN} = B.${QUERY_DATE_COLUMN}
          WHERE A.${USER_INFO_ID_COLUMN} = ? AND A.${ANALYSIS_DATE_COLUMN} limit 10000`,
      [userInfoId]
    )
    return selectionResult.map((eachEntry) => {
      return {
        input: {
          temp: parseFloat(eachEntry[TEMPERATURE_COLUMN])/100, humi: parseFloat(eachEntry[HUMIDITY_COLUMN])/100}, output: { move: eachEntry[MOVEMENT_COUNT_COLUMN]/100 }
      }
    })
  } catch (anyKindOfAsyncProcessException) {
    console.error(anyKindOfAsyncProcessException)
    databaseConnection.rollback()
    databaseConnection.release()
    return null
  } finally {
    databaseConnection.release()
    console.log("done");
  }
}

const fetchSleepData_snore = async (userInfoId) => {
  const databaseConnection = await databasePool.getConnection(async conn => conn)
  try {
    var [selectionResult] = await databaseConnection.query(
      `SELECT ${TEMPERATURE_COLUMN}, ${HUMIDITY_COLUMN}, ${LIGHT_COLUMN}, ${SOUND_COLUMN}, ${MOVEMENT_COUNT_COLUMN}, ${SNORING_COUNT_COLUMN}, ${SLEEP_SCORE_COLUMN}
          FROM ${USER_ANALYZED_SLEEP_INFO_TABLE} A
          INNER JOIN ${SLEEP_INFO_TABLE} B
          ON A.${ANALYSIS_DATE_COLUMN} = B.${QUERY_DATE_COLUMN}
          WHERE A.${USER_INFO_ID_COLUMN} = ? AND A.${ANALYSIS_DATE_COLUMN} limit 10000`,
      [userInfoId]
    )
    return selectionResult.map((eachEntry) => {
      return {
        input: {
          temp: parseFloat(eachEntry[TEMPERATURE_COLUMN])/100, humi: parseFloat(eachEntry[HUMIDITY_COLUMN])/100}, output: { snore: eachEntry[SNORING_COUNT_COLUMN]/100 }
      }
    })
  } catch (anyKindOfAsyncProcessException) {
    console.error(anyKindOfAsyncProcessException)
    databaseConnection.rollback()
    databaseConnection.release()
    return null
  } finally {
    databaseConnection.release()
    console.log("done");
  }
}



//----------------------------------------------------------------------------------------------------------------웹페이지
/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'Express'
  });

});



//----------------------------------------------------------------------------------------------------------------신경망학습RESTAPI
router.get('/ai/train/:user_id', function (req, res, next) {
  console.log("train user_id = " + req.params.user_id)

  var Train_net_move = new brain.NeuralNetwork();
  var Train_net_snore = new brain.NeuralNetwork();

  var traindata_move = [];
  var traindata_snore = [];
  var User_Number = req.params.user_id; //유저번호

  //----------------------------------------------------------------------------------------------------------------학습데이터 추출함수(뒤척임)
  const getSleepDB_move = async (userid) => {
    //Date1 ~ Date 2 Data
    let sleepData_move = await fetchSleepData_move(userid)
    traindata_move = sleepData_move;
    console.log("DB Done(Move)");
  }

    //----------------------------------------------------------------------------------------------------------------학습데이터 추출함수(코골이)
    const getSleepDB_snore = async (userid) => {
      //Date1 ~ Date 2 Data
      let sleepData_snore = await fetchSleepData_snore(userid)
      traindata_snore = sleepData_snore;
      console.log("DB DONE(snore)");
    }

  //----------------------------------------------------------------------------------------------------------------학습메인함수
  const trainSleepMove = async () => {
    console.log("StartTrain");
    await Train_net_move.train(traindata_move);
    //----------------------------------------------------------------------------------------------------------------학습내용 저장
    await fs.writeFile("trainfile/" + User_Number + "_move.json", JSON.stringify(Train_net_move), function (err) {
      if (err)
        return console.log(err);
      console.log("The train file was saved");
    });
  }
  const trainSleepSnore = async () => {
    console.log("StartTrain");
    await Train_net_snore.train(traindata_snore);
    //----------------------------------------------------------------------------------------------------------------학습내용 저장
    await fs.writeFile("trainfile/" + User_Number + "_snore.json", JSON.stringify(Train_net_snore), function (err) {
      if (err)
        return console.log(err);
      console.log("The train file was saved");
    });
  }
  const all_to_do = async () => {
    await getSleepDB_move(User_Number);
    await getSleepDB_snore(User_Number);
    await trainSleepMove();
    await trainSleepSnore();
    return "done";
  }
  all_to_do().then(function (result) {
    console.log(result);
    res.render('SleepAI_Train', {
      title: req.params.user_id,
      SleepData_move: JSON.stringify(traindata_move),
      SleepData_snore: JSON.stringify(traindata_snore)
    });
  })

});


//----------------------------------------------------------------------------------------------------------------신경망예측RESTAPI
router.get('/ai/test/:user_id', function (req, res, next) {

  var Test_net_move = new brain.NeuralNetwork();
  var Test_net_snore = new brain.NeuralNetwork();

  var SleepMoveResult;
  var SleepSnoreResult;

  var User_Number = req.params.user_id;
  var testData = {temp : req.headers.temp/100, humi : req.headers.humi/100, snore : req.headers.snore/100, move : req.headers.move/100}

  const readTrainedFile_move = () => {
    try {
      var obj = JSON.parse(fs.readFileSync("trainfile/" + User_Number + "_move.json", 'utf8'));
      Test_net_move.fromJSON(obj);
    }
    catch (error) {
      console.log(error);
    }
  }
  const readTrainedFile_snore = () => {
    try {
      var obj = JSON.parse(fs.readFileSync("trainfile/" + User_Number + "_snore.json", 'utf8'));
      Test_net_snore.fromJSON(obj);
    }
    catch (error) {
      console.log(error);
    }
  }
  const getSleepMoveResult = () => {
    console.log("test user_id = " + User_Number);
    console.log(testData);
    SleepMoveResult = Test_net_move.run(testData);   // Data
  }
  const getSleepSnoreResult = () => {
    console.log("test user_id = " + User_Number);
    console.log(testData);
    SleepSnoreResult = Test_net_snore.run(testData);   // Data
  }
  const all_to_do = async () => {
    await readTrainedFile_move();
    await readTrainedFile_snore();
    await getSleepMoveResult();
    await getSleepSnoreResult();
    return "done";
  }
  all_to_do().then(function (result) {
    console.log(result);
    res.render('SleepAI_Test', {
      title: User_Number,
      SleepData: JSON.stringify(testData),
      SleepMove: JSON.stringify(SleepMoveResult),
      SleepSnore: JSON.stringify(SleepSnoreResult),
    });
  })

});



//----------------------------------------------------------------------------------------------------------------기계식학습RESTAPI
router.get('/stat/train/:user_id', function (req, res, next) {
  console.log("train user_id = " + req.params.user_id)

  var traindata_move = [];
  var traindata_snore = [];
  var User_Number = req.params.user_id; //유저번호

  //----------------------------------------------------------------------------------------------------------------학습데이터 추출함수(뒤척임)
  const getSleepDB_move = async (userid) => {
    //Date1 ~ Date 2 Data
    let sleepData_move = await fetchSleepData_move(userid)
    traindata_move = sleepData_move;
    console.log("DB Done(Move)");
  }

    //----------------------------------------------------------------------------------------------------------------학습데이터 추출함수(코골이)
    const getSleepDB_snore = async (userid) => {
      //Date1 ~ Date 2 Data
      let sleepData_snore = await fetchSleepData_snore(userid)
      traindata_snore = sleepData_snore;
      console.log("DB DONE(snore)");
    }

  //----------------------------------------------------------------------------------------------------------------학습메인함수
  const trainSleep = async () => {
    var total_temp = 0.0;
    var total_humi = 0.0;
    var total_move = 0.0;
    var total_snore = 0.0;
    var avg_temp, avg_humi, avg_move,avg_snore;
    var count = 0;

  await traindata_move.forEach((item, index, array)=> {
      total_temp += item.input.temp;
      total_humi += item.input.humi;
      total_move += item.output.move;
      count ++;
  });

  await traindata_snore.forEach((item, index, array)=> {
    total_snore += item.output.snore;
});

    avg_temp = total_temp / count;
    avg_humi = total_humi / count;
    avg_move = total_move / count;
    avg_snore = total_snore / count;

    console.log(avg_move);
    console.log(avg_snore);

    //----------------------------------------------------------------------------------------------------------------학습내용 저장
    await fs.writeFile("statfile/" + User_Number + ".json",'{"avg_temp" :'+ parseInt(avg_temp*100)+', "avg_humi" :'+  parseInt(avg_humi*100)+', "avg_move" : '+avg_move*100+', "avg_snore" : '+avg_snore*100+'}', function (err) {
      if (err)
        return console.log(err);
      console.log("The train file was saved");
    });
  }


  const all_to_do = async () => {
    await getSleepDB_move(User_Number);
    await getSleepDB_snore(User_Number);

    await trainSleep();
    return "done";
  }

  all_to_do().then(function (result) {
    console.log(result);
    res.render('SleepAI_Train', {
      title: req.params.user_id,
      SleepData_move: JSON.stringify(traindata_move),
      SleepData_snore: JSON.stringify(traindata_snore)
    });
  })

});


//----------------------------------------------------------------------------------------------------------------기계식예측RESTAPI
router.get('/stat/test/:user_id', function (req, res, next) {
  
  var SleepMoveResult;
  var SleepSnoreResult;
  var trainfile
  var User_Number = req.params.user_id;
  var testData = {temp : req.headers.temp, humi : req.headers.humi, snore : req.headers.snore, move : req.headers.move}

  const readTrainedFile = () => {
    try {
    trainfile = JSON.parse(fs.readFileSync("statfile/" + User_Number + ".json", 'utf8'));
    }
    catch (error) {
      console.log(error);
    }
  }

  const getSleepMoveResult = () => {
    if(trainfile.avg_move < testData.move){
      if(trainfile.avg_temp < testData.temp){
        SleepMoveResult = {result : "온도가 높아 뒤척임이 많음", Suggest : "온도를"+trainfile.avg_temp+"이하로 낮출 것"} 
      }else{
        SleepMoveResult = {result : "온도가 높진 않지만 뒤척임이 많음", Suggest : "기타 수면요소 문제"} 
      }
    }else{
      SleepMoveResult = {result : "문제 없음. 평균 뒤척임", Suggest : "현재상태 유지"} 
    }
  }

  const getSleepSnoreResult = () => {
    if(trainfile.avg_snore < testData.snore){
      if(trainfile.avg_humi > testData.humi){
        SleepSnoreResult = {result : "습도가 낮아 코골이가 많음", Suggest : "습도를"+trainfile.avg_humi+"이상으로 높일 것"} 
      }else{
        SleepSnoreResult = {result : "습도가 낮진 않지만 코골이가 많음", Suggest : "기타 수면요소 문제"} 
      }
    }else{
      SleepSnoreResult = {result : "문제 없음. 평균 코골이", Suggest : "현재상태 유지"} 
    }
  }

  const all_to_do = async () => {
    await readTrainedFile();

    await getSleepMoveResult();
    await getSleepSnoreResult();

    return "done";
  }


  all_to_do().then(function (result) {
    console.log(result);
    res.render('SleepAI_Test', {
      title: User_Number,
      SleepData: JSON.stringify(testData),
      SleepStat : JSON.stringify(trainfile),
      SleepMove: JSON.stringify(SleepMoveResult),
      SleepSnore: JSON.stringify(SleepSnoreResult),
    });
  })

});



router.delete('/ai/manage/removeall', function (req, res, next) {

  fs.unlink(`trainfile/*`,(err)=>{ 
    res.render('index', {
      title: 'Express'
    });
  });

});

router.delete('/ai/manage/remove/:user_id', function (req, res, next) {
 
  fs.unlink(`trainfile/`+  req.params.user_id + ".json",(err)=>{ 
    res.render('index', {
      title: 'Express'
    });
  });

  console.log("remove user_id = " + req.params.user_id)
});

module.exports = router;
