const fs = require('fs');
const path = require('path');
const os = require('os');
const sharp = require('sharp');
const axios = require('axios');
const { app } = require('electron');

/**
 * 이미지 처리 클래스
 * 이미지 다운로드, 프레임 추가, 최적화 등을 담당합니다.
 */
class ImageProcessor {
    constructor(tempImagePath, imagesPath) {
        if (!tempImagePath || !imagesPath) {
            throw new Error("[ImageProcessor] 필수 경로가 제공되지 않았습니다.");
        }
        
        this.tempDir = tempImagePath;
        this.outputDir = imagesPath;
        
        // 이미지 다운로드 설정
        this.downloadTimeout = 30000; // 30초
        this.maxRetries = 3;
        this.frameStyles = ['엘레간트 카드 스타일 (고정)'];
        
        // 30년차 디자이너급 프리미엄 색상 팔레트
        this.premiumColors = [
            // 모던 네이티브 톤
            { primary: '#2C3E50', secondary: '#ECF0F1', accent: '#3498DB' }, // 슬레이트 블루
            { primary: '#34495E', secondary: '#F8F9FA', accent: '#E74C3C' }, // 다크 그레이
            { primary: '#2E4057', secondary: '#F4F6F7', accent: '#F39C12' }, // 네이비 골드
            
            // 고급 베이지 톤
            { primary: '#5D4E37', secondary: '#F5F5DC', accent: '#D4AF37' }, // 베이지 골드
            { primary: '#8B7355', secondary: '#FAF0E6', accent: '#CD853F' }, // 카키 베이지
            { primary: '#696969', secondary: '#F8F8FF', accent: '#4682B4' }, // 스틸 그레이
            
            // 프리미엄 그린 톤
            { primary: '#2F4F4F', secondary: '#F0FFF0', accent: '#20B2AA' }, // 포레스트 틸
            { primary: '#556B2F', secondary: '#F5FFFA', accent: '#9ACD32' }, // 올리브 그린
            
            // 세련된 와인 톤
            { primary: '#722F37', secondary: '#FDF5E6', accent: '#B22222' }, // 와인 레드
            { primary: '#4A4A4A', secondary: '#FFFFFF', accent: '#708090' }  // 모노톤 그레이
        ];
        
        // 프리미엄 그라데이션 (미묘하고 고급스러운) - 대폭 확장
        this.elegantGradients = [
            // 클래식 엘레간트
            { start: '#667eea', end: '#764ba2' }, // 부드러운 퍼플
            { start: '#f093fb', end: '#f5576c' }, // 로즈 골드
            { start: '#4facfe', end: '#00f2fe' }, // 시원한 블루
            { start: '#43e97b', end: '#38f9d7' }, // 프레시 그린
            { start: '#fa709a', end: '#fee140' }, // 따뜻한 선셋
            { start: '#a8edea', end: '#fed6e3' }, // 파스텔 드림
            { start: '#ffecd2', end: '#fcb69f' }, // 따뜻한 베이지
            { start: '#e0c3fc', end: '#9bb5ff' }, // 라벤더 블루
            
            // 모던 비비드
            { start: '#ff9a9e', end: '#fecfef' }, // 코랄 핑크
            { start: '#a18cd1', end: '#fbc2eb' }, // 바이올렛 핑크
            { start: '#fad0c4', end: '#ffd1ff' }, // 피치 핑크
            { start: '#ffecd2', end: '#fcb69f' }, // 워머 베이지
            { start: '#ff8a80', end: '#ea80fc' }, // 네온 코랄
            { start: '#8fd3f4', end: '#84fab0' }, // 트로피컬 블루
            
            // 자연 톤
            { start: '#96e6a1', end: '#d4fc79' }, // 스프링 그린
            { start: '#ffeaa7', end: '#fab1a0' }, // 오렌지 선셋
            { start: '#74b9ff', end: '#0984e3' }, // 오션 블루
            { start: '#fd79a8', end: '#fdcb6e' }, // 트로피컬 선셋
            { start: '#6c5ce7', end: '#a29bfe' }, // 퍼플 미스트
            { start: '#00b894', end: '#00cec9' }, // 에메랄드 틸
            
            // 프리미엄 메탈릭
            { start: '#bdc3c7', end: '#2c3e50' }, // 실버 그레이
            { start: '#f39c12', end: '#f1c40f' }, // 골든 옐로우
            { start: '#8e44ad', end: '#3498db' }, // 로열 퍼플
            { start: '#e67e22', end: '#f39c12' }, // 코퍼 오렌지
            { start: '#2c3e50', end: '#34495e' }, // 다크 슬레이트
            { start: '#27ae60', end: '#2ecc71' }, // 에메랄드 그린
            
            // 파스텔 엘레간트
            { start: '#ffeef8', end: '#f8e2ff' }, // 소프트 핑크
            { start: '#e8f5ff', end: '#b3e0ff' }, // 스카이 블루
            { start: '#fff2e8', end: '#ffe0b3' }, // 크림 피치
            { start: '#f0fff4', end: '#e0ffe8' }, // 민트 그린
            { start: '#fdf2f8', end: '#fce7f3' }, // 블러쉬 핑크
            { start: '#f0f9ff', end: '#e0f2fe' }, // 아이스 블루
            
            // 모던 다크
            { start: '#2c3e50', end: '#4a6741' }, // 다크 포레스트
            { start: '#8b4513', end: '#a0522d' }, // 다크 브라운
            { start: '#2f4f4f', end: '#708090' }, // 스모키 그레이
            { start: '#483d8b', end: '#6a5acd' }, // 미드나이트 퍼플
            { start: '#8b0000', end: '#dc143c' }, // 딥 레드
            { start: '#191970', end: '#4169e1' }  // 네이비 블루
        ];
        
        // 은은한 카드 배경 색상 (매우 연한 파스텔 톤)
        this.softCardBackgrounds = [
            '#fefefe', // 거의 화이트
            '#fdfdf9', // 아이보리 화이트
            '#fdfcf8', // 크림 화이트
            '#fef9f9', // 로즈 화이트
            '#f9f9ff', // 라벤더 화이트
            '#f9ffff', // 아이스 화이트
            '#fffff9', // 민트 화이트
            '#fff9f9', // 피치 화이트
            '#f8fffe', // 시원한 화이트
            '#fef8ff', // 연보라 화이트
            '#fff8f9', // 핑크 화이트
            '#f9fff8', // 연초록 화이트
            '#fff9fb', // 베이비 핑크
            '#f8f9ff', // 연파랑 화이트
            '#fffef8', // 연노랑 화이트
            '#f8fffa', // 연민트 화이트
            '#fef9fa', // 로즈 베이지
            '#f9fafe', // 연회색 화이트
            '#fffaf8', // 피치 베이지
            '#f8faff'  // 스카이 화이트
        ];
        
        // 파일 경로 설정
        this.processedImagesFile = path.join(this.outputDir, 'processed_images.json');
        this.anneImagePath = path.join(path.dirname(__dirname), '..', 'assets', 'anne.jpg');
        
        // 디렉토리 생성
        this.ensureTempDirectory();
        this.ensureOutputDirectory();
        
        console.log('🎨 ImageProcessor 초기화 완료 (엘레간트 카드 스타일 + 둥근 모서리 + 은은한 배경 + 이미지 보존)');
        console.log('📁 임시 디렉토리:', this.tempDir);
        console.log('📁 출력 디렉토리:', this.outputDir);
        console.log('✨ 프레임 스타일:', this.frameStyles.join(', '));
        console.log('🌈 사용 가능한 그라데이션:', this.elegantGradients.length + '개');
        console.log('🎨 은은한 카드 배경:', this.softCardBackgrounds.length + '개');
        console.log('🔄 이미지 형식: PNG (투명도 완벽 지원, 둥근 모서리 SVG clipPath 방식)');
    }

    /**
     * 임시 디렉토리 생성
     */
    ensureTempDirectory() {
        try {
            console.log(`🔍 임시 디렉토리 확인 시작: ${this.tempDir}`);
            
            // 상위 디렉토리부터 차례대로 생성
            const parentDir = path.dirname(this.tempDir);
            if (!fs.existsSync(parentDir)) {
                console.log(`📁 상위 디렉토리 생성: ${parentDir}`);
                fs.mkdirSync(parentDir, { recursive: true });
            }
            
            // 기존 임시 파일들 정리
            if (fs.existsSync(this.tempDir)) {
                try {
                    const files = fs.readdirSync(this.tempDir);
                    console.log(`🧹 기존 임시 파일 ${files.length}개 정리 시작`);
                    for (const file of files) {
                        const filePath = path.join(this.tempDir, file);
                        try {
                            const stats = fs.statSync(filePath);
                            if (stats.isFile()) {
                                fs.unlinkSync(filePath);
                                console.log(`🗑️ 임시 파일 삭제: ${file}`);
                            }
                        } catch (unlinkError) {
                            console.warn(`⚠️ 임시 파일 삭제 실패: ${filePath}`, unlinkError.message);
                        }
                    }
                    console.log('✅ 기존 임시 파일들 정리 완료');
                } catch (cleanupError) {
                    console.warn('⚠️ 임시 디렉토리 정리 중 일부 오류:', cleanupError.message);
                }
            } else {
                console.log('📁 임시 디렉토리가 존재하지 않음 - 새로 생성');
            }
            
            // 디렉토리 생성 (강제로 다시 생성)
            if (!fs.existsSync(this.tempDir)) {
                console.log(`📁 임시 디렉토리 생성 시도: ${this.tempDir}`);
                fs.mkdirSync(this.tempDir, { recursive: true });
                console.log(`✅ 임시 디렉토리 생성 완료: ${this.tempDir}`);
            }
            
            // 디렉토리 존재 확인
            if (!fs.existsSync(this.tempDir)) {
                throw new Error(`임시 디렉토리 생성 실패: ${this.tempDir}`);
            }
            
            // 디렉토리 권한 확인
            try {
                fs.accessSync(this.tempDir, fs.constants.W_OK);
                console.log('✅ 임시 디렉토리 쓰기 권한 확인 완료');
            } catch (accessError) {
                console.error('❌ 임시 디렉토리 쓰기 권한 없음:', accessError);
                throw new Error(`임시 디렉토리 쓰기 권한 없음: ${this.tempDir}`);
            }
            
            // 테스트 파일로 실제 쓰기 테스트
            const testFile = path.join(this.tempDir, `write_test_${Date.now()}.txt`);
            try {
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
                console.log('✅ 임시 디렉토리 쓰기 테스트 성공');
            } catch (writeError) {
                console.error('❌ 임시 디렉토리 쓰기 테스트 실패:', writeError);
                throw new Error(`임시 디렉토리 쓰기 테스트 실패: ${writeError.message}`);
            }
            
        } catch (error) {
            console.error('❌ 임시 디렉토리 생성/권한 확인 실패:', error);
            
            // 대체 임시 디렉토리 시도
            const fallbackTempDir = path.join(os.tmpdir(), 'nepas_temp_images');
            console.log(`🔄 대체 임시 디렉토리 시도: ${fallbackTempDir}`);
            
            try {
                if (!fs.existsSync(fallbackTempDir)) {
                    fs.mkdirSync(fallbackTempDir, { recursive: true });
                }
                
                const testFile = path.join(fallbackTempDir, `write_test_${Date.now()}.txt`);
                fs.writeFileSync(testFile, 'test');
                fs.unlinkSync(testFile);
                
                console.log(`✅ 대체 임시 디렉토리 사용: ${fallbackTempDir}`);
                this.tempDir = fallbackTempDir;
                
            } catch (fallbackError) {
                console.error('❌ 대체 임시 디렉토리도 실패:', fallbackError);
                throw new Error(`모든 임시 디렉토리 생성 실패: ${error.message}`);
            }
        }
    }

    /**
     * 출력 디렉토리 생성
     */
    ensureOutputDirectory() {
        try {
            if (!fs.existsSync(this.outputDir)) {
                fs.mkdirSync(this.outputDir, { recursive: true });
                console.log(`📁 출력 디렉토리 생성 완료: ${this.outputDir}`);
            }
            
            // 디렉토리 쓰기 권한 확인
            const testFile = path.join(this.outputDir, 'write_test.txt');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            console.log('✅ 출력 디렉토리 쓰기 권한 확인 완료');
            
        } catch (error) {
            console.error('❌ 출력 디렉토리 생성/권한 확인 실패:', error);
            throw error;
        }
    }

    /**
     * 엘레간트 카드 스타일 고정 (30년차 디자이너급 프리미엄 프레임)
     * @returns {Function}
     */
    getRandomFrameStyle() {
        // 엘레간트 카드 스타일로만 고정
        return this.createFramedImage3.bind(this);
    }

    /**
     * 이미지에 둥근 모서리 적용 (헬퍼 함수)
     * @param {Buffer} imageBuffer 이미지 버퍼
     * @param {number} width 이미지 너비
     * @param {number} height 이미지 높이
     * @param {number} radius 둥근 모서리 반지름
     * @returns {Promise<Buffer>} 둥근 모서리가 적용된 이미지 버퍼
     */
    async applyRoundedCorners(imageBuffer, width, height, radius) {
        try {
            console.log(`🔄 둥근 모서리 적용 시도: ${width}x${height}, radius=${radius}`);
            
            // 가장 안전한 방법: Sharp 기본 기능만 사용
            const roundedMask = Buffer.from(`
                <svg width="${width}" height="${height}">
                    <rect x="0" y="0" 
                          width="${width}" 
                          height="${height}" 
                          rx="${radius}" 
                          ry="${radius}" 
                          fill="white"/>
                </svg>
            `);
            
            // 방법 1: Sharp의 안전한 마스킹 시도
            let result;
            try {
                result = await sharp(imageBuffer)
                    .composite([
                        {
                            input: roundedMask,
                            blend: 'dest-in'
                        }
                    ])
                    .png()
                    .toBuffer();
                    
                // 결과 검증: 버퍼가 너무 작으면 실패로 간주
                if (result.length < 1000) {
                    throw new Error('결과 이미지가 너무 작음 (마스킹 실패 가능성)');
                }
                
            } catch (maskError) {
                console.log('🔄 마스킹 방법 실패, 원본 이미지 사용:', maskError.message);
                // 마스킹 실패 시 둥근 모서리 없이 원본 이미지 반환
                result = imageBuffer;
            }
            
            console.log('✅ 둥근 모서리 적용 성공');
            return result;
            
        } catch (error) {
            console.error('❌ 둥근 모서리 적용 실패, 원본 이미지 반환:', error);
            console.log('📸 원본 이미지를 그대로 사용합니다 (이미지 보존 우선)');
            // 실패 시 반드시 원본 이미지 반환해서 이미지는 보이도록 함
            return imageBuffer;
        }
    }

    /**
     * 이미지 다운로드 및 리사이징
     * @param {string} imageUrl 이미지 URL
     * @param {number} timeoutMs 타임아웃 (밀리초)
     * @returns {Promise<Buffer>} 처리된 이미지 버퍼
     */
    async downloadImage(imageUrl, timeoutMs = 30000) {
        try {
            console.log(`📥 [이미지 다운로드] 시작: ${imageUrl}`);
            
            // HTTP 요청 설정
            const response = await axios({
                method: 'GET',
                url: imageUrl,
                responseType: 'arraybuffer',
                timeout: timeoutMs,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'image/*,*/*;q=0.8',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Sec-Fetch-Dest': 'image',
                    'Sec-Fetch-Mode': 'no-cors',
                    'Sec-Fetch-Site': 'cross-site'
                },
                maxRedirects: 5,
                validateStatus: function (status) {
                    return status >= 200 && status < 400;
                }
            });
            
            const buffer = Buffer.from(response.data);
            const contentType = response.headers['content-type'] || '';
            
            console.log(`📊 [이미지 다운로드] 응답 정보:`);
            console.log(`   - 상태: ${response.status}`);
            console.log(`   - 타입: ${contentType}`);
            console.log(`   - 크기: ${Math.round(buffer.length / 1024)}KB`);
            
            // 이미지 크기 확인
            const metadata = await sharp(buffer).metadata();
            if (!metadata.width || !metadata.height) {
                throw new Error('올바르지 않은 이미지 파일입니다');
            }
            
            console.log(`📐 [이미지 메타데이터] ${metadata.width}x${metadata.height}, 포맷: ${metadata.format}`);
            console.log(`✅ [이미지 다운로드] 완료 - 크기: ${Math.round(buffer.length / 1024)}KB, 타입: ${contentType || 'unknown'}`);
            
            // 🔥 18MB 이하로 압축 처리
            const processedBuffer = await this.compressImageTo18MB(buffer, metadata);
            
            return processedBuffer;
            
        } catch (error) {
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                console.error(`❌ [이미지 다운로드] 타임아웃 (${timeoutMs}ms):`, imageUrl);
                throw new Error(`이미지 다운로드 타임아웃: ${imageUrl}`);
            } else if (error.response) {
                console.error(`❌ [이미지 다운로드] HTTP 오류 ${error.response.status}:`, imageUrl);
                throw new Error(`이미지 다운로드 실패 (HTTP ${error.response.status}): ${imageUrl}`);
            } else {
                console.error(`❌ [이미지 다운로드] 기타 오류:`, error.message);
                throw new Error(`이미지 다운로드 실패: ${imageUrl} - ${error.message}`);
            }
        }
    }

    /**
     * 이미지를 15MB 이하로 압축
     * @param {Buffer} buffer 원본 이미지 버퍼
     * @param {Object} metadata 이미지 메타데이터
     * @returns {Promise<Buffer>} 압축된 이미지 버퍼
     */
    async compressImageTo18MB(buffer, metadata) {
        const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
        
        // 이미 15MB 이하면 기본 처리만
        if (buffer.length <= MAX_FILE_SIZE) {
            // 이미지가 800px보다 크면 리사이징
            if (metadata.width > 800) {
                console.log(`🔄 이미지 리사이징 시작: ${metadata.width}px -> 800px (최대 폭)`);
                
                const resizedBuffer = await sharp(buffer)
                    .resize(800, null, {
                        withoutEnlargement: true,
                        fit: 'inside'
                    })
                    .png({ compressionLevel: 6, quality: 85 })
                    .toBuffer();
                
                const resizedMetadata = await sharp(resizedBuffer).metadata();
                console.log(`✅ 이미지 리사이징 완료: ${resizedMetadata.width}x${resizedMetadata.height}`);
                console.log(`📊 파일 크기 변화: ${Math.round(buffer.length / 1024)}KB -> ${Math.round(resizedBuffer.length / 1024)}KB`);
                
                return resizedBuffer;
            } else {
                console.log(`📐 이미지 크기가 800px 이하이므로 리사이징 생략: ${metadata.width}x${metadata.height}`);
                return buffer;
            }
        }
        
        // 15MB 초과하는 경우 압축 시작
        const currentSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
        console.log(`🗜️ [이미지 압축] 15MB 초과 감지: ${currentSizeMB}MB -> 15MB 이하로 압축 시작`);
        
        let processedBuffer = buffer;
        let currentSize = buffer.length;
        
        // 1단계: 해상도 줄이기 (단계별로)
        const resolutions = [800, 600, 400, 300, 200];
        
        for (let maxWidth of resolutions) {
            if (currentSize <= MAX_FILE_SIZE) break;
            
            if (metadata.width > maxWidth) {
                console.log(`📐 [압축 단계] 해상도 줄이기: ${maxWidth}px 최대 폭으로 리사이징`);
                
                processedBuffer = await sharp(processedBuffer)
                    .resize(maxWidth, null, {
                        withoutEnlargement: true,
                        fit: 'inside'
                    })
                    .png({ compressionLevel: 6, quality: 85 })
                    .toBuffer();
                
                currentSize = processedBuffer.length;
                console.log(`   -> 결과: ${Math.round(currentSize / 1024)}KB (${(currentSize / (1024 * 1024)).toFixed(2)}MB)`);
                
                if (currentSize <= MAX_FILE_SIZE) {
                    console.log(`✅ [압축 완료] 해상도 조정으로 15MB 이하 달성`);
                    break;
                }
            }
        }
        
        // 2단계: 품질 낮추기 (해상도로도 안되면)
        const qualities = [75, 65, 55, 45, 35, 25];
        
        for (let quality of qualities) {
            if (currentSize <= MAX_FILE_SIZE) break;
            
            console.log(`🎨 [압축 단계] 품질 낮추기: ${quality}% 품질로 압축`);
            
            processedBuffer = await sharp(processedBuffer)
                .png({ compressionLevel: 6, quality: quality })
                .toBuffer();
            
            currentSize = processedBuffer.length;
            console.log(`   -> 결과: ${Math.round(currentSize / 1024)}KB (${(currentSize / (1024 * 1024)).toFixed(2)}MB)`);
            
            if (currentSize <= MAX_FILE_SIZE) {
                console.log(`✅ [압축 완료] 품질 조정으로 15MB 이하 달성`);
                break;
            }
        }
        
        // 3단계: 더 작은 해상도로 (극단적인 경우)
        if (currentSize > MAX_FILE_SIZE) {
            console.log(`⚠️ [극단적 압축] 여전히 15MB 초과 - 더 작은 해상도로 강제 압축`);
            
            const extremeResolutions = [150, 100];
            
            for (let maxWidth of extremeResolutions) {
                processedBuffer = await sharp(processedBuffer)
                    .resize(maxWidth, null, {
                        withoutEnlargement: true,
                        fit: 'inside'
                    })
                    .png({ compressionLevel: 9, quality: 20 })
                    .toBuffer();
                
                currentSize = processedBuffer.length;
                console.log(`   -> 극단적 압축 결과: ${Math.round(currentSize / 1024)}KB (${(currentSize / (1024 * 1024)).toFixed(2)}MB)`);
                
                if (currentSize <= MAX_FILE_SIZE) {
                    console.log(`✅ [압축 완료] 극단적 압축으로 15MB 이하 달성`);
                    break;
                }
            }
        }
        
        const finalSizeMB = (currentSize / (1024 * 1024)).toFixed(2);
        if (currentSize <= MAX_FILE_SIZE) {
            console.log(`🎉 [압축 성공] 최종 크기: ${finalSizeMB}MB (15MB 이하 달성)`);
        } else {
            console.log(`⚠️ [압축 경고] 최종 크기: ${finalSizeMB}MB (여전히 15MB 초과, 하지만 최대한 압축함)`);
        }
        
        return processedBuffer;
    }

    /**
     * 프레임 스타일 1: 모던 미니멀 프레임 (30년차 디자이너급)
     * @param {Buffer} inputBuffer 입력 이미지 버퍼
     * @returns {Promise<Buffer>}
     */
    async createFramedImage1(inputBuffer) {
        try {
            console.log('🎨 프레임 스타일 1 적용 중 (모던 미니멀 프레임)...');
            
            const padding = 40;           // 여백
            const borderWidth = 2;        // 얇은 테두리
            const shadowBlur = 20;        // 부드러운 그림자
            const cornerRadius = 8;       // 모던한 모서리
            
            const selectedColor = this.premiumColors[Math.floor(Math.random() * this.premiumColors.length)];
            
            const image = sharp(inputBuffer);
            const metadata = await image.metadata();
            
            const totalWidth = metadata.width + padding * 2;
            const totalHeight = metadata.height + padding * 2;
            
            const result = await sharp({
                create: {
                    width: totalWidth,
                    height: totalHeight,
                    channels: 4,
                    background: selectedColor.secondary
                }
            })
            .composite([
                // 부드러운 드롭 셰도우
                {
                    input: Buffer.from(`
                        <svg width="${totalWidth}" height="${totalHeight}">
                            <defs>
                                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feDropShadow dx="0" dy="8" stdDeviation="${shadowBlur/2}" flood-color="${selectedColor.primary}" flood-opacity="0.15"/>
                                </filter>
                            </defs>
                            <rect x="${padding - borderWidth}" y="${padding - borderWidth}" 
                                  width="${metadata.width + borderWidth * 2}" 
                                  height="${metadata.height + borderWidth * 2}" 
                                  fill="${selectedColor.secondary}" 
                                  stroke="${selectedColor.primary}" 
                                  stroke-width="${borderWidth}" 
                                  rx="${cornerRadius}" 
                                  ry="${cornerRadius}"
                                  filter="url(#shadow)"/>
                        </svg>
                    `),
                    top: 0,
                    left: 0
                },
                // 이미지 (약간의 대비 향상)
                {
                    input: await image
                        .modulate({ brightness: 1.02, saturation: 1.05 })
                        .sharpen({ sigma: 0.5 })
                        .toBuffer(),
                    top: padding,
                    left: padding
                },
                // 미묘한 하이라이트 (위쪽 가장자리)
                {
                    input: Buffer.from(`
                        <svg width="${totalWidth}" height="${totalHeight}">
                            <rect x="${padding - borderWidth}" y="${padding - borderWidth}" 
                                  width="${metadata.width + borderWidth * 2}" 
                                  height="2" 
                                  fill="${selectedColor.accent}" 
                                  opacity="0.6"
                                  rx="${cornerRadius}" 
                                  ry="${cornerRadius}"/>
                        </svg>
                    `),
                    top: 0,
                    left: 0
                }
            ])
            .png({ compressionLevel: 6, quality: 95 })
            .toBuffer();
            
            console.log('✅ 모던 미니멀 프레임 적용 완료');
            return result;
            
        } catch (error) {
            console.error('❌ 모던 미니멀 프레임 적용 실패:', error);
            throw error;
        }
    }

    /**
     * 프레임 스타일 2: 프리미엄 매트 프레임 (30년차 디자이너급)
     * @param {Buffer} inputBuffer 입력 이미지 버퍼
     * @returns {Promise<Buffer>}
     */
    async createFramedImage2(inputBuffer) {
        try {
            console.log('🎨 프레임 스타일 2 적용 중 (프리미엄 매트 프레임)...');
            
            const mattWidth = 60;         // 매트 폭
            const frameWidth = 12;        // 프레임 두께
            const innerShadow = 8;        // 안쪽 그림자
            const cornerRadius = 4;       // 모서리 반경
            
            const selectedColor = this.premiumColors[Math.floor(Math.random() * this.premiumColors.length)];
            
            const image = sharp(inputBuffer);
            const metadata = await image.metadata();
            
            const totalWidth = metadata.width + (mattWidth + frameWidth) * 2;
            const totalHeight = metadata.height + (mattWidth + frameWidth) * 2;
            
            const result = await sharp({
                create: {
                    width: totalWidth,
                    height: totalHeight,
                    channels: 4,
                    background: selectedColor.primary
                }
            })
            .composite([
                // 외부 프레임 (다크 톤)
                {
                    input: Buffer.from(`
                        <svg width="${totalWidth}" height="${totalHeight}">
                            <rect x="0" y="0" 
                                  width="${totalWidth}" 
                                  height="${totalHeight}" 
                                  fill="${selectedColor.primary}" 
                                  rx="${cornerRadius + 2}" 
                                  ry="${cornerRadius + 2}"/>
                        </svg>
                    `),
                    top: 0,
                    left: 0
                },
                // 매트 (밝은 톤)
                {
                    input: Buffer.from(`
                        <svg width="${totalWidth}" height="${totalHeight}">
                            <defs>
                                <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feFlood flood-color="${selectedColor.primary}" flood-opacity="0.3"/>
                                    <feComposite in="SourceGraphic" in2="SourceAlpha" operator="out"/>
                                    <feGaussianBlur stdDeviation="${innerShadow/2}"/>
                                    <feOffset dx="0" dy="2"/>
                                    <feComposite in2="SourceAlpha" operator="atop"/>
                                </filter>
                            </defs>
                            <rect x="${frameWidth}" y="${frameWidth}" 
                                  width="${totalWidth - frameWidth * 2}" 
                                  height="${totalHeight - frameWidth * 2}" 
                                  fill="${selectedColor.secondary}" 
                                  rx="${cornerRadius}" 
                                  ry="${cornerRadius}"
                                  filter="url(#innerShadow)"/>
                        </svg>
                    `),
                    top: 0,
                    left: 0
                },
                // 이미지 영역 (중앙 배치)
                {
                    input: await image
                        .modulate({ brightness: 1.03, saturation: 1.1 })
                        .sharpen({ sigma: 0.7 })
                        .toBuffer(),
                    top: mattWidth + frameWidth,
                    left: mattWidth + frameWidth
                },
                // 미묘한 베벨 효과 (이미지 테두리)
                {
                    input: Buffer.from(`
                        <svg width="${totalWidth}" height="${totalHeight}">
                            <rect x="${mattWidth + frameWidth - 1}" y="${mattWidth + frameWidth - 1}" 
                                  width="${metadata.width + 2}" 
                                  height="${metadata.height + 2}" 
                                  fill="none" 
                                  stroke="${selectedColor.accent}" 
                                  stroke-width="1" 
                                  opacity="0.4"/>
                        </svg>
                    `),
                    top: 0,
                    left: 0
                },
                // 하이라이트 (매트 상단)
                {
                    input: Buffer.from(`
                        <svg width="${totalWidth}" height="${totalHeight}">
                            <linearGradient id="highlight" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style="stop-color:white;stop-opacity:0.4" />
                                <stop offset="30%" style="stop-color:white;stop-opacity:0.1" />
                                <stop offset="100%" style="stop-color:white;stop-opacity:0" />
                            </linearGradient>
                            <rect x="${frameWidth}" y="${frameWidth}" 
                                  width="${totalWidth - frameWidth * 2}" 
                                  height="${mattWidth/2}" 
                                  fill="url(#highlight)" 
                                  rx="${cornerRadius}" 
                                  ry="${cornerRadius}"/>
                        </svg>
                    `),
                    top: 0,
                    left: 0
                }
            ])
            .png({ compressionLevel: 6, quality: 95 })
            .toBuffer();
            
            console.log('✅ 프리미엄 매트 프레임 적용 완료');
            return result;
            
        } catch (error) {
            console.error('❌ 프리미엄 매트 프레임 적용 실패:', error);
            throw error;
        }
    }

    /**
     * 프레임 스타일 3: 엘레간트 카드 스타일 (30년차 디자이너급)
     * @param {Buffer} inputBuffer 입력 이미지 버퍼
     * @returns {Promise<Buffer>}
     */
    async createFramedImage3(inputBuffer) {
        try {
            console.log('🎨 프레임 스타일 3 적용 중 (엘레간트 카드 스타일 + 은은한 배경 + 이미지 보존)...');
            
            const cardPadding = 50;       // 카드 여백
            const borderRadius = 16;      // 둥근 모서리
            const gradientHeight = 80;    // 그라데이션 영역 높이
            
            const selectedGradient = this.elegantGradients[Math.floor(Math.random() * this.elegantGradients.length)];
            const selectedColor = this.premiumColors[Math.floor(Math.random() * this.premiumColors.length)];
            const selectedBackground = this.softCardBackgrounds[Math.floor(Math.random() * this.softCardBackgrounds.length)];
            
            const image = sharp(inputBuffer);
            const metadata = await image.metadata();
            
            const cardWidth = metadata.width + cardPadding * 2;
            const cardHeight = metadata.height + cardPadding * 2 + gradientHeight;
            const totalWidth = cardWidth;
            const totalHeight = cardHeight;
            
            const result = await sharp({
                create: {
                    width: totalWidth,
                    height: totalHeight,
                    channels: 4,
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                }
            })
            .composite([
                // 카드 배경 (은은한 색상) - 테두리 없음
                {
                    input: Buffer.from(`
                        <svg width="${totalWidth}" height="${totalHeight}">
                            <rect x="0" y="0" 
                                  width="${cardWidth}" 
                                  height="${cardHeight}" 
                                  fill="${selectedBackground}" 
                                  rx="${borderRadius}" 
                                  ry="${borderRadius}"/>
                        </svg>
                    `),
                    top: 0,
                    left: 0
                },
                // 상단 그라데이션 영역
                {
                    input: Buffer.from(`
                        <svg width="${totalWidth}" height="${totalHeight}">
                            <defs>
                                <linearGradient id="elegantGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" style="stop-color:${selectedGradient.start};stop-opacity:0.8" />
                                    <stop offset="100%" style="stop-color:${selectedGradient.end};stop-opacity:0.8" />
                                </linearGradient>
                            </defs>
                            <rect x="0" y="0" 
                                  width="${cardWidth}" 
                                  height="${gradientHeight}" 
                                  fill="url(#elegantGrad)" 
                                  rx="${borderRadius}" 
                                  ry="${borderRadius}"/>
                            <rect x="0" y="${gradientHeight - borderRadius}" 
                                  width="${cardWidth}" 
                                  height="${borderRadius}" 
                                  fill="url(#elegantGrad)"/>
                        </svg>
                    `),
                    top: 0,
                    left: 0
                },
                // 이미지 영역 (둥근 모서리 적용)
                {
                    input: await this.applyRoundedCorners(
                        await image
                            .modulate({ brightness: 1.05, saturation: 1.08 })
                            .sharpen({ sigma: 0.8 })
                            .toBuffer(),
                        metadata.width,
                        metadata.height,
                        12 // 둥근 모서리 반지름
                    ),
                    top: cardPadding + gradientHeight,
                    left: cardPadding
                },

                // 카드 하이라이트 (상단 가장자리)
                {
                    input: Buffer.from(`
                        <svg width="${totalWidth}" height="${totalHeight}">
                            <rect x="0" y="0" 
                                  width="${cardWidth}" 
                                  height="2" 
                                  fill="white" 
                                  opacity="0.7"
                                  rx="${borderRadius}" 
                                  ry="${borderRadius}"/>
                        </svg>
                    `),
                    top: 0,
                    left: 0
                },

            ])
            .png({ compressionLevel: 6, quality: 95 })
            .toBuffer();
            
            console.log('✅ 엘레간트 카드 스타일 + 은은한 배경 + 이미지 보존 완료!');
            return result;
            
        } catch (error) {
            console.error('❌ 엘레간트 카드 스타일 적용 실패:', error);
            throw error;
        }
    }

    /**
     * 이미지 다운로드 및 프레임 적용
     * @param {string} imageUrl 이미지 URL
     * @param {number} index 이미지 인덱스
     * @returns {Promise<string>} 저장된 파일 경로
     */
    async downloadAndConvertImage(imageUrl, index) {
        let filename = null;
        try {
            console.log(`🖼️ 이미지 ${index + 1} 처리 시작: ${imageUrl.substring(0, 50)}...`);
            
            // 고유한 파일명 생성 (타임스탬프 + 랜덤)
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000);
            const uniqueId = `${timestamp}_${random}`;
            filename = path.join(this.tempDir, `image_${index}_${uniqueId}.png`);
            
            console.log(`📁 이미지 저장 경로: ${filename}`);
            
            // 이미지 다운로드
            const buffer = await this.downloadImage(imageUrl);
            
            // 랜덤 프레임 스타일 선택 및 적용
            const selectedFrameStyle = this.getRandomFrameStyle();
            const framedBuffer = await selectedFrameStyle(buffer);
            
            // 파일 저장 전 디렉토리 재확인
            if (!fs.existsSync(this.tempDir)) {
                console.log('⚠️ 임시 디렉토리가 사라짐 - 재생성');
                this.ensureTempDirectory();
            }
            
            // 파일 저장
            await sharp(framedBuffer).toFile(filename);
            
            // 저장된 파일 검증
            if (!fs.existsSync(filename)) {
                throw new Error(`파일 저장 실패: ${filename}`);
            }
            
            const stats = fs.statSync(filename);
            console.log(`✅ 이미지 ${index + 1} 처리 완료: ${filename} (크기: ${Math.round(stats.size / 1024)}KB)`);
            return filename;
            
        } catch (error) {
            console.error(`❌ 이미지 ${index + 1} 처리 실패:`, error);
            
            // 실패한 파일이 있다면 정리
            if (filename && fs.existsSync(filename)) {
                try {
                    fs.unlinkSync(filename);
                    console.log(`🗑️ 실패한 파일 정리: ${filename}`);
                } catch (cleanupError) {
                    console.warn(`⚠️ 파일 정리 실패: ${filename}`, cleanupError.message);
                }
            }
            
            throw error;
        }
    }

    /**
     * Anne 이미지 처리 (특별 이미지)
     * @returns {Promise<string>} 처리된 Anne 이미지 경로
     */
    async processAnneImage() {
        try {
            console.log('👸 Anne 이미지 처리 시작...');
            
            if (!fs.existsSync(this.anneImagePath)) {
                console.warn('⚠️ Anne 이미지를 찾을 수 없습니다. 기본 이미지로 대체합니다.');
                
                // 기본 이미지 생성 (단색 이미지)
                const defaultBuffer = await sharp({
                    create: {
                        width: 400,
                        height: 300,
                        channels: 3,
                        background: { r: 240, g: 240, b: 240 }
                    }
                })
                .png()
                .toBuffer();
                
                const selectedFrameStyle = this.getRandomFrameStyle();
                const framedBuffer = await selectedFrameStyle(defaultBuffer);
                
                const outputPath = path.join(this.tempDir, 'framed_anne.jpg');
                await sharp(framedBuffer).toFile(outputPath);
                
                console.log('✅ 기본 Anne 이미지 생성 완료');
                return outputPath;
            }
            
            // Anne 이미지 로드 및 프레임 적용
            const anneBuffer = await fs.promises.readFile(this.anneImagePath);
            const selectedFrameStyle = this.getRandomFrameStyle();
            const framedAnneBuffer = await selectedFrameStyle(anneBuffer);
            
            const outputPath = path.join(this.tempDir, 'framed_anne.jpg');
            await sharp(framedAnneBuffer).toFile(outputPath);
            
            console.log('✅ Anne 이미지 처리 완료');
            return outputPath;
            
        } catch (error) {
            console.error('❌ Anne 이미지 처리 실패:', error);
            throw error;
        }
    }

    /**
     * 여러 이미지 배치 처리
     * @param {Array} imageUrls 이미지 URL 배열
     * @param {boolean} includeAnne Anne 이미지 포함 여부
     * @returns {Promise<Array>} 처리된 이미지 파일 경로 배열
     */
    async processBatchImages(imageUrls, includeAnne = true) {
        try {
            console.log(`🖼️ 배치 이미지 처리 시작: ${imageUrls.length}개 이미지`);
            
            const processedImages = [];
            const maxConcurrent = 3; // 동시 처리 제한
            
            // 청크 단위로 처리
            for (let i = 0; i < imageUrls.length; i += maxConcurrent) {
                const chunk = imageUrls.slice(i, i + maxConcurrent);
                const chunkPromises = chunk.map((url, chunkIndex) => 
                    this.downloadAndConvertImage(url, i + chunkIndex)
                );
                
                try {
                    const chunkResults = await Promise.all(chunkPromises);
                    processedImages.push(...chunkResults);
                    
                    console.log(`📊 진행률: ${Math.min(i + maxConcurrent, imageUrls.length)}/${imageUrls.length} 완료`);
                    
                } catch (error) {
                    console.error(`❌ 청크 ${Math.floor(i/maxConcurrent) + 1} 처리 중 일부 실패:`, error);
                    // 개별 이미지 처리 시도
                    for (let j = 0; j < chunk.length; j++) {
                        try {
                            const result = await this.downloadAndConvertImage(chunk[j], i + j);
                            processedImages.push(result);
                        } catch (singleError) {
                            console.error(`❌ 단일 이미지 처리 실패 (${i + j + 1}):`, singleError.message);
                        }
                    }
                }
            }
            
            // Anne 이미지 추가
            if (includeAnne) {
                try {
                    const anneImagePath = await this.processAnneImage();
                    processedImages.push(anneImagePath);
                } catch (error) {
                    console.error('❌ Anne 이미지 추가 실패:', error);
                }
            }
            
            console.log(`✅ 배치 이미지 처리 완료: ${processedImages.length}개 처리됨`);
            return processedImages;
            
        } catch (error) {
            console.error('❌ 배치 이미지 처리 실패:', error);
            throw error;
        }
    }

    /**
     * 상품 이미지 처리 (메인 함수)
     * @param {Object} productData 상품 데이터
     * @returns {Promise<Object>}
     */
    async processProductImages(productData) {
        try {
            console.log(`🎯 상품 이미지 처리 시작: ${productData['상품명']}`);
            
            const imagesToProcess = [];
            
            // 썸네일 이미지 추가
            if (productData['이미지 URL']) {
                imagesToProcess.push(productData['이미지 URL']);
                console.log('📷 썸네일 이미지 추가됨');
            }
            
            // 디테일 이미지들 추가
            if (productData['디테일 이미지'] && Array.isArray(productData['디테일 이미지'])) {
                imagesToProcess.push(...productData['디테일 이미지']);
                console.log(`🖼️ 디테일 이미지 ${productData['디테일 이미지'].length}개 추가됨`);
            }
            
            if (imagesToProcess.length === 0) {
                throw new Error('처리할 이미지가 없습니다.');
            }
            
            console.log(`📊 총 처리할 이미지: ${imagesToProcess.length}개`);
            
            // 이미지 처리 실행
            const processedImagePaths = await this.processBatchImages(imagesToProcess, true);
            
            // 결과 저장
            const imageData = {
                productName: productData['상품명'],
                timestamp: new Date().toISOString(),
                originalImageCount: imagesToProcess.length,
                processedImageCount: processedImagePaths.length,
                imagePaths: processedImagePaths
            };
            
            await fs.promises.writeFile(
                this.processedImagesFile,
                JSON.stringify(imageData, null, 2),
                'utf8'
            );
            
            console.log(`💾 이미지 처리 결과 저장: ${this.processedImagesFile}`);
            console.log(`🎉 상품 이미지 처리 완료: ${processedImagePaths.length}개 이미지 처리됨`);
            
            return {
                success: true,
                imageCount: processedImagePaths.length,
                images: processedImagePaths,
                data: imageData,
                message: '이미지 처리 완료'
            };
            
        } catch (error) {
            console.error('❌ 상품 이미지 처리 실패:', error);
            return {
                success: false,
                error: error.message,
                imageCount: 0,
                message: '이미지 처리 실패'
            };
        }
    }

    /**
     * 이미지 메타데이터 추출
     * @param {string} imagePath 이미지 파일 경로
     * @returns {Promise<Object>}
     */
    async getImageMetadata(imagePath) {
        try {
            const metadata = await sharp(imagePath).metadata();
            const stats = fs.statSync(imagePath);
            
            return {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                size: stats.size,
                density: metadata.density,
                hasAlpha: metadata.hasAlpha
            };
        } catch (error) {
            console.error(`❌ 이미지 메타데이터 추출 실패: ${imagePath}`, error);
            return null;
        }
    }

    /**
     * 이미지 최적화
     * @param {string} inputPath 입력 파일 경로
     * @param {string} outputPath 출력 파일 경로
     * @param {Object} options 최적화 옵션
     * @returns {Promise<boolean>}
     */
    async optimizeImage(inputPath, outputPath, options = {}) {
        try {
            const defaultOptions = {
                quality: 85,
                width: null,
                height: null,
                format: 'jpeg'
            };
            
            const opts = { ...defaultOptions, ...options };
            
            let pipeline = sharp(inputPath);
            
            // 리사이징
            if (opts.width || opts.height) {
                pipeline = pipeline.resize(opts.width, opts.height, {
                    fit: sharp.fit.inside,
                    withoutEnlargement: true
                });
            }
            
            // 포맷 및 품질 설정
            switch (opts.format) {
                case 'jpeg':
                    pipeline = pipeline.png({ compressionLevel: 6, quality: opts.quality });
                    break;
                case 'png':
                    pipeline = pipeline.png({ compressionLevel: 6, quality: opts.quality });
                    break;
                case 'webp':
                    pipeline = pipeline.webp({ quality: opts.quality });
                    break;
                default:
                    pipeline = pipeline.png({ compressionLevel: 6, quality: opts.quality });
            }
            
            await pipeline.toFile(outputPath);
            console.log(`✅ 이미지 최적화 완료: ${outputPath}`);
            
            return true;
            
        } catch (error) {
            console.error(`❌ 이미지 최적화 실패: ${inputPath}`, error);
            return false;
        }
    }

    /**
     * 임시 파일 정리
     */
    async cleanupTempFiles() {
        try {
            console.log('🧹 임시 이미지 파일 정리 시작...');
            
            if (fs.existsSync(this.tempDir)) {
                const files = fs.readdirSync(this.tempDir);
                
                for (const file of files) {
                    const filePath = path.join(this.tempDir, file);
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ 삭제됨: ${file}`);
                }
                
                fs.rmdirSync(this.tempDir);
                console.log(`📁 임시 디렉토리 삭제: ${this.tempDir}`);
            }
            
            // 처리된 이미지 정보 파일 정리
            if (fs.existsSync(this.processedImagesFile)) {
                fs.unlinkSync(this.processedImagesFile);
                console.log(`🗑️ 처리된 이미지 정보 파일 삭제: ${this.processedImagesFile}`);
            }
            
            console.log('✅ 임시 파일 정리 완료');
            
        } catch (error) {
            console.error('❌ 임시 파일 정리 실패:', error);
        }
    }

    /**
     * 저장된 이미지 데이터 로드
     * @returns {Promise<Object|null>}
     */
    async loadProcessedImages() {
        try {
            if (!fs.existsSync(this.processedImagesFile)) {
                console.log('⚠️ 처리된 이미지 파일이 없습니다.');
                return null;
            }
            
            const rawData = fs.readFileSync(this.processedImagesFile, 'utf8');
            const imageData = JSON.parse(rawData);
            
            console.log('✅ 처리된 이미지 데이터 로드 성공');
            return imageData;
            
        } catch (error) {
            console.error('❌ 처리된 이미지 데이터 로드 실패:', error);
            return null;
        }
    }

    /**
     * 상태 확인
     * @returns {Object}
     */
    getStatus() {
        return {
            tempDirExists: fs.existsSync(this.tempDir),
            anneImageExists: fs.existsSync(this.anneImagePath),
            processedImagesFileExists: fs.existsSync(this.processedImagesFile),
            tempFileCount: fs.existsSync(this.tempDir) ? fs.readdirSync(this.tempDir).length : 0
        };
    }

    /**
     * 리소스 정리
     */
    async cleanup() {
        try {
            console.log('🧹 ImageProcessor 리소스 정리...');
            
            await this.cleanupTempFiles();
            
            console.log('✅ ImageProcessor 리소스 정리 완료');
            
        } catch (error) {
            console.error('❌ 리소스 정리 중 오류:', error);
        }
    }

    /**
     * 이미지 URL 배열을 처리하여 다운로드하고 프레임을 적용한 파일 경로를 반환
     * @param {Array<string>} imageUrls 이미지 URL 배열
     * @returns {Promise<Object>} 처리 결과 (success, imagePaths, error)
     */
    async processImages(imageUrls) {
        try {
            console.log(`🖼️ 배치 이미지 처리 시작: ${imageUrls.length}개 이미지`);
            
            if (!imageUrls || imageUrls.length === 0) {
                return {
                    success: false,
                    error: '처리할 이미지 URL이 없습니다.',
                    imagePaths: []
                };
            }
            
            const imagePaths = [];
            
            // 각 이미지를 순차적으로 처리
            for (let i = 0; i < imageUrls.length; i++) {
                const imageUrl = imageUrls[i];
                console.log(`🖼️ 이미지 ${i + 1} 처리 시작: ${imageUrl.substring(0, 50)}...`);
                
                try {
                    // 고유한 파일명 생성
                    const timestamp = Date.now();
                    const randomId = Math.floor(Math.random() * 1000);
                    const fileName = `image_${i}_${timestamp}_${randomId}.png`;
                    const outputPath = path.join(this.tempDir, fileName);
                    
                    console.log(`📁 이미지 저장 경로: ${outputPath}`);
                    
                    // 임시 디렉토리 존재 확인 및 재생성
                    if (!fs.existsSync(this.tempDir)) {
                        console.log('⚠️ 임시 디렉토리가 사라짐 - 재생성');
                        this.ensureTempDirectory();
                    }
                    
                    // 이미지 다운로드
                    const imageBuffer = await this.downloadImage(imageUrl);
                    
                    // 이미지 검증
                    const metadata = await sharp(imageBuffer).metadata();
                    console.log(`🖼️ [이미지 검증] 성공 - 해상도: ${metadata.width}x${metadata.height}, 포맷: ${metadata.format}`);
                    
                    // 엘레간트 카드 스타일 고정 적용
                    console.log(`🎨 엘레간트 카드 스타일 적용 중...`);
                    
                    const processedBuffer = await this.createFramedImage3(imageBuffer);
                    
                    console.log(`✅ 엘레간트 카드 스타일 적용 완료`);
                    
                    // 처리된 이미지 저장 (동기식으로 확실하게 저장)
                    console.log(`💾 이미지 파일 저장 시작: ${outputPath}`);
                    
                    try {
                        // 버퍼 크기 확인
                        console.log(`📊 처리된 이미지 버퍼 크기: ${processedBuffer.length} bytes`);
                        
                        // 동기식으로 파일 저장
                        fs.writeFileSync(outputPath, processedBuffer);
                        console.log(`✅ 이미지 파일 저장 완료: ${outputPath}`);
                        
                        // 파일 저장 검증 (즉시 확인)
                        if (!fs.existsSync(outputPath)) {
                            throw new Error(`이미지 파일 저장 실패 - 파일이 존재하지 않음: ${outputPath}`);
                        }
                        
                        // 파일 크기 확인
                        const fileStats = fs.statSync(outputPath);
                        const fileSize = fileStats.size;
                        
                        if (fileSize === 0) {
                            throw new Error(`이미지 파일 저장 실패 - 파일 크기가 0: ${outputPath}`);
                        }
                        
                        console.log(`✅ 파일 저장 검증 완료: ${fileName} (크기: ${Math.round(fileSize / 1024)}KB)`);
                        
                        // 파일 읽기 테스트
                        try {
                            const testBuffer = fs.readFileSync(outputPath);
                            if (testBuffer.length !== fileSize) {
                                throw new Error(`파일 읽기 테스트 실패 - 크기 불일치`);
                            }
                            console.log(`✅ 파일 읽기 테스트 성공: ${fileName}`);
                        } catch (readError) {
                            throw new Error(`파일 읽기 테스트 실패: ${readError.message}`);
                        }
                        
                        imagePaths.push(outputPath);
                        console.log(`✅ 이미지 ${i + 1} 처리 완료: ${fileName}`);
                        
                    } catch (saveError) {
                        console.error(`❌ 이미지 파일 저장 실패:`, {
                            error: saveError.message,
                            outputPath: outputPath,
                            bufferSize: processedBuffer.length,
                            tempDirExists: fs.existsSync(this.tempDir)
                        });
                        
                        // 대체 저장 위치 시도
                        const fallbackPath = path.join(os.tmpdir(), fileName);
                        console.log(`🔄 대체 저장 위치 시도: ${fallbackPath}`);
                        
                        try {
                            fs.writeFileSync(fallbackPath, processedBuffer);
                            
                            if (fs.existsSync(fallbackPath) && fs.statSync(fallbackPath).size > 0) {
                                console.log(`✅ 대체 위치에 저장 성공: ${fallbackPath}`);
                                imagePaths.push(fallbackPath);
                            } else {
                                throw new Error('대체 위치 저장도 실패');
                            }
                        } catch (fallbackError) {
                            console.error(`❌ 대체 위치 저장도 실패:`, fallbackError.message);
                            throw saveError; // 원래 에러를 다시 던짐
                        }
                    }
                    
                    // 진행률 출력
                    console.log(`📊 진행률: ${i + 1}/${imageUrls.length} 완료`);
                    
                } catch (imageError) {
                    console.error(`❌ 이미지 ${i + 1} 처리 실패:`, {
                        error: imageError.message,
                        url: imageUrl,
                        stack: imageError.stack
                    });
                    // 개별 이미지 실패해도 계속 진행
                    continue;
                }
            }
            
            console.log(`✅ 배치 이미지 처리 완료: ${imagePaths.length}개 처리됨`);
            
            // 최종 결과에서 모든 파일 존재 여부 재확인
            const validImagePaths = [];
            for (const imagePath of imagePaths) {
                if (fs.existsSync(imagePath) && fs.statSync(imagePath).size > 0) {
                    validImagePaths.push(imagePath);
                    console.log(`✅ 최종 검증 통과: ${path.basename(imagePath)}`);
                } else {
                    console.warn(`⚠️ 최종 검증 실패: ${imagePath}`);
                }
            }
            
            console.log(`📊 최종 유효한 이미지: ${validImagePaths.length}개`);
            
            return {
                success: true,
                imagePaths: validImagePaths,
                processedCount: validImagePaths.length,
                totalCount: imageUrls.length
            };
            
        } catch (error) {
            console.error('❌ 배치 이미지 처리 실패:', error);
            return {
                success: false,
                error: error.message,
                imagePaths: []
            };
        }
    }
}

module.exports = ImageProcessor; 