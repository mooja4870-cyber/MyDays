const { v4: uuidv4 } = require('uuid');
const { LANGUAGE_MAP } = require('./config');

// 랜덤 ID 생성 함수들
function generateUserId() {
  return uuidv4();
}

function generateSearchId() {
  return uuidv4();
}

function generateCorrelationId() {
  return uuidv4();
}

function generateRequestId() {
  return uuidv4();
}

function generateSessionId() {
  // 19자리 세션 ID 생성 (Agoda 형식: 4639624665321863289)
  const prefix = '46396';
  const suffix = Math.floor(Math.random() * 10000000000000).toString().padStart(14, '0');
  return prefix + suffix;
}

function generateRandomIP() {
  // 한국 IP 대역 (예시)
  const koreanIPRanges = [
    { prefix: "1.11", min: 0, max: 255 },
    { prefix: "14.63", min: 0, max: 255 },
    { prefix: "27.1", min: 0, max: 255 },
    { prefix: "39.7", min: 0, max: 255 },
    { prefix: "42.82", min: 0, max: 255 },
    { prefix: "49.142", min: 0, max: 255 },
    { prefix: "58.120", min: 0, max: 255 },
    { prefix: "61.72", min: 0, max: 255 },
    { prefix: "106.240", min: 0, max: 255 },
    { prefix: "112.169", min: 0, max: 255 },
    { prefix: "114.70", min: 0, max: 255 },
    { prefix: "118.32", min: 0, max: 255 },
    { prefix: "121.134", min: 0, max: 255 },
    { prefix: "175.223", min: 0, max: 255 },
    { prefix: "211.234", min: 0, max: 255 },
    { prefix: "220.72", min: 0, max: 255 }
  ];
  
  const range = koreanIPRanges[Math.floor(Math.random() * koreanIPRanges.length)];
  const thirdOctet = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  const fourthOctet = Math.floor(Math.random() * 256);
  
  return `${range.prefix}.${thirdOctet}.${fourthOctet}`;
}

function generateCookieId() {
  return uuidv4();
}

// 날짜 관련 함수들
function getFormattedDate(date) {
  // 한국 시간으로 변환
  const koreaDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = koreaDate.getFullYear();
  const month = String(koreaDate.getMonth() + 1).padStart(2, "0");
  const day = String(koreaDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCheckInDates() {
  // 현재 한국 시간 기준
  const now = new Date();
  const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  // 30일 후
  const checkIn = new Date(koreaTime);
  checkIn.setDate(koreaTime.getDate() + 30);

  // 체크아웃은 체크인 다음날
  const checkout = new Date(checkIn);
  checkout.setDate(checkIn.getDate() + 1);

  return {
    bookingDate: now.toISOString(),
    checkIn: `${getFormattedDate(checkIn)}T15:00:00.000Z`,
    checkout: `${getFormattedDate(checkout)}T15:00:00.000Z`,
    checkInDate: `${getFormattedDate(checkIn)}T15:00:00.000Z`,
    localCheckInDate: getFormattedDate(checkIn),
    localCheckoutDate: getFormattedDate(checkout),
  };
}

// 언어 ID를 한글 이름으로 변환하는 함수
function getLanguageName(languageId) {
  return LANGUAGE_MAP[languageId] || `알 수 없는 언어(${languageId})`;
}

// 1-50 사이의 랜덤 페이지 번호 생성
function getRandomPage() {
  return Math.floor(Math.random() * 50) + 1;
}

// 배열에서 랜덤 요소 선택
function getRandomHotel(hotels) {
  const hotelArray = hotels.properties;
  const randomIndex = Math.floor(Math.random() * hotelArray.length);
  return hotelArray[randomIndex];
}

module.exports = {
  generateUserId,
  generateSearchId,
  generateCorrelationId,
  generateRequestId,
  generateSessionId,
  generateRandomIP,
  generateCookieId,
  getFormattedDate,
  getCheckInDates,
  getLanguageName,
  getRandomPage,
  getRandomHotel
}; 