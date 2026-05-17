// 설정 변수 (사용자 설정 파일에서 override 가능)
let LINK_PRICE_CID = 'A100685083'; // 링크프라이스 CID

// 빌드된 앱에서는 global.paths를 사용하고, 개발 환경에서는 __dirname 사용
const USER_DATA_PATH = global.paths ? global.paths.tempImagePath : __dirname;
const DOWNLOAD_PATH = global.paths ? global.paths.tempImagePath : __dirname;

// 사용자 설정 파일이 있으면 설정 값들을 override
if (global.userAgodaConfigPath) {
    try {
        const fs = require('fs');
        const path = require('path');
        
        if (fs.existsSync(global.userAgodaConfigPath)) {
            console.log(`📄 사용자 아고다 설정 파일 로드: ${global.userAgodaConfigPath}`);
            
            // 사용자 설정 파일에서 LINK_PRICE_CID 추출
            const userConfigContent = fs.readFileSync(global.userAgodaConfigPath, 'utf8');
            const cidMatch = userConfigContent.match(/const LINK_PRICE_CID = ['"`]([^'"`]+)['"`];/);
            
            if (cidMatch && cidMatch[1]) {
                LINK_PRICE_CID = cidMatch[1];
                console.log(`✅ 사용자 설정에서 LINK_PRICE_CID 로드: ${LINK_PRICE_CID}`);
            }
        } else {
            console.log(`⚠️ 사용자 아고다 설정 파일이 없습니다: ${global.userAgodaConfigPath}`);
        }
    } catch (error) {
        console.error(`❌ 사용자 아고다 설정 파일 로드 실패: ${error.message}`);
        console.log('⚠️ 기본 설정을 사용합니다.');
    }
}

// 호텔 검색 조건
const SEARCH_CONFIG = {
  // 체크인 날짜 (오늘로부터 며칠 후)
  CHECK_IN_DAYS_FROM_NOW: 30,
  
  // 숙박 일수
  LENGTH_OF_STAY: 1,
  
  // 객실 및 인원
  ROOMS: 2,
  ADULTS: 2,
  CHILDREN: 0,
  
  // 가격 범위 (원화)
  MIN_PRICE: 100000,    // 최소 10만원
  MAX_PRICE: 10000000,  // 최대 1000만원
  
  // 여행자 타입
  TRAVELLER_TYPE: "Family", // Couple, Family, Solo, Business 등
  
  // 통화
  CURRENCY: "KRW",
  
  // 언어 및 지역
  LOCALE: "ko-kr",
  ORIGIN: "KR",
  
  // 페이지 설정
  PAGE_SIZE: 45,          // 페이지당 호텔 수
  MAX_RANDOM_PAGE: 50,    // 랜덤 페이지 최대값
  MAX_ATTEMPTS: 30,       // 최대 시도 횟수
  
  // 정렬 옵션
  SORT_FIELD: "Ranking",  // Ranking, Price, Distance, ReviewScore 등
  SORT_ORDER: "Desc",     // Desc, Asc
  
  // 최소 리뷰 조건 (고평점 호텔)
  MIN_REVIEW_SCORE: 7.5,
  MIN_REVIEW_COUNT: 3
};

// 언어 매핑
const LANGUAGE_MAP = {
  1: "영어",
  2: "프랑스어",
  3: "독일어",
  5: "스페인어",
  6: "일본어",
  7: "중국어(홍콩)",
  8: "중국어(간체)",
  9: "한국어",
  11: "러시아어",
  12: "포르투갈어(포르투갈)",
  13: "네덜란드어",
  14: "영어(캐나다)",
  15: "영어(인도)",
  16: "영어(영국)",
  17: "영어(남아공)",
  18: "영어(호주)",
  19: "영어(싱가포르)",
  20: "중국어(대만)",
  22: "태국어",
  23: "버마어",
  24: "베트남어",
  25: "스웨덴어",
  26: "인도네시아어",
  27: "폴란드어",
  28: "노르웨이어",
  30: "핀란드어",
  31: "체코어",
  32: "터키어",
  38: "슬로베니아어",
  43: "포르투갈어(브라질)",
  50: "우크라이나어",
};

module.exports = {
  LINK_PRICE_CID,
  USER_DATA_PATH,
  DOWNLOAD_PATH,
  SEARCH_CONFIG,
  LANGUAGE_MAP
}; 