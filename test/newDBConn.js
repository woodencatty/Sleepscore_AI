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
            WHERE A.${USER_INFO_ID_COLUMN} = ? AND A.${ANALYSIS_DATE_COLUMN} BETWEEN ? AND ?`,
            [userInfoId, dateFrom, dateTo]
        )
        return selectionResult.map((eachEntry) => {
            return {
                [TEMPERATURE_COLUMN] : parseFloat(eachEntry[TEMPERATURE_COLUMN]),
                [HUMIDITY_COLUMN] : parseFloat(eachEntry[HUMIDITY_COLUMN]),
                [LIGHT_COLUMN] : eachEntry[LIGHT_COLUMN],
                [SOUND_COLUMN] : eachEntry[SOUND_COLUMN],
                [MOVEMENT_COUNT_COLUMN] : eachEntry[MOVEMENT_COUNT_COLUMN],
                [SNORING_COUNT_COLUMN] : eachEntry[SNORING_COUNT_COLUMN],
                [SLEEP_SCORE_COLUMN] : eachEntry[SLEEP_SCORE_COLUMN]
            }
        })

    } catch(anyKindOfAsyncProcessException) {
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

const main = async () => {
    let sleepDataOfSangHun = await fetchSleepData(139, '2019-10-01', '2019-10-4')
    console.log(sleepDataOfSangHun);
}
main();
