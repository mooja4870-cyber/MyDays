const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { USER_DATA_PATH } = require('./config');

// 이미지 저장 디렉토리 생성 및 초기화 함수
function initializeImageDirectory() {
  // 설정된 경로 사용
  const userDataPath = USER_DATA_PATH;
  
  console.log('[DEBUG] UserData path:', userDataPath);
  
  // userDataPath 디렉토리가 없으면 생성
  if (!fs.existsSync(userDataPath)) {
    console.log('[DEBUG] Creating userDataPath directory...');
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  
  const imgDir = path.join(USER_DATA_PATH, "hotel_imgs");
  console.log('[DEBUG] Image directory path:', imgDir);

  // 디렉토리가 있으면 모든 파일 삭제
  if (fs.existsSync(imgDir)) {
    console.log('[DEBUG] Image directory exists, cleaning up...');
    const files = fs.readdirSync(imgDir);
    for (const file of files) {
      fs.unlinkSync(path.join(imgDir, file));
    }
  } else {
    // 디렉토리가 없으면 생성
    console.log('[DEBUG] Creating image directory...');
    fs.mkdirSync(imgDir, { recursive: true });
  }

  console.log("Image directory initialized at:", imgDir);
  return imgDir;
}

// 이미지 URL에서 파일명 생성
function getImageFileName(url, index) {
  return `image_${index + 1}.jpg`;
}

// 이미지 다운로드 함수
async function downloadImage(url, filepath) {
  // URL이 //로 시작하면 https: 추가
  if (url.startsWith("//")) {
    url = "https:" + url;
  }

  try {
    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
    });

    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filepath);
      response.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (error) {
    console.error(`Error downloading image from ${url}:`, error.message);
  }
}

// 호텔 정보를 파일로 저장하는 함수
async function saveHotelToFile(hotel) {
  try {
    console.log('[DEBUG] Starting saveHotelToFile...');
    console.log('[DEBUG] Hotel data:', JSON.stringify(hotel, null, 2));
    
    // USER_DATA_PATH 사용 (빌드된 앱에서는 tempImagePath, 개발환경에서는 __dirname)
    const folderName = 'upload';
    const hotelDir = path.join(USER_DATA_PATH, folderName);
    
    console.log('[DEBUG] USER_DATA_PATH:', USER_DATA_PATH);
    console.log('[DEBUG] Hotel directory path:', hotelDir);
    
    // 호텔 폴더 생성
    if (!fs.existsSync(hotelDir)) {
      fs.mkdirSync(hotelDir, { recursive: true });
      console.log(`[DEBUG] Created hotel directory: ${hotelDir}`);
    }
    
    // 이미지 폴더 생성
    const imgDir = path.join(hotelDir, "hotel_imgs");
    if (!fs.existsSync(imgDir)) {
      fs.mkdirSync(imgDir, { recursive: true });
      console.log(`[DEBUG] Created images directory: ${imgDir}`);
    }

    // 이미지 다운로드
    console.log(`[DEBUG] Downloading ${hotel.이미지.length} images...`);
    const downloadPromises = hotel.이미지.map((img, index) => {
      const imgPath = path.join(imgDir, getImageFileName(img.url, index));
      return downloadImage(img.url, imgPath);
    });

    await Promise.all(downloadPromises);
    console.log('[DEBUG] All images downloaded successfully');

    // 이미지 경로 업데이트 - URL도 https로 수정
    hotel.이미지 = hotel.이미지.map((img, index) => ({
      ...img,
      url: img.url.startsWith('//') ? 'https:' + img.url : img.url,
      local_path: path.join(hotelDir, "hotel_imgs", getImageFileName(img.url, index)),
    }));

    // 호텔 정보 저장
    const filename = path.join(hotelDir, "hotel.json");
    console.log('[DEBUG] Writing hotel.json to:', filename);
    fs.writeFileSync(filename, JSON.stringify(hotel, null, 2), "utf8");
    
    // 파일이 실제로 생성되었는지 확인
    if (fs.existsSync(filename)) {
      const stats = fs.statSync(filename);
      console.log(`[DEBUG] hotel.json created successfully. Size: ${stats.size} bytes`);
    } else {
      console.error('[DEBUG] ERROR: hotel.json was not created!');
    }
    
    console.log(`Hotel information saved to ${filename}`);
    console.log(`Images downloaded to ${imgDir}`);
    
    return hotelDir; // 생성된 폴더 경로 반환
  } catch (error) {
    console.error("[DEBUG] Error saving hotel information:", error);
    console.error('[DEBUG] Error stack:', error.stack);
    throw error;
  }
}

// URL 저장 함수 (더 이상 사용되지 않음 - hotel.json에 포함됨)
// function saveUrlToFile(url, hotelName) {
//   try {
//     const urlFilePath = path.join(__dirname, 'agoda_url.txt');
//     console.log(`URL 파일 경로: ${urlFilePath}`);
//     
//     fs.writeFileSync(urlFilePath, `${url}\n`);
//     console.log(`URL 저장 완료: ${hotelName}`);
//   } catch (error) {
//     console.error('URL 저장 오류:', error);
//   }
// }

// upload 폴더 정리 함수
function cleanupUploadFolder() {
  try {
    const uploadDir = path.join(USER_DATA_PATH, 'upload');
    console.log('[DEBUG] Cleaning upload folder at:', uploadDir);
    
    if (fs.existsSync(uploadDir)) {
      console.log('[DEBUG] Cleaning up upload folder...');
      
      // 폴더 내 모든 파일과 하위 폴더 삭제
      function deleteRecursive(dirPath) {
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          files.forEach(file => {
            const filePath = path.join(dirPath, file);
            if (fs.statSync(filePath).isDirectory()) {
              deleteRecursive(filePath);
            } else {
              fs.unlinkSync(filePath);
            }
          });
          fs.rmdirSync(dirPath);
        }
      }
      
      deleteRecursive(uploadDir);
      console.log('[DEBUG] Upload folder cleaned up successfully');
    } else {
      console.log('[DEBUG] Upload folder does not exist, nothing to clean');
    }
  } catch (error) {
    console.error('[DEBUG] Error cleaning up upload folder:', error);
  }
}

module.exports = {
  initializeImageDirectory,
  getImageFileName,
  downloadImage,
  saveHotelToFile,
  cleanupUploadFolder
}; 