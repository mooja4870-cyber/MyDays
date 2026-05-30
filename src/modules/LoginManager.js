const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BrowserUtils = require('./BrowserUtils');
const SessionManager = require('./SessionManager');

/**
 * 네이버 로그인 관리 모듈
 * 기존 Puppeteer 코드를 Playwright로 완전 마이그레이션
 */
class LoginManager {
    constructor(sessionsPath) {
        if (!sessionsPath) {
            throw new Error("[LoginManager] sessionsPath가 제공되지 않았습니다.");
        }
        
        this.browser = null;
        this.page = null;
        this.isLoggedIn = false;
        this.sessionManager = new SessionManager(sessionsPath);
        
        // 설정값들
        this.HEADLESS_MODE = false; // 디버깅용으로 false
        this.LOGIN_URL = 'https://nid.naver.com/nidlogin.login?mode=form&url=https://www.naver.com/';
        this.LOGIN_DELAY_TIME = 2000;
    }

    /**
     * 브라우저 시작
     * @returns {Promise<Browser>}
     */
    async startBrowser() {
        console.log('🚀 [빌드 디버깅] LoginManager 브라우저 시작...');
        
        try {
            const browserOptions = BrowserUtils.getBrowserLaunchOptions(this.HEADLESS_MODE);
            console.log('🔧 [빌드 디버깅] LoginManager 브라우저 옵션:', {
                executablePath: browserOptions.executablePath,
                headless: browserOptions.headless,
                argsCount: browserOptions.args?.length
            });
            
            this.browser = await chromium.launch(browserOptions);
            console.log('✅ [빌드 디버깅] LoginManager 브라우저 시작 성공');
        } catch (browserError) {
            console.error('❌ [빌드 디버깅] LoginManager 브라우저 시작 실패:', {
                error: browserError.message,
                stack: browserError.stack,
                name: browserError.name
            });
            throw new Error(`LoginManager 브라우저 시작 실패: ${browserError.message}`);
        }

        try {
            const context = await this.browser.newContext(
                BrowserUtils.getContextOptions()
            );

            this.page = await context.newPage();
            
            // 자동화 감지 방지
            await BrowserUtils.addAntiDetectionScript(this.page);

            // 팝업 자동 처리
            this.page.on('dialog', async dialog => {
                console.log(`팝업 감지: ${dialog.message()}`);
                await dialog.accept();
            });

            console.log('✅ [빌드 디버깅] LoginManager 브라우저 페이지 준비 완료');
            return this.browser;
        } catch (contextError) {
            console.error('❌ [빌드 디버깅] LoginManager 브라우저 컨텍스트/페이지 생성 실패:', {
                error: contextError.message,
                stack: contextError.stack
            });
            throw new Error(`LoginManager 브라우저 컨텍스트 생성 실패: ${contextError.message}`);
        }
    }

    /**
     * 텍스트를 클립보드로 복사 (BlogPublisher와 동일한 방식)
     * @param {string} text - 복사할 텍스트
     */
    async copyTextToClipboard(text) {
        try {
            console.log('📋 클립보드 복사 시작...');
            
            // 방법 1: PowerShell을 사용한 클립보드 복사 (개선된 오류 처리)
            const { spawn } = require('child_process');
            
            // Base64 인코딩을 사용한 안전한 텍스트 전달 (특수문자 문제 해결)
            const base64Text = Buffer.from(text, 'utf8').toString('base64');
            console.log(`📋 Base64 인코딩된 텍스트 길이: ${base64Text.length}자`);
            
            // PowerShell 명령어 - Base64 디코딩 후 클립보드 설정
            const command = `[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${base64Text}')) | Set-Clipboard`;
            const powershell = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
                windowsHide: true,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            return new Promise((resolve, reject) => {
                let errorOutput = '';
                
                // 표준 오류 출력 수집
                powershell.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });
                
                powershell.on('close', (code) => {
                    if (code === 0) {
                        console.log('✅ PowerShell 클립보드 복사 성공');
                        resolve();
                    } else {
                        console.error(`❌ PowerShell 종료 코드: ${code}`);
                        console.error(`❌ PowerShell 오류 출력: ${errorOutput}`);
                        
                        // 대체 방법 시도
                        this.fallbackClipboardCopy(text)
                            .then(resolve)
                            .catch((fallbackError) => {
                                console.error('❌ 대체 클립보드 복사도 실패:', fallbackError.message);
                                reject(new Error(`클립보드 복사 실패. PowerShell 오류 (코드: ${code}): ${errorOutput || '알 수 없는 오류'}`));
                            });
                    }
                });
                
                powershell.on('error', (spawnError) => {
                    console.error('❌ PowerShell 실행 오류:', spawnError.message);
                    
                    // 대체 방법 시도
                    this.fallbackClipboardCopy(text)
                        .then(resolve)
                        .catch((fallbackError) => {
                            console.error('❌ 대체 클립보드 복사도 실패:', fallbackError.message);
                            reject(new Error(`PowerShell 실행 실패: ${spawnError.message}`));
                        });
                });
                
                // 타임아웃 설정 (10초)
                setTimeout(() => {
                    powershell.kill();
                    reject(new Error('PowerShell 클립보드 복사 타임아웃'));
                }, 10000);
            });
            
        } catch (error) {
            console.error('❌ 클립보드 복사 실패:', error);
            
            // 대체 방법 시도
            try {
                await this.fallbackClipboardCopy(text);
                console.log('✅ 대체 방법으로 클립보드 복사 성공');
            } catch (fallbackError) {
                console.error('❌ 대체 클립보드 복사도 실패:', fallbackError.message);
                throw new Error(`모든 클립보드 복사 방법 실패: ${error.message}`);
            }
        }
    }

    /**
     * 대체 클립보드 복사 방법
     * @param {string} text - 복사할 텍스트
     */
    async fallbackClipboardCopy(text) {
        try {
            console.log('🔄 대체 클립보드 복사 방법 시도...');
            
            // 방법 1: clip.exe 사용 (Windows 내장)
            const { spawn } = require('child_process');
            const clipProcess = spawn('clip', [], {
                windowsHide: true,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            return new Promise((resolve, reject) => {
                clipProcess.stdin.write(text, 'utf8');
                clipProcess.stdin.end();
                
                clipProcess.on('close', (code) => {
                    if (code === 0) {
                        console.log('✅ clip.exe를 사용한 클립보드 복사 성공');
                        resolve();
                    } else {
                        reject(new Error(`clip.exe 종료 코드: ${code}`));
                    }
                });
                
                clipProcess.on('error', (error) => {
                    reject(new Error(`clip.exe 실행 실패: ${error.message}`));
                });
                
                // 타임아웃 설정 (5초)
                setTimeout(() => {
                    clipProcess.kill();
                    reject(new Error('clip.exe 타임아웃'));
                }, 5000);
            });
            
        } catch (error) {
            throw new Error(`대체 클립보드 복사 실패: ${error.message}`);
        }
    }

    /**
     * 사이트로 이동
     * @param {string} url 
     */
    async goToSite(url) {
        try {
            console.log(`📍 ${url}로 이동 중...`);
            await this.page.goto(url, { waitUntil: "networkidle" });
        } catch (error) {
            console.error("❌ 페이지 로드 실패:", error);
            throw error;
        }
    }

    /**
     * 클립보드 복사 후 붙여넣기 (기존 타이핑 방식 대체)
     * @param {string} selector 
     * @param {string} text 
     */
    async pasteFromClipboard(selector, text) {
        try {
            console.log(`📋 클립보드 복사 후 붙여넣기: ${selector}`);
            
            // 클립보드에 텍스트 복사
            await this.copyTextToClipboard(text);
            
            // 입력 필드 클릭 및 기존 내용 지우기
            await this.page.click(selector);
            await this.page.keyboard.press('Control+A');
            await this.page.waitForTimeout(100);
            
            // 클립보드에서 붙여넣기
            await this.page.keyboard.press('Control+V');
            await this.page.waitForTimeout(500);
            
            console.log(`✅ 클립보드 붙여넣기 완료: ${selector}`);
            
        } catch (error) {
            console.warn(`⚠️ 클립보드 붙여넣기 실패, 직접 타이핑으로 대체: ${error.message}`);
            
            // 클립보드 실패 시 기존 타이핑 방식으로 폴백
            await this.typeRandomly(selector, text);
        }
    }

    /**
     * 랜덤 타이핑 (자연스러운 입력 시뮬레이션) - 폴백용
     * @param {string} selector 
     * @param {string} text 
     */
    async typeRandomly(selector, text) {
        await this.page.click(selector);
        await this.page.fill(selector, ''); // 기존 내용 지우기
        
        for (let char of text) {
            await this.page.type(selector, char, { 
                delay: Math.random() * 120 + 30 
            });
        }
    }

    /**
     * 네이버 로그인 실행
     * @param {string} userId 네이버 아이디
     * @param {string} userPassword 네이버 비밀번호
     * @returns {Promise<Object>} 로그인 결과
     */
    async loginNaver(userId, userPassword) {
        try {
            // 기존 세션 확인 및 복원 시도 (시간 제한 없음, 로그인 폼 기반 검증)
            if (await this.sessionManager.canUseSession(userId, 999999)) { // 시간 제한 없음
                console.log(`🔄 기존 세션 발견: ${userId}`);
                console.log('💾 저장된 세션으로 로그인 시도...');
                
                try {
                    // 브라우저 시작 (세션 복원을 위해 필요)
                    if (!this.browser) {
                        await this.startBrowser();
                    }
                    
                    // 컨텍스트에 세션 복원
                    const context = this.page.context();
                    const sessionRestored = await this.sessionManager.restoreSessionToContext(context, userId);
                    
                    if (sessionRestored) {
                        // 페이지에 localStorage, sessionStorage 복원
                        await this.sessionManager.restoreSessionToPage(this.page, userId);
                        
                        // 🔥 실제 페이지 접근을 통한 세션 유효성 검증
                        const isSessionValid = await this.sessionManager.validateSessionByPageAccess(this.page, userId);
                        
                        if (isSessionValid) {
                            console.log('✅ 기존 세션으로 로그인 상태 확인 완료!');
                            this.isLoggedIn = true;
                            
                            const sessionFilePath = path.join(this.sessionManager.sessionDir, `${userId}_session.json`);
                            
                            return {
                                success: true,
                                sessionFilePath: sessionFilePath,
                                message: '기존 세션으로 로그인 완료',
                                accountId: userId,
                                fromExistingSession: true
                            };
                        } else {
                            console.log('⚠️ 기존 세션이 만료되었거나 로그인 폼이 감지되었습니다. 새로 로그인을 시도합니다.');
                            console.log('🔄 만료된 세션 파일을 삭제하고 새로 로그인 시도');
                            await this.sessionManager.deleteSession(userId);
                        }
                    } else {
                        console.log('⚠️ 세션 복원에 실패했습니다. 새로 로그인을 시도합니다.');
                        console.log('🔄 복원 실패한 세션 파일을 삭제하고 새로 로그인 시도');
                        await this.sessionManager.deleteSession(userId);
                    }
                    
                } catch (sessionError) {
                    console.error('❌ 세션 복원 중 오류:', sessionError.message);
                    console.log('🔄 새로운 로그인을 시도합니다.');
                    console.log('🔄 오류 발생한 세션 파일을 삭제하고 새로 로그인 시도');
                    await this.sessionManager.deleteSession(userId);
                }
            }
            
                        console.log(`🔐 ${userId} 계정으로 새로운 로그인 시작...`);
            
            // 브라우저가 없으면 새로 시작
            if (!this.browser) {
                await this.startBrowser();
            }

            // 로그인 페이지로 이동
            await this.goToSite(this.LOGIN_URL);

            // 아이디 입력 대기 및 입력
            console.log(`📝 아이디 입력 중: ${userId}`);
            
            // 아이디 입력 필드 선택자들 (새로운 구조 대응)
            const idSelectors = [
                'input#id',                                    // 기본 선택자
                'input[name="id"]',                            // name 속성 기반
                'input.input_id',                              // 클래스 기반
                'input[aria-label="아이디 또는 전화번호"]',     // aria-label 기반
                '#input_item_id input',                        // 컨테이너 내부 input
                '.input_item.id input'                         // 클래스 조합
            ];
            
            let idInputFound = false;
            for (const selector of idSelectors) {
                try {
                    const idElement = await this.page.$(selector);
                    if (idElement && await idElement.isVisible()) {
                        await this.pasteFromClipboard(selector, userId);
                        console.log(`✅ 아이디 입력 성공: ${selector}`);
                        idInputFound = true;
                        break;
                    }
                } catch (error) {
                    console.log(`⚠️ 아이디 입력 시도 실패: ${selector} - ${error.message}`);
                }
            }
            
            if (!idInputFound) {
                console.error('❌ 아이디 입력 필드를 찾을 수 없습니다.');
                throw new Error('아이디 입력 필드를 찾을 수 없습니다.');
            }
            
            await this.page.waitForTimeout(500);
            
            // 비밀번호 입력 대기 및 입력
            console.log('🔒 비밀번호 입력 중...');
            
            // 비밀번호 입력 필드 선택자들 (새로운 구조 대응)
            const pwSelectors = [
                'input#pw',                                    // 기본 선택자
                'input[name="pw"]',                            // name 속성 기반
                'input.input_pw',                              // 클래스 기반
                'input[type="password"]',                      // 타입 기반
                'input[aria-label="비밀번호"]',                // aria-label 기반
                '#input_item_pw input',                        // 컨테이너 내부 input
                '.input_item.pw input'                         // 클래스 조합
            ];
            
            let pwInputFound = false;
            for (const selector of pwSelectors) {
                try {
                    const pwElement = await this.page.$(selector);
                    if (pwElement && await pwElement.isVisible()) {
                        await this.pasteFromClipboard(selector, userPassword);
                        console.log(`✅ 비밀번호 입력 성공: ${selector}`);
                        pwInputFound = true;
                        break;
                    }
                } catch (error) {
                    console.log(`⚠️ 비밀번호 입력 시도 실패: ${selector} - ${error.message}`);
                }
            }
            
            if (!pwInputFound) {
                console.error('❌ 비밀번호 입력 필드를 찾을 수 없습니다.');
                throw new Error('비밀번호 입력 필드를 찾을 수 없습니다.');
            }
            
            await this.page.waitForTimeout(1200);
            
            // 로그인 상태 유지 체크박스 체크
            await BrowserUtils.checkKeepLoginCheckbox(this.page);
            
            // 로그인 버튼 클릭
            console.log('🖱️ 로그인 버튼 클릭...');
            
            // 새로운 네이버 로그인 페이지 구조에 맞는 로그인 버튼 선택자들
            const loginButtonSelectors = [
                'button#log\\.login',                    // 메인 로그인 버튼 (이스케이프된 점)
                'button.btn_login.next_step',            // 클래스 기반 선택
                'button[type="submit"].btn_login',       // 타입과 클래스 조합
                '.btn_login_wrap .btn_login',            // 래퍼 내부 버튼
                'button[id="log.login"]',                // 속성 기반 선택
                '.btn_login.next_step.nlog-click'       // 모든 클래스 조합
            ];
            
            let loginButtonFound = false;
            
            for (const selector of loginButtonSelectors) {
                try {
                    console.log(`🔍 로그인 버튼 시도: ${selector}`);
                    const loginButton = await this.page.$(selector);
                    if (loginButton) {
                        // 버튼이 보이는지 확인
                        const isVisible = await loginButton.isVisible();
                        if (isVisible) {
                            await loginButton.click();
                            console.log(`✅ 로그인 버튼 클릭 성공: ${selector}`);
                            loginButtonFound = true;
                            break;
                        } else {
                            console.log(`⚠️ 로그인 버튼이 보이지 않음: ${selector}`);
                        }
                    } else {
                        console.log(`ℹ️ 로그인 버튼 없음: ${selector}`);
                    }
                } catch (error) {
                    console.log(`⚠️ 로그인 버튼 시도 실패: ${selector} - ${error.message}`);
                }
            }
            
            // 모든 선택자가 실패한 경우 Enter 키 사용
            if (!loginButtonFound) {
                console.log('🔄 로그인 버튼을 찾을 수 없어 Enter 키로 대체');
            await this.page.keyboard.press("Enter");
            }
            
            // 로그인 처리 대기
            await this.page.waitForTimeout(this.LOGIN_DELAY_TIME);
            
            // 로그인 성공 여부 확인
            const currentUrl = this.page.url();
            console.log(`🔍 로그인 후 현재 URL: ${currentUrl}`);
            
            // 페이지 제목도 확인
            const pageTitle = await this.page.title();
            console.log(`📄 로그인 후 페이지 제목: ${pageTitle}`);
            
            // 에러 메시지나 캡차 확인
            await this.checkLoginErrors();
            
            if (currentUrl.includes('naver.com') && !currentUrl.includes('nidlogin')) {
                console.log('✅ 새로운 로그인 성공!');
                
                // 세션 정보 저장 및 API 전송 (Username만 전송)
                console.log('💾 세션 정보 저장 및 API 전송 중...');
                const sessionResult = await this.sessionManager.saveSession(this.page, userId, userId);
                
                this.isLoggedIn = true;
                
                return {
                    success: true,
                    sessionFilePath: sessionResult.sessionFile,
                    apiResult: sessionResult.apiResult,
                    message: '로그인 성공 및 세션 저장 완료',
                    accountId: userId
                };
                
            } else {
                console.log('❌ 로그인 실패: 로그인 페이지에서 벗어나지 못함');
                console.log(`❌ 현재 URL: ${currentUrl}`);
                console.log(`❌ 페이지 제목: ${pageTitle}`);
                
                try {
                    const screenshotPath = path.join(process.cwd(), 'naver_login_failed.png');
                    await this.page.screenshot({ path: screenshotPath });
                    console.log(`📸 로그인 실패 화면 캡처 완료: ${screenshotPath}`);
                } catch (screenshotError) {
                    console.error('⚠️ 로그인 실패 화면 캡처 실패:', screenshotError.message);
                }
                
                // 구체적인 실패 원인 파악
                let failureReason = '알 수 없는 원인';
                if (currentUrl.includes('nidlogin')) {
                    failureReason = '로그인 페이지에서 벗어나지 못함 (잘못된 계정 정보일 수 있음)';
                } else if (!currentUrl.includes('naver.com')) {
                    failureReason = '네이버 도메인이 아닌 곳으로 이동됨';
                }
                
                return {
                    success: false,
                    error: `로그인 실패: ${failureReason}`,
                    message: `로그인에 실패했습니다. 현재 URL: ${currentUrl}`,
                    accountId: userId,
                    currentUrl: currentUrl,
                    pageTitle: pageTitle
                };
            }
            
        } catch (error) {
            console.error(`❌ ${userId} 로그인 중 오류:`, error);
            return {
                success: false,
                error: error.message,
                message: '로그인 중 오류 발생',
                accountId: userId
            };
        }
    }

    /**
     * 로그인 에러 상황 체크 (캡차, 에러 메시지 등)
     */
    async checkLoginErrors() {
        try {
            // 캡차 확인
            const captchaSelectors = [
                '.captcha_box',
                '.captcha',
                '#captcha',
                '.recaptcha',
                '.challenge'
            ];
            
            for (const selector of captchaSelectors) {
                const captchaElement = await this.page.$(selector);
                if (captchaElement && await captchaElement.isVisible()) {
                    console.log('🚨 캡차 감지됨');
                    return;
                }
            }
            
            // 에러 메시지 확인
            const errorSelectors = [
                '.error_box',
                '.error_msg',
                '.error',
                '.alert',
                '.warning'
            ];
            
            for (const selector of errorSelectors) {
                const errorElement = await this.page.$(selector);
                if (errorElement && await errorElement.isVisible()) {
                    const errorText = await errorElement.textContent();
                    console.log(`🚨 로그인 에러 메시지 감지: ${errorText}`);
                    return;
                }
            }
            
            // 보안 인증 페이지 확인
            const securitySelectors = [
                '.security',
                '.auth',
                '.verification'
            ];
            
            for (const selector of securitySelectors) {
                const securityElement = await this.page.$(selector);
                if (securityElement && await securityElement.isVisible()) {
                    console.log('🚨 보안 인증 페이지 감지됨');
                    return;
                }
            }
            
        } catch (error) {
            console.log('⚠️ 로그인 에러 체크 중 오류:', error.message);
        }
    }

    /**
     * 다중 계정 로그인 처리
     * @param {Array} accountList 계정 목록 [{id, password, blogId}, ...]
     * @returns {Promise<Array>} 로그인 결과 목록
     */
    async loginMultipleAccounts(accountList) {
        const results = [];
        
        console.log(`🎯 ${accountList.length}개 계정 로그인 시작...`);
        
        for (let i = 0; i < accountList.length; i++) {
            const account = accountList[i];
            const accountId = account.id || account.username || account.naverId;
            console.log(`\n📍 계정 ${i + 1}/${accountList.length}: ${accountId}`);
            
            try {
                // 브라우저 새로 시작 (계정별 격리)
                if (this.browser) {
                    await this.browser.close();
                }
                
                await this.startBrowser();
                
                // 로그인 실행
                const loginResult = await this.loginNaver(accountId, account.password);
                
                if (loginResult.success) {
                    // 세션은 이미 loginNaver에서 저장됨
                    console.log(`✅ ${accountId} 계정 로그인 및 세션 저장 완료`);
                    console.log(`📁 세션 파일: ${loginResult.sessionFilePath}`);
                } else {
                    console.log(`❌ ${accountId} 계정 로그인 실패: ${loginResult.error}`);
                }
                
                results.push({
                    account: accountId,
                    ...loginResult
                });
                
                // 브라우저 종료
                await this.browser.close();
                this.browser = null;
                this.page = null;
                
                // 다음 계정 처리 전 대기 (3초)
                if (i < accountList.length - 1) {
                    console.log('⏳ 다음 계정 처리까지 3초 대기...');
                    await this.page?.waitForTimeout(3000) || new Promise(resolve => setTimeout(resolve, 3000));
                }
                
            } catch (error) {
                console.error(`❌ ${accountId} 계정 처리 중 오류:`, error);
                results.push({
                    account: accountId,
                    success: false,
                    error: error.message
                });
            }
        }
        
        console.log('\n🎉 모든 계정 로그인 처리 완료!');
        return results;
    }

    /**
     * 단일 계정 로그인 (메인 진입점)
     * @param {Object} account {id, password, blogId}
     * @returns {Promise<Object>}
     */
    async login(account) {
        try {
            const accountId = account.id || account.username || account.naverId;
            console.log(`🚀 ${accountId} 계정 로그인 시작...`);
            
            // 브라우저 시작
            await this.startBrowser();
            
            // 로그인 실행
            const result = await this.loginNaver(accountId, account.password);
            
            // 로그인 완료 후 브라우저 닫기 (성공/실패 무관)
            console.log('🔒 로그인 완료 - 브라우저 닫는 중...');
            await this.cleanup();
            
            return result;
            
        } catch (error) {
            console.error('❌ 로그인 처리 중 전체 오류:', error);
            await this.cleanup();
            
            return {
                success: false,
                error: error.message,
                message: '로그인 처리 실패'
            };
        }
    }

    /**
     * 리소스 정리
     */
    async cleanup() {
        try {
            if (this.page) {
                await this.page.close();
                this.page = null;
            }
            
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }
            
            // SessionManager 정리
            await this.sessionManager.cleanup();
            
            this.isLoggedIn = false;
            console.log('🧹 LoginManager 리소스 정리 완료');
            
        } catch (error) {
            console.error('❌ 리소스 정리 중 오류:', error);
        }
    }

    /**
     * 상태 확인
     * @returns {Object}
     */
    getStatus() {
        return {
            isLoggedIn: this.isLoggedIn,
            hasBrowser: !!this.browser,
            hasPage: !!this.page
        };
    }

    /**
     * 로그인 상태 확인
     * @returns {boolean}
     */
    getLoginStatus() {
        return this.isLoggedIn;
    }
}

module.exports = LoginManager; 