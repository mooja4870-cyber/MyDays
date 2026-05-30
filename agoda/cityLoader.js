const fs = require('fs');
const path = require('path');

/**
 * 지정된 국가의 도시 ID와 도시 이름을 파일에서 읽어옵니다.
 * @param {string} countryName - 국가 이름 (예: '대한민국', '일본').
 * @returns {{cityIds: number[], cityNames: {[key: number]: string}}}
 */
function loadCityIds(countryName) {
  // 개발/프로덕션 환경에 따른 파일 경로 설정
  let filePath;
  
  // 먼저 사용자 데이터 폴더에 국가 파일이 있는지 확인
  if (global.userAgodaConfigPath) {
    const userCountryDir = path.dirname(global.userAgodaConfigPath);
    const userCountryFile = path.join(userCountryDir, 'country', `${countryName}.txt`);
    
    if (fs.existsSync(userCountryFile)) {
      filePath = userCountryFile;
      console.log(`📁 사용자 국가 파일 사용: ${filePath}`);
    }
  }
  
  // 사용자 파일이 없으면 기존 방식 사용
  if (!filePath) {
    // Electron 환경인지 확인
    if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
      const { app } = require('electron');
      const isPackaged = app.isPackaged;
      
      if (isPackaged) {
        // 프로덕션 환경: extraResources에서 읽기
        filePath = path.join(process.resourcesPath, 'agoda', 'country', `${countryName}.txt`);
      } else {
        // 개발 환경: 기존 방식
        filePath = path.join(__dirname, 'country', `${countryName}.txt`);
      }
    } else {
      // 일반 Node.js 환경
      filePath = path.join(__dirname, 'country', `${countryName}.txt`);
    }
    
    console.log(`📁 기본 도시 파일 경로: ${filePath}`);
  }

  try {
    // 파일 존재 여부 확인
    if (!fs.existsSync(filePath)) {
      console.warn(`[경고] "${countryName}.txt" 파일을 찾을 수 없습니다. 빈 데이터를 반환합니다.`);
      return { cityIds: [], cityNames: {} };
    }
    
    const cityData = fs.readFileSync(filePath, 'utf8');
    const cityIds = [];
    const cityNames = {};

    // 각 줄을 처리하여 도시 ID와 이름 추출
    const lines = cityData.split('\n').filter(line => line.trim());
    for (const line of lines) {
      const [cityName, cityId] = line.split(':');
      if (cityName && cityId) {
        const id = parseInt(cityId.trim(), 10);
        if (!isNaN(id)) {
          cityIds.push(id);
          cityNames[id] = cityName.trim();
        }
      }
    }

    console.log(`"${countryName}.txt"에서 ${cityIds.length}개의 도시 ID를 로드했습니다.`);
    return { cityIds, cityNames };
  } catch (error) {
    console.error(`"${countryName}.txt" 파일을 읽는 중 오류 발생:`, error);
    // 오류 발생 시 빈 데이터 반환
    return { cityIds: [], cityNames: {} };
  }
}

/**
 * 지정된 국가에 대한 도시 데이터를 초기화하고 랜덤 도시를 선택합니다.
 * @param {string} countryName - 초기화할 국가 이름.
 * @returns {{cityIds: number[], cityNames: {[key: number]: string}, initialCityId: number | null, usedCityIds: number[]}}
 */
function initializeCityData(countryName) {
  const { cityIds, cityNames } = loadCityIds(countryName);
  
  if (cityIds.length === 0) {
    console.error(`[오류] "${countryName}"에 대한 도시 데이터가 없습니다. 초기화에 실패했습니다.`);
    return { cityIds: [], cityNames: {}, initialCityId: null, usedCityIds: [] };
  }
  
  // 초기 랜덤 cityId 선택
  const initialCityId = cityIds[Math.floor(Math.random() * cityIds.length)];
  
  // 선택된 CITY_ID와 도시명 로그 출력
  console.log(`[${countryName}] 초기 선택된 CITY_ID: ${initialCityId} (${cityNames[initialCityId] || '알 수 없음'})`);
  
  // 사용된 도시 ID들을 추적하기 위한 배열
  const usedCityIds = [initialCityId];
  
  return {
    cityIds,
    cityNames,
    initialCityId,
    usedCityIds
  };
}

module.exports = {
  loadCityIds,
  initializeCityData
}; 