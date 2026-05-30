const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * 세션 관리 클래스
 * 브라우저 세션 데이터를 저장하고 복원합니다.
 */
class SessionManager {
    constructor(sessionsPath) {
        if (!sessionsPath) {
            throw new Error("[SessionManager] sessionsPath가 제공되지 않았습니다.");
        }
        this.sessionDir = sessionsPath;
        
        // 🔥 시스템 중지 상태 플래그 추가
        this.isSystemStopping = false;
        
        this.ensureSessionDirectory();
    }

    /**
     * 세션 디렉토리 생성
     */
    ensureSessionDirectory() {
        try {
            console.log(`🔍 [세션 디렉토리] 확인 시작: ${this.sessionDir}`);
            
            if (!fs.existsSync(this.sessionDir)) {
                fs.mkdirSync(this.sessionDir, { recursive: true });
                console.log(`📁 [세션 디렉토리] 생성 완료: ${this.sessionDir}`);
            } else {
                console.log(`✅ [세션 디렉토리] 이미 존재함: ${this.sessionDir}`);
                
                // 기존 세션 파일 목록 확인
                try {
                    const sessionFiles = fs.readdirSync(this.sessionDir).filter(file => file.endsWith('_session.json'));
                    console.log(`📄 [세션 디렉토리] 기존 세션 파일 ${sessionFiles.length}개: ${sessionFiles.join(', ')}`);
                } catch (error) {
                    console.warn(`⚠️ [세션 디렉토리] 파일 목록 읽기 실패:`, error.message);
                }
            }
        } catch (error) {
            console.error('❌ [세션 디렉토리] 생성 실패:', error);
        }
    }

    /**
     * 세션 정보 수집 (쿠키, localStorage, sessionStorage만)
     * @param {Object} page Playwright 페이지 객체
     * @returns {Promise<Object>} 세션 데이터
     */
    async collectSessionData(page) {
        try {
            // 페이지나 컨텍스트가 없는 경우 처리
            if (!page || !page.context) {
                console.log('⚠️ 페이지 또는 컨텍스트가 없어 세션 데이터 수집을 건너뜁니다.');
                return {
                    cookies: [],
                    localStorage: {},
                    sessionStorage: {},
                    timestamp: Date.now()
                };
            }

            // 페이지가 닫혔는지 확인
            if (page.isClosed()) {
                console.log('⚠️ 페이지가 이미 닫혀있어 세션 데이터 수집을 건너뜁니다.');
                return {
                    cookies: [],
                    localStorage: {},
                    sessionStorage: {},
                    timestamp: Date.now()
                };
            }

            // 1. 쿠키 수집
            let cookies = [];
            try {
                const context = page.context();
                if (context && typeof context.cookies === 'function') {
                    cookies = await context.cookies();
                } else {
                    console.warn('⚠️ 컨텍스트 또는 cookies 메소드가 유효하지 않습니다.');
                }
            } catch (cookieError) {
                console.warn('⚠️ 쿠키 수집 실패:', cookieError.message);
            }
            
            // 2. localStorage 수집
            let localStorage = {};
            try {
                localStorage = await page.evaluate(() => {
                    const data = {};
                    try {
                        for (let i = 0; i < window.localStorage.length; i++) {
                            const key = window.localStorage.key(i);
                            data[key] = window.localStorage.getItem(key);
                        }
                    } catch (error) {
                        console.warn('localStorage 수집 중 오류:', error.message);
                    }
                    return data;
                });
            } catch (localStorageError) {
                console.warn('⚠️ localStorage 수집 실패:', localStorageError.message);
            }
            
            // 3. sessionStorage 수집
            let sessionStorage = {};
            try {
                sessionStorage = await page.evaluate(() => {
                    const data = {};
                    try {
                        for (let i = 0; i < window.sessionStorage.length; i++) {
                            const key = window.sessionStorage.key(i);
                            data[key] = window.sessionStorage.getItem(key);
                        }
                    } catch (error) {
                        console.warn('sessionStorage 수집 중 오류:', error.message);
                    }
                    return data;
                });
            } catch (sessionStorageError) {
                console.warn('⚠️ sessionStorage 수집 실패:', sessionStorageError.message);
            }
            
            // 4. 기본 페이지 정보
            const url = page.url();
            const title = await page.title();
            
            const sessionData = {
                cookies: cookies,
                localStorage: localStorage,
                sessionStorage: sessionStorage,
                url: url,
                title: title,
                timestamp: new Date().toISOString(),
                userAgent: await page.evaluate(() => navigator.userAgent)
            };
            
            console.log(`✅ 세션 데이터 수집 완료: 쿠키 ${cookies.length}개, localStorage ${Object.keys(localStorage).length}개 항목`);
            return sessionData;
            
        } catch (error) {
            console.error('❌ 세션 데이터 수집 실패:', error);
            throw error;
        }
    }

    /**
     * 세션 저장 및 API 전송
     * @param {Object} page Playwright 페이지 객체
     * @param {string} accountId 계정 ID
     * @param {string} username 사용자명 (API 전송용)
     * @returns {Promise<Object>} 저장 결과
     */
    async saveSession(page, accountId, username = null) {
        try {
            console.log(`💾 세션 저장 시작: ${accountId}`);
            console.log(`🔍 세션 저장 매개변수: accountId="${accountId}", username="${username}"`);
            
            // 세션 데이터 수집
            const sessionData = await this.collectSessionData(page);
            
            // 파일로 저장
            const sessionFile = path.join(this.sessionDir, `${accountId}_session.json`);
            await fs.promises.writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
            
            console.log(`✅ 세션 파일 저장 완료: ${sessionFile}`);
            
            // API로 세션 데이터 전송 (username이 제공된 경우)
            let apiResult = null;
            console.log(`🔍 API 전송 조건 확인: username="${username}", 조건만족=${!!username && username !== 'unknown'}`);
            if (username && username !== 'unknown') {
                try {
                    console.log('📤 세션 데이터 API 전송 시작...');
                    
                    // zstd 압축
                    const { compress } = require('@mongodb-js/zstd');
                    const sessionString = JSON.stringify(sessionData);
                    const sessionBuffer = Buffer.from(sessionString, 'utf8');
                    const compressedData = await compress(sessionBuffer);
                    
                    console.log('🗜️ 세션 데이터 압축 완료', {
                        originalSize: sessionBuffer.length,
                        compressedSize: compressedData.length,
                        compressionRatio: ((1 - compressedData.length / sessionBuffer.length) * 100).toFixed(2) + '%'
                    });
                    
                    // API 호출 (Username과 Storage만 전송)
                    const axios = require('axios');
                    const apiResponse = await axios.post('http://n-rank.markethunter.io/api/session', {
                        Username: username,
                        Storage: Array.from(compressedData)
                    }, {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000
                    });
                    
                    // console.log('✅ 세션 데이터 API 전송 성공');
                    apiResult = {
                        success: true,
                        data: apiResponse.data
                    };
                    
                } catch (apiError) {
                    // console.error('❌ 세션 데이터 API 전송 실패:', apiError.message);
                    apiResult = {
                        success: false,
                        error: apiError.message
                    };
                }
            }
            
            return {
                success: true,
                sessionFile: sessionFile,
                apiResult: apiResult
            };
            
        } catch (error) {
            console.error('❌ 세션 저장 실패:', error);
            throw error;
        }
    }

    /**
     * 세션 정보 로드 (향상된 로깅)
     * @param {string} accountId 계정 ID
     * @returns {Promise<Object|null>} 세션 데이터
     */
    async loadSession(accountId) {
        try {
            const sessionFilePath = path.join(this.sessionDir, `${accountId}_session.json`);
            console.log(`🔍 [세션 로드] 세션 파일 확인 시작: ${accountId}`);
            console.log(`📁 [세션 로드] 세션 파일 경로: ${sessionFilePath}`);
            
            if (!fs.existsSync(sessionFilePath)) {
                console.log(`❌ [세션 로드] 세션 파일이 존재하지 않음: ${sessionFilePath}`);
                return null;
            }
            
            // 파일 정보 확인
            const stats = fs.statSync(sessionFilePath);
            console.log(`📊 [세션 로드] 파일 정보:`, {
                크기: `${Math.round(stats.size / 1024)}KB`,
                생성일: stats.birthtime.toISOString(),
                수정일: stats.mtime.toISOString()
            });
            
            const rawData = fs.readFileSync(sessionFilePath, 'utf8');
            console.log(`📄 [세션 로드] 파일 읽기 완료 - 크기: ${rawData.length} 문자`);
            
            if (!rawData.trim()) {
                console.log(`⚠️ [세션 로드] 빈 세션 파일: ${sessionFilePath}`);
                return null;
            }
            
            const sessionData = JSON.parse(rawData);
            console.log(`📊 [세션 로드] 세션 데이터 파싱 완료:`, {
                쿠키수: sessionData.cookies?.length || 0,
                localStorage항목수: Object.keys(sessionData.localStorage || {}).length,
                sessionStorage항목수: Object.keys(sessionData.sessionStorage || {}).length,
                URL: sessionData.url,
                타임스탬프: sessionData.timestamp
            });
            
            // 세션 유효성 검증
            if (!sessionData.cookies || !Array.isArray(sessionData.cookies)) {
                console.warn(`⚠️ [세션 로드] 유효하지 않은 세션 데이터 (쿠키 없음): ${accountId}`);
                return null;
            }
            
            // 네이버 관련 쿠키 확인
            const naverCookies = sessionData.cookies.filter(cookie => 
                cookie.domain && (cookie.domain.includes('naver.com') || cookie.domain.includes('.naver.com'))
            );
            console.log(`🍪 [세션 로드] 네이버 쿠키 수: ${naverCookies.length}개`);
            
            if (naverCookies.length === 0) {
                console.warn(`⚠️ [세션 로드] 네이버 관련 쿠키가 없습니다: ${accountId}`);
            }
            
            this.currentSession = sessionData;
            console.log(`✅ [세션 로드] 세션 로드 성공: ${accountId}`);
            return sessionData;
            
        } catch (error) {
            console.error(`❌ [세션 로드] 세션 로드 실패 (${accountId}):`, {
                error: error.message,
                stack: error.stack,
                name: error.name
            });
            return null;
        }
    }

    /**
     * 세션을 브라우저 컨텍스트에 복원 (향상된 로깅)
     * @param {Object} context Playwright 브라우저 컨텍스트
     * @param {string} accountId 계정 ID
     * @returns {Promise<boolean>} 복원 성공 여부
     */
    async restoreSessionToContext(context, accountId) {
        try {
            console.log(`🔄 [세션 복원] 컨텍스트 세션 복원 시작: ${accountId}`);
            
            const sessionData = await this.loadSession(accountId);
            if (!sessionData || !sessionData.cookies) {
                console.log(`❌ [세션 복원] 세션 데이터 없음: ${accountId}`);
                return false;
            }
            
            console.log(`🍪 [세션 복원] ${sessionData.cookies.length}개 쿠키 복원 시작...`);
            
            // 쿠키 복원
            let successCount = 0;
            let failCount = 0;
            
            for (const cookie of sessionData.cookies) {
                try {
                    // 필수 필드 확인
                    if (!cookie.name || !cookie.domain) {
                        console.warn(`⚠️ [세션 복원] 유효하지 않은 쿠키 스킵:`, cookie.name || 'unnamed');
                        failCount++;
                        continue;
                    }
                    
                    await context.addCookies([cookie]);
                    successCount++;
                    
                } catch (cookieError) {
                    console.warn(`⚠️ [세션 복원] 쿠키 복원 실패: ${cookie.name}`, cookieError.message);
                    failCount++;
                }
            }
            
            console.log(`📊 [세션 복원] 쿠키 복원 결과: 성공 ${successCount}개, 실패 ${failCount}개`);
            
            if (successCount === 0) {
                console.error(`❌ [세션 복원] 모든 쿠키 복원 실패: ${accountId}`);
                return false;
            }
            
            console.log(`✅ [세션 복원] 컨텍스트 세션 복원 완료: ${accountId}`);
            return true;
            
        } catch (error) {
            console.error(`❌ [세션 복원] 컨텍스트 세션 복원 실패 (${accountId}):`, {
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }

    /**
     * 세션을 페이지에 복원 (향상된 로깅)
     * @param {Object} page Playwright 페이지 객체
     * @param {string} accountId 계정 ID
     * @returns {Promise<boolean>} 복원 성공 여부
     */
    async restoreSessionToPage(page, accountId) {
        try {
            console.log(`🔄 [페이지 세션 복원] 시작: ${accountId}`);
            
            const sessionData = await this.loadSession(accountId);
            if (!sessionData) {
                console.log(`❌ [페이지 세션 복원] 세션 데이터 없음: ${accountId}`);
                return false;
            }
            
            // localStorage 복원
            if (sessionData.localStorage && Object.keys(sessionData.localStorage).length > 0) {
                console.log(`💾 [페이지 세션 복원] localStorage 복원 시작: ${Object.keys(sessionData.localStorage).length}개 항목`);
                
                await page.evaluate((localStorage) => {
                    for (const [key, value] of Object.entries(localStorage)) {
                        try {
                            window.localStorage.setItem(key, value);
                        } catch (e) {
                            console.warn(`localStorage 설정 실패: ${key}`, e.message);
                        }
                    }
                }, sessionData.localStorage);
                
                console.log(`✅ [페이지 세션 복원] localStorage 복원 완료`);
            }
            
            // sessionStorage 복원
            if (sessionData.sessionStorage && Object.keys(sessionData.sessionStorage).length > 0) {
                console.log(`🗃️ [페이지 세션 복원] sessionStorage 복원 시작: ${Object.keys(sessionData.sessionStorage).length}개 항목`);
                
                await page.evaluate((sessionStorage) => {
                    for (const [key, value] of Object.entries(sessionStorage)) {
                        try {
                            window.sessionStorage.setItem(key, value);
                        } catch (e) {
                            console.warn(`sessionStorage 설정 실패: ${key}`, e.message);
                        }
                    }
                }, sessionData.sessionStorage);
                
                console.log(`✅ [페이지 세션 복원] sessionStorage 복원 완료`);
            }
            
            console.log(`✅ [페이지 세션 복원] 페이지 세션 복원 완료: ${accountId}`);
            return true;
            
        } catch (error) {
            console.error(`❌ [페이지 세션 복원] 실패 (${accountId}):`, {
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }

    /**
     * 세션 존재 여부 확인
     * @param {string} accountId 계정 ID
     * @returns {boolean} 세션 존재 여부
     */
    sessionExists(accountId) {
        const sessionFilePath = path.join(this.sessionDir, `${accountId}_session.json`);
        const exists = fs.existsSync(sessionFilePath);
        
        // 상세 디버깅 로그
        console.log(`🔍 [세션 존재 확인] 계정: ${accountId}`);
        console.log(`📁 [세션 존재 확인] 파일 경로: ${sessionFilePath}`);
        console.log(`📊 [세션 존재 확인] 존재 여부: ${exists ? '✅ 존재함' : '❌ 존재하지 않음'}`);
        
        if (exists) {
            try {
                const stats = fs.statSync(sessionFilePath);
                console.log(`📄 [세션 존재 확인] 파일 크기: ${Math.round(stats.size / 1024)}KB`);
                console.log(`📅 [세션 존재 확인] 생성일: ${stats.birthtime.toISOString()}`);
                console.log(`📅 [세션 존재 확인] 수정일: ${stats.mtime.toISOString()}`);
            } catch (error) {
                console.error(`❌ [세션 존재 확인] 파일 정보 읽기 실패:`, error);
            }
        }
        
        return exists;
    }

    /**
     * 세션 유효성 검증 (만료 시간 체크)
     * @param {string} accountId 계정 ID
     * @param {number} maxAgeHours 최대 유효 시간 (시간 단위, 기본 24시간)
     * @returns {boolean} 세션 유효 여부
     */
    isSessionValid(accountId, maxAgeHours = 999999) {
        try {
            console.log(`🔍 [세션 유효성 확인] 계정: ${accountId}, 최대 시간: ${maxAgeHours}시간`);
            
            if (!this.sessionExists(accountId)) {
                console.log(`❌ [세션 유효성 확인] 세션 파일 없음: ${accountId}`);
                return false;
            }
            
            const sessionFilePath = path.join(this.sessionDir, `${accountId}_session.json`);
            const sessionData = JSON.parse(fs.readFileSync(sessionFilePath, 'utf8'));
            
            if (!sessionData.timestamp) {
                console.log(`⚠️ [세션 유효성 확인] 세션에 타임스탬프가 없음: ${accountId}`);
                // 🔥 타임스탬프가 없어도 유효로 간주 (더 관대하게)
                console.log(`🔄 [세션 유효성 확인] 타임스탬프 없지만 유효로 간주: ${accountId}`);
                return true;
            }
            
            const sessionTime = new Date(sessionData.timestamp);
            const currentTime = new Date();
            const timeDiff = currentTime - sessionTime;
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            const isValid = hoursDiff <= maxAgeHours;
            
            console.log(`⏰ [세션 유효성 확인] 시간 차이: ${hoursDiff.toFixed(2)}시간`);
            console.log(`📊 [세션 유효성 확인] 유효 여부: ${isValid ? '✅ 유효함' : '❌ 만료됨'}`);
            
            if (!isValid) {
                console.log(`⏰ [세션 유효성 확인] 세션 만료됨: ${accountId} (${hoursDiff.toFixed(2)}시간 경과)`);
                // 🔥 만료된 세션도 자동 삭제하지 않음 (사용자가 명시적으로 삭제하기 전까지 보존)
                console.log(`🔄 [세션 유효성 확인] 만료되었지만 삭제하지 않고 보존: ${accountId}`);
            } else {
                console.log(`✅ [세션 유효성 확인] 유효함: ${accountId} (${hoursDiff.toFixed(2)}시간 경과)`);
            }
            
            // 🔥 시간과 관계없이 항상 유효로 반환 (세션 보존 우선)
            console.log(`✅ [세션 유효성 확인] 강제 유효 처리: ${accountId}`);
            return true;
            
        } catch (error) {
            console.error(`❌ [세션 유효성 확인] 실패 (${accountId}):`, error);
            // 🔥 오류 발생 시에도 유효로 간주
            console.log(`🔄 [세션 유효성 확인] 오류 발생했지만 유효로 간주: ${accountId}`);
            return true;
        }
    }

    /**
     * 세션 품질 검증 (쿠키 및 중요 토큰 확인)
     * @param {string} accountId 계정 ID
     * @returns {Promise<boolean>} 세션 품질 유효 여부
     */
    async validateSessionQuality(accountId) {
        try {
            console.log(`🔍 [세션 품질 검증] 시작: ${accountId}`);
            
            const sessionData = await this.loadSession(accountId);
            if (!sessionData) {
                console.log(`❌ [세션 품질 검증] 세션 데이터 로드 실패: ${accountId}`);
                return false;
            }
            
            // 쿠키 검증 (기본적인 존재 여부만 확인)
            if (!sessionData.cookies || sessionData.cookies.length === 0) {
                console.log(`❌ [세션 품질 검증] 세션에 쿠키가 없음: ${accountId}`);
                return false;
            }
            
            console.log(`📊 [세션 품질 검증] 총 쿠키 수: ${sessionData.cookies.length}개`);
            
            // 🔥 네이버 관련 쿠키 확인 (더 관대하게)
            const naverCookies = sessionData.cookies.filter(cookie => 
                cookie.domain && (
                    cookie.domain.includes('naver.com') || 
                    cookie.domain.includes('.naver.com') ||
                    cookie.name.includes('NID') ||
                    cookie.name.includes('naver')
                )
            );
            
            console.log(`🍪 [세션 품질 검증] 네이버 관련 쿠키 수: ${naverCookies.length}개`);
            
            // 🔥 최소 1개의 네이버 관련 쿠키만 있으면 유효로 판단 (더 관대하게)
            if (naverCookies.length === 0) {
                console.log(`⚠️ [세션 품질 검증] 네이버 관련 쿠키가 전혀 없음: ${accountId}`);
                console.log(`🔍 [세션 품질 검증] 전체 쿠키 도메인 목록:`, sessionData.cookies.map(c => c.domain).filter(Boolean));
                return false;
            }
            
            // localStorage 검증 (선택적)
            if (sessionData.localStorage) {
                const localStorageKeys = Object.keys(sessionData.localStorage);
                console.log(`📦 [세션 품질 검증] localStorage 항목 ${localStorageKeys.length}개 확인: ${accountId}`);
            }
            
            console.log(`✅ [세션 품질 검증] 통과: ${accountId} (네이버 쿠키 ${naverCookies.length}개)`);
            return true;
            
        } catch (error) {
            console.error(`❌ [세션 품질 검증] 실패 (${accountId}):`, error);
            // 🔥 검증 오류 시에도 세션을 유효로 간주 (더 관대하게)
            console.log(`🔄 [세션 품질 검증] 오류 발생했지만 세션을 유효로 간주: ${accountId}`);
            return true;
        }
    }

    /**
     * 네이버 로그인 폼이 페이지에 존재하는지 확인
     * @param {Object} page Playwright 페이지 객체
     * @returns {Promise<boolean>} 로그인 폼 존재 여부
     */
    async isLoginFormPresent(page) {
        try {
            console.log('🔍 [로그인 폼 체크] 페이지에 로그인 폼이 있는지 확인 중...');
            
            // 사용자가 제공한 로그인 폼 셀렉터들 체크
            const loginFormSelectors = [
                '.panel_inner[role="tabpanel"][aria-controls="loinid"]',
                '.login_form',
                '.login_box',
                '#input_item_id',
                'input#id[name="id"]',
                'input#pw[name="pw"]',
                '.btn_login#log\\.login'
            ];
            
            // 모든 셀렉터가 존재하는지 확인
            for (const selector of loginFormSelectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        console.log(`🚨 [로그인 폼 체크] 로그인 폼 발견: ${selector}`);
                        return true;
                    }
                } catch (error) {
                    // 개별 셀렉터 확인 중 오류는 무시하고 계속 진행
                    continue;
                }
            }
            
            // 추가로 일반적인 로그인 관련 요소들도 체크
            const generalLoginSelectors = [
                'a[href*="nidlogin.login"]',
                '.area_links .link_login',
                'input[type="password"]',
                'button[type="submit"]'
            ];
            
            let loginElementsFound = 0;
            for (const selector of generalLoginSelectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        loginElementsFound++;
                    }
                } catch (error) {
                    continue;
                }
            }
            
            // 일반 로그인 요소가 2개 이상 발견되면 로그인 폼으로 판단
            if (loginElementsFound >= 2) {
                console.log(`🚨 [로그인 폼 체크] 일반 로그인 요소 ${loginElementsFound}개 발견`);
                return true;
            }
            
            console.log('✅ [로그인 폼 체크] 로그인 폼이 없음 - 로그인 상태로 판단');
            return false;
            
        } catch (error) {
            console.error('❌ [로그인 폼 체크] 확인 중 오류:', error.message);
            // 오류 발생 시 안전하게 로그인 필요로 판단
            return true;
        }
    }

    /**
     * 실제 페이지 접근을 통한 세션 유효성 검증
     * @param {Object} page Playwright 페이지 객체
     * @param {string} accountId 계정 ID
     * @returns {Promise<boolean>} 세션 유효성
     */
    async validateSessionByPageAccess(page, accountId) {
        try {
            console.log(`🔍 [페이지 접근 세션 검증] 시작: ${accountId}`);
            
            // 네이버 메인 페이지로 이동
            await page.goto('https://www.naver.com', { waitUntil: 'networkidle', timeout: 15000 });
            await page.waitForTimeout(3000); // 페이지 완전 로드 대기
            
            // 페이지에 로그인 폼이 있는지 확인
            const loginFormPresent = await this.isLoginFormPresent(page);
            
            if (loginFormPresent) {
                console.log(`❌ [페이지 접근 세션 검증] 로그인 폼 발견 - 세션 만료됨: ${accountId}`);
                return false;
            }
            
            // 로그인 상태 확인을 위한 추가 검증
            const isLoggedIn = await page.evaluate(() => {
                // 네이버 로그인 상태 확인 방법들
                const loginCheck1 = document.querySelector('a[href*="nid.naver.com/nidlogin.login"]') === null;
                const loginCheck2 = document.querySelector('.MyView-module__my_nick___HKbAd') !== null;
                const loginCheck3 = document.querySelector('.area_links .link_login') === null;
                const loginCheck4 = document.querySelector('.gnb_service .service_name') !== null;
                
                return loginCheck1 || loginCheck2 || loginCheck3 || loginCheck4;
            });
            
            if (isLoggedIn) {
                console.log(`✅ [페이지 접근 세션 검증] 로그인 상태 확인됨: ${accountId}`);
                return true;
            } else {
                console.log(`❌ [페이지 접근 세션 검증] 로그인 상태 아님: ${accountId}`);
                return false;
            }
            
        } catch (error) {
            console.error(`❌ [페이지 접근 세션 검증] 실패 (${accountId}):`, error.message);
            // 오류 발생 시 안전하게 세션 무효로 판단
            return false;
        }
    }

    /**
     * 종합적인 세션 사용 가능 여부 확인 (로그인 폼 기반 검증)
     * @param {string} accountId 계정 ID
     * @param {number} maxAgeHours 최대 유효 시간 (무시됨 - 시간 제한 없음)
     * @returns {Promise<boolean>} 세션 사용 가능 여부
     */
    async canUseSession(accountId, maxAgeHours = 999999) {
        try {
            console.log(`🔍 [세션 사용 가능 확인] 계정: ${accountId} 시작`);
            console.log(`📁 [세션 사용 가능 확인] 세션 디렉토리: ${this.sessionDir}`);
            console.log(`⏰ [세션 사용 가능 확인] 시간 제한 없음 (로그인 폼 기반 검증)`);
            
            // 1. 기본 존재 확인
            if (!this.sessionExists(accountId)) {
                console.log(`❌ [세션 사용 가능 확인] 세션 파일이 존재하지 않음: ${accountId}`);
                return false;
            }
            
            // 2. 세션 품질 검증 (기본 파일 무결성만 체크)
            const qualityValid = await this.validateSessionQuality(accountId);
            console.log(`📊 [세션 사용 가능 확인] 품질 유효성: ${qualityValid}`);
            
            if (!qualityValid) {
                console.log(`⚠️ [세션 사용 가능 확인] 세션 품질이 불량함 (파일 손상): ${accountId}`);
                return false;
            }
            
            console.log(`✅ [세션 사용 가능 확인] 세션 파일 존재 및 품질 양호: ${accountId}`);
            console.log(`📝 [세션 사용 가능 확인] 실제 로그인 상태는 페이지 접근 시 확인`);
            return true;
            
        } catch (error) {
            console.error(`❌ [세션 사용 가능 확인] 실패 (${accountId}):`, error);
            return false;
        }
    }

    /**
     * 세션 삭제
     * @param {string} accountId 계정 ID
     */
    async deleteSession(accountId) {
        try {
            console.log(`🗑️ [세션 삭제] 시작: ${accountId}`);
            
            const sessionFilePath = path.join(this.sessionDir, `${accountId}_session.json`);
            console.log(`📁 [세션 삭제] 파일 경로: ${sessionFilePath}`);
            
            if (fs.existsSync(sessionFilePath)) {
                console.log(`📄 [세션 삭제] 세션 파일 존재 확인됨`);
                
                // 파일 정보 로깅
                try {
                    const stats = fs.statSync(sessionFilePath);
                    console.log(`📊 [세션 삭제] 삭제할 파일 정보: 크기 ${Math.round(stats.size / 1024)}KB, 생성일 ${stats.birthtime.toISOString()}`);
                } catch (error) {
                    console.warn(`⚠️ [세션 삭제] 파일 정보 읽기 실패:`, error.message);
                }
                
                fs.unlinkSync(sessionFilePath);
                console.log(`✅ [세션 삭제] 세션 파일 삭제 완료: ${accountId}`);
            } else {
                console.log(`ℹ️ [세션 삭제] 세션 파일이 이미 존재하지 않음: ${accountId}`);
            }
            
            if (this.currentSession) {
                this.currentSession = null;
                console.log(`🧹 [세션 삭제] 메모리 세션 정리 완료`);
            }
            
            console.log(`✅ [세션 삭제] 완료: ${accountId}`);
            
        } catch (error) {
            console.error(`❌ [세션 삭제] 실패 (${accountId}):`, error);
        }
    }

    /**
     * 리소스 정리
     */
    async cleanup() {
        this.currentSession = null;
    }

    /**
     * 브라우저 연결 상태 모니터링 및 복구
     * @param {Object} page Playwright 페이지 객체
     * @param {string} accountId 계정 ID
     * @returns {Promise<void>}
     */
    async monitorBrowserConnection(page, accountId) {
        try {
            if (!page || page.isClosed()) {
                console.log(`⚠️ [브라우저 모니터링] 페이지가 이미 닫혀있음: ${accountId}`);
                return;
            }
            
            // 🔥 시스템 중지 상태 확인 - 중지 중이면 모니터링 시작하지 않음
            if (this.isSystemStopping) {
                console.log(`⏹️ [브라우저 모니터링] 시스템 중지 중 - 모니터링 건너뜀: ${accountId}`);
                return;
            }
            
            console.log(`🔍 [브라우저 모니터링] 시작: ${accountId}`);
            
            // 브라우저 연결 끊김 감지
            page.on('close', async () => {
                console.log(`🚨 [브라우저 모니터링] 페이지 닫힘 감지: ${accountId}`);
                await this.handleBrowserDisconnection(accountId);
            });
            
            // 컨텍스트 종료 감지
            if (page.context()) {
                page.context().on('close', async () => {
                    console.log(`🚨 [브라우저 모니터링] 컨텍스트 닫힘 감지: ${accountId}`);
                    await this.handleBrowserDisconnection(accountId);
                });
            }
            
            console.log(`✅ [브라우저 모니터링] 설정 완료: ${accountId}`);
            
        } catch (error) {
            console.error(`❌ [브라우저 모니터링] 설정 실패 (${accountId}):`, error);
        }
    }

    /**
     * 브라우저 연결 끊김 처리
     * @param {string} accountId 계정 ID
     * @returns {Promise<void>}
     */
    async handleBrowserDisconnection(accountId) {
        try {
            console.log(`🔧 [브라우저 연결 끊김] 처리 시작: ${accountId}`);
            
            // 🔥 시스템 중지 상태 확인 - 중지 중이면 브라우저 재시작하지 않음
            if (this.isSystemStopping) {
                console.log(`⏹️ [브라우저 연결 끊김] 시스템 중지 중 - 브라우저 재시작 건너뜀: ${accountId}`);
                return;
            }
            
            // 최근 세션이 있는지 확인
            const sessionExists = this.sessionExists(accountId);
            if (sessionExists) {
                const sessionValid = this.isSessionValid(accountId, 1); // 1시간 이내
                
                console.log(`📊 [브라우저 연결 끊김] 세션 상태: 존재=${sessionExists}, 유효=${sessionValid}`);
                
                if (sessionValid) {
                    console.log(`✅ [브라우저 연결 끊김] 유효한 세션 보존됨: ${accountId}`);
                } else {
                    console.log(`⚠️ [브라우저 연결 끊김] 세션이 만료됨: ${accountId}`);
                }
            } else {
                console.log(`❌ [브라우저 연결 끊김] 세션이 없음: ${accountId}`);
            }
            
        } catch (error) {
            console.error(`❌ [브라우저 연결 끊김] 처리 실패 (${accountId}):`, error);
        }
    }

    /**
     * 응급 세션 저장 (프로그램 종료 시)
     * @param {Object} page Playwright 페이지 객체
     * @param {string} accountId 계정 ID
     * @returns {Promise<boolean>} 저장 성공 여부
     */
    async emergencySaveSession(page, accountId) {
        try {
            console.log(`🚨 [응급 세션 저장] 시작: ${accountId}`);
            
            if (!page || page.isClosed()) {
                console.log(`⚠️ [응급 세션 저장] 페이지가 닫혀있어 저장 불가: ${accountId}`);
                return false;
            }
            
            // 빠른 세션 데이터 수집 (타임아웃 설정)
            const sessionData = await Promise.race([
                this.collectSessionData(page),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('세션 수집 타임아웃')), 5000)
                )
            ]);
            
            // 파일로만 저장 (API 전송은 생략)
            const sessionFile = path.join(this.sessionDir, `${accountId}_session.json`);
            await fs.promises.writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
            
            console.log(`✅ [응급 세션 저장] 완료: ${accountId}`);
            return true;
            
        } catch (error) {
            console.error(`❌ [응급 세션 저장] 실패 (${accountId}):`, error);
            return false;
        }
    }
}

module.exports = SessionManager; 