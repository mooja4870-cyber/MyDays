const puppeteer = require('puppeteer');
const path = require('path');

/**
 * 네이버 ID 검증기
 * 네이버 비밀번호 찾기 페이지를 통해 ID 유효성을 검증합니다.
 */
class NaverIdValidator {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    /**
     * 대기 함수 (waitForTimeout 대체)
     * @param {number} ms 대기 시간 (밀리초)
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 브라우저 시작
     */
    async startBrowser() {
        try {
            console.log('🚀 실제 Chrome 브라우저 시작 중...');
            
            // 실제 Chrome 경로 찾기
            const chromePaths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Users\\' + require('os').userInfo().username + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
            ];
            
            let chromePath = null;
            for (const path of chromePaths) {
                try {
                    require('fs').accessSync(path);
                    chromePath = path;
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            if (!chromePath) {
                throw new Error('Chrome 브라우저를 찾을 수 없습니다. Chrome이 설치되어 있는지 확인해주세요.');
            }
            
            console.log(`📍 Chrome 경로: ${chromePath}`);
            
            this.browser = await puppeteer.launch({
                executablePath: chromePath, // 실제 Chrome 사용
                headless: "new",
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--no-first-run',
                    '--no-default-browser-check',
                    '--disable-infobars',
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-images', // 이미지 로딩 비활성화로 속도 향상
                    // '--disable-javascript', // JavaScript 비활성화 (페이지 강제 종료 방지)
                    // '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                ],
                defaultViewport: null,
                timeout: 30000
            });

            this.page = await this.browser.newPage();
            
            // 봇 감지 우회를 위한 고급 설정
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36');
            // await this.page.setViewport({ width: 1366, height: 768 });
            
            // webdriver 속성 숨기기 (봇 감지 우회)
            await this.page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
                
                // 플러그인 정보 가짜로 설정
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });
                
                // 언어 설정
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['ko-KR', 'ko', 'en-US', 'en'],
                });
                
                // Chrome 객체 추가
                window.chrome = {
                    runtime: {},
                    loadTimes: function() {},
                    csi: function() {},
                    app: {}
                };
            });
            
            // 기본 타임아웃 설정
            await this.page.setDefaultNavigationTimeout(30000);
            await this.page.setDefaultTimeout(30000);
            
            console.log('🔍 네이버 ID 검증 브라우저 시작 완료');
        } catch (error) {
            console.error('❌ 브라우저 시작 실패:', error);
            throw error;
        }
    }

    /**
     * 브라우저 종료
     */
    async closeBrowser() {
        try {
            if (this.page && !this.page.isClosed()) {
                try {
                    await this.page.close();
                } catch (pageCloseError) {
                    console.log('⚠️ 페이지 종료 중 오류 (무시):', pageCloseError.message);
                }
                this.page = null;
            }
            
            if (this.browser && this.browser.connected) {
                try {
                    await this.browser.close();
                } catch (browserCloseError) {
                    console.log('⚠️ 브라우저 종료 중 오류 (무시):', browserCloseError.message);
                }
                this.browser = null;
            }
            
            console.log('🔍 네이버 ID 검증 브라우저 종료 완료');
            
        } catch (error) {
            console.error('❌ 브라우저 종료 실패:', error);
            // 강제로 null 설정
            this.page = null;
            this.browser = null;
        }
    }

    /**
     * 네이버 ID 검증
     * @param {string} naverId 검증할 네이버 ID
     * @returns {Promise<Object>} 검증 결과 {isValid: boolean, message: string}
     */
    async validateNaverId(naverId) {
        try {
            console.log(`🔍 네이버 ID 검증 시작: ${naverId}`);
            
            if (!naverId || naverId.trim() === '') {
                return {
                    isValid: false,
                    message: '네이버 ID가 입력되지 않았습니다.'
                };
            }

            // 1. 브라우저 시작 (헤드리스 모드)
            await this.startBrowser();

            // 2. 네이버 비밀번호 찾기 페이지로 이동
            console.log('📍 네이버 비밀번호 찾기 페이지 접근 중...');
            await this.page.goto('https://nid.naver.com/user2/help/pwInquiry?lang=ko_KR', {
                waitUntil: 'networkidle2',
                timeout: 15000
            });

            // 3. ID 입력 필드에 ID 입력 (자연스럽게)
            console.log('📝 네이버 ID 입력 중...');
            const idInputSelector = '[class="input_name"]';
            await this.page.waitForSelector(idInputSelector, { timeout: 10000 });
            
            // 마우스 움직임으로 자연스럽게 클릭
            await this.page.hover(idInputSelector);
            await this.delay(500 + Math.random() * 500); // 0.5~1초 랜덤 대기
            await this.page.click(idInputSelector);
            
            // 기존 내용 삭제
            await this.page.evaluate((selector) => {
                document.querySelector(selector).value = '';
            }, idInputSelector);
            
            // 자연스럽게 타이핑 (사람처럼 한 글자씩)
            for (const char of naverId.trim()) {
                await this.page.type(idInputSelector, char, { delay: 100 + Math.random() * 100 });
            }
            await this.delay(500); // 타이핑 완료 후 대기

            // 4. 검증 버튼 클릭 (자연스럽게)
            console.log('🔍 ID 검증 버튼 클릭...');
            const checkButtonSelector = '[class="btn_check"]';
            await this.page.waitForSelector(checkButtonSelector, { timeout: 10000 });
            
            // 마우스 움직임으로 자연스럽게 클릭
            await this.page.hover(checkButtonSelector);
            await this.delay(300 + Math.random() * 300); // 0.3~0.6초 랜덤 대기
            await this.page.click(checkButtonSelector);

            // 5. URL 변경 대기 및 즉시 검증
            console.log('⏳ 페이지 이동 대기 중...');
            
            // URL 변경을 감지하여 즉시 처리 (actionInputUserId 체크 우선)
            let urlChangeResult;
            try {
                urlChangeResult = await this.page.waitForFunction(
                    () => {
                        const currentUrl = window.location.href;
                        // actionInputUserId가 포함되면 즉시 true 반환 (실패 케이스)
                        if (currentUrl.includes('m=actionInputUserId')) {
                            return 'INVALID_ID';
                        }
                        // viewSelectUserAuth가 포함되면 성공 케이스
                        if (currentUrl.includes('viewSelectUserAuth')) {
                            return 'VALID_ID';
                        }
                        // 아직 변경되지 않음
                        return false;
                    },
                    { timeout: 10000 } // 10초로 단축
                );
            } catch (timeoutError) {
                console.warn('⚠️ URL 변경 대기 타임아웃 - 현재 URL 확인');
                const currentUrl = await this.page.url();
                console.log(`📍 현재 URL: ${currentUrl}`);
                
                // 타임아웃 시에도 URL 확인하여 판단
                if (currentUrl.includes('m=actionInputUserId')) {
                    urlChangeResult = 'INVALID_ID';
                } else if (currentUrl.includes('viewSelectUserAuth')) {
                    urlChangeResult = 'VALID_ID';
                } else {
                    // 명확하지 않은 경우 실패로 처리
                    throw new Error('ID 검증 페이지 이동 타임아웃');
                }
            }

            // 6. HTML 소스 기반 검증 (성공 케이스만 진행)
            console.log('🔍 HTML 소스 분석 시작...');
            await this.delay(3000); // 페이지 완전 안정화 대기

            let result = {
                hasRegMobile: false,
                hasRegEmail: false,
                hasUserMobile: false
            };

            try {
                // 페이지 HTML 소스 가져오기
                console.log('📍 페이지 HTML 소스 가져오는 중...');
                const htmlContent = await this.page.content();
                
                // HTML 소스에서 div ID 검색
                result.hasRegMobile = htmlContent.includes('id="div_regMobile"');
                result.hasRegEmail = htmlContent.includes('id="div_regEmail"');
                result.hasUserMobile = htmlContent.includes('id="div_userMobile"');

                console.log('✅ HTML 소스 분석 완료');
                
            } catch (contentError) {
                console.error('❌ HTML 소스 가져오기 실패:', contentError.message);
                throw contentError;
            }

            console.log('📊 검증 결과:', result);

            // 7. 검증 성공/실패 판단 (hasUserMobile 기준)
            if (result.hasUserMobile) {
                // 성공: hasUserMobile이 true인 경우
                console.log('✅ 검증 성공: hasUserMobile = true');
                return {
                    isValid: true,
                    message: '계정 확인이 완료되었습니다.'
                };
            } else {
                // 실패: hasUserMobile이 false인 경우
                console.log('❌ 검증 실패: hasUserMobile = false');
                return {
                    isValid: false,
                    message: '계정 확인에 실패했습니다. 다른 계정을 사용해주세요.'
                };
            }

        } catch (error) {
            console.error(`❌ 네이버 ID 검증 실패 (${naverId}):`, error);
            return {
                isValid: false,
                message: `검증 중 오류가 발생했습니다: ${error.message}`
            };
        } finally {
            // 검증 완료 후 브라우저 종료
            await this.closeBrowser();
        }
    }

    /**
     * 여러 네이버 ID를 동시에 검증
     * @param {Array} naverIds 검증할 네이버 ID 배열
     * @returns {Promise<Array>} 검증 결과 배열
     */
    async validateMultipleNaverIds(naverIds) {
        const results = [];
        
        for (const naverId of naverIds) {
            try {
                const result = await this.validateNaverId(naverId);
                results.push({
                    naverId,
                    ...result
                });
            } catch (error) {
                results.push({
                    naverId,
                    isValid: false,
                    message: `검증 실패: ${error.message}`
                });
            }
        }
        
        return results;
    }
}

module.exports = NaverIdValidator; 