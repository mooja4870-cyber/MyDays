/**
 * 브라우저 공통 설정 유틸리티
 * 모든 모듈에서 일관된 브라우저 설정을 사용하기 위한 공통 함수들
 */

/**
 * 공통 브라우저 시작 인수 (실제 Chrome + 캐시 방지)
 */
const COMMON_BROWSER_ARGS = [
    "--no-sandbox",
    "--disable-setuid-sandbox", 
    "--disable-infobars",
    "--disable-blink-features=AutomationControlled",
    "--ignore-certificate-errors",
    "--disable-web-security",
    "--allow-running-insecure-content",
    "--disable-automation",
    "--disable-extensions-except", 
    "--disable-plugins-discovery",
    "--no-first-run",
    // 캐시 방지 옵션들
    "--incognito",
    "--disable-cache",
    "--disable-application-cache",
    "--disable-offline-load-stale-cache",
    "--disk-cache-size=0",
    "--media-cache-size=0",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--disable-features=TranslateUI",
    "--disable-ipc-flooding-protection",
    // 클립보드 권한 자동 허용
    "--allow-file-access-from-files",
    "--enable-web-security",
    "--disable-features=VizDisplayCompositor"
];

/**
 * 공통 사용자 에이전트
 */
const COMMON_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

/**
 * 공통 뷰포트 설정
 */
const COMMON_VIEWPORT = null;

/**
 * 자동화 감지 방지 스크립트
 * @returns {Function} 자동화 감지 방지를 위한 스크립트 함수
 */
function getAntiDetectionScript() {
    return () => {
        // webdriver 속성 숨기기
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });
        
        // 언어 설정 정상화
        Object.defineProperty(navigator, 'languages', {
            get: () => ['ko-KR', 'ko', 'en-US', 'en'],
        });
        
        // 플러그인 정보 정상화
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });
        
        // permissions API 정상화
        Object.defineProperty(navigator, 'permissions', {
            get: () => ({
                query: () => Promise.resolve({ state: 'granted' })
            })
        });
        
        // deviceMemory 설정
        Object.defineProperty(navigator, 'deviceMemory', {
            get: () => 8
        });
        
        // hardwareConcurrency 설정
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => 4
        });
    };
}

/**
 * Chrome 실행 파일 경로 찾기
 */
function findChromeExecutable() {
    const { execSync } = require('child_process');
    const os = require('os');
    
    try {
        if (os.platform() === 'win32') {
            // Windows에서 Chrome 경로 찾기
            const possiblePaths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
                process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
                process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe'
            ];
            
            for (const chromePath of possiblePaths) {
                if (require('fs').existsSync(chromePath)) {
                    return chromePath;
                }
            }
        }
        return null;
    } catch (error) {
        console.warn('Chrome 경로 찾기 실패:', error.message);
        return null;
    }
}

/**
 * 공통 브라우저 시작 옵션 반환
 * @param {boolean} headless 헤드리스 모드 여부
 * @returns {Object} 브라우저 시작 옵션
 */
function getBrowserLaunchOptions(headless = false) {
    const path = require('path');
    const fs = require('fs');
    const { app } = require('electron');
    
    const chromeExecutable = findChromeExecutable();
    
    const options = {
        headless: headless,
        args: COMMON_BROWSER_ARGS
    };
    
    // 빌드 환경에서 Playwright chromium 바이너리 경로 설정
    if (app && app.isPackaged) {
        try {
            // 빌드된 애플리케이션에서 chromium 바이너리 경로 찾기
            const resourcesPath = process.resourcesPath;
            const chromiumPaths = [
                // app.asar.unpacked 경로
                path.join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'playwright', 'browsers', 'chromium-*', 'chrome-win', 'chrome.exe'),
                path.join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'playwright', '.local-browsers', 'chromium-*', 'chrome-win', 'chrome.exe'),
                // 직접 unpacked 경로
                path.join(resourcesPath, 'node_modules', 'playwright', 'browsers', 'chromium-*', 'chrome-win', 'chrome.exe'),
                path.join(resourcesPath, 'node_modules', 'playwright', '.local-browsers', 'chromium-*', 'chrome-win', 'chrome.exe')
            ];
            
            let foundChromium = null;
            
            for (const chromiumPath of chromiumPaths) {
                try {
                    // glob 패턴 처리 (chromium-* 부분)
                    const basePath = path.dirname(chromiumPath);
                    const parentPath = path.dirname(basePath);
                    
                    if (fs.existsSync(parentPath)) {
                        const dirs = fs.readdirSync(parentPath);
                        for (const dir of dirs) {
                            if (dir.startsWith('chromium-')) {
                                const fullPath = path.join(parentPath, dir, 'chrome-win', 'chrome.exe');
                                if (fs.existsSync(fullPath)) {
                                    foundChromium = fullPath;
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (foundChromium) break;
                } catch (error) {
                    // 개별 경로 확인 실패는 무시하고 계속
                }
            }
            
            if (foundChromium) {
                options.executablePath = foundChromium;
                console.log(`✅ 빌드 환경 Chromium 사용: ${foundChromium}`);
            } else {
                console.warn('⚠️ 빌드 환경에서 Chromium을 찾을 수 없음. 시스템 Chrome 사용 시도...');
                // 시스템 Chrome 사용
                if (chromeExecutable) {
                    options.executablePath = chromeExecutable;
                    console.log(`✅ 시스템 Chrome 사용: ${chromeExecutable}`);
                } else {
                    console.error('❌ Chrome/Chromium을 찾을 수 없습니다!');
                    throw new Error('Chrome/Chromium 실행 파일을 찾을 수 없습니다. 브라우저를 수동으로 설치해주세요.');
                }
            }
        } catch (error) {
            console.error('❌ 빌드 환경 브라우저 설정 실패:', error);
            // 폴백: 시스템 Chrome 사용
            if (chromeExecutable) {
                options.executablePath = chromeExecutable;
                console.log(`🔄 폴백: 시스템 Chrome 사용: ${chromeExecutable}`);
            } else {
                throw new Error(`브라우저 설정 실패: ${error.message}`);
            }
        }
    } else {
        // 개발 환경: 실제 Chrome 또는 Playwright의 기본 chromium 사용
        if (chromeExecutable) {
            options.executablePath = chromeExecutable;
            console.log(`✅ 개발 환경 Chrome 사용: ${chromeExecutable}`);
        } else {
            console.log('🔧 개발 환경 Playwright 기본 Chromium 사용');
            // executablePath를 설정하지 않으면 Playwright가 자동으로 설치된 chromium 사용
        }
    }
    
    return options;
}

/**
 * 공통 컨텍스트 옵션 반환
 * @param {string} customUserAgent 사용자 정의 User Agent (선택사항)
 * @returns {Object} 브라우저 컨텍스트 옵션
 */
function getContextOptions(customUserAgent = null) {
    return {
        userAgent: customUserAgent || COMMON_USER_AGENT,
        viewport: COMMON_VIEWPORT,
        ignoreHTTPSErrors: true,
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul',
        // 클립보드 및 기타 권한 자동 허용
        permissions: [
            'clipboard-read',
            'clipboard-write',
            'notifications',
            'geolocation'
        ]
    };
}

/**
 * 로그인 상태 유지 체크박스 체크 (새로운 네이버 로그인 구조 대응)
 * @param {Page} page Playwright 페이지 객체
 * @returns {Promise<boolean>} 체크 성공 여부
 */
async function checkKeepLoginCheckbox(page) {
    console.log('✅ 로그인 상태 유지 체크박스 확인 중...');
    
    try {
        // 먼저 체크박스가 이미 체크되어 있는지 확인
        const checkboxElement = page.locator('input#nvlong');
        if (await checkboxElement.count() > 0) {
            if (await checkboxElement.isChecked()) {
                console.log('✅ 로그인 상태 유지 체크박스가 이미 선택되어 있습니다.');
                return true;
            }
        }
        
        // 새로운 네이버 로그인 구조에 맞춘 시도 목록
        const attempts = [
            {
                selector: 'div#keep',
                action: 'click',
                description: 'div#keep (role="checkbox")',
                checkSelector: 'input#nvlong'
            },
            {
                selector: 'input#nvlong',
                action: 'check',
                description: 'input#nvlong (실제 checkbox)',
                checkSelector: 'input#nvlong'
            },
            {
                selector: '.keep_text',
                action: 'click',
                description: 'span.keep_text (텍스트 클릭)',
                checkSelector: 'input#nvlong'
            },
            {
                selector: '#login_keep_wrap',
                action: 'click',
                description: '#login_keep_wrap (전체 컨테이너)',
                checkSelector: 'input#nvlong'
            }
    ];

        for (const attempt of attempts) {
            try {
                console.log(`🔍 시도 중: ${attempt.description}`);
                
                const element = page.locator(attempt.selector);
                
                // 요소가 보이는지 확인 (짧은 대기 시간)
                await element.waitFor({ state: 'visible', timeout: 3000 });

                if (attempt.action === 'check') {
                    // input checkbox를 직접 체크
                    if (!await element.isChecked()) {
                        await element.check();
                        console.log(`👍 체크박스 직접 체크 완료 (${attempt.description})`);
                    } else {
                        console.log(`👍 체크박스 이미 선택됨 (${attempt.description})`);
                        return true; // 이미 체크되어 있으면 바로 반환
                    }
                } else if (attempt.action === 'click') { 
                    // 클릭 가능한 요소를 클릭
                    await element.click();
                    console.log(`👍 클릭 완료 (${attempt.description})`);
                    
                    // 클릭 후 약간의 대기
                    await page.waitForTimeout(500);
                }
                
                // 실제 체크박스 상태 확인
                const checkboxElement = page.locator(attempt.checkSelector);
                if (await checkboxElement.count() > 0) {
                    // 체크박스가 존재하는지 확인
                    if (await checkboxElement.isChecked()) {
                        console.log(`✅ 최종 확인: ${attempt.checkSelector} 체크박스가 선택된 상태입니다.`);
                        return true;
                        } else {
                        console.log(`⚠️ ${attempt.checkSelector} 체크박스가 아직 선택되지 않았습니다.`);
                        
                        // 한 번 더 시도: 실제 체크박스를 강제로 체크 (이미 체크되어 있지 않은 경우만)
                        if (!await checkboxElement.isChecked()) {
                            try {
                                await checkboxElement.check({ force: true });
                                if (await checkboxElement.isChecked()) {
                                    console.log(`✅ 강제 체크 성공: ${attempt.checkSelector}`);
                                    return true;
                                }
                            } catch (forceError) {
                                console.log(`⚠️ 강제 체크 실패: ${forceError.message}`);
                                }
                            }
                        }
                    } else {
                    console.log(`⚠️ ${attempt.checkSelector} 체크박스를 찾을 수 없습니다.`);
                }
                
            } catch (error) {
                console.log(`ℹ️ 시도 실패 (${attempt.description}): ${error.message.split('\n')[0]}. 다음 시도 진행.`);
            }
        }
        
        // 모든 시도가 실패한 경우 마지막으로 JavaScript 실행으로 강제 체크
        console.log('🔄 모든 시도 실패. JavaScript로 강제 체크 시도...');
        try {
            const finalResult = await page.evaluate(() => {
                // 먼저 이미 체크되어 있는지 확인
                const checkbox = document.querySelector('#nvlong');
                if (checkbox && checkbox.checked) {
                    console.log('JavaScript: 이미 체크되어 있음');
                    return true;
                }
                
                // 다양한 방법으로 체크박스 상태 변경 시도
                const methods = [
                    () => {
                        const checkbox = document.querySelector('#nvlong');
                        if (checkbox && !checkbox.checked) {
                            checkbox.checked = true;
                            checkbox.value = 'on';
                            // change 이벤트 발생
                            const event = new Event('change', { bubbles: true });
                            checkbox.dispatchEvent(event);
                            return checkbox.checked;
                        }
                        return checkbox?.checked || false;
                    },
                    () => {
                        const keepDiv = document.querySelector('#keep');
                        if (keepDiv) {
                            keepDiv.setAttribute('aria-checked', 'true');
                            keepDiv.click();
                            return true;
                        }
                        return false;
                    },
                    () => {
                        const checkbox = document.querySelector('input[name="nvlong"]');
                        if (checkbox && !checkbox.checked) {
                            checkbox.checked = true;
                            checkbox.value = 'on';
                            return checkbox.checked;
                        }
                        return checkbox?.checked || false;
                    }
                ];
                
                for (const method of methods) {
                    try {
                        if (method()) {
                            console.log('JavaScript 체크 성공');
                            return true;
                        }
                    } catch (e) {
                        console.log('JavaScript 방법 실패:', e.message);
                    }
                        }
                return false;
            });
            
            if (finalResult) {
                console.log('✅ JavaScript 강제 체크 성공!');
                return true;
                }
        } catch (jsError) {
            console.log(`⚠️ JavaScript 강제 체크 실패: ${jsError.message}`);
            }
        
        console.error('❌ 모든 방법을 시도했지만 로그인 상태 유지 체크박스를 선택할 수 없습니다.');
        return false;
        
    } catch (error) { 
        console.error('❌ 로그인 상태 유지 체크박스 처리 중 예기치 않은 시스템 오류:', error);
        return false;
    }
}

/**
 * 페이지에 자동화 감지 방지 스크립트 추가
 * @param {Page} page Playwright 페이지 객체
 */
async function addAntiDetectionScript(page) {
    await page.addInitScript(getAntiDetectionScript());
}

module.exports = {
    COMMON_BROWSER_ARGS,
    COMMON_USER_AGENT,
    COMMON_VIEWPORT,
    getBrowserLaunchOptions,
    getContextOptions,
    getAntiDetectionScript,
    checkKeepLoginCheckbox,
    addAntiDetectionScript
}; 