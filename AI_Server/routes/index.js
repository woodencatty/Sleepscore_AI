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
const fetchSleepData = async (userInfoId) => {
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
          temp: parseFloat(eachEntry[TEMPERATURE_COLUMN])/100, humi: parseFloat(eachEntry[HUMIDITY_COLUMN])/100, light: eachEntry[LIGHT_COLUMN]/100,
          noise: eachEntry[SOUND_COLUMN]/10000, move: eachEntry[MOVEMENT_COUNT_COLUMN]/100, snore: eachEntry[SNORING_COUNT_COLUMN]/100
        }, output: { Score: eachEntry[SLEEP_SCORE_COLUMN]/100 }
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
//----------------------------------------------------------------------------------------------------------------학습RESTAPI

router.get('/ai/train/:user_id', function (req, res, next) {
  console.log("train user_id = " + req.params.user_id)

  var Train_net = new brain.NeuralNetwork();
  var traindata = [];
  var User_Number = req.params.user_id; //유저번호

  //----------------------------------------------------------------------------------------------------------------학습데이터 추출함수
  const getSleepDB = async (userid) => {
    //Date1 ~ Date 2 Data
    let sleepData = await fetchSleepData(userid)
    traindata = sleepData;
    console.log(traindata);
    console.log("DB DONE");
  }

  //----------------------------------------------------------------------------------------------------------------학습메인함수
  const trainSleepScore = async () => {
    console.log("StartTrain");
    await Train_net.train(traindata);
    //----------------------------------------------------------------------------------------------------------------학습내용 저장
    await fs.writeFile("trainfile/" + User_Number + ".json", JSON.stringify(Train_net), function (err) {
      if (err)
        return console.log(err);
      console.log("The train file was saved");
    });
  }

  const all_to_do = async () => {
    await getSleepDB(User_Number);
    // await console.log(traindata);
    await trainSleepScore();
    return "done";
  }

  all_to_do().then(function (result) {
    console.log(result);
    res.render('SleepAI_Train', {
      title: req.params.user_id,
      SleepData: JSON.stringify(traindata),
    });
  })

});


//----------------------------------------------------------------------------------------------------------------예측RESTAPI

router.get('/ai/test/:user_id', function (req, res, next) {

  var Test_net = new brain.NeuralNetwork();
  var SleepSocreResult;
  var User_Number = req.params.user_id;
  var testData = {temp : req.headers.temp/100, humi : req.headers.humi/100, light : req.headers.light/100, noise : req.headers.noise/10000, move : req.headers.move/100, snore : req.headers.snore/100}
  const readTrainedFile = () => {
    try {
      var obj = JSON.parse(fs.readFileSync("trainfile/" + User_Number + ".json", 'utf8'));
      Test_net.fromJSON(obj);
    }
    catch (error) {
      console.log(error);
    }
  }

  const getSleepScoreResult = () => {
    console.log("test user_id = " + User_Number);
    console.log(testData);
    SleepSocreResult = Test_net.run(testData);   // Data
  }

  const all_to_do = async () => {
    await readTrainedFile();
    await getSleepScoreResult();
    return "done";
  }


  all_to_do().then(function (result) {
    console.log(result);
    res.render('SleepAI_Test', {
      title: User_Number,
      SleepData: JSON.stringify(testData),
      SleepScore: JSON.stringify(SleepSocreResult),
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
