// npm install axios form-data xml2js uuid puppeteer @google/generative-ai https-proxy-agent
const path = require("path");
const { SEARCH_CONFIG, USER_DATA_PATH, DOWNLOAD_PATH, LINK_PRICE_CID } = require('./config');
const { getRandomPage } = require('./utils');
const { initializeCityData } = require('./cityLoader');
const { callAgodaApi, getRandomHotel, organizeHotelInfo, saveHotelToFile } = require('./agodaApi');

// 전역 변수
let bPlanPage = 1;

// 기본 도시 매핑 제거 - 무한 랜덤 시도로 변경

// 랜덤 호텔 정보를 가져오는 함수 (중복 호텔 체크 포함)
async function getRandomHotelInfo(country = '대한민국', usedHotelManager = null, customCid = null, bannedWords = []) {
  try {
    const { cityIds, cityNames } = initializeCityData(country);
    let triedCitiesCount = 0; // 시도한 도시 수 추적
    
    console.log(`🔄 무한 랜덤 도시 시도 모드: 호텔을 찾을 때까지 계속 시도합니다`);

    while (true) { // 무한 도시 시도 루프
      // 랜덤으로 새 도시 선택
      const currentCityId = cityIds[Math.floor(Math.random() * cityIds.length)];
      triedCitiesCount++;
      
      console.log(`🏙️ 새 도시 시도 ${triedCitiesCount}번째: ${cityNames[currentCityId] || '알 수 없음'} (${currentCityId})`);
      
      // 이 도시에서 30번 시도
      let page = getRandomPage();
      let attempts = 0;
      const maxAttemptsPerCity = 30;
      let bPlanPage = 1;

      while (attempts < maxAttemptsPerCity) { // 한 도시당 30번 시도
        console.log(`Fetching page ${page}... (Attempt ${attempts + 1}/${maxAttemptsPerCity}) [City ID: ${currentCityId} (${cityNames[currentCityId] || '알 수 없음'})]`);

        try {
          const response = await callAgodaApi(currentCityId, page, cityNames);

          // 결과 확인
          if (response.data?.data?.citySearch?.properties?.length > 0) {
            const randomHotel = getRandomHotel(response.data.data.citySearch);
            const fakeResponse = {
              data: {
                citySearch: {
                  properties: [randomHotel],
                },
              },
            };

            const hotelInfo = organizeHotelInfo(fakeResponse, {}, customCid);
            const selectedHotel = hotelInfo.hotels[Object.keys(hotelInfo.hotels)[0]];

            // 가격 체크
            if (selectedHotel.가격 === "N/A") {
              console.log(`Selected hotel has no price (N/A). Retrying...`);
              attempts++;
              page = getRandomPage();
              continue;
            }
            
            // 금칙어 체크 (호텔 이름에 금칙어 포함 여부 확인)
            if (bannedWords && bannedWords.length > 0 && selectedHotel.이름) {
              const hotelName = selectedHotel.이름.toLowerCase();
              const isBanned = bannedWords.some(bannedWord => {
                const normalizedBannedWord = bannedWord.toLowerCase().trim();
                return hotelName.includes(normalizedBannedWord);
              });
              
              if (isBanned) {
                console.log(`🚫 [금칙어 필터링] 호텔 "${selectedHotel.이름}"은 금칙어가 포함되어 있어 제외됩니다. 다른 도시에서 호텔 검색...`);
                break; // 이 도시를 빠져나가서 다른 도시 시도
              }
            }
            
            // 중복 호텔 체크 (usedHotelManager가 제공된 경우)
            if (usedHotelManager && selectedHotel.아이디 && usedHotelManager.currentAccountId) {
              if (usedHotelManager.isHotelUsed(selectedHotel.아이디, usedHotelManager.currentAccountId)) {
                console.log(`🔍 호텔 ${selectedHotel.아이디} (${selectedHotel.이름})는 계정 ${usedHotelManager.currentAccountId}에서 이미 사용된 호텔입니다. 다른 도시에서 호텔 검색...`);
                break; // 이 도시를 빠져나가서 다른 도시 시도
              }
            }
            
            // 가격이 있고 중복이 아니면 성공
            console.log(`✅ Successfully found hotel on page ${page} with price: ${selectedHotel.가격}`);
            
            // 사용한 호텔로 기록 (저장 전에 미리 기록)
            if (usedHotelManager && selectedHotel.아이디 && usedHotelManager.currentAccountId) {
              usedHotelManager.addUsedHotel(selectedHotel.아이디, usedHotelManager.currentAccountId, selectedHotel.이름);
            }
            
            const hotelDir = await saveHotelToFile(selectedHotel);
            selectedHotel._savedToFolder = hotelDir; // 폴더 경로 저장
            return selectedHotel;
          } else {
            // 결과가 없을 경우 
            console.log(`No hotels found. Trying with backup page ${bPlanPage}...`);
            attempts++;
            page = bPlanPage;
            bPlanPage++;
          }
        } catch (requestError) {
          console.error(`Request error on page ${page}:`, requestError.message);
          if (requestError.response) {
            console.error("Response status:", requestError.response.status);
            console.error("Response data:", JSON.stringify(requestError.response.data, null, 2).substring(0, 500));
          }
          attempts++;
          page = getRandomPage();
        }
      }
      
      // 이 도시에서 30번 시도 모두 실패
      console.log(`❌ 도시 ${cityNames[currentCityId]} (${currentCityId})에서 ${maxAttemptsPerCity}번 시도 모두 실패. 다른 도시로 이동...`);
    }
  } catch (error) {
    if (error.response) {
      console.error("Response error status:", error.response.status);
      console.error("Response error data:", JSON.stringify(error.response.data, null, 2));
    }
    console.error("Error:", error.message);
    throw error;
  }
}

// 메인 실행 함수
async function main() {
  try {
    console.log('===== Agoda 호텔 정보 크롤링 시작 =====');
    console.log(`링크프라이스 CID: ${LINK_PRICE_CID}`);
    console.log(`데이터 저장 경로: ${USER_DATA_PATH}`);
    console.log(`다운로드 경로: ${DOWNLOAD_PATH}`);
    
    const hotel = await getRandomHotelInfo();
    console.log('\n✅ 호텔 정보 크롤링 완료!');
    console.log(`호텔명: ${hotel.이름}`);
    console.log(`가격: ${hotel.가격정보.기본가격}`);
    console.log(`평점: ${hotel.리뷰.평점}`);
    console.log(`아고다 URL: ${hotel.agoda_url}`);
    console.log(`\n파일 저장 완료:`);
    console.log(`- 폴더 위치: ${hotel._savedToFolder}`);
    console.log(`- 호텔 정보: ${path.join(hotel._savedToFolder, 'hotel.json')}`);
    console.log(`- 이미지 폴더: ${path.join(hotel._savedToFolder, 'hotel_imgs')}`);
  } catch (error) {
    console.error('\n❌ 크롤링 실패:', error.message);
    process.exit(1);
  }
}

// 직접 실행
if (require.main === module) {
  main();
}

module.exports = {
  getRandomHotelInfo,
  main
}; 