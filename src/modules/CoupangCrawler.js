const { createHmac } = require('crypto');
const { blake3 } = require('@noble/hashes/blake3');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ConfigManager = require('./ConfigManager');

/**
 * 쿠팡 크롤링 관리 모듈 (API 기반) - 개별 URL 순차 처리
 * HMAC-BLAKE3 서명을 사용하여 외부 API를 통해 쿠팡 상품 데이터를 크롤링합니다.
 */
class CoupangCrawler {
    constructor(appDataPath) {
        if (!appDataPath) {
            throw new Error("[CoupangCrawler] appDataPath가 제공되지 않았습니다.");
        }

        this.SCRIPT_DIR = path.join(appDataPath, 'coupang_crawler');
        console.log(`[CoupangCrawler] 스크립트 디렉토리 설정: ${this.SCRIPT_DIR}`);
        
        this.RESULT_FILE = path.join(this.SCRIPT_DIR, 'result.json');
        this.URL_FILE = null; // 작업 파일 (current_urls.txt 등)
        this.ORIGINAL_URL_FILE_PATH = null; // 사용자가 업로드한 원본 파일 경로
        this.VALIDATED_URLS_FILE = path.join(this.SCRIPT_DIR, 'validated_urls.json');
        
        // API 설정
        this.API_BASE_URL = 'https://api.2eum.co.kr/open';
        this.SECRET_KEY = 'fr33frommoney';
        
        // 자동화 설정
        this.isRunning = false;
        this.currentProgress = 0;
        this.totalUrls = 0;
        this.currentUrlIndex = 0;
        this.currentStep = '';
        this.currentAccount = null;
        this.affiliateId = '';
        
        // 대기시간 설정 (초 단위)
        this.minDelay = 10;
        this.maxDelay = 30;
        
        // 실행 횟수 설정
        this.maxExecutionCount = 1;
        this.currentExecutionCount = 0;
        
        // 시간 오프셋 설정 (서버와 시간 동기화를 위한 보정값, 초 단위)
        this.timeOffset = 0;
        
        // 계정 관리
        this.accounts = [];
        this.currentAccountIndex = 0;
        
        // ContentGenerator 인스턴스 관리
        this.activeContentGenerators = new Set();
        
        // 디렉토리 생성
        if (!fs.existsSync(this.SCRIPT_DIR)) {
            fs.mkdirSync(this.SCRIPT_DIR, { recursive: true });
        }
        
        console.log('🔧 CoupangCrawler 초기화 완료');
    }

    /**
     * 자동화 설정 업데이트
     * @param {Object} config 설정 객체
     */
    updateConfig(config) {
        if (config.affiliateId) this.affiliateId = config.affiliateId;
        if (config.minDelay) this.minDelay = config.minDelay;
        if (config.maxDelay) this.maxDelay = config.maxDelay;
        if (config.maxExecutionCount) this.maxExecutionCount = config.maxExecutionCount;
        if (config.accounts) this.accounts = config.accounts;
        if (config.timeOffset !== undefined) this.timeOffset = config.timeOffset;
        
        console.log('📋 자동화 설정 업데이트:', {
            affiliateId: this.affiliateId,
            minDelay: this.minDelay,
            maxDelay: this.maxDelay,
            maxExecutionCount: this.maxExecutionCount,
            accountCount: this.accounts.length,
            timeOffset: this.timeOffset
        });
    }

    /**
     * URL 목록 설정
     * @param {Array<string>} urls URL 목록
     * @returns {Promise<Object>} 설정 결과
     */
    async setUrls(urls) {
        try {
            console.log('📂 URL 목록 설정 시작:', urls.length);
            
            // URL 유효성 검사
            const validUrls = urls.filter(url => {
                if (!url || typeof url !== 'string') return false;
                try {
                    new URL(url);
                    return url.includes('coupang.com');
                } catch {
                    return false;
                }
            });
            
            if (validUrls.length === 0) {
                throw new Error('유효한 쿠팡 URL이 없습니다.');
            }
            
            // URL 목록을 파일로 저장
            const urlFilePath = path.join(this.SCRIPT_DIR, 'uploaded_urls.txt');
            await fs.promises.writeFile(urlFilePath, validUrls.join('\n'), 'utf8');
            
            // URL_FILE 속성 업데이트
            this.URL_FILE = urlFilePath;
            this.totalUrls = validUrls.length;
            this.currentUrlIndex = 0;
            
            console.log('✅ URL 목록 설정 완료:', {
                총URL수: validUrls.length,
                유효URL수: validUrls.length,
                저장경로: urlFilePath
            });
            
            return {
                success: true,
                totalUrls: validUrls.length,
                validUrls: validUrls.length,
                filePath: urlFilePath
            };
            
        } catch (error) {
            console.error('❌ URL 목록 설정 실패:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 랜덤 대기시간 생성 (초 단위)
     * @returns {number} 대기시간 (밀리초)
     */
    getRandomDelay() {
        const randomSeconds = Math.floor(Math.random() * (this.maxDelay - this.minDelay + 1)) + this.minDelay;
        console.log(`⏰ 랜덤 대기시간: ${randomSeconds}초`);
        return randomSeconds * 1000; // 밀리초로 변환
    }

    /**
     * TraceId 생성 함수
     * @returns {string} TraceId
     */
    generateTraceId() {
        const randomBytes = new Uint8Array(8);
        require('crypto').getRandomValues(randomBytes);
        const hexString = Array.from(randomBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        return 'V0-181-' + hexString;
    }

    /**
     * 쿠팡 어필리에이트 URL 생성 함수
     * @param {string} productPageUrl 상품 페이지 URL
     * @param {string} affiliateId 어필리에이트 ID
     * @returns {string|null} 어필리에이트 URL
     */
    createCoupangAffiliateUrl(productPageUrl, affiliateId) {
        try {
            // URL 파싱
            const url = new URL(productPageUrl);
            const pathParts = url.pathname.split('/');
            
            // 상품 ID 추출 (URL 경로에서)
            const productId = pathParts[3] || '';
            
            // 쿼리 파라미터에서 itemId, vendorItemId 추출
            const itemId = url.searchParams.get('itemId') || '';
            const vendorItemId = url.searchParams.get('vendorItemId') || '';
            
            // TraceId 생성
            const traceid = this.generateTraceId();
            
            // 상품 타입 결정 (URL 패턴에 따라)
            const productType = productPageUrl.includes("/vp/products/") ? "AFFSDP" : "AFFTDP";
            
            // 어필리에이트 URL 생성
            const coupangUrl = `https://link.coupang.com/re/${productType}?lptag=${affiliateId}&pageKey=${productId}&traceid=${traceid}&itemId=${itemId}&vendorItemId=${vendorItemId}`;
            
            console.log('🔗 어필리에이트 URL 생성:', coupangUrl);
            return coupangUrl;
        } catch (error) {
            console.error('❌ 어필리에이트 URL 생성 오류:', error);
            return null;
        }
    }

    /**
     * HMAC-BLAKE3 서명 생성 함수 (RFC 2104 표준 준수)
     * @param {string} body 요청 본문
     * @param {string} timestamp 타임스탬프
     * @returns {string} 서명
     */
    createHMACBlake3Signature(body, timestamp) {
        try {
            const message = Buffer.concat([Buffer.from(body), Buffer.from(timestamp)]);
            const key = Buffer.from(this.SECRET_KEY);
            
            // HMAC-BLAKE3 구현 (RFC 2104 표준 따름)
            const blockSize = 64; // BLAKE3의 블록 크기
            let keyPad = Buffer.alloc(blockSize);
            
            if (key.length > blockSize) {
                const hashedKey = blake3(key);
                Buffer.from(hashedKey).copy(keyPad);
            } else {
                key.copy(keyPad);
            }
            
            const oKeyPad = Buffer.alloc(blockSize);
            const iKeyPad = Buffer.alloc(blockSize);
            
            for (let i = 0; i < blockSize; i++) {
                oKeyPad[i] = keyPad[i] ^ 0x5c;
                iKeyPad[i] = keyPad[i] ^ 0x36;
            }
            
            const innerHash = blake3(Buffer.concat([iKeyPad, message]));
            const outerHash = blake3(Buffer.concat([oKeyPad, Buffer.from(innerHash)]));
            
            return Buffer.from(outerHash).toString('hex');
        } catch (error) {
            console.error('❌ 서명 생성 실패:', error);
            throw new Error(`서명 생성 실패: ${error.message}`);
        }
    }

    /**
     * 쿠팡 URL 정리 (깔끔한 product URL만 추출)
     * @param {string} url 원본 쿠팡 URL
     * @returns {string} 정리된 URL
     */
    cleanCoupangURL(url) {
        try {
            // products/ 다음의 숫자 ID만 추출
            const match = url.match(/\/products\/(\d+)/);
            if (match && match[1]) {
                return `https://www.coupang.com/vp/products/${match[1]}`;
            }
            return url; // 매칭되지 않으면 원본 반환
        } catch (error) {
            console.error('❌ URL 정리 실패:', error);
            return url; // 오류 시 원본 반환
        }
    }

    /**
     * API 요청 보내기
     * @param {string} endpoint API 엔드포인트 ('validate' 또는 'scrape')
     * @param {Object} body 요청 본문
     * @returns {Promise<Object>} API 응답
     */
    async sendAPIRequest(endpoint, body, retryCount = 0) {
        const bodyString = JSON.stringify(body);
        const maxRetries = 3;
        
        try {
            console.log(`🌐 API 요청: ${endpoint}${retryCount > 0 ? ` (재시도 ${retryCount}/${maxRetries})` : ''}`, body);
            
            // 요청 직전에 타임스탬프 생성 (지연 최소화 + 시간 오프셋 적용)
            const timestamp = Math.floor(Date.now() - 10000).toString();
            const signature = this.createHMACBlake3Signature(bodyString, timestamp);
            
            console.log(`⏰ 타임스탬프: ${timestamp}`);
            console.log(`🔐 서명: ${signature.substring(0, 16)}...`);
            
            // 요청 정보 상세 로그
            const requestUrl = `${this.API_BASE_URL}/${endpoint}`;
            const requestHeaders = {
                'X-Signature': signature,
                'X-Timestamp': timestamp,
                'Content-Type': 'application/json'
            };
            
            console.log('📋 === API 요청 상세 정보 ===');
            console.log(`🔗 URL: ${requestUrl}`);
            console.log('📨 Headers:', requestHeaders);
            console.log('📄 Body:', bodyString);
            console.log('⏱️ Timeout: 60000ms');
            console.log('============================');
            
            const response = await axios.post(requestUrl, body, {
                headers: requestHeaders,
                timeout: 60000  // timeout을 60초로 줄임
            });
            
            console.log(`✅ API 응답 성공: ${endpoint}`);
            return {
                success: true,
                data: response.data
            };
            
        } catch (error) {
            const errorMessage = error.response?.data || error.message;
            console.error(`❌ API 요청 실패: ${endpoint}`, errorMessage);
            
            // 타임스탬프 오류 시 재시도 로직
            if (retryCount < maxRetries && 
                (errorMessage.includes?.('Timestamp is invalid') || 
                 errorMessage.includes?.('expired') || 
                 errorMessage.error === 'Timestamp is invalid or expired')) {
                
                console.log(`⏳ 타임스탬프 오류 감지, ${retryCount + 1}초 후 재시도... (중지 가능)`);
                
                // 🔥 재시도 대기 중에도 중지 요청 체크
                const retryDelay = (retryCount + 1) * 1000;
                for (let i = 0; i < retryDelay; i += 100) {
                    if (!this.isRunning) {
                        console.log('⏹️ API 재시도 대기 중 자동화 중지 요청 감지');
                        return {
                            success: false,
                            error: '자동화가 중지되었습니다.',
                            cancelled: true
                        };
                    }
                    await this.delay(100);
                }
                
                // 시간 오프셋 조정 시도
                if (retryCount === 1) {
                    this.timeOffset = -1; // 1초 빠르게
                    console.log('🔧 시간 오프셋을 -1초로 조정');
                } else if (retryCount === 2) {
                    this.timeOffset = 1; // 1초 늦게
                    console.log('🔧 시간 오프셋을 +1초로 조정');
                }
                
                return await this.sendAPIRequest(endpoint, body, retryCount + 1);
            }
            
            return {
                success: false,
                error: errorMessage,
                status: error.response?.status
            };
        }
    }

    /**
     * 메모장 파일에서 URL 목록 읽기
     * @param {string} filePath 파일 경로
     * @returns {Promise<string[]>} URL 배열
     */
    async readURLsFromFile(filePath) {
        try {
            console.log(`📂 URL 파일 읽기: ${filePath}`);
            
            if (!fs.existsSync(filePath)) {
                throw new Error('URL 파일을 찾을 수 없습니다.');
            }
            
            const content = fs.readFileSync(filePath, 'utf8');
            const urls = content
                .split('\n')
                .map(url => url.trim())
                .filter(url => url.length > 0 && url.includes('coupang.com'));
                // URL 정리 제거 - 원본 URL 그대로 반환
            
            console.log(`📋 총 ${urls.length}개의 URL을 읽었습니다.`);
            console.log(`🔍 첫 번째 URL 예시 (원본): ${urls[0] ? urls[0].substring(0, 100) + '...' : '없음'}`);
            
            if (urls.length === 0) {
                throw new Error('유효한 쿠팡 URL을 찾을 수 없습니다.');
            }
            
            return urls;
            
        } catch (error) {
            console.error('❌ URL 파일 읽기 실패:', error);
            throw error;
        }
    }

    /**
     * URL 목록 파일 업로드 처리
     * @param {string} sourceFilePath 업로드된 파일 경로
     * @returns {Promise<string[]>} 읽은 URL 배열
     */
    async uploadURLFile(sourceFilePath, isPackaged = false, userDataPath = null) {
        try {
            console.log(`📤 URL 파일 업로드: ${sourceFilePath}`);
            this.ORIGINAL_URL_FILE_PATH = sourceFilePath; // 🔥 원본 파일 경로 저장
            
            // 파일 존재 확인
            if (!fs.existsSync(sourceFilePath)) {
                throw new Error(`업로드할 파일이 존재하지 않습니다: ${sourceFilePath}`);
            }
            
            // 빌드 환경에서는 사용자 데이터 디렉토리에 복사해서 사용
            if (isPackaged && userDataPath) {
                console.log(`🔧 빌드 환경: 안전한 위치로 파일 복사`);
                
                const safeUrlFile = path.join(userDataPath, 'current_urls.txt');
                
                console.log(`📁 사용자 데이터 경로: ${userDataPath}`);
                console.log(`📄 안전한 파일 경로: ${safeUrlFile}`);
                
                // 디렉토리 생성 확인
                if (!fs.existsSync(userDataPath)) {
                    fs.mkdirSync(userDataPath, { recursive: true });
                }
                
                // 파일 복사
                fs.copyFileSync(sourceFilePath, safeUrlFile);
                this.URL_FILE = safeUrlFile; // 작업 파일은 복사본으로 설정
                
                console.log(`✅ 파일 복사 완료: ${this.URL_FILE}`);
            } else {
                // 개발 환경에서는 원본 파일을 직접 사용
                console.log(`🔧 개발 환경: 원본 파일 직접 사용`);
                this.URL_FILE = sourceFilePath;
            }
            
            console.log(`💾 최종 작업 URL 파일(URL_FILE): ${this.URL_FILE}`);
            console.log(`💾 원본 URL 파일(ORIGINAL_URL_FILE_PATH): ${this.ORIGINAL_URL_FILE_PATH}`);
            console.log(`🔍 URL_FILE 설정 확인: ${this.URL_FILE ? '설정됨' : '설정되지 않음'}`);
            
            // URL 읽기
            const urls = await this.readURLsFromFile(this.URL_FILE);
            console.log(`📋 총 ${urls.length}개 URL 로드 완료`);
            
            return urls;
            
        } catch (error) {
            console.error('❌ URL 파일 업로드 실패:', error);
            this.URL_FILE = null; // 실패 시 null로 리셋
            this.ORIGINAL_URL_FILE_PATH = null;
            throw error;
        }
    }

    /**
     * 개별 URL 처리 (검증 → 크롤링 → 컨텐츠 생성 → 블로그 업로드)
     * @param {string} url 처리할 URL
     * @param {number} index URL 인덱스
     * @param {Object} account 사용할 계정 정보
     * @returns {Promise<Object>} 처리 결과
     */
    async processSingleURL(url, index, account) {
        try {
            console.log(`\n🔄 URL 처리 시작 (${index + 1}/${this.totalUrls}): ${url}`);
            console.log(`👤 사용 계정: ${account.username}`);
            
            this.currentStep = `URL ${index + 1} 처리 중`;
            this.currentUrlIndex = index;
            
            // 1단계: 상품 크롤링 (재시도 로직 포함)
            console.log('🕷️ 1단계: 상품 크롤링');
            const cleanUrl = this.cleanCoupangURL(url);
            
            let scrapeResult;
            const maxRetries = 3; // 최대 재시도 횟수
            let retryCount = 0;
            
            while (retryCount <= maxRetries) {
                // 🔥 재시도 루프 시작 시 중지 요청 확인
                if (!this.isRunning) {
                    console.log('⏹️ 재시도 중 자동화 중지 요청 감지');
                    throw new Error('자동화가 중지되었습니다.');
                }
                
                if (retryCount > 0) {
                    console.log(`🔄 크롤링 재시도 ${retryCount}/${maxRetries}...`);
                    // 재시도 전 대기 (2초씩 증가: 2초, 4초, 6초) - 중지 체크 포함
                    const delayTime = 2000 * retryCount;
                    console.log(`⏳ ${delayTime/1000}초 대기 중... (중지 가능)`);
                    
                    // 100ms씩 나누어서 대기하며 중지 요청 체크
                    for (let i = 0; i < delayTime; i += 100) {
                        if (!this.isRunning) {
                            console.log('⏹️ 대기 중 자동화 중지 요청 감지');
                            throw new Error('자동화가 중지되었습니다.');
                        }
                        await this.delay(100);
                    }
                }
                
                // 🔥 API 요청 전 중지 요청 확인
                if (!this.isRunning) {
                    console.log('⏹️ API 요청 전 자동화 중지 요청 감지');
                    throw new Error('자동화가 중지되었습니다.');
                }
                
                scrapeResult = await this.sendAPIRequest('scrape', { productURL: cleanUrl });
                
                // 기본적인 성공 여부 확인
                if (!scrapeResult.success || !scrapeResult.data) {
                    console.error(`❌ 크롤링 기본 실패 (시도 ${retryCount + 1}/${maxRetries + 1}): ${scrapeResult.error}`);
                    retryCount++;
                    
                    if (retryCount > maxRetries) {
                        throw new Error(`상품 크롤링 실패 (${maxRetries + 1}회 시도): ${scrapeResult.error}`);
                    }
                    continue;
                }
                
                // itemId가 0인 경우 실패로 간주하고 재시도
                if (scrapeResult.data.itemId === 0 || scrapeResult.data.itemId === "0") {
                    console.warn(`⚠️ itemId가 0으로 크롤링 실패 감지 (시도 ${retryCount + 1}/${maxRetries + 1})`);
                    console.log(`🔍 [디버깅] scrapeResult.data.itemId: ${scrapeResult.data.itemId} (타입: ${typeof scrapeResult.data.itemId})`);
                    retryCount++;
                    
                    if (retryCount > maxRetries) {
                        throw new Error(`상품 크롤링 실패 - itemId가 0입니다 (${maxRetries + 1}회 시도 후 포기)`);
                    }
                    continue;
                }
                
                // 성공한 경우 루프 종료
                console.log('✅ 상품 크롤링 성공');
                console.log(`🔍 [성공] itemId: ${scrapeResult.data.itemId}`);
                break;
            }
            
            // 🔍 API 응답 구조 디버깅
            console.log('🔍 [API 응답 디버깅] scrapeResult.data 구조:');
            console.log('🔍 전체 데이터:', JSON.stringify(scrapeResult.data, null, 2));
            console.log('🔍 데이터 키들:', Object.keys(scrapeResult.data || {}));
            console.log('🔍 이미지 관련 필드 확인:');
            console.log('  - images:', scrapeResult.data?.images);
            console.log('  - imageUrls:', scrapeResult.data?.imageUrls);
            console.log('  - productImages:', scrapeResult.data?.productImages);
            console.log('  - img:', scrapeResult.data?.img);
            console.log('  - thumbnail:', scrapeResult.data?.thumbnail);
            
            // 어필리에이트 URL 생성
            const affiliateUrl = this.createCoupangAffiliateUrl(cleanUrl, this.affiliateId);
            
            // 크롤링 데이터에 어필리에이트 URL 추가
            const productData = {
                ...scrapeResult.data,
                originalUrl: url,
                cleanUrl: cleanUrl,
                affiliateUrl: affiliateUrl,
                crawledAt: new Date().toISOString(),
                account: account.username
            };
            
            // 중지 요청 확인
            console.log(`🔍 [디버깅] isRunning 상태 확인: ${this.isRunning}`);
            if (!this.isRunning) {
                console.log('⏹️ 자동화 중지 요청으로 처리 중단');
                console.log(`🔍 [디버깅] 중지 상태 세부정보:`, {
                    isRunning: this.isRunning,
                    currentProgress: this.currentProgress,
                    currentStep: this.currentStep,
                    currentAccount: this.currentAccount
                });
                throw new Error('자동화가 중지되었습니다.');
            }
            
            // 3단계: 컨텐츠 생성 (ContentGenerator 사용)
            console.log('📝 3단계: 컨텐츠 생성');
            const ContentGenerator = require('./ContentGenerator');
            const contentGenerator = new ContentGenerator();
            
            let contentResult; // 변수를 try 블록 밖에서 선언
            try {
                // ContentGenerator를 활성 목록에 추가
                this.activeContentGenerators.add(contentGenerator);
                
                // 계정 정보에서 Claude API 키 가져오기
                const claudeApiKey = account.claudeApi || account.claudeApiKey;
                if (!claudeApiKey) {
                    throw new Error(`계정 ${account.username || account.id}의 Claude API 키가 설정되지 않았습니다.`);
                }
                
                contentGenerator.setApiKey(claudeApiKey);
                contentResult = await contentGenerator.generateAllContent(productData);
                
                if (!contentResult.success) {
                    throw new Error(`컨텐츠 생성 실패: ${contentResult.error}`);
                }
                
                console.log('✅ 컨텐츠 생성 완료');
            } finally {
                // ContentGenerator를 활성 목록에서 제거
                this.activeContentGenerators.delete(contentGenerator);
            }
            
            // 결과 저장 (크롤링 데이터 + 컨텐츠 데이터만)
            const result = {
                url: cleanUrl,
                originalUrl: url,
                affiliateUrl: affiliateUrl,
                productData: productData,
                contentData: contentResult?.data || null, // null-safe 접근
                account: account.username,
                processedAt: new Date().toISOString(),
                success: true
            };
            
            // 개별 결과 파일 저장
            const resultFile = path.join(this.SCRIPT_DIR, `result_${Date.now()}_${index + 1}.json`);
            fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
            console.log(`💾 결과 저장: ${resultFile}`);
            
            // 🔥 URL 삭제는 main.js에서 블로그 발행 완료 후 처리하도록 변경
            console.log(`✅ 크롤링 및 컨텐츠 생성 완료 (URL 삭제는 블로그 발행 후)`);
            // await this.removeProcessedUrl(url); // 주석 처리
            
            return result;
            
        } catch (error) {
            console.error(`❌ URL 처리 실패 (${index + 1}/${this.totalUrls}):`, error);
            
            const errorResult = {
                url: url,
                originalUrl: url,
                error: error.message,
                account: account.username,
                processedAt: new Date().toISOString(),
                success: false
            };
            
            return errorResult;
        }
    }

    /**
     * 자동화 실행 (개별 URL 순차 처리)
     * @param {string} urlFilePath URL 파일 경로 (선택사항, null이면 기존 URL_FILE 사용)
     * @param {Object} singleAccount 단일 계정 (main.js에서 호출 시 사용)
     * @returns {Promise<Object>} 실행 결과
     */
    async runAutomation(urlFilePath = null, singleAccount = null) {
        // 이미 자동화가 실행 중인지 확인
        if (this.isRunning) {
            console.log('⚠️ 자동화가 이미 실행 중입니다.');
            return {
                success: false,
                error: '이미 자동화가 진행 중입니다.',
                message: '자동화 진행 중'
            };
        }

        try {
            this.isRunning = true;
            this.currentProgress = 0;
            this.currentExecutionCount = 0;
            this.currentAccountIndex = 0;
            
            // 기존 ContentGenerator 인스턴스들 정리 및 중지 플래그 초기화
            this.activeContentGenerators.clear();
            
            console.log('🚀 쿠팡 자동화 시작...');
            console.log(`🔍 [디버깅] 자동화 시작 - isRunning: ${this.isRunning}`);
            
            // 단일 계정 처리 (main.js에서 호출된 경우)
            if (singleAccount) {
                this.accounts = [singleAccount];
                console.log(`👤 단일 계정 모드: ${singleAccount.username || singleAccount.id}`);
                
                // 단일 계정 모드에서는 URL 순차 처리만 수행
                return await this.runSingleAccountAutomation(urlFilePath, singleAccount);
            } else {
                // 다중 계정 모드 (기존 로직)
                return await this.runMultiAccountAutomation(urlFilePath);
            }
            
        } catch (error) {
            console.error('❌ 자동화 실패:', error);
            return {
                success: false,
                error: error.message,
                message: '자동화 실패'
            };
        } finally {
            this.isRunning = false;
            this.currentProgress = 0;
            this.currentStep = '';
            this.currentUrlIndex = 0;
            this.currentExecutionCount = 0;
            this.currentAccount = null;
        }
    }

    /**
     * 단일 계정 자동화 실행 (URL 순차 처리만)
     * @param {string} urlFilePath URL 파일 경로
     * @param {Object} account 계정 정보
     * @returns {Promise<Object>} 실행 결과
     */
    async runSingleAccountAutomation(urlFilePath, account) {
        try {
            console.log(`🎯 단일 계정 자동화 시작: ${account.username || account.id}`);
            
            // URL 파일 처리
            let urls = [];
            
            if (urlFilePath) {
                console.log(`📂 새로운 URL 파일 사용: ${urlFilePath}`);
                urls = await this.readURLsFromFile(urlFilePath);
                this.URL_FILE = urlFilePath;
            } else if (this.URL_FILE && fs.existsSync(this.URL_FILE)) {
                console.log(`📂 기존 업로드된 URL 파일 사용: ${this.URL_FILE}`);
                urls = await this.readURLsFromFile(this.URL_FILE);
            } else {
                throw new Error('URL 파일이 설정되지 않았습니다. 먼저 URL 파일을 업로드해주세요.');
            }

            if (urls.length === 0) {
                throw new Error('처리할 URL이 없습니다. URL 파일에 올바른 URL을 입력해주세요.');
            }

            console.log(`📋 총 ${urls.length}개 URL 순차 처리 예정`);
            this.totalUrls = urls.length;
            this.currentAccount = account;
            
            const results = [];
            
            // URL별 순차 처리 (단일 루프만 사용)
            for (let urlIndex = 0; urlIndex < urls.length; urlIndex++) {
                if (!this.isRunning) {
                    console.log('⏹️ 자동화 중지 요청으로 처리 중단');
                    break;
                }
                
                const url = urls[urlIndex];
                this.currentUrlIndex = urlIndex;
                
                console.log(`\n🎯 [${urlIndex + 1}/${urls.length}] URL 순차 처리: ${url}`);
                
                // 개별 URL 처리
                const result = await this.processSingleURL(url, urlIndex, account);
                results.push(result);
                
                // 진행률 업데이트
                this.currentProgress = Math.round(((urlIndex + 1) / urls.length) * 100);
                console.log(`📊 진행률: ${this.currentProgress}% (${urlIndex + 1}/${urls.length})`);
                
                // 다음 URL 처리 전 대기 (마지막 URL이 아닌 경우)
                if (urlIndex < urls.length - 1) {
                    const delay = this.getRandomDelay();
                    console.log(`⏸️ 다음 URL 처리까지 대기: ${delay/1000}초 (중지 가능)`);
                    
                    // 🔥 긴 대기시간을 100ms씩 나누어서 중지 요청 체크
                    for (let i = 0; i < delay; i += 100) {
                        if (!this.isRunning) {
                            console.log('⏹️ URL 간 대기 중 자동화 중지 요청 감지');
                            throw new Error('자동화가 중지되었습니다.');
                        }
                        await this.delay(100);
                    }
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            const errorCount = results.filter(r => !r.success).length;
            
            console.log(`\n🎉 단일 계정 자동화 완료!`);
            console.log(`📊 성공: ${successCount}개, 실패: ${errorCount}개`);
            
            return {
                success: true,
                data: {
                    summary: {
                        totalUrls: urls.length,
                        processedUrls: results.length,
                        successCount: successCount,
                        errorCount: errorCount,
                        account: account.username || account.id,
                        completedAt: new Date().toISOString()
                    },
                    results: results
                },
                message: '단일 계정 자동화 완료'
            };
            
        } catch (error) {
            console.error('❌ 단일 계정 자동화 실패:', error);
            throw error;
        }
    }

    /**
     * 다중 계정 자동화 실행 (기존 로직)
     * @param {string} urlFilePath URL 파일 경로
     * @returns {Promise<Object>} 실행 결과
     */
    async runMultiAccountAutomation(urlFilePath) {
        try {
            // ConfigManager에서 최신 계정 정보 가져오기
            const configAccounts = this.getAccountsFromConfig();
            if (configAccounts.length > 0) {
                this.accounts = configAccounts;
                console.log(`📋 ConfigManager에서 ${configAccounts.length}개 계정 로드 완료`);
            } else {
                console.log('⚠️ ConfigManager에서 계정 정보를 찾을 수 없습니다. 기존 설정 사용');
            }
            
            console.log(`📊 설정: 어필리에이트ID(${this.affiliateId}), 대기시간(${this.minDelay}-${this.maxDelay}초), 실행횟수(${this.maxExecutionCount}회), 계정수(${this.accounts.length}개)`);
            
            // 계정이 없으면 오류 반환
            if (this.accounts.length === 0) {
                throw new Error('등록된 계정이 없습니다. 먼저 계정을 등록해주세요.');
            }

            // URL 파일 처리
            let urls = [];
            
            if (urlFilePath) {
                console.log(`📂 새로운 URL 파일 사용: ${urlFilePath}`);
                urls = await this.readURLsFromFile(urlFilePath);
                this.URL_FILE = urlFilePath;
            } else if (this.URL_FILE && fs.existsSync(this.URL_FILE)) {
                console.log(`📂 기존 업로드된 URL 파일 사용: ${this.URL_FILE}`);
                urls = await this.readURLsFromFile(this.URL_FILE);
            } else {
                const errorMsg = this.URL_FILE ? 
                    `URL 파일을 찾을 수 없습니다: ${this.URL_FILE}. 먼저 URL 파일을 업로드해주세요.` :
                    'URL 파일이 설정되지 않았습니다. 먼저 URL 파일을 업로드해주세요.';
                    
                console.error('❌ URL 파일 오류:', errorMsg);
                throw new Error(errorMsg);
            }

            if (urls.length === 0) {
                throw new Error('처리할 URL이 없습니다. URL 파일에 올바른 URL을 입력해주세요.');
            }

            console.log(`📋 총 ${urls.length}개 URL 처리 예정`);
            this.totalUrls = urls.length;
            const totalTasks = this.totalUrls * this.maxExecutionCount * this.accounts.length;
            
            console.log(`📊 총 작업 수: ${totalTasks} (URL: ${this.totalUrls}, 실행횟수: ${this.maxExecutionCount}, 계정: ${this.accounts.length})`);
            
            const results = [];
            let completedTasks = 0;
            
            // 계정별 실행
            for (let accountIndex = 0; accountIndex < this.accounts.length; accountIndex++) {
                if (!this.isRunning) break;
                
                const account = this.accounts[accountIndex];
                this.currentAccount = account;
                this.currentAccountIndex = accountIndex;
                
                console.log(`\n👤 계정 ${accountIndex + 1}/${this.accounts.length}: ${account.username}`);
                
                // 실행 횟수별 처리
                for (let execCount = 0; execCount < this.maxExecutionCount; execCount++) {
                    if (!this.isRunning) break;
                    
                    console.log(`\n🔄 실행 횟수: ${execCount + 1}/${this.maxExecutionCount}`);
                    this.currentExecutionCount = execCount + 1;
                    
                    // URL별 처리
                    for (let urlIndex = 0; urlIndex < urls.length; urlIndex++) {
                        if (!this.isRunning) break;
                        
                        const url = urls[urlIndex];
                        
                        // 개별 URL 처리
                        const result = await this.processSingleURL(url, urlIndex, account);
                        results.push(result);
                        
                        completedTasks++;
                        this.currentProgress = Math.round((completedTasks / totalTasks) * 100);
                        
                        console.log(`📊 진행률: ${this.currentProgress}% (${completedTasks}/${totalTasks})`);
                        
                        // 다음 URL 처리 전 랜덤 대기
                        if (urlIndex < urls.length - 1 || execCount < this.maxExecutionCount - 1 || accountIndex < this.accounts.length - 1) {
                            const delay = this.getRandomDelay();
                            console.log(`⏸️ 다음 작업까지 대기: ${delay/1000}초 (중지 가능)`);
                            
                            // 🔥 긴 대기시간을 100ms씩 나누어서 중지 요청 체크
                            for (let i = 0; i < delay; i += 100) {
                                if (!this.isRunning) {
                                    console.log('⏹️ 작업 간 대기 중 자동화 중지 요청 감지');
                                    throw new Error('자동화가 중지되었습니다.');
                                }
                                await this.delay(100);
                            }
                        }
                    }
                }
            }
            
            // 전체 결과 저장
            const finalResults = {
                summary: {
                    totalTasks: totalTasks,
                    completedTasks: completedTasks,
                    successCount: results.filter(r => r.success).length,
                    errorCount: results.filter(r => !r.success).length,
                    accounts: this.accounts.length,
                    executionCount: this.maxExecutionCount,
                    urlCount: this.totalUrls,
                    completedAt: new Date().toISOString()
                },
                results: results
            };
            
            const finalResultFile = path.join(this.SCRIPT_DIR, `automation_results_${Date.now()}.json`);
            fs.writeFileSync(finalResultFile, JSON.stringify(finalResults, null, 2));
            console.log(`💾 최종 결과 저장: ${finalResultFile}`);
            
            console.log('\n🎉 자동화 완료!');
            console.log(`📊 성공: ${finalResults.summary.successCount}개, 실패: ${finalResults.summary.errorCount}개`);
            
            return {
                success: true,
                data: finalResults,
                message: '자동화 완료'
            };
            
        } catch (error) {
            console.error('❌ 다중 계정 자동화 실패:', error);
            throw error;
        }
    }

    /**
     * URL 파일 상태 확인
     * @returns {Object} URL 파일 상태 정보
     */
    getUrlFileStatus() {
        return {
            isSet: !!this.URL_FILE,
            path: this.URL_FILE,
            exists: this.URL_FILE ? fs.existsSync(this.URL_FILE) : false
        };
    }

    /**
     * URL 파일에서 처리할 URL 즉시 삭제
     * @param {string} urlToDelete 삭제할 URL
     */
    async removeProcessedUrl(urlToDelete) {
        // 🔥 작업 파일과 원본 파일을 모두 삭제 대상으로 설정
        const filesToRemoveFrom = new Set();
        if (this.URL_FILE && fs.existsSync(this.URL_FILE)) {
            filesToRemoveFrom.add(this.URL_FILE);
        }
        if (this.ORIGINAL_URL_FILE_PATH && fs.existsSync(this.ORIGINAL_URL_FILE_PATH)) {
            filesToRemoveFrom.add(this.ORIGINAL_URL_FILE_PATH);
        }

        if (filesToRemoveFrom.size === 0) {
            console.log('⚠️ 삭제할 URL 파일이 없습니다 (작업 파일 또는 원본 파일).');
            return;
        }

        for (const filePath of filesToRemoveFrom) {
            try {
                const fileIdentifier = `[${path.basename(filePath)}]`;
                console.log(`🗑️ ${fileIdentifier} 파일에서 URL 삭제 시도: ${filePath}`);
                console.log(`🎯 삭제 대상 URL: ${urlToDelete}`);
                
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const originalUrls = fileContent.split('\n').map(url => url.trim());
                
                const filteredUrls = originalUrls.filter(url => url && url !== urlToDelete);

                if (originalUrls.length === filteredUrls.length) {
                    console.warn(`❌ ${fileIdentifier} 파일에서 삭제할 URL을 찾지 못함: ${urlToDelete.substring(0, 80)}...`);
                    continue; // 다음 파일로 이동
                }
                
                console.log(`📊 ${fileIdentifier} 삭제 전 URL 개수: ${originalUrls.length}, 삭제 후: ${filteredUrls.length}`);

                fs.writeFileSync(filePath, filteredUrls.join('\n'));
                console.log(`✅ ${fileIdentifier} 파일에서 URL 삭제 완료`);

            } catch (error) {
                console.error(`❌ [${path.basename(filePath)}] 파일에서 URL 삭제 중 오류:`, error);
                // 한 파일에서 오류가 발생해도 다른 파일은 계속 처리
            }
        }
    }

    /**
     * 자동화 중지
     */
    async stopAutomation() {
        try {
            console.log('⏹️ 자동화 중지 요청...');
            
            this.isRunning = false;
            
            // 실행 중인 모든 ContentGenerator 중지
            if (this.activeContentGenerators.size > 0) {
                console.log(`🛑 실행 중인 ContentGenerator ${this.activeContentGenerators.size}개 중지 중...`);
                
                const stopPromises = Array.from(this.activeContentGenerators).map(async (generator) => {
                    try {
                        await generator.stop();
                    } catch (error) {
                        console.error('❌ ContentGenerator 중지 실패:', error);
                    }
                });
                
                await Promise.all(stopPromises);
                this.activeContentGenerators.clear();
                console.log('✅ 모든 ContentGenerator 중지 완료');
            }
            
            this.currentProgress = 0;
            this.currentStep = '';
            this.currentUrlIndex = 0;
            this.currentExecutionCount = 0;
            this.currentAccount = null;
            
            console.log('✅ 자동화 중지 완료');
            
            return {
                success: true,
                message: '자동화가 중지되었습니다.'
            };
        } catch (error) {
            console.error('❌ 자동화 중지 실패:', error);
            return {
                success: false,
                error: error.message,
                message: '자동화 중지 실패'
            };
        }
    }

    /**
     * 자동화 상태 확인
     * @returns {Object} 상태 정보
     */
    getAutomationStatus() {
        // 현재 계정 정보 문자열 생성
        let currentAccountText = '미설정';
        if (this.currentAccount && this.currentAccount.username) {
            currentAccountText = this.currentAccount.username;
        } else if (this.accounts.length > 0 && this.currentAccountIndex < this.accounts.length) {
            currentAccountText = this.accounts[this.currentAccountIndex].username || '계정명 없음';
        } else if (this.accounts.length === 0) {
            currentAccountText = '계정 없음';
        }
        
        return {
            isRunning: this.isRunning,
            progress: this.currentProgress,
            currentStep: this.currentStep,
            currentUrlIndex: this.currentUrlIndex,
            totalUrls: this.totalUrls,
            currentExecutionCount: this.currentExecutionCount,
            maxExecutionCount: this.maxExecutionCount,
            currentAccount: currentAccountText,
            currentAccountIndex: this.currentAccountIndex,
            totalAccounts: this.accounts.length,
            affiliateId: this.affiliateId,
            delayRange: `${this.minDelay}-${this.maxDelay}초`
        };
    }

    /**
     * 지연 함수
     * @param {number} ms 지연 시간 (밀리초)
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 리소스 정리
     */
    async cleanup() {
        try {
            console.log('🧹 CoupangCrawler 리소스 정리...');
            
            if (this.isRunning) {
                await this.stopAutomation();
            }
            
            console.log('✅ CoupangCrawler 리소스 정리 완료');
        } catch (error) {
            console.error('❌ 리소스 정리 중 오류:', error);
        }
    }
}

module.exports = CoupangCrawler; 