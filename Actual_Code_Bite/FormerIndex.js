var express = require('express');
var router = express.Router();

//----------------------------------------------------------------------------------------------------------------값 정의

RandomForestClassifier = require('random-forest-classifier').RandomForestClassifier;
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
const fetchSleepData = async (userInfoId, dateFrom, dateTo) => {
  const databaseConnection = await databasePool.getConnection(async conn => conn)
  try {
    const ioStringToDateRegex = /T.+/
    dateFrom = dateFrom instanceof Date ? dateFrom.toISOString().replace(ioStringToDateRegex, "") : (dateFrom ? dateFrom : "2019-01-01")
    dateTo = dateTo instanceof Date ? dateTo.toISOString().replace(ioStringToDateRegex, "") : (dateTo ? dateTo : new Date().toISOString().replace(ioStringToDateRegex, ""))
    var [selectionResult] = await databaseConnection.query(
      `SELECT ${TEMPERATURE_COLUMN}, ${HUMIDITY_COLUMN}, ${LIGHT_COLUMN}, ${SOUND_COLUMN}, ${MOVEMENT_COUNT_COLUMN}, ${SNORING_COUNT_COLUMN}, ${SLEEP_SCORE_COLUMN}
          FROM ${USER_ANALYZED_SLEEP_INFO_TABLE} A
          INNER JOIN ${SLEEP_INFO_TABLE} B
          ON A.${ANALYSIS_DATE_COLUMN} = B.${QUERY_DATE_COLUMN}
          WHERE A.${USER_INFO_ID_COLUMN} = ? AND A.${ANALYSIS_DATE_COLUMN} limit 100`,
      [userInfoId]
    )
    return selectionResult.map((eachEntry) => {
      return {
        [TEMPERATURE_COLUMN]: parseFloat(eachEntry[TEMPERATURE_COLUMN]),
        [HUMIDITY_COLUMN]: parseFloat(eachEntry[HUMIDITY_COLUMN]),
        [LIGHT_COLUMN]: eachEntry[LIGHT_COLUMN],
        [SOUND_COLUMN]: eachEntry[SOUND_COLUMN],
        [MOVEMENT_COUNT_COLUMN]: eachEntry[MOVEMENT_COUNT_COLUMN],
        [SNORING_COUNT_COLUMN]: eachEntry[SNORING_COUNT_COLUMN],
        [SLEEP_SCORE_COLUMN]: eachEntry[SLEEP_SCORE_COLUMN]
      }
    })

  } catch (anyKindOfAsyncProcessException) {
    console.error(anyKindOfAsyncProcessException)
    databaseConnection.rollback()
    databaseConnection.release()
    process.exit(1)
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

  //----------------------------------------------------------------------------------------------------------------학습메인함수
  const getSleepDB = async (userid) => {
    //Date1 ~ Date 2 Data
    let sleepData = await fetchSleepData(userid, '2019-10-01', '2019-10-31')
    traindata = sleepData;
    console.log(traindata);
    console.log("DB DONE");
  }

  var traindata = [];
  var User_Number = req.params.user_id; //유저번호

  //----------------------------------------------------------------------------------------------------------------임시학습데이터
  var testdata = [{
    "temperature": 36,
    "humidity": 34,
    "light": 1686,
    "sound": 0,
    "movementCount": 1,
    "snoringCount": 0
  }];

  var rf = new RandomForestClassifier({
    n_estimators: 10
  });

  //----------------------------------------------------------------------------------------------------------------학습내용 + 예측
var predicted_score;
var trained_json
  const train_test = () => {
    console.log("StartTrain");

    rf.fit(traindata, ["temperature", "humidity", "light", "sound", "movementCount", "snoringCount"], "sleepScore", function (err, predictSleepScore) {
      //    console.log(traindata);
      //console.log(JSON.stringify(trees, null, 4));
      var pred = rf.predict(testdata, predictSleepScore);
      console.log(pred);
      predicted_score = pred;
      trained_json = JSON.stringify(rf)
        //----------------------------------------------------------------------------------------------------------------학습내용 저장
      fs.writeFile("trainfile/"+User_Number+".json", JSON.stringify(rf), function (err) {
        if (err)
            return console.log(err);
        console.log("The train file was saved");
    });


    });
  }

  const all_to_do = async () => {
    await getSleepDB(User_Number);
    // await console.log(traindata);
    await train_test();
    return "done";
  }

  all_to_do().then(function (result) {
    console.log(result);
    res.render('SleepAI_Train', {
      title: req.params.user_id,
      SleepData : JSON.stringify(traindata),
      SleepScore : predicted_score,
      Trainfile : trained_json
    });
  })

});


  //----------------------------------------------------------------------------------------------------------------예측RESTAPI

router.get('/ai/test/:user_id', function (req, res, next) {

  var rf = new RandomForestClassifier({
    n_estimators: 10
  });
  
  const train_test = () => {
    console.log("StartTrain");

    rf.fit(traindata, ["temperature", "humidity", "light", "sound", "movementCount", "snoringCount"], "sleepScore", function (err, predictSleepScore) {

      var pred = rf.predict(testdata, predictSleepScore);
      console.log(pred);
      predicted_score = pred;
      trained_json = JSON.stringify(rf)
        //----------------------------------------------------------------------------------------------------------------학습내용 저장
      fs.writeFile("trainfile/"+User_Number+".json", JSON.stringify(rf), function (err) {
        if (err)
            return console.log(err);
        console.log("The train file was saved");
    });


    });
  }


  const all_to_do = async () => {
    // await console.log(traindata);
    await train_test();
    return "done";
  }


  all_to_do().then(function (result) {
    console.log(result);
    res.render('SleepAI_Train', {
      title: req.params.user_id,
      SleepData : JSON.stringify(traindata),
      SleepScore : predicted_score,
      Trainfile : trained_json
    });
  })

  res.render('index', {
    title: 'Express'
  });
  console.log("test user_id = " + req.params.user_id)
});

router.delete('/ai/manage/removeall', function (req, res, next) {
  res.render('index', {
    title: 'Express'
  });

});

router.delete('/ai/manage/remove/:user_id', function (req, res, next) {
  res.render('index', {
    title: 'Express'
  });
  console.log("remove user_id = " + req.params.user_id)
});

module.exports = router;
