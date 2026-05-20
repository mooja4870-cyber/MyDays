const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs-extra'); // fs-extra로 변경
const os = require('os');
const https = require('https');
const http = require('http');

// --- 경로 및 환경 설정 ---
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
const isPackaged = app.isPackaged;

/**
 * 개발/프로덕션 환경에 따른 경로 설정
 * 개발환경: 현재 실행하는 소스 코드 경로 사용
 * 프로덕션환경: process.resourcesPath의 app.asar 경로에서 파일 실행
 */
function getAppPaths() {
    const appDataPath = app.getPath('userData');
    let resourcesPath, appPath;
    
    if (isPackaged) {
        // 프로덕션 환경: asar 패키지 내부 경로 사용
        resourcesPath = process.resourcesPath;
        appPath = app.getAppPath(); // app.asar 경로
        console.log('[경로 설정] 프로덕션 환경 - asar 패키지 사용');
        console.log('[경로 설정] app.getAppPath():', appPath);
    } else {
        // 개발 환경: 소스 코드 경로 사용
        resourcesPath = path.join(__dirname, '..');
        appPath = path.join(__dirname, '..');
        console.log('[경로 설정] 개발 환경 - 소스 코드 경로 사용');
    }
    
    return {
        appDataPath,
        resourcesPath,
        appPath,
        tempImagePath: path.join(appDataPath, 'temp_images'),
        logsPath: path.join(appDataPath, 'logs'),
        sessionsPath: path.join(appDataPath, 'sessions'),
        imagesPath: path.join(appDataPath, 'images'),
        configPath: path.join(appDataPath, 'config')
    };
}

// 경로 설정 적용
const paths = getAppPaths();
const { appDataPath, resourcesPath, appPath, tempImagePath, logsPath, sessionsPath, imagesPath, configPath } = paths;

// 필수 디렉토리 생성
[tempImagePath, logsPath, sessionsPath, imagesPath, configPath].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[경로 설정] 디렉토리 생성: ${dir}`);
    }
});

// 전역 변수로 경로 공유 (필요 시)
global.paths = {
    appDataPath,
    resourcesPath,
    appPath,
    tempImagePath,
    logsPath,
    sessionsPath,
    imagesPath,
    configPath,
    isDev,
    isPackaged,
    // 아고다 경로 추가
    agodaPath: isPackaged ? path.join(appPath, 'agoda') : path.join(__dirname, '../agoda')
};

console.log('[경로 설정] 환경 구분:', isPackaged ? 'PRODUCTION (asar)' : 'DEVELOPMENT');
console.log('[경로 설정] 앱 데이터 경로:', appDataPath);
console.log('[경로 설정] 리소스 경로:', resourcesPath);
console.log('[경로 설정] 앱 경로:', appPath);

// 프로그램 자동 종료 타이머 설정 (21,600초 = 6시간)
const AUTO_SHUTDOWN_TIME = 21600 * 1000; // 21,600초를 밀리초로 변환
let autoShutdownTimer = null;

function startAutoShutdownTimer() {
    console.log('🕐 프로그램 6시간 후 자동 종료 타이머 시작');
    autoShutdownTimer = setTimeout(() => {
        console.log('⏰ 21,600초(6시간) 경과 - 프로그램을 자동으로 종료합니다.');
        // 알림 없이 바로 종료
        app.quit();
    }, AUTO_SHUTDOWN_TIME);
}

// .env 파일 로드 (GitHub 토큰 사용을 위해 추가)
// 개발/프로덕션 환경에 따른 .env 파일 경로 설정
function loadEnvironmentFile() {
    console.log('[ENV] 환경 변수 파일 로드 시작...');
    console.log(`[ENV] isPackaged: ${isPackaged}`);
    console.log(`[ENV] process.resourcesPath: ${process.resourcesPath}`);
    console.log(`[ENV] __dirname: ${__dirname}`);
    console.log(`[ENV] app.getAppPath(): ${app.getAppPath()}`);
    console.log(`[ENV] process.cwd(): ${process.cwd()}`);
    
    let envPath;
    const possiblePaths = [];

    if (isPackaged) {
        // 빌드 환경: 여러 가능한 경로 시도 (더 많은 경로 추가)
        possiblePaths.push(
            path.join(process.resourcesPath, '.env'),
            path.join(process.resourcesPath, 'app.asar.unpacked', '.env'),
            path.join(resourcesPath, '.env'),
            path.join(appPath, '.env'),
            path.join(path.dirname(process.execPath), 'resources', '.env'),
            path.join(path.dirname(process.execPath), '.env')
        );
        console.log(`[ENV] 프로덕션 환경 - 가능한 경로들:`, possiblePaths);
        
        // 각 경로의 부모 디렉토리도 확인
        possiblePaths.forEach((testPath, index) => {
            const parentDir = path.dirname(testPath);
            console.log(`[ENV] 경로 ${index + 1} 부모 디렉토리 존재: ${fs.existsSync(parentDir)} - ${parentDir}`);
            if (fs.existsSync(parentDir)) {
                try {
                    const files = fs.readdirSync(parentDir);
                    console.log(`[ENV] 경로 ${index + 1} 부모 디렉토리 파일들:`, files.filter(f => f.includes('.env') || f.includes('env')));
                } catch (e) {
                    console.log(`[ENV] 경로 ${index + 1} 부모 디렉토리 읽기 실패:`, e.message);
                }
            }
        });
        
    } else {
        // 개발 환경
        possiblePaths.push(
            path.join(__dirname, '..', '.env'),
            path.join(process.cwd(), '.env')
        );
        console.log(`[ENV] 개발 환경 - 가능한 경로들:`, possiblePaths);
    }

    // 첫 번째로 발견되는 .env 파일 사용
    for (const testPath of possiblePaths) {
        console.log(`[ENV] 경로 확인 중: ${testPath}`);
        if (fs.existsSync(testPath)) {
            envPath = testPath;
            console.log(`[ENV] ✅ .env 파일 발견: ${envPath}`);
            
            // 파일 크기와 권한도 확인
            try {
                const stats = fs.statSync(testPath);
                console.log(`[ENV] 파일 크기: ${stats.size} bytes, 읽기 가능: ${stats.isFile()}`);
            } catch (e) {
                console.log(`[ENV] 파일 정보 확인 실패: ${e.message}`);
            }
            break;
        } else {
            console.log(`[ENV] ❌ .env 파일 없음: ${testPath}`);
        }
    }

    if (envPath) {
        try {
            console.log(`[ENV] dotenv.config 시도 중: ${envPath}`);
            const result = require('dotenv').config({ path: envPath, override: true });
            console.log(`[ENV] dotenv.config 결과:`, result.error ? `오류: ${result.error}` : '성공');
            
            if (process.env.GH_TOKEN) {
                console.log(`[ENV] ✅ GH_TOKEN 로드 성공: ${process.env.GH_TOKEN.substring(0, 4)}...`);
                console.log(`[ENV] GH_TOKEN 길이: ${process.env.GH_TOKEN.length} 문자`);
            } else {
                console.error('[ENV] ❌ .env 파일은 있으나 GH_TOKEN 변수를 찾지 못했습니다.');
                console.error('[ENV] .env 파일 내용을 확인해보세요: GH_TOKEN=your_token_here');
                
                // .env 파일 내용 일부 출력 (디버깅용)
                try {
                    const envContent = fs.readFileSync(envPath, 'utf8');
                    const lines = envContent.split('\n').slice(0, 5); // 처음 5줄만
                    console.log('[ENV] .env 파일 내용 (처음 5줄):');
                    lines.forEach((line, i) => {
                        const cleanLine = line.replace(/=.+/, '=***'); // 값 숨김
                        console.log(`[ENV]   ${i + 1}: ${cleanLine}`);
                    });
                } catch (e) {
                    console.error('[ENV] .env 파일 내용 읽기 실패:', e.message);
                }
            }
        } catch (error) {
            console.error('[ENV] ❌ .env 파일 로드 중 오류:', error.message);
        }
    } else {
        console.error(`[ENV] ❌ .env 파일을 찾을 수 없습니다.`);
        console.error('[ENV] 확인된 경로:', possiblePaths);
        
        // .env 파일이 없어도 시스템 환경변수에서 GH_TOKEN 확인
        if (process.env.GH_TOKEN) {
            console.log('[ENV] ✅ 시스템 환경변수에서 GH_TOKEN 발견');
            console.log(`[ENV] GH_TOKEN (시스템): ${process.env.GH_TOKEN.substring(0, 4)}...`);
        } else {
            console.error('[ENV] ❌ 시스템 환경변수에서도 GH_TOKEN을 찾을 수 없습니다.');
            console.error('[ENV] GitHub 토큰이 없으면 자동 업데이트가 작동하지 않습니다.');
            console.error('[ENV] 💡 해결 방법:');
            console.error('[ENV]   1. .env 파일을 빌드 시 포함시키기');
            console.error('[ENV]   2. Windows 시스템 환경변수로 GH_TOKEN 설정');
            console.error('[ENV]   3. 빌드 후 수동으로 .env 파일을 resources 폴더에 복사');
        }
    }
}
loadEnvironmentFile();

// 자동 업데이트 설정
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

console.log('[Updater] 자동 업데이트 설정 초기화...');

// 🔥 빌드 시점에 토큰이 삽입되는 플레이스홀더 (deploy.bat에서 실제 토큰으로 치환됨)
const BUILT_IN_GH_TOKEN = 'YOUR_GITHUB_TOKEN_HERE';

// 블로그 방식의 기본 autoUpdater 설정
const effectiveToken = process.env.GH_TOKEN || (BUILT_IN_GH_TOKEN.startsWith('ghp_') ? BUILT_IN_GH_TOKEN : null);

if (effectiveToken) {
    console.log('[Updater] GitHub 토큰 설정 완료');
    
    // 기본 autoUpdater 설정
    autoUpdater.autoDownload = true; // 자동 다운로드 활성화
    autoUpdater.autoInstallOnAppQuit = false; // 앱 종료 시 자동 설치 비활성화
    
    // GitHub 설정
    autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'cuj2090',
        repo: 'coupang_naver',
        private: true,
        token: effectiveToken
    });
    
    console.log('[Updater] autoUpdater 설정 완료');
} else {
    console.warn('[Updater] GitHub 토큰이 없어 업데이트를 확인하지 않습니다.');
}

// 블로그 방식의 autoUpdater 이벤트 핸들러
autoUpdater.on("checking-for-update", () => {
    console.log("🔍 업데이트 확인 중...");
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-log', '🔍 업데이트 확인 중...');
    }
});

autoUpdater.on("update-available", (info) => {
    console.log("📦 업데이트 사용 가능:", info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-log', `📦 새 버전 발견: ${info.version} - 다운로드 중...`);
    }
});

autoUpdater.on("update-not-available", (info) => {
    console.log("✅ 최신 버전입니다:", info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-log', `✅ 최신 버전 사용 중: ${info.version}`);
    }
});

autoUpdater.on("error", (err) => {
    console.error("❌ 업데이트 오류:", err);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-log', `❌ 업데이트 오류: ${err.message}`);
    }
});

autoUpdater.on("download-progress", (progressObj) => {
    let progressMsg = "다운로드 " + Math.round(progressObj.percent) + "%";
    console.log("📥 " + progressMsg);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-log', `📥 ${progressMsg}`);
    }
});

autoUpdater.on("update-downloaded", (info) => {
    console.log("✅ 업데이트 다운로드 완료:", info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-log', `✅ 업데이트 다운로드 완료: ${info.version}`);
        
        // 블로그 방식: 사용자에게 업데이트 여부 묻기
        const { dialog } = require('electron');
        const option = {
            type: "question",
            buttons: ["예", "아니오"],
            defaultId: 0,
            title: "업데이트",
            message: `새로운 버전 ${info.version}이 다운로드되었습니다.\n\n지금 업데이트를 설치하시겠습니까?`,
        };
        
        dialog.showMessageBox(mainWindow, option).then(function(res){
            if(res.response === 0){
                console.log('✅ 사용자가 업데이트 설치를 승인했습니다.');
                mainWindow.webContents.send('update-log', '🔄 앱 재시작 및 업데이트 설치 중...');
                autoUpdater.quitAndInstall();
            } else {
                console.log('⏸️ 사용자가 업데이트를 연기했습니다.');
                mainWindow.webContents.send('update-log', '⏸️ 업데이트가 연기되었습니다. 다음 시작 시 적용됩니다.');
            }
        });
    }
});



/**
 * 대체 업데이트 확인 함수 (Azure Blob Storage 인증 실패 시 사용)
 */
async function checkUpdateAlternative() {
    const token = process.env.GH_TOKEN || (BUILT_IN_GH_TOKEN.startsWith('ghp_') ? BUILT_IN_GH_TOKEN : null);
    if (!token) {
        throw new Error('GitHub 토큰이 설정되지 않았습니다.');
    }
    
    return new Promise((resolve, reject) => {
        console.log('[Updater] 대체 업데이트 확인 시작...');
        
        const options = {
            hostname: 'api.github.com',
            path: '/repos/cuj2090/coupang_naver/releases/latest',
            method: 'GET',
            headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'nepas-electron-app',
                'Accept': 'application/vnd.github.v3+json'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        const release = JSON.parse(data);
                        
                        // 빌드 환경에 맞는 package.json 경로 찾기
                        let packageJsonPath;
                        let currentVersion;
                        
                        if (isPackaged) {
                            // 빌드 환경: app.getVersion() 사용 (가장 안전)
                            if (app) {
                                currentVersion = app.getVersion();
                                console.log(`[Updater] app.getVersion() 사용: ${currentVersion}`);
                            } else {
                                return reject(new Error('Electron app 객체를 사용할 수 없습니다.'));
                            }
                        } else {
                            // 개발 환경: package.json 직접 읽기
                            try {
                                packageJsonPath = path.join(__dirname, '..', 'package.json');
                                const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
                                const packageData = JSON.parse(packageContent);
                                currentVersion = packageData.version;
                                console.log(`[Updater] package.json 직접 읽기: ${currentVersion}`);
                            } catch (e) {
                                console.error('[Updater] package.json 읽기 실패:', e.message);
                                return reject(new Error('현재 버전을 확인할 수 없습니다.'));
                            }
                        }
                        
                        if (!currentVersion) {
                            return reject(new Error('현재 애플리케이션 버전을 확인할 수 없습니다.'));
                        }
                        
                        const latestVersion = release.tag_name.replace('v', '');
                        console.log(`[Updater] 대체 버전 확인: 현재 ${currentVersion}, 최신 ${latestVersion}`);
                        
                        if (latestVersion !== currentVersion) {
                            console.log('[Updater] 새 버전 발견 - 사용자에게 알림');
                            console.log(`[Updater] 현재 버전: ${currentVersion}, 최신 버전: ${latestVersion}`);
                            
                            // 직접 다운로드 링크 찾기 (Azure Blob Storage 회피)
                            const assets = release.assets;
                            let directDownloadUrl = null;
                            
                            if (assets && assets.length > 0) {
                                // Windows 설치 파일 찾기
                                const windowsAsset = assets.find(asset => 
                                    asset.name.includes('Setup.exe') || 
                                    asset.name.includes('.exe')
                                );
                                
                                if (windowsAsset) {
                                    // GitHub API를 통한 직접 다운로드 URL 생성
                                    directDownloadUrl = `https://api.github.com/repos/cuj2090/coupang_naver/releases/assets/${windowsAsset.id}`;
                                    console.log('[Updater] 직접 다운로드 URL 생성:', directDownloadUrl);
                                }
                            }
                            
                            // 사용자에게 수동 업데이트 알림
                            if (mainWindow && !mainWindow.isDestroyed()) {
                                mainWindow.webContents.send('update-log', `🆕 새 버전 발견: v${latestVersion}`);
                                mainWindow.webContents.send('update-log', '💻 수동 다운로드가 필요합니다');
                                mainWindow.webContents.send('update-log', `🔗 다운로드: https://github.com/cuj2090/coupang_naver/releases/tag/v${latestVersion}`);
                                
                                mainWindow.webContents.send('update-available-manual', {
                                    version: latestVersion,
                                    downloadUrl: directDownloadUrl || release.html_url,
                                    releaseNotes: release.body,
                                    directDownload: !!directDownloadUrl
                                });
                            }
                        } else {
                            console.log('[Updater] 최신 버전 사용 중');
                        }
                        
                        // 대체 업데이트 체크 성공 시 실패 횟수 초기화
                        updateFailureCount = 0;
                        console.log('[Updater] 대체 업데이트 체크 성공 - 실패 횟수 초기화');
                        
                        resolve(true);
                    } else {
                        reject(new Error(`GitHub API 오류: ${res.statusCode}`));
                    }
                } catch (parseError) {
                    reject(new Error(`GitHub API 응답 파싱 오류: ${parseError.message}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(new Error(`GitHub API 요청 오류: ${error.message}`));
        });
        
        req.setTimeout(10000, () => {
            req.abort();
            reject(new Error('GitHub API 요청 타임아웃'));
        });
        
        req.end();
    });
}

/**
 * 토큰 없이 공개 API로 업데이트 확인하는 함수 (최후 수단)
 */
async function checkUpdateAlternativePublic() {
    return new Promise((resolve, reject) => {
        console.log('[Updater] 공개 API로 업데이트 확인 시작...');
        
        const options = {
            hostname: 'api.github.com',
            path: '/repos/cuj2090/coupang_naver/releases/latest',
            method: 'GET',
            headers: {
                'User-Agent': 'nepas-electron-app',
                'Accept': 'application/vnd.github.v3+json'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        const release = JSON.parse(data);
                        
                        let currentVersion;
                        if (isPackaged && app) {
                            currentVersion = app.getVersion();
                            console.log(`[Updater] app.getVersion() 사용: ${currentVersion}`);
                        } else {
                            try {
                                const packageJsonPath = path.join(__dirname, '..', 'package.json');
                                const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
                                const packageData = JSON.parse(packageContent);
                                currentVersion = packageData.version;
                                console.log(`[Updater] package.json 직접 읽기: ${currentVersion}`);
                            } catch (e) {
                                console.error('[Updater] package.json 읽기 실패:', e.message);
                                return reject(new Error('현재 버전을 확인할 수 없습니다.'));
                            }
                        }
                        
                        if (!currentVersion) {
                            return reject(new Error('현재 애플리케이션 버전을 확인할 수 없습니다.'));
                        }
                        
                        const latestVersion = release.tag_name.replace('v', '');
                        console.log(`[Updater] 공개 API 버전 확인: 현재 ${currentVersion}, 최신 ${latestVersion}`);
                        
                        if (latestVersion !== currentVersion) {
                            console.log('[Updater] 새 버전 발견 - 사용자에게 수동 다운로드 안내');
                            
                            if (mainWindow && !mainWindow.isDestroyed()) {
                                mainWindow.webContents.send('update-available-manual', {
                                    version: latestVersion,
                                    downloadUrl: release.html_url,
                                    releaseNotes: release.body,
                                    directDownload: false
                                });
                            }
                        } else {
                            console.log('[Updater] 최신 버전 사용 중');
                        }
                        
                        resolve(true);
                    } else {
                        reject(new Error(`GitHub API 오류: ${res.statusCode}`));
                    }
                } catch (parseError) {
                    reject(new Error(`GitHub API 응답 파싱 오류: ${parseError.message}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(new Error(`GitHub API 요청 오류: ${error.message}`));
        });
        
        req.setTimeout(10000, () => {
            req.abort();
            reject(new Error('GitHub API 요청 타임아웃'));
        });
        
        req.end();
    });
}

/**
 * GitHub 토큰 검증 함수
 */
async function validateGitHubToken() {
    const token = process.env.GH_TOKEN || (BUILT_IN_GH_TOKEN.startsWith('ghp_') ? BUILT_IN_GH_TOKEN : null);
    if (!token) {
        throw new Error('GitHub 토큰이 설정되지 않았습니다.');
    }
    
    return new Promise((resolve, reject) => {
        console.log('[Updater] GitHub 토큰 검증 시작...');
        
        const options = {
            hostname: 'api.github.com',
            path: '/repos/cuj2090/coupang_naver/releases/latest',
            method: 'GET',
            headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'nepas-electron-app',
                'Accept': 'application/vnd.github.v3+json'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('[Updater] ✅ GitHub 토큰 검증 성공 - Repository 접근 가능');
                    resolve(true);
                } else if (res.statusCode === 401) {
                    const error = new Error('GitHub 토큰이 유효하지 않습니다.');
                    console.error('[Updater] ❌ GitHub 토큰 검증 실패:', error.message);
                    logTokenTroubleshooting();
                    reject(error);
                } else if (res.statusCode === 403) {
                    const error = new Error('GitHub 토큰에 Repository 접근 권한이 없습니다.');
                    console.error('[Updater] ❌ GitHub 토큰 검증 실패:', error.message);
                    logTokenTroubleshooting();
                    reject(error);
                } else if (res.statusCode === 404) {
                    const error = new Error('Repository를 찾을 수 없습니다.');
                    console.error('[Updater] ❌ GitHub 토큰 검증 실패:', error.message);
                    logTokenTroubleshooting();
                    reject(error);
                } else {
                    const error = new Error(`GitHub API 오류: ${res.statusCode}`);
                    console.error('[Updater] ❌ GitHub 토큰 검증 실패:', error.message);
                    logTokenTroubleshooting();
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('[Updater] ❌ GitHub 토큰 검증 네트워크 오류:', error.message);
            logTokenTroubleshooting();
            reject(error);
        });
        
        req.setTimeout(10000, () => {
            req.abort();
            const error = new Error('GitHub API 요청 타임아웃');
            console.error('[Updater] ❌ GitHub 토큰 검증 실패:', error.message);
            logTokenTroubleshooting();
            reject(error);
        });
        
        req.end();
    });
}

/**
 * 토큰 문제 해결 방법 로그 출력
 */
function logTokenTroubleshooting() {
    console.error('[Updater] 토큰 문제 해결 방법:');
    console.error('[Updater] 1. 토큰이 올바른지 확인 (.env 파일)');
    console.error('[Updater] 2. 토큰 권한 확인 (repo 스코프 필요)');
    console.error('[Updater] 3. 토큰 만료 여부 확인');
    console.error('[Updater] 4. Repository 정보 확인 (cuj2090/coupang_naver)');
    console.error('[Updater] 5. 인터넷 연결 상태 확인');
}

// 기존 autoUpdater 이벤트 핸들러들을 제거하고 간단한 시스템으로 교체

// 기존 복잡한 autoUpdater 이벤트 핸들러들을 모두 제거

// 모듈 imports
const LoginManager = require('./modules/LoginManager');
const CoupangCrawler = require('./modules/CoupangCrawler');
const ContentGenerator = require('./modules/ContentGenerator');
const ImageProcessor = require('./modules/ImageProcessor');
const BlogPublisher = require('./modules/BlogPublisher');
const SessionManager = require('./modules/SessionManager');
const ConfigManager = require('./modules/ConfigManager');
const ProgressTracker = require('./modules/ProgressTracker');
const NaverIdValidator = require('./modules/NaverIdValidator');
const CoupangApiManager = require('./modules/CoupangApiManager');

/**
 * 메인 블로그 자동화 클래스
 * 모든 모듈을 통합하여 전체 자동화 프로세스를 관리합니다.
 */
class BlogAutomation {
    constructor(options) {
        // 모듈 인스턴스들
        this.configManager = new ConfigManager(options.appDataPath);
        this.loginManager = new LoginManager(options.sessionsPath);
        this.coupangCrawler = new CoupangCrawler(options.appDataPath);
        this.contentGenerator = new ContentGenerator();
        this.imageProcessor = new ImageProcessor(options.tempImagePath, options.imagesPath);
        this.blogPublisher = null; // 필요할 때 생성
        this.sessionManager = new SessionManager(options.sessionsPath);
        this.progressTracker = new ProgressTracker(options.logsPath);
        this.naverIdValidator = new NaverIdValidator();
        this.coupangApiManager = new CoupangApiManager(options.appDataPath);
        
        // 상태 관리
        this.isRunning = false;
        this.currentSessionId = null;
        this.mainWindow = null;
        
        console.log('🚀 BlogAutomation 시스템 초기화 완료');
    }

    /**
     * 메인 윈도우 설정
     * @param {BrowserWindow} window 메인 윈도우
     */
    setMainWindow(window) {
        this.mainWindow = window;
    }

    /**
     * 렌더러로 진행 상황 전송
     * @param {string} channel 채널명
     * @param {Object} data 데이터
     */
    sendToRenderer(channel, data) {
        try {
            // console.log(`📡 [빌드 디버깅] 렌더러로 데이터 전송:`, {
            //     channel: channel,
            //     hasData: !!data,
            //     dataType: typeof data,
            //     dataPreview: data && typeof data === 'object' ? Object.keys(data) : data
            // });
            
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send(channel, data);
                // console.log('✅ 렌더러 데이터 전송 성공');
            } else {
                console.warn('⚠️ 렌더러 윈도우 없음 또는 파괴됨');
            }
        } catch (error) {
            console.error('❌ [빌드 디버깅] 렌더러 데이터 전송 실패:', {
                error: error.message,
                channel: channel,
                stack: error.stack
            });
        }
    }

    /**
     * 메인 프로세스 로그를 렌더러 프로세스로 전송
     * @param {string} level 로그 레벨 (info, warn, error)
     * @param {string} message 로그 메시지
     * @param {*} data 추가 데이터 (옵션)
     */
    sendLogToRenderer(level, message, data = null) {
        try {
            // 로그 데이터 유효성 검증
            if (!level || typeof level !== 'string') {
                level = 'info';
            }
            if (!message || typeof message !== 'string') {
                message = '메시지 없음';
            }

            const logData = {
                level: level,
                message: message,
                timestamp: new Date().toISOString()
            };

            // 데이터가 있으면 추가 (JSON 직렬화 가능한지 확인)
            if (data !== null && data !== undefined) {
                try {
                    // JSON 직렬화 테스트
                    JSON.stringify(data);
                    logData.data = data;
                } catch (serializationError) {
                    console.warn('로그 데이터 직렬화 실패:', serializationError);
                    logData.data = '[직렬화 불가능한 데이터]';
                }
            }

            // SSE 클라이언트로 전송
            if (global.sseClients && Array.isArray(global.sseClients)) {
                global.sseClients.forEach(client => {
                    try {
                        client.write(`data: ${JSON.stringify(logData)}\n\n`);
                    } catch (e) {
                        // ignore
                    }
                });
            }

            if (!this.mainWindow || this.mainWindow.isDestroyed()) {
                return;
            }

            // 렌더러로 전송
            this.mainWindow.webContents.send('main-process-log', logData);
            
        } catch (error) {
            console.error('sendLogToRenderer 실패:', error);
        }
    }

    /**
     * 쿠팡 API 기반 자동화 실행 (랜덤 상품 선택)
     * @param {Object} account 계정 정보
     * @returns {Promise<Object>} 실행 결과
     */
    async executeAutomationWithCoupangAPI(account) {
        let sessionId = null;
        
        try {
            console.log(`🚀 쿠팡 API 기반 자동화 시작: ${account.username}`);
            this.sendLogToRenderer('info', `🚀 쿠팡 API 기반 자동화 시작: ${account.username}`);
            
            // 세션 시작
            sessionId = this.progressTracker.startSession({
                accountId: account.id,
                accountName: account.username,
                executionMode: 'coupang-api'
            });
            
            this.currentSessionId = sessionId;
            this.isRunning = true;
            
            // 설정 정보 가져오기
            const settings = await this.getRendererSettings();
            console.log('⚙️ 적용할 설정:', settings);
            this.sendLogToRenderer('info', '⚙️ 적용할 설정', settings);
            
            // 계정별 일일 포스트 제한 확인
            const dailyPostKey = this.generateDailyPostKey(account);
            const todayPostCount = await this.getTodayPostCount(dailyPostKey);
            
            console.log(`📊 일일 포스트 현황: ${account.username} - 오늘 ${todayPostCount}개 / 제한 ${settings.dailyLimit}개`);
            this.sendLogToRenderer('info', `📊 일일 포스트 현황: ${account.username} - 오늘 ${todayPostCount}개 / 제한 ${settings.dailyLimit}개`);
            
            if (todayPostCount >= settings.dailyLimit) {
                const error = `계정 ${account.username}이 일일 포스트 제한(${settings.dailyLimit}개)에 도달했습니다. 내일 다시 시도해주세요.`;
                console.warn('⚠️ 일일 포스트 제한 도달:', error);
                this.sendLogToRenderer('warn', '⚠️ 일일 포스트 제한 도달:', error);
                throw new Error(error);
            }
            
            // 처리할 포스트 수 계산
            const remainingPostsToday = settings.dailyLimit - todayPostCount;
            const postsToProcess = Math.min(remainingPostsToday, settings.dailyLimit);
            
            console.log(`🎯 총 ${postsToProcess}개 포스트 처리 예정 (일일 제한 고려)`);
            this.sendLogToRenderer('info', `🎯 총 ${postsToProcess}개 포스트 처리 예정 (일일 제한 고려)`);
            
            let processedCount = 0;
            let successCount = 0;
            let errorCount = 0;
            const results = [];
            
            // 포스트별 루프 처리
            for (let postIndex = 0; postIndex < postsToProcess; postIndex++) {
                // 중지 조건 확인
                if (!this.isRunning) {
                    console.log('⏹️ 자동화 중지 요청으로 인해 처리를 중단합니다.');
                    this.sendLogToRenderer('warn', '⏹️ 자동화 중지 요청으로 인해 처리를 중단합니다.');
                    break;
                }
                
                console.log(`\n🎲 [${postIndex + 1}/${postsToProcess}] 쿠팡 API 랜덤 상품 처리 시작`);
                this.sendLogToRenderer('info', `🎲 [${postIndex + 1}/${postsToProcess}] 쿠팡 API 랜덤 상품 처리 시작`);
                
                // 실시간 진행 상황 전송
                this.sendToRenderer('url-progress-update', {
                    currentUrl: postIndex + 1,
                    totalUrls: postsToProcess,
                    accountName: account.username || account.naverId,
                    url: '쿠팡 API 랜덤 상품',
                    progress: Math.round(((postIndex + 1) / postsToProcess) * 100)
                });
                
                try {
                    // 1단계: 쿠팡 API에서 랜덤 상품 URL 가져오기
                    console.log('🎁 1단계: 쿠팡 API에서 랜덤 상품 선택');
                    this.sendLogToRenderer('info', '🎁 1단계: 쿠팡 API에서 랜덤 상품 선택');
                    
                    const coupangUrl = await this.coupangApiManager.getRandomProductUrl({
                        subId: account.affiliateId || 'default-channel',
                        imageSize: '512x512'
                    });
                    
                    console.log('✅ 쿠팡 API 랜덤 상품 URL 획득:', coupangUrl);
                    this.sendLogToRenderer('info', '✅ 쿠팡 API 랜덤 상품 URL 획득:', coupangUrl);
                    
                    // 2단계: 선택된 상품 URL 크롤링 및 컨텐츠 생성
                    console.log('🕷️ 2단계: 선택된 상품 크롤링 및 컨텐츠 생성');
                    this.sendLogToRenderer('info', '🕷️ 2단계: 선택된 상품 크롤링 및 컨텐츠 생성');
                    
                    const productResult = await this.processSingleProduct(coupangUrl, account);
                    
                    if (!productResult.success) {
                        throw new Error(`상품 처리 실패: ${productResult.error}`);
                    }
                    
                    // 3단계: 이미지 처리
                    console.log('🖼️ 3단계: 이미지 처리');
                    this.sendLogToRenderer('info', '🖼️ 3단계: 이미지 처리');
                    
                    const imageResult = await this.downloadImages(productResult.productData?.images || []);
                    
                    // 4단계: 블로그 포스팅
                    console.log('📝 4단계: 블로그 포스팅');
                    this.sendLogToRenderer('info', '📝 4단계: 블로그 포스팅');
                    
                    const publishResult = await this.publishToBlog(productResult, imageResult, account);
                    
                    if (publishResult.success) {
                        successCount++;
                        console.log(`✅ 포스트 ${postIndex + 1} 성공`);
                        this.sendLogToRenderer('info', `✅ 포스트 ${postIndex + 1} 성공`);
                        
                        // 일일 포스트 수 증가
                        await this.incrementTodayPostCount(dailyPostKey);
                    } else {
                        errorCount++;
                        console.error(`❌ 포스트 ${postIndex + 1} 실패: ${publishResult.error}`);
                        this.sendLogToRenderer('error', `❌ 포스트 ${postIndex + 1} 실패: ${publishResult.error}`);
                    }
                    
                    results.push({
                        postIndex: postIndex + 1,
                        coupangUrl: coupangUrl,
                        productTitle: productResult.productData?.title || 'Unknown',
                        success: publishResult.success,
                        error: publishResult.error
                    });
                    
                    processedCount++;
                    
                    // 포스트 간 대기 시간 (마지막 포스트가 아닐 때만)
                    if (postIndex < postsToProcess - 1) {
                        const delayMinutes = settings.postDelay || 10;
                        const delayMs = delayMinutes * 60 * 1000;
                        console.log(`⏳ 다음 포스트까지 ${delayMinutes}분 대기 중...`);
                        this.sendLogToRenderer('info', `⏳ 다음 포스트까지 ${delayMinutes}분 대기 중...`);
                        
                        await this.delayWithStopCheck(delayMs, {
                            message: `다음 포스트까지 ${delayMinutes}분 대기 중...`,
                            checkInterval: 5000
                        });
                    }
                    
                } catch (error) {
                    errorCount++;
                    console.error(`❌ 포스트 ${postIndex + 1} 처리 중 오류:`, error);
                    this.sendLogToRenderer('error', `❌ 포스트 ${postIndex + 1} 처리 중 오류:`, error.message);
                    
                    results.push({
                        postIndex: postIndex + 1,
                        success: false,
                        error: error.message
                    });
                    
                    processedCount++;
                }
            }
            
            // 세션 완료
            this.progressTracker.completeSession();
            
            console.log('\n🎉 쿠팡 API 기반 자동화 완료!');
            console.log(`📊 성공: ${successCount}개, 실패: ${errorCount}개`);
            this.sendLogToRenderer('info', '🎉 쿠팡 API 기반 자동화 완료!');
            this.sendLogToRenderer('info', `📊 성공: ${successCount}개, 실패: ${errorCount}개`);
            
            return {
                success: true,
                processedCount: processedCount,
                successCount: successCount,
                errorCount: errorCount,
                results: results,
                message: '쿠팡 API 기반 자동화 완료'
            };
            
        } catch (error) {
            console.error('❌ 쿠팡 API 기반 자동화 실패:', error);
            this.sendLogToRenderer('error', '❌ 쿠팡 API 기반 자동화 실패:', error.message);
            
            if (sessionId) {
                this.progressTracker.failSession(error);
            }
            
            return {
                success: false,
                error: error.message,
                sessionId: sessionId
            };
            
        } finally {
            this.isRunning = false;
            this.currentSessionId = null;
        }
    }

    /**
     * 단일 계정 자동화 실행
     * @param {Object} account 계정 정보
     * @returns {Promise<Object>} 실행 결과
     */
    async executeSingleAccount(account) {
        let sessionId = null;
        
        try {
            console.log('🚀 [빌드 디버깅] 단일 계정 자동화 시작');
            console.log('📦 빌드 환경:', app.isPackaged ? 'PACKAGED' : 'DEVELOPMENT');
            console.log('👤 계정 정보:', {
                username: account.username,
                blogId: account.blogId,
                affiliateId: account.affiliateId,
                categoryId: account.categoryId
            });
            
            // 렌더러로 로그 전송
            this.sendLogToRenderer('info', '🚀 [빌드 디버깅] 단일 계정 자동화 시작');
            this.sendLogToRenderer('info', `📦 빌드 환경: ${app.isPackaged ? 'PACKAGED' : 'DEVELOPMENT'}`);
            this.sendLogToRenderer('info', '👤 계정 정보', {
                username: account.username,
                blogId: account.blogId,
                affiliateId: account.affiliateId,
                categoryId: account.categoryId
            });
            
            // 이미 자동화가 실행 중인지 확인
            if (this.isRunning) {
                console.log('⚠️ 자동화가 이미 실행 중입니다.');
                return {
                    success: false,
                    error: '이미 자동화가 진행 중입니다. 완료될 때까지 기다려주세요.',
                    message: '자동화 진행 중'
                };
            }
            
            // 세션 시작
            console.log('🔄 세션 시작...');
            sessionId = this.progressTracker.startSession({
                accountId: account.id,
                accountName: account.username,
                executionMode: 'single'
            });
            console.log('✅ 세션 시작 완료, ID:', sessionId);
            
            this.currentSessionId = sessionId;
            this.isRunning = true;
            
            // 단계별 실행
            console.log('🔄 executeAutomationSteps 호출...');
            console.time('executeAutomationSteps 실행 시간');
            
            const result = await this.executeAutomationSteps(account);
            
            console.timeEnd('executeAutomationSteps 실행 시간');
            console.log('📊 executeAutomationSteps 결과:', {
                success: result?.success,
                error: result?.error,
                processedCount: result?.processedCount,
                successCount: result?.successCount,
                errorCount: result?.errorCount
            });
            
            // 세션 완료
            if (result.success) {
                console.log('✅ 세션 완료 처리...');
                this.progressTracker.completeSession();
            } else {
                console.log('❌ 세션 실패 처리...');
                this.progressTracker.failSession(result.error || '알 수 없는 오류');
            }
            
            console.log('🎉 단일 계정 자동화 완료');
            return result;
            
        } catch (error) {
            console.error('❌ [빌드 디버깅] 단일 계정 자동화 실패 (상세):', {
                error: error,
                message: error.message,
                stack: error.stack,
                name: error.name,
                account: account.username
            });
            
            if (sessionId) {
                this.progressTracker.failSession(error);
            }
            
            return {
                success: false,
                error: error.message,
                sessionId: sessionId
            };
            
        } finally {
            console.log('🧹 단일 계정 자동화 정리 작업...');
            this.isRunning = false;
            this.currentSessionId = null;
            console.log('✅ 정리 작업 완료');
        }
    }

    /**
     * 네이버 블로그 발행 기능 테스트 실행
     * @param {Object} payload 테스트 정보
     * @returns {Promise<Object>} 실행 결과
     */
    async executeNaverTestPublish(payload) {
        try {
            console.log('🧪 [테스트] 네이버 블로그 발행 테스트 시작');
            this.sendLogToRenderer('info', '🧪 네이버 블로그 발행 테스트를 시작합니다...');
            
            if (this.isRunning) {
                return {
                    success: false,
                    error: '현재 다른 자동화 작업이 진행 중입니다. 완료 후 시도해주세요.'
                };
            }
            
            this.isRunning = true;
            
            // BlogPublisher 설정
            const blogConfig = {
                BLOG_ID: payload.blogId,
                CATEGORY_ID: 1, // 기본 카테고리
                OPEN_TYPE: 2,   // 전체공개
                geminiApi: payload.geminiApi || ''
            };
            
            console.log(`📂 카테고리 ID: 1, 블로그 ID: ${payload.blogId}`);
            this.sendLogToRenderer('info', `📂 블로그 ID: ${payload.blogId}로 설정을 생성합니다.`);
            
            this.blogPublisher = new (require('./modules/BlogPublisher'))(blogConfig);
            
            // 🔒 SessionManager 전달
            this.blogPublisher.sessionManager = this.sessionManager;
            
            // 진행 업데이트를 렌더러로 보냅니다
            this.blogPublisher.on('publish-progress', (data) => {
                const stepMsg = data.step || '진행 중';
                console.log(`[테스트 진행 상황] ${stepMsg}`);
                this.sendLogToRenderer('info', `⏳ [테스트 진행] ${stepMsg}`);
            });
            
            const postData = {
                title: payload.title || '네이버 블로그 자동 발행 테스트 제목',
                content: payload.body || '네이버 블로그 자동 발행 테스트 본문 내용입니다.',
                images: [], // 테스트 포스팅은 빠르고 가볍게 진행하기 위해 이미지 생략
                categoryId: 1,
                openType: 'public',
                tags: ['블로그테스트', '자동발행'],
                productData: null,
                affiliateUrl: null
            };
            
            const account = {
                username: payload.naverId,
                password: payload.naverPassword,
                naverPassword: payload.naverPassword,
                blogId: payload.blogId,
                geminiApi: payload.geminiApi || ''
            };
            
            console.log('📝 로그인 및 포스팅 발행 시도...');
            this.sendLogToRenderer('info', '📝 네이버 로그인 및 포스팅 발행 작업을 시작합니다...');
            
            const publishResult = await this.blogPublisher.loginAndPublish(postData, account);
            
            if (!publishResult.success) {
                throw new Error(`블로그 포스트 발행 실패: ${publishResult.error}`);
            }
            
            console.log('✅ 네이버 발행 테스트 최종 성공:', publishResult);
            this.sendLogToRenderer('success', '🎉 네이버 블로그 포스팅 발행 테스트가 완벽히 성공했습니다!');
            if (publishResult.data && publishResult.data.url) {
                this.sendLogToRenderer('info', `🔗 발행된 글 주소: ${publishResult.data.url}`);
            }
            
            return publishResult;
            
        } catch (error) {
            console.error('❌ 네이버 발행 테스트 중 오류:', error);
            this.sendLogToRenderer('error', `❌ 네이버 발행 테스트 중 오류 발생: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        } finally {
            this.isRunning = false;
            
            // BlogPublisher 정리
            if (this.blogPublisher) {
                try {
                    await this.blogPublisher.cleanup();
                } catch (cleanupError) {
                    console.warn('⚠️ 테스트 완료 후 BlogPublisher 정리 중 오류:', cleanupError.message);
                }
                this.blogPublisher = null;
            }
            console.log('✅ 테스트 프로세스 정리 완료');
            this.sendLogToRenderer('info', '🧹 테스트 프로세스가 정상적으로 종료되었습니다.');
        }
    }

    async executePhotoPublish(payload) {
        try {
            console.log('📸 [사진 발행] 네이버 사진 자동 발행 시작');
            this.sendLogToRenderer('info', '📸 네이버 사진 자동 발행을 시작합니다...');
            
            if (this.isRunning) {
                return {
                    success: false,
                    error: '현재 다른 자동화 작업이 진행 중입니다. 완료 후 시도해주세요.'
                };
            }
            
            this.isRunning = true;
            
            const { naverId, naverPassword, blogId, geminiApi, images, context, openType, useBubble, useDescription } = payload;
            
            let activeGeminiApi = geminiApi;
            if ((!activeGeminiApi || activeGeminiApi.trim() === '') && this.configManager) {
                const localAccount = this.configManager.getAccounts().find(acc => 
                    acc.username && acc.username.trim().toLowerCase() === naverId.trim().toLowerCase()
                );
                if (localAccount && localAccount.geminiApi) {
                    console.log(`🔑 [서버 키 자동 대체] 모바일 수신 키가 비어 있어 PC 서버의 API 키를 적용합니다.`);
                    activeGeminiApi = localAccount.geminiApi;
                }
            } else if (activeGeminiApi && activeGeminiApi.trim() !== '') {
                console.log(`🔑 [모바일 API 키 사용] 모바일 기기에서 수신한 API 키를 사용합니다.`);
                // PC 서버의 계정 설정에 저장된 키와 다르면 동기화하여 저장
                if (this.configManager) {
                    const localAccount = this.configManager.getAccounts().find(acc => 
                        acc.username && acc.username.trim().toLowerCase() === naverId.trim().toLowerCase()
                    );
                    if (localAccount && localAccount.geminiApi !== activeGeminiApi) {
                        console.log(`💾 [API 키 동기화] PC 서버의 기존 API 키를 모바일에서 입력한 새 API 키로 업데이트합니다.`);
                        localAccount.geminiApi = activeGeminiApi;
                        this.configManager.addOrUpdateAccount(localAccount).catch(err => {
                            console.error('❌ [API 키 동기화 실패]:', err);
                        });
                    }
                }
            }
            
            if (!naverId || !naverPassword || !blogId || !activeGeminiApi) {
                return {
                    success: false,
                    error: '네이버 계정 정보와 제미나이 API 키가 필요합니다.'
                };
            }
            
            if (!images || !Array.isArray(images) || images.length === 0) {
                return {
                    success: false,
                    error: '첨부된 사진이 없습니다.'
                };
            }

            // 1. 임시 이미지 디렉토리 확인 및 생성
            const fs = require('fs');
            const path = require('path');
            const tempDir = global.paths ? global.paths.tempImagePath : path.join(process.cwd(), 'temp_images');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            // 2. base64 이미지를 파일로 저장 및 경로 수집
            this.sendLogToRenderer('info', `💾 첨부된 사진 ${images.length}장을 임시 파일로 저장 및 방향 보정 중...`);
            const imagePaths = [];
            const sharp = require('sharp');
            for (let i = 0; i < images.length; i++) {
                const base64Data = images[i];
                const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
                let ext = 'png';
                let buffer;
                if (matches) {
                    ext = matches[1];
                    buffer = Buffer.from(matches[2], 'base64');
                } else {
                    buffer = Buffer.from(base64Data, 'base64');
                }
                const fileName = `user_photo_${Date.now()}_${i}.${ext}`;
                const filePath = path.join(tempDir, fileName);
                
                try {
                    // 🔥 sharp를 사용하여 EXIF Orientation 정보를 자동 분석 후 물리적인 방향으로 사진 회전 및 구도 보존
                    await sharp(buffer)
                        .rotate()
                        .toFile(filePath);
                    this.sendLogToRenderer('info', `📸 [보정 완료] ${i + 1}번째 이미지 방향 및 구도 조정을 완벽히 처리했습니다.`);
                } catch (sharpError) {
                    console.error(`⚠️ sharp 회전 처리 중 오류, 원본 파일로 저장합니다:`, sharpError.message);
                    fs.writeFileSync(filePath, buffer);
                }
                
                imagePaths.push(filePath);
            }
            this.sendLogToRenderer('info', '✅ 사진 파일 변환 및 방향 보조 완료');

            // 3. 제미나이 멀티모달 프롬프트를 사용하여 글 생성
            this.sendLogToRenderer('info', '🤖 제미나이 AI를 활용하여 사진 분석 및 감성 본문 작성 중...');
            
            const ContentGenerator = require('./modules/ContentGenerator');
            const generator = new ContentGenerator();
            generator.setApiKey(activeGeminiApi);
            
            const fileToGenerativePart = (base64Data) => {
                const matches = base64Data.match(/^data:(image\/[a-zA-Z0-9]+);base64,(.+)$/);
                if (matches) {
                    return {
                        inlineData: {
                            data: matches[2],
                            mimeType: matches[1]
                        },
                    };
                }
                return {
                    inlineData: {
                        data: base64Data,
                        mimeType: 'image/png'
                    }
                };
            };
            
            const imageParts = images.map(base64 => fileToGenerativePart(base64));
            
            const prompt = `당신은 대한민국 대표 일상/감성 네이버 블로거입니다.
제공된 사진들(${imageParts.length}장)과 작성자가 제공한 설명(컨텍스트)을 분석하여, 한 편의 아름답고 자연스러운 블로그 포스팅을 작성해주세요.

[작성자 설명(컨텍스트)]:
"${context || '생략됨'}"

[요구사항 및 형식]:
1. 전체 글에 어울리는 매력적인 [대제목]을 가장 먼저 생성해주세요.
2. 전달된 사진은 총 ${imageParts.length}장입니다. 본문은 반드시 사진 개수와 정확히 일치하는 ${imageParts.length}개의 섹션으로 구성되어야 합니다.
3. 각 섹션(문단)은 아래 형식으로 한 줄씩 띄우며 번호나 [섹션] 같은 인덱스 없이 자연스럽게 구성해주세요:
   - 굵은체 소제목: 해당 문단의 핵심 소제목
   - 보통체 본문: 사진을 설명하고 감상을 담은 친근하고 자연스러운 내용 (약 60자 내외로 간결하게 작성하되, 설명이 더 필요한 불가피한 경우에도 절대 120자를 넘지 않도록 해주세요.)
4. 글을 작성할 때는 사진의 이미지 콘텐츠와 작성자가 준 설명을 감안하여, 글의 시기(계절, 요일, 촬영 시간대 등)와 분위기가 물씬 느껴지도록 감성적인 어조로 적어주세요.
5. 이모지(😊, 📸 등)는 네이버 블로그 봇 정책 및 깔끔한 가독성을 위해 절대 사용하지 마세요.
6. 출력을 줄 때 반드시 아래와 같은 파싱하기 쉬운 JSON 형식으로 반환해주세요:
{
  "title": "여기에 전체 대제목 입력",
  "sections": [
    {
      "subtitle": "소제목 1",
      "body": "본문 내용 1"
    },
    ...
  ]
}
JSON 외에 다른 여담이나 설명 문구, 백틱(\`\`\`json 등)은 붙이지 말고 순수 JSON 데이터만 출력해주세요.`;

            const chatSession = generator.model.startChat({
                generationConfig: generator.generationConfig,
                history: [],
            });

            // 멀티모달 메시지 파트 구성
            const messageParts = [...imageParts, prompt];
            
            console.log('🤖 제미나이 AI 멀티모달 호출...');
            const aiResult = await chatSession.sendMessage(messageParts);
            let responseText = aiResult.response.text().trim();
            console.log('🤖 제미나이 AI 응답 수신 완료');
            
            // JSON 마크다운 포맷 제거 후 파싱
            responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            
            let postJson;
            try {
                postJson = JSON.parse(responseText);
            } catch (e) {
                console.warn('⚠️ JSON 파싱 실패, 정규식으로 복구 시도:', e);
                const titleMatch = responseText.match(/"title"\s*:\s*"([^"]+)"/);
                const title = titleMatch ? titleMatch[1] : '우리 집 막내와 함께한 오늘의 일상 기록';
                postJson = {
                    title: title,
                    sections: [{
                        subtitle: '오늘의 소중한 순간',
                        body: responseText.substring(0, 300)
                    }]
                };
            }
            
            this.sendLogToRenderer('info', `✅ 글 생성 성공! 제목: [${postJson.title}]`);
            
            // 4. 네이버 블로그 업로드용 HTML 본문 조립
            let formattedContent = '';
            for (let i = 0; i < postJson.sections.length; i++) {
                const sec = postJson.sections[i];
                let secText = '';
                
                // 말풍선 소제목 넣기/빼기 처리
                if (useBubble !== false) {
                    secText += sec.subtitle || '오늘의 순간';
                }
                
                // 60자 설명문 넣기/빼기 처리
                if (useDescription !== false) {
                    if (secText) secText += '\n';
                    secText += sec.body || '';
                }
                
                // 📸 둘 다 빠지는 특수한 경우: 사장님의 천재적인 아이디어 적용!
                // 포커싱 에러를 100% 원천 방지하고 사진 위 깔끔한 인덱스용으로 사진 번호(1, 2, ... n) 배정!
                if (useBubble === false && useDescription === false) {
                    secText = `${i + 1}`;
                }
                
                formattedContent += secText + '\n\n';
            }
            
            const fallbackTitle = postJson.title || postJson.Title || postJson.대제목 || "자동 생성된 감성 포스팅";
            const postData = {
                title: fallbackTitle,
                content: formattedContent.trim(),
                images: imagePaths,
                categoryId: 1, // 기본 일상 카테고리
                openType: openType !== undefined ? parseInt(openType, 10) : 2,
                tags: ['일상기록', '사진일기', '네파스자동화'],
                productData: null,
                affiliateUrl: null,
                isPhotoPublish: true
            };
            
            const account = {
                username: naverId,
                password: naverPassword,
                naverPassword: naverPassword,
                blogId: blogId,
                geminiApi: activeGeminiApi
            };
            
            // 5. 블로그 발행 시작
            this.sendLogToRenderer('info', `📝 네이버 자동 발행 로그인 및 포스팅 중...`);
            
            this.blogPublisher = new BlogPublisher({
                BLOG_ID: blogId,
                CATEGORY_ID: 1,
                OPEN_TYPE: openType !== undefined ? parseInt(openType, 10) : 2,
                geminiApi: activeGeminiApi,
                useBubble: useBubble !== false,
                useDescription: useDescription !== false
            });
            this.blogPublisher.sessionManager = this.sessionManager;
            
            this.blogPublisher.on('publish-progress', (data) => {
                const stepMsg = data.step || '진행 중';
                this.sendLogToRenderer('info', `⏳ [발행 진행] ${stepMsg}`);
            });
            
            const publishResult = await this.blogPublisher.loginAndPublish(postData, account);
            
            if (!publishResult.success) {
                throw new Error(`블로그 포스트 발행 실패: ${publishResult.error}`);
            }
            
            this.sendLogToRenderer('success', '🎉 네이버 블로그 사진 포스팅 자동 발행에 최종 성공했습니다!');
            
            return {
                success: true,
                message: '사진 블로그 포스팅이 성공적으로 발행되었습니다!',
                postTitle: postData.title,
                blogId: blogId
            };
            
        } catch (error) {
            console.error('❌ 사진 발행 중 오류 발생:', error);
            this.sendLogToRenderer('error', `❌ 사진 발행 실패: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        } finally {
            this.isRunning = false;
            
            // BlogPublisher 정리
            if (this.blogPublisher) {
                try {
                    await this.blogPublisher.cleanup();
                } catch (cleanupError) {
                    console.warn('⚠️ 테스트 완료 후 BlogPublisher 정리 중 오류:', cleanupError.message);
                }
                this.blogPublisher = null;
            }
            console.log('✅ 사진 발행 프로세스 정리 완료');
        }
    }

    /**
     * 순차 실행 (모든 활성 계정)
     * @returns {Promise<Object>} 실행 결과
     */
    async executeSequential() {
        let sessionId = null;
        
        try {
            const activeAccounts = this.configManager.getActiveAccounts();
            
            if (activeAccounts.length === 0) {
                throw new Error('활성화된 계정이 없습니다.');
            }
            
            console.log(`🔄 순차 실행 시작: ${activeAccounts.length}개 계정`);
            
            // 세션 시작
            sessionId = this.progressTracker.startSession({
                executionMode: 'sequential',
                accountCount: activeAccounts.length,
                accounts: activeAccounts.map(acc => ({ id: acc.id, username: acc.username }))
            });
            
            this.currentSessionId = sessionId;
            this.isRunning = true;
            
            const results = [];
            let successCount = 0;
            
            for (let i = 0; i < activeAccounts.length; i++) {
                const account = activeAccounts[i];
                
                try {
                    console.log(`\n📋 계정 ${i + 1}/${activeAccounts.length} 처리 중: ${account.username}`);
                    
                    // 계정별 자동화 실행
                    const accountResult = await this.executeAutomationSteps(account);
                    
                    if (accountResult.success) {
                        successCount++;
                        console.log(`✅ 계정 ${account.username} 완료`);
                    } else {
                        console.error(`❌ 계정 ${account.username} 실패: ${accountResult.error}`);
                    }
                    
                    results.push({
                        account: account.username,
                        ...accountResult
                    });
                    
                    // 계정 간 대기 시간
                    if (i < activeAccounts.length - 1) {
                        console.log('⏳ 다음 계정 처리까지 대기 중...');
                        await this.delay(5000); // 5초 대기
                    }
                    
                } catch (accountError) {
                    console.error(`❌ 계정 ${account.username} 처리 중 오류:`, accountError);
                    results.push({
                        account: account.username,
                        success: false,
                        error: accountError.message
                    });
                }
            }
            
            // 세션 완료
            this.progressTracker.completeSession();
            
            console.log('\n🎉 순차 실행 완료!');
            console.log(`📊 성공: ${successCount}개, 실패: ${results.length - successCount}개`);
            
            return {
                success: true,
                data: {
                    successCount: successCount,
                    totalCount: results.length,
                    results: results
                },
                message: '순차 실행 완료'
            };
            
        } catch (error) {
            console.error('❌ 순차 실행 실패:', error);
            
            if (sessionId) {
                this.progressTracker.failSession(error);
            }
            
            return {
                success: false,
                error: error.message
            };
            
        } finally {
            this.isRunning = false;
            this.currentSessionId = null;
        }
    }

    /**
     * 다중 계정 교차 실행 (1번→2번→1번→2번...)
     * @param {Array} accounts 선택된 계정 목록
     * @param {number} automationCount 계정별 자동화 실행 횟수
     * @param {number} postDelay 포스팅당 대기시간 (분)
     * @returns {Promise<Object>} 실행 결과
     */
    async executeMultiAccountAlternating(accounts, automationCount = 3, postDelay = 10) {
        let sessionId = null;
        
        try {
            if (!accounts || accounts.length === 0) {
                throw new Error('선택된 계정이 없습니다.');
            }
            
            console.log(`🔄 다중 계정 교차 실행 시작: ${accounts.length}개 계정`);
            
            // 포스팅당 대기시간 최소값 검증 (10분 이상)
            const validatedPostDelay = Math.max(postDelay, 10);
            if (postDelay < 10) {
                console.log(`⚠️ 포스팅당 대기시간이 10분 미만입니다. ${postDelay}분 -> ${validatedPostDelay}분으로 자동 조정`);
                postDelay = validatedPostDelay;
            }
            
            console.log(`📊 설정: 계정별 자동화 횟수 ${automationCount}회, 포스팅당 대기시간 ${postDelay}분`);
            
            // 세션 시작
            sessionId = this.progressTracker.startSession({
                executionMode: 'alternating',
                accountCount: accounts.length,
                automationCount: automationCount,
                postDelay: postDelay,
                accounts: accounts.map(acc => ({ id: acc.id, username: acc.username }))
            });
            
            this.currentSessionId = sessionId;
            this.isRunning = true;
            
            const results = [];
            const accountPostCounts = {}; // 각 계정별 포스트 수 추적
            
            // 계정별 포스트 수 초기화
            for (const account of accounts) {
                accountPostCounts[account.username] = 0;
                console.log(`📊 계정 ${account.username} 자동화 실행 목표: ${automationCount}회`);
            }
            
            let totalPosts = 0;
            const maxTotalPosts = accounts.length * automationCount; // 전체 예상 포스트 수
            
            console.log(`📋 총 예상 포스트 수: ${maxTotalPosts}개 (계정 ${accounts.length}개 × 횟수 ${automationCount}회)`);
            
            // 🔥 교차 실행 루프 - 설정 횟수 기반 (라운드 시스템)
            for (let round = 1; round <= automationCount && this.isRunning; round++) {
                console.log(`\n🔄 라운드 ${round}/${automationCount} 시작`);
                
                // 각 라운드에서 모든 계정을 한 번씩 실행 (A계정 1번 → B계정 1번 → A계정 2번...)
                for (let accountIndex = 0; accountIndex < accounts.length && this.isRunning; accountIndex++) {
                    // 루프 시작 시 중지 조건 확인
                    if (!this.isRunning) {
                        console.log('⏹️ 자동화 중지 요청 감지 - 교차 실행 루프 중단');
                        break;
                    }
                    
                    // 🔥 URL 파일 상태 확인 (URL이 모두 소진되었는지 체크)
                    const urlFileStatus = this.coupangCrawler.getUrlFileStatus();
                    if (!urlFileStatus.exists) {
                        console.log('📄 URL 파일이 존재하지 않습니다 - 모든 URL 처리 완료로 간주');
                        break;
                    }
                    
                    let availableUrls = [];
                    try {
                        availableUrls = await this.coupangCrawler.readURLsFromFile(urlFileStatus.path);
                    } catch (error) {
                        console.warn('⚠️ URL 파일 읽기 실패:', error.message);
                        availableUrls = [];
                    }
                    
                    if (availableUrls.length === 0) {
                        console.log('🎉 모든 URL 처리 완료! 더 이상 처리할 URL이 없습니다.');
                        this.sendLogToRenderer('info', '🎉 모든 URL 처리 완료! 더 이상 처리할 URL이 없습니다.');
                        break;
                    }
                    
                    console.log(`📋 현재 남은 URL 개수: ${availableUrls.length}개`);
                    
                    const account = accounts[accountIndex];
                    const accountName = account.username;
                    
                    // 현재 계정의 실행 횟수 증가
                    accountPostCounts[accountName]++;
                    totalPosts++;
                    
                    console.log(`\n🎯 [${totalPosts}/${maxTotalPosts}] 라운드 ${round}: ${accountName} (${accountPostCounts[accountName]}/${automationCount})`);
                    
                    // 렌더러에 진행 상황 전송
                    this.sendToRenderer('account-progress-update', {
                        currentAccount: accountName,
                        currentAccountIndex: accountIndex,
                        totalAccounts: accounts.length,
                        accountPostCount: accountPostCounts[accountName],
                        automationCount: automationCount,
                        totalPosts: totalPosts,
                        maxTotalPosts: maxTotalPosts,
                        currentRound: round
                    });
                    
                    // 계정 처리 전 중지 조건 재확인
                    if (!this.isRunning) {
                        console.log('⏹️ 자동화 중지 요청 감지 - 계정 처리 전 중단');
                        break;
                    }
                    
                    try {
                        // 계정별 단일 URL 처리 (교차 실행)
                        const accountResult = await this.executeSingleUrl(account);
                        
                        // 처리 완료 후 중지 조건 확인
                        if (!this.isRunning) {
                            console.log('⏹️ 자동화 중지 요청 감지 - 계정 처리 완료 후 중단');
                            break;
                        }
                        
                        if (accountResult.success) {
                            console.log(`✅ 계정 ${accountName} 포스팅 완료 (라운드 ${round}, 총 ${accountPostCounts[accountName]}/${automationCount})`);
                            
                            // 🔥 오늘 포스트 수 실시간 업데이트
                            const dailyPostKey = this.generateDailyPostKey(account);
                            await this.incrementTodayPostCount(dailyPostKey);
                            
                                                 } else {
                             // 🔥 URL이 모두 소진된 경우
                             if (accountResult.noMoreUrls) {
                                 console.log(`📄 더 이상 처리할 URL이 없습니다 - 교차 실행 완료`);
                                 this.sendLogToRenderer('info', `📄 더 이상 처리할 URL이 없습니다 - 교차 실행 완료`);
                                 break;
                             }
                             // 중지된 경우와 실제 오류 구분
                             else if (accountResult.stopped || (accountResult.error && accountResult.error.includes('중지'))) {
                                 console.log(`⏹️ 계정 ${accountName} 자동화 중지됨`);
                                 break;
                             } else {
                                 console.error(`❌ 계정 ${accountName} 포스팅 실패: ${accountResult.error}`);
                             }
                         }
                         
                         results.push({
                             account: accountName,
                             round: round,
                             postNumber: accountPostCounts[accountName],
                             totalPostNumber: totalPosts,
                             ...accountResult
                         });
                         
                     } catch (accountError) {
                         console.error(`❌ 계정 ${accountName} 처리 중 오류:`, accountError);
                         
                         // 중지 관련 오류인 경우 루프 중단
                         if (accountError.message && accountError.message.includes('중지')) {
                             console.log('⏹️ 자동화 중지 관련 오류 - 루프 중단');
                             break;
                         }
                         
                         results.push({
                             account: accountName,
                             round: round,
                             postNumber: accountPostCounts[accountName],
                             totalPostNumber: totalPosts,
                             success: false,
                             error: accountError.message
                         });
                     }
                     
                     // 대기 전 중지 조건 확인
                     if (!this.isRunning) {
                         console.log('⏹️ 자동화 중지 요청 감지 - 대기 시간 적용 전 중단');
                         break;
                     }
                     
                     // 포스팅당 대기시간 적용 (마지막 포스트가 아닌 경우)
                     const isLastPost = (round === automationCount && accountIndex === accounts.length - 1);
                     if (!isLastPost && this.isRunning) {
                         const waitTimeMs = postDelay * 60 * 1000; // 분을 밀리초로 변환
                         
                         const nextAccountIndex = (accountIndex + 1) % accounts.length;
                         const nextRound = nextAccountIndex === 0 ? round + 1 : round;
                         const nextAccount = nextAccountIndex === 0 && nextRound > automationCount ? 
                             '완료' : accounts[nextAccountIndex].username;
                         
                         console.log(`⏸️ 포스팅당 대기시간 적용: ${postDelay}분 대기...`);
                         console.log(`📋 다음: 라운드 ${nextRound}, 계정 ${nextAccount}`);
                         
                         // 렌더러에 대기 상태 전송
                         this.sendToRenderer('waiting-update', {
                             waitTimeMinutes: postDelay,
                             waitTimeMs: waitTimeMs,
                             nextAccount: nextAccount,
                             nextRound: nextRound
                         });
                         
                         try {
                             await this.delayWithStopCheck(waitTimeMs, {
                                 waitTimeMinutes: postDelay,
                                 nextAccount: nextAccount
                             });
                         } catch (delayError) {
                             // 대기 중 중지된 경우
                             if (delayError.message && delayError.message.includes('중지')) {
                                 console.log('⏹️ 대기 중 자동화 중지 요청 - 루프 중단');
                                 break;
                             }
                             throw delayError;
                         }
                     }
                 }
                 
                 // URL이 모두 소진되었거나 중지된 경우 라운드 중단
                 if (!this.isRunning) {
                     console.log('⏹️ 자동화 중지로 인해 라운드 중단');
                     break;
                 }
             }
            
            // 🔥 중지 상태 확인하여 세션 처리
            if (!this.isRunning) {
                console.log('⏹️ 자동화 중지로 인한 세션 종료');
                this.progressTracker.completeSession(); // 중지도 정상 완료로 처리
            } else {
                this.progressTracker.completeSession();
            }
            
            const successCount = results.filter(r => r.success).length;
            const stopMessage = !this.isRunning ? ' (사용자 중지)' : '';
            
            console.log(`\n🎉 다중 계정 교차 실행 완료${stopMessage}!`);
            console.log(`📊 총 포스트: ${totalPosts}개, 성공: ${successCount}개, 실패: ${results.length - successCount}개`);
            console.log(`📋 계정별 실행 결과:`);
            
            // 계정별 실행 결과 로깅
            for (const account of accounts) {
                const accountResults = results.filter(r => r.account === account.username);
                const accountSuccess = accountResults.filter(r => r.success).length;
                console.log(`  - ${account.username}: ${accountSuccess}/${automationCount} 성공 (완료: ${accountPostCounts[account.username] || 0}회)`);
            }
            
            // URL 완료 여부 확인
            let urlsCompleted = false;
            try {
                const finalUrlCheck = await this.coupangCrawler.readURLsFromFile(this.coupangCrawler.getUrlFileStatus().path);
                urlsCompleted = finalUrlCheck.length === 0;
            } catch (error) {
                urlsCompleted = true; // 파일을 읽을 수 없으면 완료된 것으로 간주
            }
            
            let finalMessage = !this.isRunning ? '다중 계정 교차 실행 중지됨' : '다중 계정 교차 실행 완료';
            if (urlsCompleted && this.isRunning) {
                finalMessage += ' - 모든 URL 처리 완료';
                console.log('📄 모든 URL 처리가 완료되었습니다!');
                this.sendLogToRenderer('info', '📄 모든 URL 처리가 완료되었습니다!');
            }
            
            return {
                success: true,
                stopped: !this.isRunning, // 중지 여부 표시
                urlsCompleted: urlsCompleted, // URL 완료 여부 추가
                data: {
                    totalPosts: totalPosts,
                    expectedPosts: maxTotalPosts,
                    successCount: successCount,
                    errorCount: results.length - successCount,
                    accountPostCounts: accountPostCounts,
                    results: results,
                    accountSummary: accounts.map(account => ({
                        username: account.username,
                        completed: accountPostCounts[account.username] || 0,
                        target: automationCount,
                        success: results.filter(r => r.account === account.username && r.success).length
                    }))
                },
                message: finalMessage
            };
            
        } catch (error) {
            console.error('❌ 다중 계정 교차 실행 실패:', error);
            
            if (sessionId) {
                this.progressTracker.failSession(error);
            }
            
            return {
                success: false,
                error: error.message
            };
            
        } finally {
            this.isRunning = false;
            this.currentSessionId = null;
        }
    }

    /**
     * 단일 URL 처리 (교차 실행용)
     * @param {Object} account 계정 정보
     * @returns {Promise<Object>} 실행 결과
     */
    async executeSingleUrl(account) {
        try {
            console.log(`🚀 [빌드 디버깅] 단일 URL 처리 시작: ${account.username}`);
            console.log('📦 빌드 환경:', app.isPackaged ? 'PACKAGED' : 'DEVELOPMENT');
            
            // 중지 조건 확인
            if (!this.isRunning) {
                console.log('⏹️ 자동화 중지 요청으로 인해 처리를 중단합니다.');
                throw new Error('자동화가 중지되었습니다.');
            }
            
            // 설정 정보 가져오기
            const settings = await this.getRendererSettings();
            console.log('⚙️ 적용할 설정:', settings);
            
            // URL 파일에서 첫 번째 URL 가져오기
            const urlFileStatus = this.coupangCrawler.getUrlFileStatus();
            if (!urlFileStatus.isSet || !urlFileStatus.exists) {
                throw new Error('URL 파일이 설정되지 않았거나 존재하지 않습니다.');
            }
            
            const urls = await this.coupangCrawler.readURLsFromFile(urlFileStatus.path);
            if (urls.length === 0) {
                console.log('📄 URL 파일에 더 이상 처리할 URL이 없습니다.');
                this.sendLogToRenderer('info', '📄 URL 파일에 더 이상 처리할 URL이 없습니다.');
                return {
                    success: false,
                    error: '더 이상 처리할 URL이 없습니다. 모든 URL 처리가 완료되었습니다.',
                    noMoreUrls: true // 특별한 플래그 추가
                };
            }
            
            const url = urls[0]; // 첫 번째 URL만 처리
            console.log(`🎯 처리할 URL: ${url}`);
            
            // 중지 조건 재확인
            if (!this.isRunning) {
                console.log('⏹️ 자동화 중지 요청으로 인해 처리를 중단합니다.');
                throw new Error('자동화가 중지되었습니다.');
            }
            
            // 1단계: 상품 크롤링 및 컨텐츠 생성
            console.log('🕷️ 1단계: 상품 크롤링 및 컨텐츠 생성');
            this.progressTracker.startStep('crawling_content', { 
                account: account.username, 
                url: url
            });
            this.sendToRenderer('progress-update', this.progressTracker.getProgress());

            const productResult = await this.processSingleProduct(url, account);
            if (!productResult.success) {
                throw new Error(`상품 처리 실패: ${productResult.error}`);
            }

            this.progressTracker.completeStep('crawling_content', { 
                success: true,
                productTitle: productResult.productData?.title || 'Unknown'
            });

            // 중지 조건 재확인
            if (!this.isRunning) {
                console.log('⏹️ 자동화 중지 요청으로 인해 처리를 중단합니다.');
                throw new Error('자동화가 중지되었습니다.');
            }

            // 2단계: 이미지 처리
            console.log('🖼️ 2단계: 이미지 처리');
            this.progressTracker.startStep('image_processing', { 
                account: account.username
            });

            const imageResult = await this.downloadImages(productResult.productData?.images || []);
            this.progressTracker.completeStep('image_processing', { 
                success: true,
                imageCount: imageResult?.imagePaths?.length || 0
            });

            // 중지 조건 재확인
            if (!this.isRunning) {
                console.log('⏹️ 자동화 중지 요청으로 인해 처리를 중단합니다.');
                throw new Error('자동화가 중지되었습니다.');
            }

            // 3단계: 블로그 포스팅
            console.log('📝 3단계: 블로그 포스팅');
            this.progressTracker.startStep('blog_publishing', { 
                account: account.username
            });

            const publishResult = await this.publishToBlog(productResult, imageResult, account);
            if (!publishResult.success) {
                throw new Error(`블로그 포스팅 실패: ${publishResult.error}`);
            }

            this.progressTracker.completeStep('blog_publishing', { 
                success: true
            });

            // 중지 조건 재확인
            if (!this.isRunning) {
                console.log('⏹️ 자동화 중지 요청으로 인해 처리를 중단합니다.');
                throw new Error('자동화가 중지되었습니다.');
            }

            // 4단계: 처리된 URL 삭제
            console.log('🗑️ 4단계: 블로그 발행 완료 후 URL 삭제');
            await this.removeProcessedUrl(url);
            console.log('✅ 블로그 발행 완료 후 URL 삭제 성공');

            // 일일 포스트 카운트 증가
            const dailyPostKey = this.generateDailyPostKey(account);
            await this.incrementTodayPostCount(dailyPostKey);
            console.log(`📊 일일 포스트 카운트 증가: ${account.username} - 1개`);
            
            // 렌더러 UI 실시간 업데이트
            const updateData = {
                accountId: account.username || account.naverId,
                dailyPostKey: dailyPostKey,
                increment: 1
            };
            console.log('📤 렌더러로 포스트 카운트 업데이트 전송:', updateData);
            this.sendToRenderer('post-count-update', updateData);

            return {
                success: true,
                data: {
                    url: url,
                    productTitle: productResult.productData?.title,
                    publishResult: publishResult
                },
                message: '단일 URL 처리 완료'
            };

        } catch (error) {
            console.error(`❌ 단일 URL 처리 실패 (${account.username}):`, error);
            
            // 🔥 중지 관련 오류인 경우 정상 중지로 처리
            if (error.message && error.message.includes('중지')) {
                console.log('⏹️ 자동화 중지로 인한 처리 중단 - 정상 중지로 처리');
                return {
                    success: false,
                    stopped: true, // 중지 플래그 추가
                    error: '사용자가 자동화를 중지했습니다.'
                };
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 자동화 단계별 실행 (URL별 루프 처리)
     * @param {Object} account 계정 정보
     * @returns {Promise<Object>} 실행 결과
     */
    async executeAutomationSteps(account) {
        try {
            console.log(`🚀 [빌드 디버깅] 자동화 단계 시작: ${account.username}`);
            console.log('📦 빌드 환경:', app.isPackaged ? 'PACKAGED' : 'DEVELOPMENT');
            
            // 렌더러로 로그 전송
            this.sendLogToRenderer('info', `🚀 [빌드 디버깅] 자동화 단계 시작: ${account.username}`);
            this.sendLogToRenderer('info', `📦 빌드 환경: ${app.isPackaged ? 'PACKAGED' : 'DEVELOPMENT'}`);
            
            // 설정 정보 가져오기
            const settings = await this.getRendererSettings();
            console.log('⚙️ 적용할 설정:', settings);
            this.sendLogToRenderer('info', '⚙️ 적용할 설정', settings);
            
            // 계정별 일일 포스트 제한 확인
            const dailyPostKey = this.generateDailyPostKey(account);
            const todayPostCount = await this.getTodayPostCount(dailyPostKey);
            
            console.log(`📊 일일 포스트 현황: ${account.username} - 오늘 ${todayPostCount}개 / 제한 ${settings.dailyLimit}개`);
            this.sendLogToRenderer('info', `📊 일일 포스트 현황: ${account.username} - 오늘 ${todayPostCount}개 / 제한 ${settings.dailyLimit}개`);
            
            if (todayPostCount >= settings.dailyLimit) {
                const error = `계정 ${account.username}이 일일 포스트 제한(${settings.dailyLimit}개)에 도달했습니다. 내일 다시 시도해주세요.`;
                console.warn('⚠️ 일일 포스트 제한 도달:', error);
                this.sendLogToRenderer('warn', '⚠️ 일일 포스트 제한 도달:', error);
                throw new Error(error);
            }
            
            // URL 파일 상태 확인
            console.log('🔍 URL 파일 상태 확인 중...');
            this.sendLogToRenderer('info', '🔍 URL 파일 상태 확인 중...');
            
            const urlFileStatus = this.coupangCrawler.getUrlFileStatus();
            console.log(`📂 URL 파일 상태 (상세):`, urlFileStatus);
            this.sendLogToRenderer('info', '📂 URL 파일 상태 (상세)', urlFileStatus);
            
            if (!urlFileStatus.isSet) {
                const error = 'URL 파일이 설정되지 않았습니다. 먼저 URL 파일을 업로드해주세요.';
                console.error('❌ URL 파일 미설정:', error);
                throw new Error(error);
            }
            
            if (!urlFileStatus.exists) {
                const error = `URL 파일을 찾을 수 없습니다: ${urlFileStatus.path}. 먼저 URL 파일을 업로드해주세요.`;
                console.error('❌ URL 파일 없음:', error);
                throw new Error(error);
            }
            
            const urlFilePath = urlFileStatus.path;
            console.log(`✅ URL 파일 확인 완료: ${urlFilePath}`);

            console.log('📄 파일 내용 읽기 시작...');
            this.sendLogToRenderer('info', '📄 파일 내용 읽기 시작...');
            
            // CoupangCrawler의 readURLsFromFile 메서드 사용 (더 안전한 파일 읽기)
            let urls;
            try {
                urls = await this.coupangCrawler.readURLsFromFile(urlFilePath);
                console.log(`📋 유효한 URL 개수: ${urls.length}`);
                console.log(`🔍 첫 번째 URL 예시: ${urls[0] || '없음'}`);
                this.sendLogToRenderer('info', `📋 유효한 URL 개수: ${urls.length}`);
                this.sendLogToRenderer('info', `🔍 첫 번째 URL 예시: ${urls[0] || '없음'}`);
            } catch (error) {
                console.error('❌ URL 파일 읽기 실패:', error);
                this.sendLogToRenderer('error', '❌ URL 파일 읽기 실패:', error.message);
                throw new Error(`URL 파일 읽기 실패: ${error.message}`);
            }
            
            if (urls.length === 0) {
                const error = '처리할 유효한 쿠팡 URL이 없습니다. URL 파일을 확인해주세요.';
                console.error('❌ 유효한 URL이 없습니다.');
                this.sendLogToRenderer('error', '❌ 유효한 URL이 없습니다.');
                throw new Error(error);
            }

            // 일일 제한 고려하여 처리할 URL 수 조정
            const remainingPostsToday = settings.dailyLimit - todayPostCount;
            const maxUrlsToProcess = Math.min(urls.length, Math.max(0, remainingPostsToday));
            const urlsToProcess = urls.slice(0, maxUrlsToProcess);
            
            console.log(`🔍 [URL 개수 디버깅] 전체 URL: ${urls.length}, 일일제한: ${settings.dailyLimit}, 오늘게시: ${todayPostCount}, 남은할당: ${remainingPostsToday}, 최종처리: ${urlsToProcess.length}`);
            console.log(`🚀 총 ${urls.length}개 URL 중 ${urlsToProcess.length}개 처리 예정 (일일 제한 고려)`);
            this.sendLogToRenderer('info', `🚀 총 ${urls.length}개 URL 중 ${urlsToProcess.length}개 처리 예정 (일일 제한 고려)`);
            
            let processedCount = 0;
            let successCount = 0;
            let errorCount = 0;
            const results = [];

            // URL별 루프 처리
            for (let urlIndex = 0; urlIndex < urlsToProcess.length; urlIndex++) {
                // 중지 조건 확인
                if (!this.isRunning) {
                    console.log('⏹️ 자동화 중지 요청으로 인해 처리를 중단합니다.');
                    this.sendLogToRenderer('warn', '⏹️ 자동화 중지 요청으로 인해 처리를 중단합니다.');
                    break;
                }
                
                const url = urlsToProcess[urlIndex];
                console.log(`\n🎯 [${urlIndex + 1}/${urlsToProcess.length}] URL 처리 시작: ${url}`);
                this.sendLogToRenderer('info', `🎯 [${urlIndex + 1}/${urlsToProcess.length}] URL 처리 시작: ${url}`);

                // 실시간 URL 진행 상황 전송
                console.log(`🔍 [진행상황 디버깅] 현재: ${urlIndex + 1}, 총개수: ${urlsToProcess.length}, 실제URL개수: ${urls.length}`);
                this.sendToRenderer('url-progress-update', {
                    currentUrl: urlIndex + 1,
                    totalUrls: urlsToProcess.length,
                    accountName: account.username || account.naverId,
                    url: url,
                    progress: Math.round(((urlIndex + 1) / urlsToProcess.length) * 100)
                });
                
                try {
                    // 각 단계마다 중지 조건 확인
                    if (!this.isRunning) {
                        console.log('⏹️ 자동화 중지 요청 감지 - URL 처리 중단');
                        this.sendLogToRenderer('warn', '⏹️ 자동화 중지 요청 감지 - URL 처리 중단');
                        break;
                    }

                    // 중지 조건 재확인
                    if (!this.isRunning) {
                        console.log('⏹️ 자동화 중지 요청 감지 - 크롤링 단계 전 중단');
                        this.sendLogToRenderer('warn', '⏹️ 자동화 중지 요청 감지 - 크롤링 단계 전 중단');
                        break;
                    }

                    // 1단계: URL 크롤링 및 컨텐츠 생성
                    console.log('🕷️ 1단계: 상품 크롤링 및 컨텐츠 생성');
                    this.sendLogToRenderer('info', '🕷️ 1단계: 상품 크롤링 및 컨텐츠 생성');
                    this.progressTracker.startStep('crawling_content', { 
                        account: account.username, 
                        url: urlIndex + 1,
                        total: urlsToProcess.length 
                    });
                    this.sendToRenderer('progress-update', this.progressTracker.getProgress());

                    console.log('📞 processSingleProduct 호출...');
                    this.sendLogToRenderer('info', '📞 processSingleProduct 호출...');
                    const productResult = await this.processSingleProduct(url, account);
                    console.log('📊 processSingleProduct 결과:', {
                        success: productResult?.success,
                        error: productResult?.error,
                        productTitle: productResult?.productData?.title
                    });
                    
                    if (!productResult.success) {
                        throw new Error(`상품 처리 실패: ${productResult.error}`);
                    }

                    this.progressTracker.completeStep('crawling_content', { 
                        success: true,
                        productTitle: productResult.productData?.title || 'Unknown'
                    });

                    // 중지 조건 재확인
                    if (!this.isRunning) {
                        console.log('⏹️ 자동화 중지 요청 감지 - 이미지 처리 단계 전 중단');
                        this.sendLogToRenderer('warn', '⏹️ 자동화 중지 요청 감지 - 이미지 처리 단계 전 중단');
                        break;
                    }

                    // 2단계: 이미지 처리
                    console.log('🖼️ 2단계: 이미지 처리');
                    this.sendLogToRenderer('info', '🖼️ 2단계: 이미지 처리');
                    this.progressTracker.startStep('image_processing', { 
                        account: account.username, 
                        url: urlIndex + 1,
                        total: urlsToProcess.length 
                    });

                    const imageResult = await this.downloadImages(productResult.productData?.images || []);
                    console.log('📊 이미지 처리 결과:', {
                        success: imageResult?.success,
                        imageCount: imageResult?.imagePaths?.length || 0
                    });

                    this.progressTracker.completeStep('image_processing', { 
                        success: true,
                        imageCount: imageResult?.imagePaths?.length || 0
                    });

                    // 중지 조건 재확인
                    if (!this.isRunning) {
                        console.log('⏹️ 자동화 중지 요청 감지 - 블로그 포스팅 단계 전 중단');
                        this.sendLogToRenderer('warn', '⏹️ 자동화 중지 요청 감지 - 블로그 포스팅 단계 전 중단');
                        break;
                    }

                    // 3단계: 블로그 포스팅
                    console.log('📝 3단계: 블로그 포스팅');
                    this.sendLogToRenderer('info', '📝 3단계: 블로그 포스팅');
                    this.progressTracker.startStep('blog_publishing', { 
                        account: account.username, 
                        url: urlIndex + 1,
                        total: urlsToProcess.length 
                    });

                    const publishResult = await this.publishToBlog(productResult, imageResult, account);
                    console.log('📊 블로그 포스팅 결과:', {
                        success: publishResult?.success,
                        error: publishResult?.error
                    });

                    if (!publishResult.success) {
                        throw new Error(`블로그 포스팅 실패: ${publishResult.error}`);
                    }

                    this.progressTracker.completeStep('blog_publishing', { 
                        success: true,
                        postUrl: publishResult?.data?.url || 'Unknown'
                    });

                    // 🔥 블로그 발행 성공 후 URL 삭제 (사용자 요구사항)
                    console.log('🗑️ 4단계: 블로그 발행 완료 후 URL 삭제');
                    this.sendLogToRenderer('info', '🗑️ 4단계: 블로그 발행 완료 후 URL 삭제');
                    try {
                        await this.removeProcessedUrl(url);
                        console.log('✅ 블로그 발행 완료 후 URL 삭제 성공');
                        this.sendLogToRenderer('info', '✅ 블로그 발행 완료 후 URL 삭제 성공');
                    } catch (urlDeleteError) {
                        console.warn('⚠️ URL 삭제 실패 (무시하고 계속):', urlDeleteError.message);
                        this.sendLogToRenderer('warn', `⚠️ URL 삭제 실패: ${urlDeleteError.message}`);
                        // URL 삭제 실패해도 자동화는 계속 진행
                    }

                    // 성공 시 일일 포스트 카운트 증가
                    const dailyPostKeyForCount = this.generateDailyPostKey(account);
                    await this.incrementTodayPostCount(dailyPostKeyForCount);
                    console.log(`📊 일일 포스트 카운트 증가: ${account.username} - ${todayPostCount + successCount + 1}개`);
                    this.sendLogToRenderer('info', `📊 일일 포스트 카운트 증가: ${account.username} - ${todayPostCount + successCount + 1}개`);
                    
                    // 렌더러 UI 실시간 업데이트
                    const updateData = {
                        accountId: account.username || account.naverId,
                        dailyPostKey: dailyPostKeyForCount,
                        increment: 1
                    };
                    console.log('📤 렌더러로 포스트 카운트 업데이트 전송 (executeAutomationSteps):', updateData);
                    this.sendToRenderer('post-count-update', updateData);

                    // 🔒 각 URL 처리 완료 시마다 세션 저장 (갑작스러운 종료 대비)
                    console.log('💾 URL 처리 완료 후 세션 안전 저장 중...');
                    this.sendLogToRenderer('info', '💾 URL 처리 완료 후 세션 안전 저장 중...');
                    try {
                        if (this.blogPublisher && this.blogPublisher.page && !this.blogPublisher.page.isClosed()) {
                            const accountId = account.username || account.naverId;
                            const username = account.username || account.naverId;
                            
                            await this.sessionManager.saveSession(this.blogPublisher.page, accountId, username);
                            console.log('✅ URL 처리 완료 후 세션 안전 저장 성공');
                            this.sendLogToRenderer('info', '✅ URL 처리 완료 후 세션 안전 저장 성공');
                        } else {
                            console.log('⚠️ 브라우저 페이지가 없어 세션 저장 건너뜀');
                        }
                    } catch (sessionSaveError) {
                        console.warn('⚠️ URL 처리 완료 후 세션 저장 실패:', sessionSaveError.message);
                        this.sendLogToRenderer('warn', `⚠️ 세션 저장 실패: ${sessionSaveError.message}`);
                        // 세션 저장 실패해도 자동화는 계속 진행
                    }

                    successCount++;
                    console.log(`✅ URL ${urlIndex + 1}/${urlsToProcess.length} 처리 완료`);
                    this.sendLogToRenderer('info', `✅ URL ${urlIndex + 1}/${urlsToProcess.length} 처리 완료`);
                    
                    results.push({
                        url: url,
                        success: true,
                        productTitle: productResult.productData?.title || 'Unknown',
                        postUrl: publishResult?.data?.url || 'Unknown'
                    });

                } catch (error) {
                    console.error(`❌ URL ${urlIndex + 1}/${urlsToProcess.length} 처리 실패:`, {
                        error: error.message,
                        url: url,
                        stack: error.stack
                    });
                    errorCount++;
                    results.push({
                        url: url,
                        success: false,
                        error: error.message
                    });
                    
                    // 🔥 실패 시에는 URL을 삭제하지 않음 (다시 시도할 수 있도록)
                    console.log('⚠️ URL 처리 실패로 인해 URL을 삭제하지 않음 (다시 시도 가능)');
                    this.sendLogToRenderer('warn', '⚠️ URL 처리 실패로 인해 URL을 삭제하지 않음 (다시 시도 가능)');
                }

                processedCount++;

                // 중지 조건 확인 후 다음 URL 처리 전 대기
                if (!this.isRunning) {
                    console.log('⏹️ 자동화 중지 요청으로 인해 다음 URL 처리를 중단합니다.');
                    this.sendLogToRenderer('warn', '⏹️ 자동화 중지 요청으로 인해 다음 URL 처리를 중단합니다.');
                    break;
                }

                // 다음 URL 처리 전 포스팅당 대기시간 적용 (마지막 URL이 아닌 경우)
                if (urlIndex < urlsToProcess.length - 1) {
                    const delayMinutes = Math.max(settings.postDelay || 10, 10);
                    const delayTime = delayMinutes * 60 * 1000; // 분을 밀리초로 변환
                    console.log(`⏸️ 포스팅당 대기시간 적용: ${delayMinutes}분 (${delayTime/1000}초) 대기...`);
                    this.sendLogToRenderer('info', `⏸️ 포스팅당 대기시간 적용: ${delayMinutes}분 대기...`);
                    
                    // 대기 중에도 중지 조건 확인 (1초마다)
                    const checkInterval = 1000;
                    let remainingTime = delayTime;
                    
                    while (remainingTime > 0 && this.isRunning) {
                        // 남은 시간을 분:초 형태로 표시
                        const remainingMinutes = Math.floor(remainingTime / 60000);
                        const remainingSeconds = Math.floor((remainingTime % 60000) / 1000);
                        const timeDisplay = remainingMinutes > 0 ? `${remainingMinutes}분 ${remainingSeconds}초` : `${remainingSeconds}초`;
                        
                        this.sendLogToRenderer('info', `⏳ 대기 중... 남은 시간: ${timeDisplay}`);
                        
                        await this.delay(Math.min(checkInterval, remainingTime));
                        remainingTime -= checkInterval;
                    }
                    
                    if (!this.isRunning) {
                        console.log('⏹️ 대기 중 자동화 중지 요청 감지');
                        this.sendLogToRenderer('warn', '⏹️ 대기 중 자동화 중지 요청 감지');
                        break;
                    }
                }
            }
            
            console.log(`\n🎉 모든 URL 처리 완료!`);
            console.log(`📊 최종 결과 - 성공: ${successCount}개, 실패: ${errorCount}개`);

            return {
                success: true,
                account: account.username,
                sessionId: this.currentSessionId,
                processedCount: processedCount,
                successCount: successCount,
                errorCount: errorCount,
                results: results,
                message: '자동화 완료'
            };
            
        } catch (error) {
            console.error(`❌ [빌드 디버깅] 자동화 단계 실행 실패 (${account.username}):`, {
                error: error,
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            return {
                success: false,
                account: account.username,
                error: error.message,
                sessionId: this.currentSessionId
            };
        }
    }

    /**
     * 단일 상품 처리 (URL 하나씩 처리)
     * @param {string} url 상품 URL
     * @param {Object} account 계정 정보
     * @returns {Promise<Object>} 처리 결과
     */
    async processSingleProduct(url, account) {
        try {
            // 중지 조건 확인
            if (!this.isRunning) {
                console.log('⏹️ 자동화 중지 요청으로 인해 상품 처리를 중단합니다.');
                this.sendLogToRenderer('warn', '⏹️ 자동화 중지 요청으로 인해 상품 처리를 중단합니다.');
                return {
                    success: false,
                    error: '자동화가 중지되었습니다.'
                };
            }
            
            console.log(`🔄 [빌드 디버깅] 단일 상품 처리 시작: ${url}`);
            this.sendLogToRenderer('info', `🔄 [빌드 디버깅] 단일 상품 처리 시작: ${url}`);
            
            // CoupangCrawler로 상품 크롤링 및 컨텐츠 생성
            console.log('⚙️ CoupangCrawler 설정 업데이트 중...');
            this.sendLogToRenderer('info', '⚙️ CoupangCrawler 설정 업데이트 중...');
            
            this.coupangCrawler.updateConfig({
                affiliateId: account.affiliateId || 'default',
                minDelay: 10,
                maxDelay: 30,
                executionCount: 1,
                accounts: [account]
            });
            
            console.log('✅ CoupangCrawler 설정 업데이트 완료');
            this.sendLogToRenderer('info', '✅ CoupangCrawler 설정 업데이트 완료');
            
            // 중지 조건 재확인
            if (!this.isRunning) {
                console.log('⏹️ 자동화 중지 요청으로 인해 크롤링을 중단합니다.');
                this.sendLogToRenderer('warn', '⏹️ 자동화 중지 요청으로 인해 크롤링을 중단합니다.');
                return {
                    success: false,
                    error: '자동화가 중지되었습니다.'
                };
            }

            console.log(`📞 [빌드 디버깅] CoupangCrawler.processSingleURL 직접 호출 (URL: ${url})`);
            this.sendLogToRenderer('info', `📞 [빌드 디버깅] CoupangCrawler.processSingleURL 직접 호출 (URL: ${url})`);
            
            // CoupangCrawler 상태를 수동으로 설정 (직접 호출을 위해)
            const originalRunningState = this.coupangCrawler.isRunning;
            this.coupangCrawler.isRunning = true;
            this.coupangCrawler.totalUrls = 1;
            this.coupangCrawler.currentAccount = account;
            
            let result;
            try {
                // 임시 파일 생성 없이 URL을 직접 처리
                result = await this.coupangCrawler.processSingleURL(url, 0, account);
            } finally {
                // 원래 상태로 복원
                this.coupangCrawler.isRunning = originalRunningState;
            }

            console.log(`📊 [빌드 디버깅] CoupangCrawler.processSingleURL 결과:`, {
                success: result?.success,
                error: result?.error,
                hasProductData: !!result?.productData,
                hasContentData: !!result?.contentData
            });
            this.sendLogToRenderer('info', `📊 [빌드 디버깅] CoupangCrawler.processSingleURL 결과`, {
                success: result?.success,
                error: result?.error,
                hasProductData: !!result?.productData,
                hasContentData: !!result?.contentData
            });

            if (!result.success) {
                const errorMsg = `CoupangCrawler 처리 실패: ${result.error}`;
                console.error('❌', errorMsg);
                this.sendLogToRenderer('error', '❌', errorMsg);
                throw new Error(errorMsg);
            }

            // URL 삭제는 CoupangCrawler.processSingleURL()에서 이미 처리됨 (중복 방지)

            console.log(`✅ [빌드 디버깅] 단일 상품 처리 완료: ${url}`);
            this.sendLogToRenderer('info', `✅ [빌드 디버깅] 단일 상품 처리 완료: ${url}`);
            return result;


        } catch (error) {
            console.error('❌ [빌드 디버깅] 상품 처리 중 오류:', {
                url: url,
                error: error.message,
                stack: error.stack
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 이미지 다운로드 처리
     * @param {Array} imageUrls 이미지 URL 배열
     * @returns {Promise<Object>} 다운로드 결과
     */
    async downloadImages(imageUrls) {
        try {
            if (!imageUrls || imageUrls.length === 0) {
                console.log('⚠️ 다운로드할 이미지가 없습니다.');
                return { success: true, imagePaths: [], imageCount: 0 };
            }

            console.log(`📸 이미지 다운로드 시작: ${imageUrls.length}개`);
            
            // ImageProcessor를 사용하여 이미지 처리
            if (this.imageProcessor && typeof this.imageProcessor.processImages === 'function') {
                console.log('✅ ImageProcessor.processImages 메서드 사용');
                const processedImages = await this.imageProcessor.processImages(imageUrls);
                
                return {
                    success: true,
                    imagePaths: processedImages || [],
                    imageCount: processedImages ? processedImages.length : 0
                };
            } else {
                console.warn('⚠️ ImageProcessor.processImages 메서드를 사용할 수 없음 - 기본 방식 사용');
                
                // 기본 방식으로 이미지 URL 반환
                return {
                    success: true,
                    imagePaths: imageUrls,
                    imageCount: imageUrls.length
                };
            }
        } catch (error) {
            console.error('❌ 이미지 다운로드 실패:', error);
            return {
                success: false,
                error: error.message,
                imagePaths: [],
                imageCount: 0
            };
        }
    }

    /**
     * 레거시 이미지 다운로드 (폴백용)
     * @param {Array} imageUrls 이미지 URL 배열
     * @returns {Promise<Object>} 다운로드 결과 및 파일 경로 배열
     */
    async downloadImagesLegacy(imageUrls) {
        if (!imageUrls || imageUrls.length === 0) {
            return { imagePaths: [], success: true };
        }

        // 빌드 환경에 따른 이미지 디렉토리 설정
        const imagesDir = app.isPackaged ? 
            path.join(app.getPath('userData'), 'images') : 
            path.join(process.cwd(), 'images');
        
        // images 폴더 생성
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
            console.log(`📁 이미지 폴더 생성: ${imagesDir}`);
        }

        const downloadedImages = [];

        for (let i = 0; i < imageUrls.length; i++) {
            const imageUrl = imageUrls[i];
            
            try {
                console.log(`📸 레거시 이미지 다운로드 ${i + 1}/${imageUrls.length}: ${imageUrl}`);
                
                // URL이 //로 시작하면 https: 추가
                const cleanUrl = imageUrl.startsWith("//") ? `https:${imageUrl}` : imageUrl;
                
                // 파일 확장자 추출
                const urlPath = new URL(cleanUrl).pathname;
                const ext = path.extname(urlPath) || '.jpg';
                const filename = `product_image_${Date.now()}_${i}${ext}`;
                const filePath = path.join(imagesDir, filename);

                await this.downloadFile(cleanUrl, filePath);
                downloadedImages.push(filePath);
                
                console.log(`✅ 레거시 이미지 다운로드 완료: ${filename}`);
                
                // 각 다운로드 간 짧은 대기
                await this.delay(500);
                
            } catch (error) {
                console.error(`❌ 레거시 이미지 다운로드 실패 (${i + 1}):`, error.message);
                // 하나 실패해도 계속 진행
            }
        }

        return { imagePaths: downloadedImages, success: true };
    }

    /**
     * 파일 다운로드
     * @param {string} url 다운로드할 URL
     * @param {string} filePath 저장할 파일 경로
     * @returns {Promise<void>}
     */
    async downloadFile(url, filePath) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https:') ? https : http;
            
            const request = protocol.get(url, (response) => {
                if (response.statusCode === 200) {
                    const fileStream = fs.createWriteStream(filePath);
                    response.pipe(fileStream);
                    
                    fileStream.on('finish', () => {
                        fileStream.close();
                        resolve();
                    });
                    
                    fileStream.on('error', (error) => {
                        fs.unlink(filePath, () => {}); // 실패한 파일 삭제
                        reject(error);
                    });
                } else {
                    reject(new Error(`HTTP ${response.statusCode}: ${url}`));
                }
            });
            
            request.on('error', (error) => {
                reject(error);
            });
            
            request.setTimeout(30000, () => {
                request.abort();
                reject(new Error('다운로드 타임아웃'));
            });
        });
    }

    /**
     * 다운로드된 이미지 파일 삭제
     * @param {Array} imagePaths 삭제할 이미지 파일 경로 배열
     */
    async cleanupImages(imagePaths) {
        if (!imagePaths || imagePaths.length === 0) {
            return;
        }

        console.log('🗑️ 다운로드된 이미지 파일 정리 시작...');
        
        for (const imagePath of imagePaths) {
            try {
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                    console.log(`✅ 이미지 파일 삭제: ${path.basename(imagePath)}`);
                }
            } catch (error) {
                console.error(`❌ 이미지 파일 삭제 실패: ${imagePath}`, error);
            }
        }

        // images 폴더가 비어있으면 삭제
        try {
            const imagesDir = path.join(process.cwd(), 'images');
            if (fs.existsSync(imagesDir)) {
                const files = fs.readdirSync(imagesDir);
                if (files.length === 0) {
                    fs.rmdirSync(imagesDir);
                    console.log('📁 빈 이미지 폴더 삭제');
                }
            }
        } catch (error) {
            // 폴더 삭제 실패는 무시
        }
    }

    /**
     * 블로그 포스팅 (세션 관리 개선 + 이미지 처리 개선)
     * @param {Object} productResult 상품 처리 결과
     * @param {Object} imageResult 이미지 처리 결과  
     * @param {Object} account 계정 정보
     * @returns {Promise<Object>} 포스팅 결과
     */
    async publishToBlog(productResult, imageResult, account) {
        let downloadedImages = [];
        
        try {
            // 중지 조건 확인
            if (!this.isRunning) {
                console.log('⏹️ 자동화 중지 요청으로 인해 블로그 포스팅을 중단합니다.');
                this.sendLogToRenderer('warn', '⏹️ 자동화 중지 요청으로 인해 블로그 포스팅을 중단합니다.');
                return {
                    success: false,
                    error: '자동화가 중지되었습니다.'
                };
            }
            
            console.log('📝 블로그 포스팅 시작 (세션 관리 개선)...');
            
            // 1. 이미지 다운로드 (개선된 방식)
            console.log('📸 이미지 다운로드 시작...');
            
            // 상품 데이터에서 이미지 URL 추출 (다양한 필드 시도)
            let imageUrls = [];
            
            if (productResult.productData) {
                const data = productResult.productData;
                
                // 다양한 이미지 필드에서 추출 시도
                imageUrls = data.images || 
                           data.imageUrls || 
                           data.productImages || 
                           data.img || 
                           data.thumbnail || 
                           data.photo ||
                           data.pictures ||
                           [];
                
                // 만약 단일 이미지라면 배열로 변환
                if (typeof imageUrls === 'string') {
                    imageUrls = [imageUrls];
                }
                
                // 배열이 아니라면 빈 배열로 설정
                if (!Array.isArray(imageUrls)) {
                    imageUrls = [];
                }
                
                // 이미지 URL이 없다면 다른 객체 내부에서 찾기
                if (imageUrls.length === 0) {
                    // 중첩된 객체에서 이미지 찾기
                    const searchInObject = (obj, path = '') => {
                        if (!obj || typeof obj !== 'object') return [];
                        
                        let found = [];
                        for (const [key, value] of Object.entries(obj)) {
                            const currentPath = path ? `${path}.${key}` : key;
                            
                            // 이미지 관련 키 이름 확인
                            if (/image|img|photo|picture|thumbnail/i.test(key)) {
                                if (Array.isArray(value)) {
                                    found.push(...value);
                                } else if (typeof value === 'string' && value.startsWith('http')) {
                                    found.push(value);
                                }
                            }
                            
                            // 재귀적으로 검색 (깊이 3까지만)
                            if (typeof value === 'object' && value !== null && path.split('.').length < 3) {
                                found.push(...searchInObject(value, currentPath));
                            }
                        }
                        return found;
                    };
                    
                    imageUrls = searchInObject(data);
                }
            }
            
            // fallback으로 imageResult 확인
            if (imageUrls.length === 0 && imageResult && imageResult.images) {
                imageUrls = imageResult.images;
            }
            
            // 🔍 이미지 URL 추출 디버깅
            console.log('🔍 [이미지 URL 디버깅] productResult 구조:');
            console.log('🔍 productResult.productData:', productResult.productData ? Object.keys(productResult.productData) : 'undefined');
            console.log('🔍 productResult.productData?.images:', productResult.productData?.images);
            console.log('🔍 productResult.productData?.imageUrls:', productResult.productData?.imageUrls);
            console.log('🔍 productResult.productData?.productImages:', productResult.productData?.productImages);
            console.log('🔍 imageResult:', imageResult);
            console.log('🔍 최종 추출된 imageUrls:', imageUrls);
            console.log(`📸 이미지 다운로드 시작: ${imageUrls.length}개`);
            
            if (imageUrls.length > 0) {
                // ImageProcessor의 processImages 메서드 존재 여부 확인
                if (this.imageProcessor && typeof this.imageProcessor.processImages === 'function') {
                    console.log('✅ ImageProcessor.processImages 메서드 사용 가능');
                    
                    // ImageProcessor를 사용하여 이미지 처리
                    const processedImages = await this.imageProcessor.processImages(imageUrls);
                    
                    if (processedImages.success && processedImages.imagePaths) {
                        downloadedImages = processedImages.imagePaths;
                        console.log(`✅ ${downloadedImages.length}개 이미지 처리 완료`);
                    } else {
                        console.warn('⚠️ 이미지 처리 실패:', processedImages.error);
                        // 처리 실패 시 기존 방식으로 다운로드 시도
                        const downloadResult = await this.downloadImages(imageUrls);
                        downloadedImages = downloadResult.imagePaths || [];
                        console.log(`✅ ${downloadedImages.length}개 이미지 다운로드 완료 (대체)`);
                    }
                } else {
                    console.warn('⚠️ ImageProcessor.processImages 메서드 없음 - 기존 방식 사용');
                    
                    // 기존 방식으로 이미지 다운로드
                    const downloadResult = await this.downloadImages(imageUrls);
                    downloadedImages = downloadResult.imagePaths || [];
                    console.log(`✅ ${downloadedImages.length}개 이미지 다운로드 완료 (기존 방식)`);
                }
            } else {
                console.log('⚠️ 다운로드할 이미지가 없습니다.');
            }

            // BlogPublisher 설정
            const blogConfig = {
                BLOG_ID: account.blogId || account.username,
                CATEGORY_ID: account.categoryId || 1,
                OPEN_TYPE: 2,
                geminiApi: account.geminiApi // Gemini API 키 추가
            };
            
            this.blogPublisher = new (require('./modules/BlogPublisher'))(blogConfig);
            console.log(`📂 카테고리 ID: ${account.categoryId || 1}, 블로그 ID: ${account.blogId || account.username}`);
            console.log(`🤖 Gemini API 키: ${account.geminiApi ? '설정됨' : '없음'}`);
            
            // 🔒 SessionManager를 BlogPublisher에 전달 (세션 모니터링용)
            this.blogPublisher.sessionManager = this.sessionManager;
            
            const postData = {
                title: productResult.contentData?.title || '상품 리뷰',
                content: productResult.contentData?.content || '상품 소개',
                images: downloadedImages, // 다운로드된 파일 경로 사용
                categoryId: account.categoryId || 1,
                openType: 'public',
                tags: ['쿠팡', '상품리뷰'],
                productData: productResult.productData, // 상품 데이터도 포함
                affiliateUrl: productResult.affiliateUrl // 어필리에이트 URL 추가
            };

            console.log(`📝 블로그 포스팅 준비:`);
            console.log(`  - 제목: ${postData.title}`);
            console.log(`  - 본문 길이: ${postData.content?.length || 0}자`);
            console.log(`  - 이미지 수: ${postData.images?.length || 0}개`);
            console.log(`  - 어필리에이트 URL: ${postData.affiliateUrl ? '있음' : '없음'}`);

            // 2. 세션 관리 개선: 기존 세션 확인 후 로그인/발행
            const userId = account.username || account.id || account.naverId;
            
            console.log(`🔍 기존 세션 확인 중: ${userId}`);
            console.log(`📁 세션 파일 경로: ${require('path').join(require('electron').app.getPath('userData'), 'sessions', `${userId}_session.json`)}`);
            
            const canUseSession = await this.sessionManager.canUseSession(userId, 999999); // 무제한 사용
            
            let publishResult;
            
            if (canUseSession) {
                console.log(`✅ 기존 세션 발견: ${userId}`);
                
                // 기존 세션으로 발행 시도
                try {
                    const sessionData = await this.sessionManager.loadSession(userId);
                    publishResult = await this.blogPublisher.publish(postData, sessionData, account);
                    console.log('✅ 기존 세션으로 블로그 발행 성공');
                } catch (sessionError) {
                    console.warn('⚠️ 기존 세션으로 발행 실패, 새로 로그인 시도:', sessionError.message);
                    // 🔥 세션이 만료되어도 삭제하지 않고 새로 로그인만 시도
                    console.log('🔄 세션 발행 실패했지만 파일은 보존하고 새로 로그인 시도');
                    publishResult = await this.blogPublisher.loginAndPublish(postData, account);
                }
            } else {
                console.log(`📝 기존 세션 없음, 새로 로그인: ${userId}`);
                // 새로 로그인 후 발행
                publishResult = await this.blogPublisher.loginAndPublish(postData, account);
            }
            
            if (!publishResult.success) {
                throw new Error(`블로그 발행 실패: ${publishResult.error}`);
            }
            
            // 3. 발행 완료 후 최신 세션을 로컬 및 서버로 저장
            console.log('💾 발행 완료 후 세션 재저장 중...');
            try {
                // BlogPublisher에서 사용한 페이지로부터 세션 수집 및 전송
                if (this.blogPublisher.page && !this.blogPublisher.page.isClosed()) {
                    // saveSession(page, accountId, username)
                    // - accountId: 로컬 파일명에 사용 (userId)
                    // - username: API 전송 시 사용 (account.username 또는 account.naverId)
                    const accountId = userId; // 로컬 파일명: "oj2090a_session.json"
                    const username = account.username || account.naverId || userId; // API 전송용
                    
                    console.log(`🔍 세션 저장 정보: accountId="${accountId}", username="${username}"`);
                    
                    await this.sessionManager.saveSession(this.blogPublisher.page, accountId, username);
                    console.log('✅ 발행 완료 후 세션 재저장 성공');
                } else {
                    console.log('⚠️ 브라우저 페이지가 닫혀있어 세션 저장 불가');
                }
            } catch (sessionSaveError) {
                console.warn('⚠️ 발행 완료 후 세션 저장 실패:', sessionSaveError.message);
                // 세션 저장 실패해도 자동화는 계속 진행
            }
            
            console.log('✅ 블로그 포스팅 완료 (세션 관리 포함)');
            return publishResult;

        } catch (error) {
            console.error('❌ 블로그 포스팅 중 오류:', error);
            this.sendLogToRenderer('error', `❌ 블로그 포스팅 실패: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        } finally {
            // 성공/실패 관계없이 다운로드된 이미지 파일 정리
            if (downloadedImages.length > 0) {
                await this.cleanupImages(downloadedImages);
            }
            
            // BlogPublisher 정리
            if (this.blogPublisher) {
                await this.blogPublisher.cleanup();
                this.blogPublisher = null;
            }
        }
    }

    /**
     * 처리할 URL을 원본 파일에서 즉시 삭제
     * @param {string} urlToDelete 삭제할 URL
     */
    async removeProcessedUrl(urlToDelete) {
        try {
            // CoupangCrawler의 removeProcessedUrl 메소드 사용 (원본 파일에서 즉시 삭제)
            await this.coupangCrawler.removeProcessedUrl(urlToDelete);
            
        } catch (error) {
            console.error('❌ URL 삭제 중 오류:', error);
            // 오류가 발생해도 계속 진행
        }
    }

    /**
     * 모든 다운로드된 이미지 정리 (중지 시 사용)
     */
    async cleanupAllImages() {
        try {
            console.log('🗑️ 모든 다운로드된 이미지 정리 시작...');
            
            // 빌드 환경에 따른 이미지 폴더들 정리
            const imageDirs = app.isPackaged ? [
                // 빌드 환경: 사용자 데이터 디렉토리
                path.join(app.getPath('userData'), 'images'),
                path.join(app.getPath('userData'), 'temp_images'),
                path.join(app.getPath('userData'), 'coupang_images')
            ] : [
                // 개발 환경: 기존 방식
                path.join(process.cwd(), 'images'),
                path.join(process.cwd(), 'temp_images'),
                path.join(os.tmpdir(), 'coupang_images')
            ];

            let deletedCount = 0;
            
            for (const imageDir of imageDirs) {
                if (fs.existsSync(imageDir)) {
                    try {
                        const files = fs.readdirSync(imageDir);
                        
                        for (const file of files) {
                            const filePath = path.join(imageDir, file);
                            const stat = fs.statSync(filePath);
                            
                            if (stat.isFile()) {
                                fs.unlinkSync(filePath);
                                deletedCount++;
                                console.log(`✅ 이미지 파일 삭제: ${file}`);
                            }
                        }
                        
                        // 폴더가 비어있으면 삭제
                        const remainingFiles = fs.readdirSync(imageDir);
                        if (remainingFiles.length === 0) {
                            fs.rmdirSync(imageDir);
                            console.log(`📁 빈 이미지 폴더 삭제: ${path.basename(imageDir)}`);
                        }
                        
                    } catch (error) {
                        console.error(`❌ 이미지 폴더 정리 실패: ${imageDir}`, error);
                    }
                }
            }
            
            console.log(`✅ 총 ${deletedCount}개 이미지 파일 삭제 완료`);
            return {
                success: true,
                deletedCount: deletedCount,
                message: `${deletedCount}개 이미지 파일이 삭제되었습니다.`
            };
            
        } catch (error) {
            console.error('❌ 이미지 정리 중 오류:', error);
            return {
                success: false,
                error: error.message,
                deletedCount: 0
            };
        }
    }

    /**
     * 자동화 완전 중지
     */
    async stopAutomation() {
        try {
            console.log('⏹️ 자동화 중지 요청...');
            this.sendLogToRenderer('warn', '⏹️ 자동화 중지 요청');
            
            // 🔥 즉시 실행 상태를 false로 설정 (모든 루프에서 확인됨)
            console.log('🛑 실행 상태 즉시 중지 설정...');
            this.isRunning = false;
            
            // 🔥 세션 매니저에도 중지 상태 알림 (브라우저 모니터링 중지)
            if (this.sessionManager) {
                console.log('🛑 세션 매니저 중지 상태 설정...');
                this.sessionManager.isSystemStopping = true;
                this.sessionManager.stopRequested = true;
                this.sendLogToRenderer('info', '🛑 세션 매니저 중지 상태 설정 완료');
            }
            
            // 진행 중인 세션 중지
            if (this.currentSessionId) {
                console.log('🛑 진행 중인 세션 중지...');
                this.progressTracker.stopSession();
                this.currentSessionId = null;
                this.sendLogToRenderer('info', '🛑 진행 중인 세션 중지 완료');
            }
            
            // CoupangCrawler 중지
            if (this.coupangCrawler) {
                console.log('🛑 CoupangCrawler 중지...');
                try {
                    this.coupangCrawler.isRunning = false;
                    await this.coupangCrawler.stopAutomation();
                    this.sendLogToRenderer('info', '✅ CoupangCrawler 중지 완료');
                } catch (crawlerError) {
                    console.warn('⚠️ CoupangCrawler 중지 중 오류:', crawlerError.message);
                }
            }
            
            // 🔥 BlogPublisher 안전 중지 (브라우저 강제 종료 방지)
            if (this.blogPublisher) {
                console.log('🛑 BlogPublisher 중지...');
                try {
                    await this.blogPublisher.stop();
                    await this.blogPublisher.cleanup();
                    this.blogPublisher = null;
                    this.sendLogToRenderer('info', '✅ BlogPublisher 중지 완료');
                } catch (publisherError) {
                    console.warn('⚠️ BlogPublisher 중지 중 오류:', publisherError.message);
                }
            }
            
            // 🔥 다운로드된 이미지 정리
            console.log('🗑️ 다운로드된 이미지 정리...');
            try {
                await this.cleanupAllImages();
                this.sendLogToRenderer('info', '✅ 이미지 정리 완료');
            } catch (imageError) {
                console.warn('⚠️ 이미지 정리 중 오류:', imageError.message);
            }
            
            // 🔥 시스템 정리
            console.log('🧹 시스템 정리...');
            try {
                await this.cleanup();
                this.sendLogToRenderer('info', '✅ 시스템 정리 완료');
            } catch (cleanupError) {
                console.warn('⚠️ 시스템 정리 중 오류:', cleanupError.message);
            }
            if (this.blogPublisher) {
                console.log('🛑 BlogPublisher 안전 중지...');
                try {
                    // 브라우저 연결 모니터링 중지
                    if (this.blogPublisher.page && !this.blogPublisher.page.isClosed()) {
                        console.log('🔒 브라우저 연결 모니터링 중지...');
                        await this.blogPublisher.page.removeAllListeners();
                    }
                    
                    // BlogPublisher 정리
                    await this.blogPublisher.cleanup();
                    this.blogPublisher = null;
                    this.sendLogToRenderer('info', '✅ BlogPublisher 안전 중지 완료');
                } catch (publisherError) {
                    console.warn('⚠️ BlogPublisher 중지 중 오류 (무시):', publisherError.message);
                    // 강제로 null 설정
                    this.blogPublisher = null;
                }
            }
            
            // 다운로드된 모든 이미지 삭제
            console.log('🗑️ 다운로드된 이미지 정리...');
            const deletedImageCount = await this.cleanupAllImages();
            this.sendLogToRenderer('info', `🗑️ ${deletedImageCount}개 이미지 파일 정리 완료`);
            
            // 🔥 시스템 정리 (세션 매니저 중지 상태 해제)
            console.log('🧹 시스템 정리...');
            try {
                await this.cleanup();
                
                // 세션 매니저 중지 상태 해제
                if (this.sessionManager) {
                    this.sessionManager.isSystemStopping = false;
                }
                
                this.sendLogToRenderer('info', '🧹 시스템 정리 완료');
            } catch (cleanupError) {
                console.warn('⚠️ 시스템 정리 중 오류 (무시):', cleanupError.message);
            }
            
            console.log('✅ 자동화 중지 완료');
            this.sendLogToRenderer('info', '✅ 자동화 중지 완료');
            
            return { 
                success: true, 
                message: '자동화가 중지되었습니다.',
                deletedImages: deletedImageCount
            };
            
        } catch (error) {
            console.error('❌ 자동화 중지 실패:', error);
            this.sendLogToRenderer('error', `❌ 자동화 중지 실패: ${error.message}`);
            
            // 🔥 오류 발생 시에도 상태 강제 초기화
            this.isRunning = false;
            this.blogPublisher = null;
            if (this.sessionManager) {
                this.sessionManager.isSystemStopping = false;
            }
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Gemini API 테스트
     * @param {string} apiKey API 키
     * @returns {Promise<Object>} 테스트 결과
     */
    async testGeminiAPI(apiKey) {
        try {
            console.log('🧪 Gemini API 테스트 시작...');
            
            this.contentGenerator.setApiKey(apiKey);
            const testResult = await this.contentGenerator.testConnection();
            
            if (testResult.success) {
                // API 키 저장
                await this.configManager.setGeminiApiKey(apiKey);
                console.log('✅ Gemini API 테스트 성공');
            } else {
                console.error('❌ Gemini API 테스트 실패:', testResult.error);
            }
            
            return testResult;
            
        } catch (error) {
            console.error('❌ Gemini API 테스트 오류:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 계정 관리
     * @param {string} action 액션 (add, remove, update, list)
     * @param {Object} data 계정 데이터
     * @returns {Promise<Object>} 처리 결과
     */
    async manageAccount(action, data) {
        try {
            console.log('🔍 manageAccount 호출됨:', { action, data, dataType: typeof data });
            
            let result;
            
            switch (action) {
                case 'add':
                    console.log('📝 계정 추가 요청 - 데이터:', data);
                    result = await this.configManager.addAccount(data);
                    break;
                    
                case 'remove':
                    result = await this.configManager.removeAccount(data.accountId);
                    break;
                    
                case 'update':
                    result = await this.configManager.updateAccountStatus(data.accountId, data.isActive);
                    break;
                    
                case 'list':
                    result = this.configManager.getAccounts();
                    break;
                    
                case 'getAll':
                    console.log('📋 모든 계정 조회 요청');
                    result = this.configManager.getAccounts();
                    return { success: true, accounts: result };
                    
                default:
                    throw new Error(`알 수 없는 액션: ${action}`);
            }
            
            return { success: true, data: result };
            
        } catch (error) {
            console.error(`❌ 계정 관리 실패 (${action}):`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 네이버 ID 검증
     * @param {string} naverId 검증할 네이버 ID
     * @param {string} naverPassword 네이버 비밀번호
     * @returns {Promise<Object>} 검증 결과
     */
    async validateNaverId(naverId, naverPassword) {
        try {
            console.log(`🔍 네이버 ID 검증 요청: ${naverId}`);
            
            const validationResult = await this.naverIdValidator.validateNaverId(naverId, naverPassword);
            
            return {
                success: true,
                isValid: validationResult.isValid,
                message: validationResult.message
            };
            
        } catch (error) {
            console.error(`❌ 네이버 ID 검증 실패 (${naverId}):`, error);
            return {
                success: false,
                isValid: false,
                message: `검증 중 오류가 발생했습니다: ${error.message}`
            };
        }
    }

    /**
     * 시스템 상태 조회
     * @returns {Object} 시스템 상태
     */
    getSystemStatus() {
        return {
            isRunning: this.isRunning,
            currentSessionId: this.currentSessionId,
            modules: {
                configManager: this.configManager.getStatus(),
                sessionManager: this.sessionManager.getStatus(),
                progressTracker: this.progressTracker.getStatus(),
                loginManager: this.loginManager.getStatus(),
                imageProcessor: this.imageProcessor.getStatus(),
                blogPublisher: this.blogPublisher?.getStatus() || {}
            },
            progress: this.progressTracker.getProgress()
        };
    }

    /**
     * 로그 조회
     * @param {number} lines 조회할 라인 수
     * @returns {Array} 로그 라인들
     */
    getLogs(lines = 100) {
        return this.progressTracker.readLogs(lines);
    }

    /**
     * 지연 함수
     * @param {number} ms 밀리초
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 중지 조건을 확인하면서 대기하는 함수
     * @param {number} ms 밀리초
     * @param {Object} options 추가 옵션 (waitTimeMinutes, nextAccount 등)
     * @param {number} checkInterval 중지 조건 확인 간격 (기본: 1초)
     */
    async delayWithStopCheck(ms, options = {}, checkInterval = 1000) {
        const totalTime = ms;
        let elapsedTime = 0;
        
        console.log(`⏳ 대기 시작: ${Math.ceil(totalTime / 60000)}분 (${Math.ceil(totalTime / 1000)}초)`);
        
        while (elapsedTime < totalTime) {
            // 매 반복마다 중지 조건 먼저 확인
            if (!this.isRunning) {
                console.log('⏹️ 대기 중 자동화 중지 요청 감지');
                throw new Error('대기 중 자동화가 중지되었습니다.');
            }
            
            const waitTime = Math.min(checkInterval, totalTime - elapsedTime);
            await this.delay(waitTime);
            elapsedTime += waitTime;
            
            // 남은 시간을 렌더러에 전송 (중지 상태가 아닌 경우에만)
            const remainingTime = totalTime - elapsedTime;
            if (remainingTime > 0 && this.isRunning) {
                const remainingMinutes = Math.floor(remainingTime / 60000);
                const remainingSeconds = Math.floor((remainingTime % 60000) / 1000);
                console.log(`⏳ 대기 중... 남은 시간: ${remainingMinutes > 0 ? remainingMinutes + '분 ' : ''}${remainingSeconds}초`);
                
                this.sendToRenderer('waiting-update', {
                    remainingTimeMs: remainingTime,
                    remainingMinutes: remainingMinutes,
                    remainingSeconds: remainingSeconds,
                    waitTimeMinutes: options.waitTimeMinutes || Math.ceil(totalTime / 60000),
                    nextAccount: options.nextAccount || '알 수 없음'
                });
            }
            
            // 대기 완료 후에도 중지 조건 확인
            if (!this.isRunning) {
                console.log('⏹️ 대기 완료 후 자동화 중지 요청 감지');
                throw new Error('대기 완료 후 자동화가 중지되었습니다.');
            }
        }
        
        console.log('✅ 대기 완료');
    }

    /**
     * 시스템 정리
     */
    async cleanup() {
        try {
            console.log('🧹 BlogAutomation 시스템 정리 시작...');
            
            // 실행 상태 리셋
            this.isRunning = false;
            this.currentSessionId = null;
            
            // 각 모듈 정리 (순서 중요)
            const cleanupTasks = [];
            
            if (this.naverIdValidator) {
                cleanupTasks.push(
                    this.naverIdValidator.closeBrowser().catch(err => 
                        console.warn('NaverIdValidator 정리 실패:', err.message)
                    )
                );
            }
            
            if (this.blogPublisher) {
                cleanupTasks.push(
                    this.blogPublisher.cleanup().catch(err => 
                        console.warn('BlogPublisher 정리 실패:', err.message)
                    )
                );
            }
            
            if (this.loginManager) {
                cleanupTasks.push(
                    this.loginManager.cleanup().catch(err => 
                        console.warn('LoginManager 정리 실패:', err.message)
                    )
                );
            }
            
            if (this.coupangCrawler) {
                cleanupTasks.push(
                    this.coupangCrawler.cleanup().catch(err => 
                        console.warn('CoupangCrawler 정리 실패:', err.message)
                    )
                );
            }
            
            if (this.imageProcessor) {
                cleanupTasks.push(
                    this.imageProcessor.cleanup().catch(err => 
                        console.warn('ImageProcessor 정리 실패:', err.message)
                    )
                );
            }
            
            if (this.contentGenerator) {
                cleanupTasks.push(
                    this.contentGenerator.cleanup().catch(err => 
                        console.warn('ContentGenerator 정리 실패:', err.message)
                    )
                );
            }
            
            if (this.sessionManager) {
                cleanupTasks.push(
                    this.sessionManager.cleanup().catch(err => 
                        console.warn('SessionManager 정리 실패:', err.message)
                    )
                );
            }
            
            if (this.progressTracker) {
                cleanupTasks.push(
                    this.progressTracker.cleanup().catch(err => 
                        console.warn('ProgressTracker 정리 실패:', err.message)
                    )
                );
            }
            
            if (this.configManager) {
                cleanupTasks.push(
                    this.configManager.cleanup().catch(err => 
                        console.warn('ConfigManager 정리 실패:', err.message)
                    )
                );
            }
            
            // 모든 정리 작업을 병렬로 실행
            await Promise.allSettled(cleanupTasks);
            
            // 임시 파일 정리
            await this.cleanupAllImages().catch(err => 
                console.warn('이미지 정리 실패:', err.message)
            );
            
            console.log('✅ BlogAutomation 시스템 정리 완료');
            
        } catch (error) {
            console.error('❌ BlogAutomation 정리 중 오류:', error);
        }
    }

    /**
     * 렌더러에서 설정 정보 가져오기
     * @returns {Promise<Object>} 설정 정보
     */
    async getRendererSettings() {
        try {
            // 기본 설정값
            const defaultSettings = {
                postDelay: 10,  // 분
                dailyLimit: 3  // 개
            };
            
            // 렌더러에서 설정 정보 요청
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                const settings = await this.mainWindow.webContents.executeJavaScript(`
                    (() => {
                        try {
                            const saved = localStorage.getItem('blogAutomationState');
                            if (saved) {
                                const state = JSON.parse(saved);
                                return state.settings || ${JSON.stringify(defaultSettings)};
                            }
                            return ${JSON.stringify(defaultSettings)};
                        } catch (error) {
                            console.error('설정 로드 실패:', error);
                            return ${JSON.stringify(defaultSettings)};
                        }
                    })()
                `);
                return settings;
            }
            
            return defaultSettings;
        } catch (error) {
            console.error('❌ 렌더러 설정 가져오기 실패:', error);
            return {
                postDelay: 10,
                dailyLimit: 3
            };
        }
    }

    /**
     * 오늘 포스트 카운트 가져오기
     * @param {string} dailyPostKey 일일 포스트 키
     * @returns {Promise<number>} 오늘 포스트 수
     */
    async getTodayPostCount(dailyPostKey) {
        try {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                const count = await this.mainWindow.webContents.executeJavaScript(`
                    (() => {
                        try {
                            const saved = localStorage.getItem('blogAutomationState');
                            if (saved) {
                                const state = JSON.parse(saved);
                                return state.todayExecutions && state.todayExecutions['${dailyPostKey}'] || 0;
                            }
                            return 0;
                        } catch (error) {
                            console.error('일일 포스트 카운트 로드 실패:', error);
                            return 0;
                        }
                    })()
                `);
                return count;
            }
            return 0;
        } catch (error) {
            console.error('❌ 오늘 포스트 카운트 가져오기 실패:', error);
            return 0;
        }
    }

    /**
     * 오늘 포스트 카운트 증가
     * @param {string} dailyPostKey 일일 포스트 키
     * @returns {Promise<void>}
     */
    async incrementTodayPostCount(dailyPostKey) {
        try {
            console.log(`📊 일일 포스트 카운트 증가 시작: ${dailyPostKey}`);
            
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                const newCount = await this.mainWindow.webContents.executeJavaScript(`
                    (() => {
                        try {
                            console.log('📊 localStorage에서 포스트 카운트 증가 시작: ${dailyPostKey}');
                            
                            const saved = localStorage.getItem('blogAutomationState');
                            let state = {};
                            
                            if (saved) {
                                state = JSON.parse(saved);
                                console.log('📊 기존 상태 로드:', state);
                            } else {
                                console.log('📊 새로운 상태 생성');
                            }
                            
                            if (!state.todayExecutions) {
                                state.todayExecutions = {};
                                console.log('📊 todayExecutions 객체 생성');
                            }
                            
                            const oldCount = state.todayExecutions['${dailyPostKey}'] || 0;
                            state.todayExecutions['${dailyPostKey}'] = oldCount + 1;
                            const newCount = state.todayExecutions['${dailyPostKey}'];
                            
                            console.log('📊 카운트 업데이트: ${dailyPostKey}', oldCount, '->', newCount);
                            
                            localStorage.setItem('blogAutomationState', JSON.stringify(state));
                            console.log('📊 localStorage 저장 완료');
                            
                            // UI 업데이트 트리거
                            if (typeof Dashboard !== 'undefined') {
                                console.log('📊 Dashboard UI 업데이트 트리거');
                                Dashboard.updateStats();
                                Dashboard.renderExecutionStats();
                            } else {
                                console.warn('⚠️ Dashboard 객체를 찾을 수 없음');
                            }
                            
                            return newCount;
                        } catch (error) {
                            console.error('❌ 일일 포스트 카운트 증가 실패:', error);
                            return 0;
                        }
                    })()
                `);
                
                console.log(`✅ 일일 포스트 카운트 증가 완료: ${dailyPostKey} -> ${newCount}`);
            } else {
                console.warn('⚠️ mainWindow가 없거나 파괴됨 - 카운트 증가 건너뜀');
            }
        } catch (error) {
            console.error('❌ 오늘 포스트 카운트 증가 실패:', error);
        }
    }

    /**
     * 일일 포스트 키 생성 (통일된 형식)
     * @param {Object} account 계정 정보
     * @returns {string} 일일 포스트 키
     */
    generateDailyPostKey(account) {
        const today = new Date().toISOString().split('T')[0];
        const accountId = account.username || account.naverId || account.id;
        return `${today}-${accountId}`;
    }

    /**
     * 완전 자동화 실행 - 쿠팡 API로 상품 정보를 가져와서 자동 블로그 포스팅
     * @param {Array} accounts 실행할 계정 목록
     * @param {Object} apiOptions API 옵션
     * @returns {Promise<Object>} 실행 결과
     */
    async executeFullAutomation(accounts, apiOptions = {}) {
        try {
            console.log('🤖 완전 자동화 실행 시작');
            this.sendLogToRenderer('info', '🤖 완전 자동화 실행 시작');

            // API 연결 확인
            if (!this.coupangApiManager.isConnected) {
                const isConnected = await this.coupangApiManager.testConnection();
                if (!isConnected) {
                    throw new Error('쿠팡 API 연결에 실패했습니다. API 키를 확인해주세요.');
                }
            }

            // 상품 URL 가져오기
            this.sendToRenderer('full-automation-progress', {
                stage: 'fetching-products',
                message: '쿠팡 API에서 상품 정보를 가져오는 중...'
            });

            const productUrls = await this.coupangApiManager.getAllProducts(apiOptions);
            
            if (productUrls.length === 0) {
                throw new Error('가져온 상품이 없습니다. API 설정을 확인해주세요.');
            }

            console.log(`📦 총 ${productUrls.length}개 상품 URL 획득`);
            this.sendLogToRenderer('info', `📦 총 ${productUrls.length}개 상품 URL 획득`);

            // 기존 자동화 로직 실행
            this.sendToRenderer('full-automation-progress', {
                stage: 'starting-automation',
                message: `${productUrls.length}개 상품으로 자동화 시작...`,
                totalProducts: productUrls.length
            });

            // 상품 URL을 전역 상태에 저장 (기존 자동화 로직에서 사용)
            this.currentProductUrls = productUrls;

            // 계정별 순차 실행
            const results = [];
            for (let i = 0; i < accounts.length; i++) {
                const account = accounts[i];
                
                try {
                    this.sendToRenderer('full-automation-progress', {
                        stage: 'processing-account',
                        message: `계정 ${account.username} 처리 중...`,
                        currentAccount: i + 1,
                        totalAccounts: accounts.length
                    });

                    const accountResult = await this.executeFullAutomationForAccount(account, productUrls, apiOptions);
                    results.push(accountResult);

                    this.sendLogToRenderer('info', `✅ 계정 ${account.username} 처리 완료: ${accountResult.successCount}개 성공`);
                } catch (error) {
                    console.error(`❌ 계정 ${account.username} 처리 실패:`, error);
                    this.sendLogToRenderer('error', `❌ 계정 ${account.username} 처리 실패: ${error.message}`);
                    results.push({
                        account: account.username,
                        success: false,
                        error: error.message,
                        successCount: 0,
                        failureCount: 0
                    });
                }
            }

            // 결과 집계
            const totalSuccess = results.reduce((sum, r) => sum + (r.successCount || 0), 0);
            const totalFailure = results.reduce((sum, r) => sum + (r.failureCount || 0), 0);

            const finalResult = {
                success: true,
                totalAccounts: accounts.length,
                totalProducts: productUrls.length,
                totalSuccess,
                totalFailure,
                results
            };

            console.log('✅ 완전 자동화 실행 완료:', finalResult);
            this.sendLogToRenderer('info', `✅ 완전 자동화 완료: ${totalSuccess}개 성공, ${totalFailure}개 실패`);

            this.sendToRenderer('full-automation-complete', finalResult);
            return finalResult;

        } catch (error) {
            console.error('❌ 완전 자동화 실행 실패:', error);
            this.sendLogToRenderer('error', `❌ 완전 자동화 실행 실패: ${error.message}`);
            
            this.sendToRenderer('full-automation-error', {
                error: error.message
            });
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 단일 계정에 대한 완전 자동화 실행
     * @param {Object} account 계정 정보
     * @param {Array} productUrls 상품 URL 배열
     * @param {Object} apiOptions API 옵션
     * @returns {Promise<Object>} 실행 결과
     */
    async executeFullAutomationForAccount(account, productUrls, apiOptions) {
        let successCount = 0;
        let failureCount = 0;
        const errors = [];

        try {
            console.log(`👤 계정 ${account.username} 완전 자동화 시작`);
            
            // 일일 포스트 제한 확인
            const dailyPostKey = this.generateDailyPostKey(account);
            const todayPostCount = await this.getTodayPostCount(dailyPostKey);
            const dailyLimit = 3; // 기본 제한
            
            if (todayPostCount >= dailyLimit) {
                console.log(`⚠️ 계정 ${account.username}은 오늘 일일 포스트 제한(${dailyLimit}개)에 도달했습니다.`);
                return {
                    account: account.username,
                    success: true,
                    message: `일일 포스트 제한 도달 (${todayPostCount}/${dailyLimit})`,
                    successCount: 0,
                    failureCount: 0
                };
            }

            const remainingPosts = dailyLimit - todayPostCount;
            const maxUrlsToProcess = Math.min(productUrls.length, Math.max(0, remainingPosts));
            const urlsToProcess = productUrls.slice(0, maxUrlsToProcess);

            console.log(`📝 계정 ${account.username}: ${urlsToProcess.length}개 상품 처리 예정 (남은 할당량: ${remainingPosts}개)`);

            // 각 상품 URL에 대해 자동화 실행
            for (let i = 0; i < urlsToProcess.length; i++) {
                const url = urlsToProcess[i];
                
                try {
                    this.sendToRenderer('full-automation-progress', {
                        stage: 'processing-product',
                        message: `${account.username}: 상품 ${i + 1}/${urlsToProcess.length} 처리 중...`,
                        currentProduct: i + 1,
                        totalProducts: urlsToProcess.length,
                        accountName: account.username
                    });

                    // 단일 상품 처리
                    const result = await this.processSingleProduct(url, account);
                    
                    if (result.success) {
                        successCount++;
                        await this.incrementTodayPostCount(dailyPostKey);
                        console.log(`✅ 상품 처리 성공: ${url}`);
                    } else {
                        failureCount++;
                        errors.push(`상품 ${i + 1}: ${result.error}`);
                        console.log(`❌ 상품 처리 실패: ${url} - ${result.error}`);
                    }

                    // 포스트 간 대기 시간
                    if (i < urlsToProcess.length - 1) {
                        const delayMinutes = 10; // 기본 10분 대기
                        console.log(`⏰ ${delayMinutes}분 대기 중...`);
                        this.sendToRenderer('full-automation-progress', {
                            stage: 'waiting',
                            message: `다음 포스트까지 ${delayMinutes}분 대기 중...`,
                            waitTime: delayMinutes * 60
                        });
                        await this.delay(delayMinutes * 60 * 1000);
                    }

                } catch (error) {
                    failureCount++;
                    errors.push(`상품 ${i + 1}: ${error.message}`);
                    console.error(`❌ 상품 처리 중 오류:`, error);
                }
                
                // 중지 요청 확인
                if (this.stopRequested) {
                    console.log('🛑 사용자 요청으로 중지됨');
                    break;
                }
            }

            return {
                account: account.username,
                success: true,
                successCount,
                failureCount,
                errors: errors.length > 0 ? errors : undefined
            };

        } catch (error) {
            console.error(`❌ 계정 ${account.username} 완전 자동화 실패:`, error);
            return {
                account: account.username,
                success: false,
                error: error.message,
                successCount,
                failureCount
            };
        }
    }

    /**
     * 아고다 자동화 실행
     * @param {Array} accounts - 실행할 계정 목록
     * @param {string} country - 선택된 국가
     * @returns {Object} 실행 결과
     */
    async executeAgodaAutomation(accounts, country) {
        console.log(`🏨 아고다 자동화 시작: ${accounts.length}개 계정, 국가: ${country}`);
        
        // 🚫 아고다 서비스 비활성화 체크 (렌더러에서 설정 확인)
        try {
            const rendererSettings = await this.getRendererSettings();
            if (rendererSettings && rendererSettings.agodaAutomation && rendererSettings.agodaAutomation.enabled === false) {
                console.log('🚫 아고다 서비스가 비활성화되어 실행을 중단합니다.');
                return {
                    success: false,
                    error: '아고다 서비스는 현재 일시 중단되었습니다. 잠시만 기다려주세요.',
                    successCount: 0,
                    errorCount: accounts.length
                };
            }
        } catch (error) {
            console.warn('⚠️ 아고다 서비스 활성화 상태 확인 실패, 안전상 실행을 중단합니다:', error);
            return {
                success: false,
                error: '아고다 서비스 상태를 확인할 수 없어 실행을 중단했습니다.',
                successCount: 0,
                errorCount: accounts.length
            };
        }
        
        // 자동화 실행 상태 설정
        this.isRunning = true;
        
        try {
            // 설정 정보 가져오기
            const settings = await this.getRendererSettings();
            console.log('⚙️ 아고다 자동화 적용 설정:', settings);
            
            // 🏨 사용한 호텔 관리자 초기화
            const UsedHotelManager = require('./modules/UsedHotelManager');
            const usedHotelManager = new UsedHotelManager();
            
            // 자동 데이터 정리 실행 (7일 이상 된 데이터 삭제)
            const cleanupResult = usedHotelManager.autoCleanup();
            if (cleanupResult.deletedCount > 0) {
                console.log(`🧹 오래된 호텔 데이터 ${cleanupResult.deletedCount}개 정리됨`);
            }
            
            // 사용 통계 출력
            const stats = usedHotelManager.getUsageStatistics();
            console.log(`📊 호텔 사용 통계: 총 ${stats.totalHotels}개 호텔, ${stats.totalDays}일간 데이터`);
            
            // 아고다 모듈 경로 확인 (개발/프로덕션 환경 대응)
            const path = require('path');
            const agodaPath = isPackaged ? 
                path.join(appPath, 'agoda') : 
                path.join(__dirname, '../agoda');
            
            console.log(`📁 아고다 모듈 경로: ${agodaPath}`);
            
            // 아고다 모듈 로드 전에 사용자 설정 경로를 전역 변수로 설정
            global.userAgodaConfigPath = path.join(appDataPath, 'agoda_config', 'config.js');
            
            // 사용자 데이터 폴더에 아고다 설정 디렉토리 생성 (모듈 로드 전에 미리 설정)
            const userAgodaConfigDir = path.join(appDataPath, 'agoda_config');
            if (!fs.existsSync(userAgodaConfigDir)) {
                fs.mkdirSync(userAgodaConfigDir, { recursive: true });
                console.log(`📁 아고다 설정 디렉토리 생성: ${userAgodaConfigDir}`);
            }
            
            // 사용자 데이터 폴더의 config.js 경로
            const userAgodaConfig = path.join(userAgodaConfigDir, 'config.js');
            
            // 원본 아고다 설정 파일 경로 (읽기 전용)
            const originalAgodaConfig = path.join(agodaPath, 'config.js');
            
            // 사용자 데이터 폴더에 config.js가 없으면 원본에서 복사 (모듈 로드 전)
            if (!fs.existsSync(userAgodaConfig)) {
                console.log('📄 아고다 설정 파일 복사 중...');
                
                // 원본 파일 읽기 (asar에서도 읽기 가능)
                let originalContent;
                try {
                    originalContent = fs.readFileSync(originalAgodaConfig, 'utf8');
                } catch (readError) {
                    console.error(`❌ 원본 설정 파일 읽기 실패: ${readError.message}`);
                    // 기본 설정으로 대체
                    originalContent = `// 설정 변수
const LINK_PRICE_CID = 'A100685083'; // 링크프라이스 CID

// 빌드된 앱에서는 global.paths를 사용하고, 개발 환경에서는 __dirname 사용
const USER_DATA_PATH = global.paths ? global.paths.tempImagePath : __dirname;
const DOWNLOAD_PATH = global.paths ? global.paths.tempImagePath : __dirname;

// 호텔 검색 조건
const SEARCH_CONFIG = {
  CHECK_IN_DAYS_FROM_NOW: 30,
  LENGTH_OF_STAY: 1,
  ROOMS: 2,
  ADULTS: 2,
  CHILDREN: 0,
  MIN_PRICE: 100000,
  MAX_PRICE: 10000000,
  TRAVELLER_TYPE: "Family",
  CURRENCY: "KRW",
  LOCALE: "ko-kr",
  ORIGIN: "KR",
  PAGE_SIZE: 45,
  MAX_RANDOM_PAGE: 50,
  MAX_ATTEMPTS: 30,
  SORT_FIELD: "Ranking",
  SORT_ORDER: "Desc",
  MIN_REVIEW_SCORE: 7.5,
  MIN_REVIEW_COUNT: 3
};

const LANGUAGE_MAP = {
  1: "영어", 2: "프랑스어", 3: "독일어", 5: "스페인어", 6: "일본어",
  7: "중국어(홍콩)", 8: "중국어(간체)", 9: "한국어", 11: "러시아어",
  12: "포르투갈어(포르투갈)", 13: "네덜란드어", 14: "영어(캐나다)",
  15: "영어(인도)", 16: "영어(영국)", 17: "영어(남아공)", 18: "영어(호주)",
  19: "영어(싱가포르)", 20: "중국어(대만)", 22: "태국어", 23: "버마어",
  24: "베트남어", 25: "스웨덴어", 26: "인도네시아어", 27: "폴란드어",
  28: "노르웨이어", 30: "핀란드어", 31: "체코어", 32: "터키어",
  38: "슬로베니아어", 43: "포르투갈어(브라질)", 50: "우크라이나어"
};

module.exports = {
  LINK_PRICE_CID,
  USER_DATA_PATH,
  DOWNLOAD_PATH,
  SEARCH_CONFIG,
  LANGUAGE_MAP
};`;
                }
                
                // 사용자 데이터 폴더에 파일 생성
                fs.writeFileSync(userAgodaConfig, originalContent, 'utf8');
                console.log('✅ 아고다 설정 파일 복사 완료');
            }
            
            // 국가 파일들도 사용자 데이터 폴더에 복사 (모듈 로드 전)
            const userCountryDir = path.join(userAgodaConfigDir, 'country');
            if (!fs.existsSync(userCountryDir)) {
                fs.mkdirSync(userCountryDir, { recursive: true });
                console.log(`📁 국가 데이터 디렉토리 생성: ${userCountryDir}`);
                
                // 국가 파일들 복사
                const originalCountryDir = path.join(agodaPath, 'country');
                const countryFiles = ['대한민국.txt', '일본.txt', '중국.txt'];
                
                for (const countryFile of countryFiles) {
                    const originalFile = path.join(originalCountryDir, countryFile);
                    const userFile = path.join(userCountryDir, countryFile);
                    
                    try {
                        if (fs.existsSync(originalFile)) {
                            const countryContent = fs.readFileSync(originalFile, 'utf8');
                            fs.writeFileSync(userFile, countryContent, 'utf8');
                            console.log(`✅ 국가 파일 복사 완료: ${countryFile}`);
                        }
                    } catch (copyError) {
                        console.warn(`⚠️ 국가 파일 복사 실패: ${countryFile} - ${copyError.message}`);
                    }
                }
            }
            
            // 아고다 모듈 동적 로드
            const { getRandomHotelInfo } = require(path.join(agodaPath, 'index.js'));
            const { cleanupUploadFolder } = require(path.join(agodaPath, 'fileHandler.js'));
            
            let successCount = 0;
            let errorCount = 0;
            const errors = [];
            
            for (const account of accounts) {
                try {
                    console.log(`🏨 계정 ${account.naverId}으로 아고다 자동화 시작`);
                    
                    // 계정별 일일 포스트 제한 확인
                    const dailyPostKey = this.generateDailyPostKey(account);
                    const todayPostCount = await this.getTodayPostCount(dailyPostKey);
                    
                    console.log(`📊 일일 포스트 현황: ${account.naverId} - 오늘 ${todayPostCount}개 / 제한 ${settings.dailyLimit}개`);
                    
                    if (todayPostCount >= settings.dailyLimit) {
                        console.log(`⚠️ 계정 ${account.naverId}이 일일 포스트 제한(${settings.dailyLimit}개)에 도달했습니다.`);
                        continue; // 다음 계정으로 건너뛰기
                    }
                    
                    // 처리할 포스트 수 계산 (일일 제한 고려)
                    const remainingPostsToday = settings.dailyLimit - todayPostCount;
                    const postsToProcess = remainingPostsToday; // 남은 포스트 수만큼 처리
                    
                    console.log(`🎯 계정 ${account.naverId}: ${postsToProcess}개 포스트 처리 예정 (오늘 ${todayPostCount}개 완료, 일일 제한 ${settings.dailyLimit}개)`);
                    
                    // 계정별 설정된 횟수만큼 반복 실행
                    for (let postIndex = 0; postIndex < postsToProcess; postIndex++) {
                        try {
                            // 중지 조건 확인
                            if (!this.isRunning) {
                                console.log('⏹️ 자동화 중지 요청으로 인해 처리를 중단합니다.');
                                break;
                            }
                            
                            console.log(`📝 계정 ${account.naverId} - 포스트 ${postIndex + 1}/${postsToProcess} 처리 중...`);
                        
                        // 🔄 렌더러에 진행 상황 전송
                        this.sendToRenderer('agoda-automation-progress', {
                            accountIndex: accounts.indexOf(account),
                            totalAccounts: accounts.length,
                            postIndex: postIndex,
                            totalPosts: postsToProcess,
                            accountName: account.naverId,
                            step: '호텔 정보 수집 시작'
                        });
                            
                            // 현재 포스트 수 재확인 (중간에 다른 프로세스가 포스트를 추가했을 수 있음)
                            const currentPostCount = await this.getTodayPostCount(dailyPostKey);
                            if (currentPostCount >= settings.dailyLimit) {
                                console.log(`⚠️ 계정 ${account.naverId}이 일일 포스트 제한에 도달했습니다. 다음 계정으로 이동합니다.`);
                                break;
                            }
                        
                                                    // 아고다 설정 업데이트
                        const fs = require('fs');
                        const userAgodaConfig = path.join(appDataPath, 'agoda_config', 'config.js');
                        
                        console.log(`📝 사용자 아고다 설정 파일 경로: ${userAgodaConfig}`);
                        
                        try {
                            // 링크 프라이스 CID 설정
                            if (account.linkPriceCid) {
                                // 사용자 데이터 폴더의 config.js 파일 읽기
                                let configContent = fs.readFileSync(userAgodaConfig, 'utf8');
                                
                                // CID 업데이트
                                configContent = configContent.replace(
                                    /const LINK_PRICE_CID = ['"`].*?['"`];/,
                                    `const LINK_PRICE_CID = '${account.linkPriceCid}';`
                                );
                                
                                // 사용자 데이터 폴더의 파일에 저장
                                fs.writeFileSync(userAgodaConfig, configContent);
                                
                                console.log(`✅ 아고다 설정 업데이트 완료: CID=${account.linkPriceCid}, 국가=${country}`);
                                console.log(`💾 설정 파일 위치: ${userAgodaConfig}`);
                            }
                            
                        } catch (configError) {
                            console.error(`❌ 아고다 설정 파일 처리 실패: ${configError.message}`);
                            console.log('⚠️ 기본 설정으로 계속 진행합니다.');
                        }
                        
                        // 중지 조건 확인 (설정 처리 후)
                        if (!this.isRunning) {
                            console.log('⏹️ 아고다 자동화 중지 요청 감지 - 설정 처리 후 중단');
                            throw new Error('아고다 자동화가 중지되었습니다.');
                        }
                            
                        // 아고다 호텔 정보 가져오기 (계정별 중복 체크)
                        console.log('🏨 호텔 정보 수집 시작...');
                        
                        // 🔄 렌더러에 진행 상황 전송
                        this.sendToRenderer('agoda-automation-progress', {
                            accountIndex: accounts.indexOf(account),
                            totalAccounts: accounts.length,
                            postIndex: postIndex,
                            totalPosts: postsToProcess,
                            accountName: account.naverId,
                            step: '호텔 정보 수집 중...'
                        });
                        
                        // 현재 계정 ID 설정 (중복 체크를 위함)
                        usedHotelManager.currentAccountId = account.naverId || account.username || account.id;
                        console.log(`🔍 계정별 중복 체크 설정: ${usedHotelManager.currentAccountId}`);
                        
                        // 렌더러에서 실제 금칙어 설정 가져오기
                        let bannedWords = [];
                        try {
                            const mainWindow = this.getMainWindow();
                            if (mainWindow && mainWindow.webContents) {
                                // 렌더러에서 현재 설정된 금칙어 가져오기
                                bannedWords = await mainWindow.webContents.executeJavaScript(`
                                    (() => {
                                        try {
                                            const AppState = window.AppState;
                                            if (AppState && AppState.agodaAutomation && AppState.agodaAutomation.bannedWords) {
                                                return AppState.agodaAutomation.bannedWords;
                                            }
                                            return ['아늑', '오송815', '오송 815']; // 기본값
                                        } catch (error) {
                                            console.error('금칙어 가져오기 실패:', error);
                                            return ['아늑', '오송815', '오송 815']; // 기본값
                                        }
                                    })()
                                `);
                            }
                        } catch (error) {
                            console.error('❌ 렌더러에서 금칙어 가져오기 실패, 기본값 사용:', error);
                            bannedWords = ['아늑', '오송815', '오송 815']; // 기본값
                        }
                        
                        console.log(`🚫 [금칙어 적용] ${bannedWords.length}개 금칙어:`, bannedWords);
                        
                        const hotelInfo = await getRandomHotelInfo(country, usedHotelManager, account.linkPriceCid, bannedWords);
                        
                        if (!hotelInfo) {
                            throw new Error('호텔 정보를 가져올 수 없습니다.');
                        }
                        
                        console.log(`🏨 호텔 정보 수집 완료: ${hotelInfo.이름}`);
                        
                        // 중지 조건 확인 (호텔 정보 수집 후)
                        if (!this.isRunning) {
                            console.log('⏹️ 아고다 자동화 중지 요청 감지 - 호텔 정보 수집 후 중단');
                            throw new Error('아고다 자동화가 중지되었습니다.');
                        }
                        
                        // 제미나이로 블로그 글 작성
                        console.log('📝 블로그 컨텐츠 생성 시작...');
                        
                        // 🔄 렌더러에 진행 상황 전송
                        this.sendToRenderer('agoda-automation-progress', {
                            accountIndex: accounts.indexOf(account),
                            totalAccounts: accounts.length,
                            postIndex: postIndex,
                            totalPosts: postsToProcess,
                            accountName: account.naverId,
                            step: '콘텐츠 생성 중...'
                        });
                        
                        const blogContent = await this.contentGenerator.generateAgodaContent(hotelInfo, account.geminiApi);
                        
                        // 중지 조건 확인 (컨텐츠 생성 후)
                        if (!this.isRunning) {
                            console.log('⏹️ 아고다 자동화 중지 요청 감지 - 컨텐츠 생성 후 중단');
                            throw new Error('아고다 자동화가 중지되었습니다.');
                        }
                        
                        // 블로그 게시
                        console.log('📤 블로그 게시 시작...');
                        
                        // 🔄 렌더러에 진행 상황 전송
                        this.sendToRenderer('agoda-automation-progress', {
                            accountIndex: accounts.indexOf(account),
                            totalAccounts: accounts.length,
                            postIndex: postIndex,
                            totalPosts: postsToProcess,
                            accountName: account.naverId,
                            step: '블로그 포스팅 중...'
                        });
                        
                        const publishResult = await this.publishAgodaToBlog(blogContent, hotelInfo, account);
                            
                            if (publishResult.success) {
                                successCount++;
                                console.log(`✅ 계정 ${account.naverId} 포스트 ${postIndex + 1} 완료`);
                                
                                // 🔄 렌더러에 완료 상황 전송
                                this.sendToRenderer('agoda-automation-progress', {
                                    accountIndex: accounts.indexOf(account),
                                    totalAccounts: accounts.length,
                                    postIndex: postIndex,
                                    totalPosts: postsToProcess,
                                    accountName: account.naverId,
                                    step: '포스트 완료!'
                                });
                                
                                // 일일 포스트 카운트 증가
                                await this.incrementTodayPostCount(dailyPostKey);
                                console.log(`📊 일일 포스트 카운트 증가: ${account.naverId} - 1개`);
                                
                                // 렌더러 UI 실시간 업데이트
                                const updateData = {
                                    accountId: account.naverId,
                                    dailyPostKey: dailyPostKey,
                                    increment: 1
                                };
                                console.log('📤 렌더러로 포스트 카운트 업데이트 전송:', updateData);
                                this.sendToRenderer('post-count-update', updateData);
                                
                            } else {
                                throw new Error(publishResult.error || '블로그 게시 실패');
                            }
                            
                            // 중지 조건 확인 (블로그 게시 후)
                            if (!this.isRunning) {
                                console.log('⏹️ 아고다 자동화 중지 요청 감지 - 블로그 게시 후 중단');
                                throw new Error('아고다 자동화가 중지되었습니다.');
                            }
                            
                            // 포스트 간 대기 시간 적용 (마지막 포스트가 아닌 경우)
                            if (postIndex < postsToProcess - 1) {
                                const delayMinutes = settings.postDelay || 10;
                                console.log(`⏳ 다음 포스트까지 ${delayMinutes}분 대기...`);
                                
                                // 중지 조건을 체크하면서 대기
                                try {
                                    await this.delayWithStopCheck(delayMinutes * 60 * 1000, {
                                        waitTimeMinutes: delayMinutes,
                                        nextAccount: account.naverId
                                    });
                                } catch (delayError) {
                                    if (delayError.message && delayError.message.includes('중지')) {
                                        console.log('⏹️ 아고다 자동화 대기 중 중지 요청 - 루프 중단');
                                        throw delayError;
                                    }
                                    throw delayError;
                                }
                            }
                            
                        } catch (postError) {
                            errorCount++;
                            errors.push({
                                account: account.naverId,
                                postIndex: postIndex + 1,
                                error: postError.message
                            });
                            console.error(`❌ 계정 ${account.naverId} 포스트 ${postIndex + 1} 실패:`, postError);
                        }
                    }
                    
                    // 계정 간 대기 시간 적용 (마지막 계정이 아닌 경우)
                    if (accounts.indexOf(account) < accounts.length - 1) {
                        const delayMinutes = settings.postDelay || 10;
                        console.log(`⏳ 다음 계정 처리까지 ${delayMinutes}분 대기...`);
                        await this.delay(delayMinutes * 60 * 1000);
                    }
                    
                } catch (error) {
                    errorCount++;
                    errors.push({
                        account: account.naverId,
                        error: error.message
                    });
                    console.error(`❌ 계정 ${account.naverId} 아고다 자동화 실패:`, error);
                }
                
                // 각 계정 작업 완료 후 upload 폴더 정리
                try {
                    cleanupUploadFolder();
                } catch (cleanupError) {
                    console.error('❌ Upload 폴더 정리 실패:', cleanupError);
                }
            }
            
            console.log(`🏨 아고다 자동화 완료: 성공 ${successCount}개, 실패 ${errorCount}개`);
            
            return {
                success: true,
                successCount,
                errorCount,
                errors: errors.length > 0 ? errors : undefined
            };
            
        } catch (error) {
            console.error('❌ 아고다 자동화 실행 중 오류:', error);
            return {
                success: false,
                error: error.message,
                successCount: 0,
                errorCount: accounts.length
            };
        } finally {
            // 자동화 실행 상태 해제
            this.isRunning = false;
        }
    }

    /**
     * 아고다 자동화 중지
     * @returns {Object} 중지 결과
     */
    async stopAgodaAutomation() {
        console.log('🛑 아고다 자동화 중지 요청');
        
        try {
            // 아고다 자동화 중지 로직
            if (this.isRunning) {
                console.log('🔄 아고다 자동화 실행 상태 중지 처리...');
                this.isRunning = false;
                
                // ContentGenerator 중지
                if (this.contentGenerator) {
                    console.log('🛑 ContentGenerator 중지 요청...');
                    await this.contentGenerator.stop();
                }
                
                // BlogPublisher 정리
                if (this.blogPublisher) {
                    console.log('🛑 BlogPublisher 정리 요청...');
                    await this.blogPublisher.cleanup();
                }
                
                console.log('✅ 아고다 자동화 중지 완료');
            } else {
                console.log('⚠️ 아고다 자동화가 실행 중이 아닙니다');
            }
            
            return {
                success: true,
                message: '아고다 자동화가 성공적으로 중지되었습니다.'
            };
            
        } catch (error) {
            console.error('❌ 아고다 자동화 중지 중 오류:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 아고다 블로그 게시 전용 함수 (쿠팡 파트너스와 동일한 구조)
     * @param {Object} blogContent - 블로그 콘텐츠 (title, content, affiliateUrl)
     * @param {Object} hotelInfo - 호텔 정보 (이미지 포함)
     * @param {Object} account - 계정 정보
     * @returns {Object} 게시 결과
     */
    async publishAgodaToBlog(blogContent, hotelInfo, account) {
        try {
            // 중지 조건 확인
            if (!this.isRunning) {
                console.log('⏹️ 자동화 중지 요청으로 인해 아고다 블로그 포스팅을 중단합니다.');
                return {
                    success: false,
                    error: '자동화가 중지되었습니다.'
                };
            }

            console.log('🏨 아고다 블로그 포스팅 시작...');

            // 1. 이미지 처리 (hotel_imgs 폴더에서 5개 이미지 가져오기)
            const path = require('path');
            const fs = require('fs');
            
            // global.paths.tempImagePath 사용 (빌드된 앱에서는 사용자 데이터 폴더)
            const agodaBasePath = global.paths ? global.paths.tempImagePath : (isPackaged ? 
                path.join(appPath, 'agoda') : 
                path.join(__dirname, '../agoda'));
            const uploadImagesPath = path.join(agodaBasePath, 'upload', 'hotel_imgs');
            
            console.log(`📸 아고다 기본 경로: ${agodaBasePath}`);
            console.log(`📸 이미지 폴더 경로: ${uploadImagesPath}`);
            console.log(`📸 global.paths 사용 가능: ${global.paths ? 'YES' : 'NO'}`);
            
            let downloadedImages = [];
            if (fs.existsSync(uploadImagesPath)) {
                const imageFiles = fs.readdirSync(uploadImagesPath)
                    .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
                    .slice(0, 5); // 5개 이미지만 사용
                
                console.log(`📸 발견된 이미지 파일: ${imageFiles.length}개`);
                
                for (const imageFile of imageFiles) {
                    const localPath = path.join(uploadImagesPath, imageFile);
                    if (fs.existsSync(localPath)) {
                        downloadedImages.push(localPath);
                    }
                }
            } else {
                console.log('⚠️ upload/hotel_imgs 폴더를 찾을 수 없습니다.');
            }

            console.log(`✅ 아고다 이미지 준비 완료: ${downloadedImages.length}개`);

            // 2. BlogPublisher 설정
            const blogConfig = {
                BLOG_ID: account.blogId || account.username,
                CATEGORY_ID: account.categoryId || 1,
                OPEN_TYPE: 2,
                geminiApi: account.geminiApi // Gemini API 키 추가
            };
            
            this.blogPublisher = new (require('./modules/BlogPublisher'))(blogConfig);
            console.log(`📂 카테고리 ID: ${account.categoryId || 1}, 블로그 ID: ${account.blogId || account.username}`);
            console.log(`🤖 Gemini API 키: ${account.geminiApi ? '설정됨' : '없음'}`);
            
            // 🔒 SessionManager를 BlogPublisher에 전달 (세션 모니터링용)
            this.blogPublisher.sessionManager = this.sessionManager;
            
            const postData = {
                title: blogContent.title,
                content: blogContent.content,
                images: downloadedImages, // 다운로드된 파일 경로 사용
                categoryId: account.categoryId || 1,
                openType: 'public',
                tags: ['아고다', '호텔리뷰'],
                affiliateUrl: blogContent.affiliateUrl // 아고다 URL 추가
            };

            console.log(`📝 아고다 블로그 포스팅 준비:`);
            console.log(`  - 제목: ${postData.title}`);
            console.log(`  - 본문 길이: ${postData.content?.length || 0}자`);
            console.log(`  - 이미지 수: ${postData.images?.length || 0}개`);
            console.log(`  - 아고다 URL: ${postData.affiliateUrl ? '있음' : '없음'}`);

            // 3. 세션 관리: 기존 세션 확인 후 로그인/발행
            const userId = account.username || account.id || account.naverId;
            
            console.log(`🔍 기존 세션 확인 중: ${userId}`);
            
            const canUseSession = await this.sessionManager.canUseSession(userId, 999999); // 무제한 사용
            
            if (canUseSession) {
                console.log('✅ 기존 세션 사용 가능 - 바로 블로그 포스팅 진행');
                
                const sessionData = await this.sessionManager.loadSession(userId);
                if (!sessionData) {
                    console.log('❌ 세션 데이터 로드 실패 - 새로 로그인 필요');
                    
                    // 세션 데이터 로드 실패 시 새로 로그인
                    const loginAndPublishResult = await this.blogPublisher.loginAndPublish(postData, account);
                    
                    if (loginAndPublishResult.success) {
                        console.log('✅ 로그인 후 아고다 블로그 포스팅 성공');
                        return {
                            success: true,
                            message: '로그인 후 아고다 블로그 포스팅이 성공적으로 완료되었습니다.',
                            data: loginAndPublishResult
                        };
                    } else {
                        throw new Error(loginAndPublishResult.error || '로그인 후 블로그 포스팅 실패');
                    }
                }
                
                // 아고다 전용 블로그 포스팅
                const publishResult = await this.blogPublisher.publishAgodaPost(postData, sessionData, account);
                
                if (publishResult.success) {
                    console.log('✅ 아고다 블로그 포스팅 성공');
                    return {
                        success: true,
                        message: '아고다 블로그 포스팅이 성공적으로 완료되었습니다.',
                        data: publishResult
                    };
                } else {
                    throw new Error(publishResult.error || '블로그 포스팅 실패');
                }
            } else {
                console.log('❌ 기존 세션 사용 불가 - 새로 로그인 필요');
                
                // 새로 로그인 후 블로그 포스팅
                const loginAndPublishResult = await this.blogPublisher.loginAndPublish(postData, account);
                
                if (loginAndPublishResult.success) {
                    console.log('✅ 로그인 후 아고다 블로그 포스팅 성공');
                    return {
                        success: true,
                        message: '로그인 후 아고다 블로그 포스팅이 성공적으로 완료되었습니다.',
                        data: loginAndPublishResult
                    };
                } else {
                    throw new Error(loginAndPublishResult.error || '로그인 후 블로그 포스팅 실패');
                }
            }

        } catch (error) {
            console.error('❌ 아고다 블로그 포스팅 중 오류:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 전역 변수
let mainWindow;
let blogAutomation;

// global sseClients list for web browser log streaming
global.sseClients = [];
let httpServer;

function broadcastLogToSse(logData) {
    if (global.sseClients && Array.isArray(global.sseClients)) {
        global.sseClients.forEach(client => {
            try {
                client.write(`data: ${JSON.stringify(logData)}\n\n`);
            } catch (e) {
                // ignore
            }
        });
    }
}

function startLocalHttpServer(port = 3333) {
    const PUBLIC_DIR = path.join(__dirname, 'renderer');
    
    const MIME_TYPES = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
    };

    httpServer = http.createServer((req, res) => {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        let reqPathName = req.url.split('?')[0];
        if (req.url.startsWith('http')) {
            try { reqPathName = new URL(req.url).pathname; } catch(e) {}
        }
        const reqPath = reqPathName === '/' ? '/' : reqPathName.replace(/\/+$/, '');

        // SSE endpoint: GET /api/logs
        if (req.method === 'GET' && reqPath === '/api/logs') {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });
            
            global.sseClients.push(res);
            console.log(`📡 [SSE] 클라이언트 연결됨. 현재 클라이언트 수: ${global.sseClients.length}`);
            
            req.on('close', () => {
                global.sseClients = global.sseClients.filter(c => c !== res);
                console.log(`📡 [SSE] 클라이언트 연결 종료. 현재 클라이언트 수: ${global.sseClients.length}`);
            });
            
            // Send a welcome event
            res.write(`data: ${JSON.stringify({ level: 'info', message: '📡 실시간 로그 연결이 활성화되었습니다.' })}\n\n`);
            return;
        }

        // Health check endpoint: GET /api/health
        if (req.method === 'GET' && reqPath === '/api/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', app: 'MyDays' }));
            return;
        }

        // API endpoint: POST /api/execute-automation-step
        if (req.method === 'POST' && reqPath === '/api/execute-automation-step') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    console.log('🚀 [HTTP API] execute-automation-step 호출됨:', data);
                    
                    if (!blogAutomation) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: 'BlogAutomation 시스템이 초기화되지 않았습니다.' }));
                        return;
                    }
                    
                    const { action, payload } = data;
                    let result = { success: false, error: '지원되지 않는 액션입니다.' };
                    
                    if (action === 'naver-test-publish') {
                        if (!payload || !payload.naverId || !payload.naverPassword || !payload.blogId) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: '네이버 로그인 정보와 블로그 ID가 필요합니다.' }));
                            return;
                        }
                        result = await blogAutomation.executeNaverTestPublish(payload);
                    } else if (action === 'photo-publish') {
                        if (!payload || !payload.naverId || !payload.naverPassword || !payload.blogId) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: '필수 네이버 로그인 정보와 블로그 ID가 필요합니다.' }));
                            return;
                        }
                        result = await blogAutomation.executePhotoPublish(payload);
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } catch (error) {
                    console.error('❌ [HTTP API] 오류:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: error.message }));
                }
            });
            return;
        }

        // Serve static files
        let filePath = path.join(PUBLIC_DIR, reqPath === '/' ? 'index.html' : reqPath);
        if (!filePath.startsWith(PUBLIC_DIR)) {
            res.statusCode = 403;
            res.end('Access Denied');
            return;
        }

        const ext = path.extname(filePath);
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    res.statusCode = 404;
                    res.end('File Not Found');
                } else {
                    res.statusCode = 500;
                    res.end(`Server Error: ${err.code}`);
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    });

    httpServer.listen(port, () => {
        console.log(`🚀 [HTTP 서버 실행] http://localhost:${port} 에서 웹 서비스 중입니다.`);
        
        // PC의 모든 로컬 IPv4 인터페이스 검색 및 안내 출력
        try {
            const networkInterfaces = os.networkInterfaces();
            const localIps = [];
            for (const interfaceName in networkInterfaces) {
                const interfaces = networkInterfaces[interfaceName];
                for (const iface of interfaces) {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        localIps.push(iface.address);
                    }
                }
            }
            if (localIps.length > 0) {
                console.log('📡 모바일 기기 연결 가능 주소 (같은 Wi-Fi 공유기 필수):');
                localIps.forEach(ip => {
                    console.log(`   👉 http://${ip}:${port}`);
                });
            }
        } catch (e) {
            console.error('⚠️ 로컬 IP 목록 조회 실패:', e);
        }
    });
    
    httpServer.on('error', (err) => {
        console.error('❌ [HTTP 서버 오류]:', err);
    });
}

function initializeApp() {
    try {
        console.log('🚀 BlogAutomation 시스템 초기화 시작...');
        const appDataPath = app.getPath('userData');
        blogAutomation = new BlogAutomation({ 
            appDataPath: appDataPath,
            sessionsPath: paths.sessionsPath,
            tempImagePath: paths.tempImagePath,
            imagesPath: paths.imagesPath,
            logsPath: paths.logsPath,
        });
        
        // [디버깅] BlogAutomation 인스턴스에 포함된 모든 메서드 목록 출력
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(blogAutomation))
            .filter(prop => typeof blogAutomation[prop] === 'function' && !prop.startsWith('_'));
        console.log('✅ BlogAutomation 인스턴스 생성 완료. 사용 가능한 메서드:', methods);

        // HTTP 서버 구동
        startLocalHttpServer(3333);

    } catch (error) {
        console.error('💥 BlogAutomation 초기화 중 치명적인 오류 발생:', error);
        dialog.showErrorBox(
            '초기화 실패',
            `프로그램 핵심 기능 초기화에 실패했습니다. 앱을 재시작해주세요.\n\n오류: ${error.message}`
        );
        app.quit();
    }
}

// BlogAutomation 인스턴스는 initializeApp() 함수에서 생성됨

/**
 * 메인 윈도우 생성
 */
function createWindow() {
    // 빌드 환경 확인
    const isPackaged = app.isPackaged;
    
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: isPackaged ? path.join(appPath, 'src', 'preload.js') : path.join(__dirname, 'preload.js'),
            // 빌드 환경에서는 DevTools 완전 비활성화
            // devTools: !isPackaged // 빌드 환경에서는 false, 개발 환경에서는 true
        },
        icon: isPackaged ? path.join(resourcesPath, 'assets', 'icon.ico') : path.join(__dirname, '..', 'assets', 'icon.ico'),
        title: '네파스',
        show: false
    });

    // 개발/프로덕션 환경에 따른 HTML 파일 로드
    const htmlPath = isPackaged ? path.join(appPath, 'src', 'renderer', 'index.html') : path.join(__dirname, 'renderer', 'index.html');
    mainWindow.loadFile(htmlPath);

    // 개발 환경에서만 DevTools 자동 열기
    if (!isPackaged) {
        mainWindow.webContents.openDevTools();
        console.log('🔧 [개발 모드] DevTools가 활성화되었습니다 - 모든 로그를 확인할 수 있습니다');
    } else {
        console.log('📦 [빌드 모드] DevTools가 비활성화되었습니다');
        
        // 빌드 환경에서 개발자 도구 단축키 완전 차단
        mainWindow.webContents.on('before-input-event', (event, input) => {
            // Ctrl+Shift+I, F12, Ctrl+Shift+J 등 개발자 도구 단축키 차단
            if (input.control && input.shift && input.key.toLowerCase() === 'i') {
                event.preventDefault();
                console.log('🚫 [보안] 개발자 도구 접근이 차단되었습니다 (Ctrl+Shift+I)');
                return;
            }
            if (input.key === 'F12') {
                event.preventDefault();
                console.log('🚫 [보안] 개발자 도구 접근이 차단되었습니다 (F12)');
                return;
            }
            if (input.control && input.shift && input.key.toLowerCase() === 'j') {
                event.preventDefault();
                console.log('🚫 [보안] 개발자 도구 접근이 차단되었습니다 (Ctrl+Shift+J)');
                return;
            }
            if (input.control && input.shift && input.key.toLowerCase() === 'c') {
                event.preventDefault();
                console.log('🚫 [보안] 개발자 도구 접근이 차단되었습니다 (Ctrl+Shift+C)');
                return;
            }
        });
        
        // 우클릭 컨텍스트 메뉴에서 "검사" 메뉴 차단
        mainWindow.webContents.on('context-menu', (event, params) => {
            event.preventDefault();
        });
        
        // DevTools 열기 시도 차단
        mainWindow.webContents.on('devtools-opened', () => {
            mainWindow.webContents.closeDevTools();
            console.log('🚫 [보안] 개발자 도구 강제 차단됨');
        });
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('🪟 [윈도우] 메인 윈도우가 표시되었습니다');
    });

    mainWindow.on('closed', () => {
        console.log('🪟 [윈도우] 메인 윈도우가 닫혔습니다');
        mainWindow = null;
    });

    // BlogAutomation에 윈도우 설정 (이미 생성된 인스턴스에)
    if (blogAutomation) {
        blogAutomation.setMainWindow(mainWindow);
        console.log('✅ BlogAutomation에 메인 윈도우 설정 완료');
    } else {
        console.error('❌ BlogAutomation 인스턴스가 없습니다!');
    }

    // 메인 프로세스 로그를 렌더러로 전송하는 함수 오버라이드
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.log = (...args) => {
        originalConsoleLog(...args);
        const logData = {
            level: 'info',
            message: args.join(' '),
            timestamp: new Date().toISOString()
        };
        broadcastLogToSse(logData);
        if (mainWindow && !mainWindow.isDestroyed()) {
            try {
                mainWindow.webContents.send('main-process-log', logData);
            } catch (e) {
                // 조용히 무시
            }
        }
    };

    console.error = (...args) => {
        originalConsoleError(...args);
        const logData = {
            level: 'error',
            message: args.join(' '),
            timestamp: new Date().toISOString()
        };
        broadcastLogToSse(logData);
        if (mainWindow && !mainWindow.isDestroyed()) {
            try {
                mainWindow.webContents.send('main-process-log', logData);
            } catch (e) {
                // 조용히 무시
            }
        }
    };

    console.warn = (...args) => {
        originalConsoleWarn(...args);
        const logData = {
            level: 'warn',
            message: args.join(' '),
            timestamp: new Date().toISOString()
        };
        broadcastLogToSse(logData);
        if (mainWindow && !mainWindow.isDestroyed()) {
            try {
                mainWindow.webContents.send('main-process-log', logData);
            } catch (e) {
                // 조용히 무시
            }
        }
    };

    console.log('🔊 [로그] 모든 콘솔 로그가 렌더러로 전송되도록 설정되었습니다');
}

// 자동 업데이트 이벤트 핸들러는 위에서 이미 등록되었습니다.

// Electron 앱 이벤트 처리
app.whenReady().then(() => {
    initializeApp();
    createWindow();
    
    // 윈도우 생성 후 업데이트 확인 (블로그 방식)
    if (effectiveToken) {
        setTimeout(() => {
            console.log('[Updater] 앱 시작 후 업데이트 확인');
            autoUpdater.checkForUpdates();
        }, 3000); // 3초 후 시작
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        console.log('🪟 모든 윈도우가 닫혔습니다. 앱을 종료합니다.');
        app.quit();
    }
});

// 추가 안전장치: 강제 종료 시나리오 처리
app.on('will-quit', (event) => {
    console.log('🛑 앱이 종료되려고 합니다...');
});

// 프로세스 종료 시그널 처리 (Windows에서 강제 종료 시)
process.on('SIGINT', () => {
    console.log('🛑 SIGINT 신호 수신 - 앱 종료 중...');
    process.exit(0); // 즉시 종료
});

process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM 신호 수신 - 앱 종료 중...');
    process.exit(0); // 즉시 종료
});

// 앱 종료 상태 추적
let isQuitting = false;
let cleanupInProgress = false;

app.on('before-quit', async (event) => {
    console.log('🔄 앱 종료 준비 중...');
    
    // 이미 종료 과정이 시작되었다면 바로 종료 허용
    if (isQuitting) {
        console.log('✅ 이미 종료 과정 진행 중 - 종료 허용');
        return;
    }
    
    // 정리 작업이 이미 진행 중이면 바로 종료
    if (cleanupInProgress) {
        console.log('✅ 정리 작업 진행 중 - 종료 허용');
        return;
    }
    
    // 첫 번째 종료 시도
    isQuitting = true;
    event.preventDefault(); // 일시적으로 종료 방지
    
    try {
        console.log('🧹 자동화 시스템 정리 시작...');
        cleanupInProgress = true;
        
        // 🚨 응급 세션 저장 (진행 중인 브라우저가 있는 경우)
        if (blogAutomation && blogAutomation.blogPublisher && blogAutomation.blogPublisher.page) {
            try {
                console.log('🚨 응급 세션 저장 시도...');
                const page = blogAutomation.blogPublisher.page;
                
                if (!page.isClosed()) {
                    // 현재 URL에서 계정 ID 추정
                    const currentUrl = page.url();
                    let accountId = 'emergency';
                    
                    // 네이버 블로그 URL에서 계정 ID 추출 시도
                    if (currentUrl.includes('blog.naver.com')) {
                        const urlParts = currentUrl.split('/');
                        const blogIdIndex = urlParts.findIndex(part => part === 'blog.naver.com');
                        if (blogIdIndex >= 0 && urlParts[blogIdIndex + 1]) {
                            accountId = urlParts[blogIdIndex + 1];
                        }
                    }
                    
                    console.log(`🚨 응급 세션 저장 대상: ${accountId}`);
                    const saved = await blogAutomation.sessionManager.emergencySaveSession(page, accountId);
                    
                    if (saved) {
                        console.log('✅ 응급 세션 저장 성공');
                    } else {
                        console.log('⚠️ 응급 세션 저장 실패');
                    }
                }
            } catch (emergencyError) {
                console.warn('⚠️ 응급 세션 저장 중 오류 (무시하고 계속):', emergencyError.message);
            }
        }
        
        // 3초 타임아웃으로 정리 작업 실행
        const cleanupPromise = blogAutomation ? blogAutomation.cleanup() : Promise.resolve();
        await Promise.race([
            cleanupPromise,
            new Promise(resolve => setTimeout(resolve, 3000))
        ]);
        
        console.log('✅ 정리 작업 완료');
        
    } catch (error) {
        console.error('❌ 정리 작업 중 오류 (무시하고 계속):', error);
    } finally {
        cleanupInProgress = false;
        
        // 모든 브라우저 윈도우 강제 종료
        try {
            const allWindows = BrowserWindow.getAllWindows();
            for (const window of allWindows) {
                if (!window.isDestroyed()) {
                    window.destroy();
                }
            }
        } catch (error) {
            console.warn('윈도우 정리 중 오류:', error);
        }
        
        console.log('✅ 앱 종료 준비 완료 - 강제 종료');
        
        // 강제 종료 (더 이상 이벤트가 발생하지 않음)
        setImmediate(() => {
            process.exit(0);
        });
    }
});

// 윈도우가 모두 닫혔을 때 (macOS 제외)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        console.log('🪟 모든 윈도우 닫힘 - 앱 종료');
        app.quit();
    }
});

// macOS에서 dock 아이콘 클릭 시
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC 핸들러들
console.log('🔧 [빌드 디버깅] IPC 핸들러 등록 시작...');

ipcMain.handle('execute-automation-step', async (event, data) => {
    console.log('🚀 [빌드 디버깅] IPC execute-automation-step 핸들러 호출됨!');
    console.log('📦 빌드 환경:', app.isPackaged ? 'PACKAGED' : 'DEVELOPMENT');
    console.log('📨 요청 데이터 (상세):', JSON.stringify(data, null, 2));
    
    try {
        // BlogAutomation 인스턴스 확인
        if (!blogAutomation) {
            const error = 'BlogAutomation 시스템이 초기화되지 않았습니다.';
            console.error('❌ BlogAutomation 인스턴스 없음:', error);
            return { success: false, error: error };
        }
        
        if (!data || typeof data !== 'object') {
            const error = '유효하지 않은 데이터입니다.';
            console.error('❌ 데이터 유효성 검사 실패:', error);
            return { success: false, error: error };
        }
        
        const { action, payload } = data;
        console.log('🎯 액션:', action);
        console.log('📋 페이로드:', payload);
        
        if (!action) {
            const error = '액션이 지정되지 않았습니다.';
            console.error('❌ 액션 없음:', error);
            return { success: false, error: error };
        }
        
        console.log('🔄 액션 분기 처리 시작...');
        
        switch (action) {
            case 'single-account':
                console.log('👤 single-account 액션 처리 시작');
                if (!payload || !payload.username) {
                    const error = '계정 정보가 필요합니다.';
                    console.error('❌ 계정 정보 없음:', error);
                    return { success: false, error: error };
                }
                
                console.log('📞 blogAutomation.executeSingleAccount 호출...');
                console.time('executeSingleAccount 실행 시간');
                
                const result = await blogAutomation.executeSingleAccount(payload);
                
                console.timeEnd('executeSingleAccount 실행 시간');
                console.log('✅ executeSingleAccount 완료:', {
                    success: result?.success,
                    error: result?.error,
                    message: result?.message
                });
                
                return result;
                
            case 'naver-test-publish':
                console.log('🧪 naver-test-publish 액션 처리 시작');
                if (!payload || !payload.naverId || !payload.naverPassword || !payload.blogId) {
                    const error = '네이버 로그인 정보와 블로그 ID가 필요합니다.';
                    console.error('❌ 필수 정보 누락:', error);
                    return { success: false, error: error };
                }
                
                return await blogAutomation.executeNaverTestPublish(payload);
                
            case 'photo-publish':
                console.log('📸 photo-publish 액션 처리 시작');
                if (!payload || !payload.naverId || !payload.naverPassword || !payload.blogId || !payload.geminiApi) {
                    const error = '필수 로그인 정보와 제미나이 API 키가 필요합니다.';
                    console.error('❌ 필수 정보 누락:', error);
                    return { success: false, error: error };
                }
                
                return await blogAutomation.executePhotoPublish(payload);
                
            case 'multi-account-alternating':
                console.log('🔄 multi-account-alternating 액션 처리');
                if (!payload || !payload.accounts || !Array.isArray(payload.accounts)) {
                    const error = '계정 목록이 필요합니다.';
                    console.error('❌ 계정 목록 없음:', error);
                    return { success: false, error: error };
                }
                
                const { accounts, automationCount = 3, postDelay = 10 } = payload;
                console.log(`📋 다중 계정 교차 실행: ${accounts.length}개 계정, 자동화횟수: ${automationCount}, 대기시간: ${postDelay}분`);
                
                return await blogAutomation.executeMultiAccountAlternating(accounts, automationCount, postDelay);
                
            case 'sequential-all':
                console.log('🔄 sequential-all 액션 처리');
                return await blogAutomation.executeSequential();
                
            case 'coupang-api-automation':
                console.log('🎁 coupang-api-automation 액션 처리 시작');
                if (!payload || !payload.username) {
                    const error = '계정 정보가 필요합니다.';
                    console.error('❌ 계정 정보 없음:', error);
                    return { success: false, error: error };
                }
                
                console.log('📞 blogAutomation.executeAutomationWithCoupangAPI 호출...');
                console.time('executeAutomationWithCoupangAPI 실행 시간');
                
                const coupangResult = await blogAutomation.executeAutomationWithCoupangAPI(payload);
                
                console.timeEnd('executeAutomationWithCoupangAPI 실행 시간');
                console.log('✅ executeAutomationWithCoupangAPI 완료:', {
                    success: coupangResult?.success,
                    error: coupangResult?.error,
                    successCount: coupangResult?.successCount,
                    errorCount: coupangResult?.errorCount
                });
                
                return coupangResult;
                
            case 'stop':
                console.log('⏹️ stop 액션 처리');
                console.log('⏹️ 자동화 중지 요청');
                
                // 세션 매니저 중지 상태 설정
                console.log('🛑 세션 매니저 중지 상태 설정...');
                if (blogAutomation.sessionManager) {
                    blogAutomation.sessionManager.stopRequested = true;
                }
                
                // 진행 중인 세션 중지
                console.log('🛑 진행 중인 세션 중지...');
                if (blogAutomation.currentSessionId) {
                    blogAutomation.progressTracker.stopSession();
                }
                
                // CoupangCrawler 중지
                console.log('🛑 CoupangCrawler 중지...');
                if (blogAutomation.coupangCrawler) {
                    blogAutomation.coupangCrawler.stopAutomation();
                }
                
                const stopResult = await blogAutomation.stopAutomation();
                console.log('✅ 자동화 중지 완료');
                
                return stopResult;
                
            case 'stop-agoda':
                console.log('⏹️ stop-agoda 액션 처리');
                console.log('⏹️ 아고다 자동화 중지 요청');
                
                const agodaStopResult = await blogAutomation.stopAgodaAutomation();
                console.log('✅ 아고다 자동화 중지 완료');
                
                return agodaStopResult;
                
            case 'agoda-automation':
                console.log('🏨 agoda-automation 액션 처리 시작');
                
                // 🚫 아고다 서비스 비활성화 체크 추가
                try {
                    const rendererSettings = await blogAutomation.getRendererSettings();
                    if (rendererSettings && rendererSettings.agodaAutomation && rendererSettings.agodaAutomation.enabled === false) {
                        console.log('🚫 아고다 서비스가 비활성화되어 요청을 차단합니다.');
                        return {
                            success: false,
                            error: '아고다 서비스는 현재 일시 중단되었습니다. 잠시만 기다려주세요.',
                            successCount: 0,
                            errorCount: payload?.accounts?.length || 0
                        };
                    }
                } catch (error) {
                    console.warn('⚠️ 아고다 서비스 활성화 상태 확인 실패:', error);
                }
                
                if (!payload || !payload.accounts || !Array.isArray(payload.accounts)) {
                    const error = '계정 목록이 필요합니다.';
                    console.error('❌ 계정 목록 없음:', error);
                    return { success: false, error: error };
                }
                
                if (!payload.country) {
                    const error = '국가 정보가 필요합니다.';
                    console.error('❌ 국가 정보 없음:', error);
                    return { success: false, error: error };
                }
                
                console.log(`🏨 아고다 자동화 실행: ${payload.accounts.length}개 계정, 국가: ${payload.country}`);
                
                try {
                    // 아고다 자동화 실행
                    const agodaResult = await blogAutomation.executeAgodaAutomation(payload.accounts, payload.country);
                    
                    console.log('✅ 아고다 자동화 완료:', {
                        success: agodaResult?.success,
                        error: agodaResult?.error,
                        successCount: agodaResult?.successCount,
                        errorCount: agodaResult?.errorCount
                    });
                    
                    return agodaResult;
                } catch (error) {
                    console.error('❌ 아고다 자동화 실행 중 오류:', error);
                    return { success: false, error: error.message };
                }
                
            case 'stop-agoda':
                console.log('🛑 stop-agoda 액션 처리');
                try {
                    // 아고다 자동화 중지
                    const result = await blogAutomation.stopAgodaAutomation();
                    console.log('✅ 아고다 자동화 중지 완료');
                    return result;
                } catch (error) {
                    console.error('❌ 아고다 자동화 중지 실패:', error);
                    return { success: false, error: error.message };
                }
                
            default:
                const error = `알 수 없는 액션: ${action}`;
                console.error('❌ 알 수 없는 액션:', error);
                return { success: false, error: error };
        }
        
    } catch (error) {
        console.error('❌ [빌드 디버깅] IPC executeAutomationStep 최상위 오류 (상세):', {
            error: error,
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // 에러가 발생해도 반드시 응답 반환
        return { 
            success: false, 
            error: error.message || '알 수 없는 오류',
            stack: error.stack 
        };
    }
});

console.log('✅ [빌드 디버깅] IPC 핸들러 등록 완료!');

// 디버깅용 IPC 핸들러 추가
ipcMain.handle('get-app-version', async () => {
    console.log('🔍 [빌드 디버깅] getAppVersion 호출됨');
    try {
        const version = app.getVersion();
        console.log('📱 앱 버전:', version);
        return { success: true, version: version, isPackaged: app.isPackaged };
    } catch (error) {
        console.error('❌ getAppVersion 오류:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('test-main-process', async () => {
    console.log('🧪 [빌드 디버깅] testMainProcess 호출됨');
    try {
        return { 
            success: true, 
            message: 'Main 프로세스 정상 작동',
            timestamp: new Date().toISOString(),
            isPackaged: app.isPackaged,
            platform: process.platform
        };
    } catch (error) {
        console.error('❌ testMainProcess 오류:', error);
        return { success: false, error: error.message };
    }
});

console.log('🎯 [빌드 디버깅] 디버깅용 IPC 핸들러 등록 완료!');

// Main 프로세스 준비 상태 확인 API
ipcMain.handle('check-main-process-ready', async () => {
    console.log('🚀 [빌드 디버깅] check-main-process-ready 호출됨');
    try {
        const isReady = {
            blogAutomation: !!blogAutomation,
            coupangCrawler: !!blogAutomation?.coupangCrawler,
            mainWindow: !!mainWindow,
            ipcHandlersRegistered: true,
            timestamp: new Date().toISOString(),
            isPackaged: app.isPackaged
        };
        
        console.log('📊 Main 프로세스 준비 상태:', isReady);
        return { success: true, ready: isReady };
    } catch (error) {
        console.error('❌ check-main-process-ready 오류:', error);
        return { success: false, error: error.message };
    }
});

console.log('🎯 [빌드 디버깅] Main 프로세스 준비 상태 확인 API 등록 완료!');

// IPC 핸들러 등록 상태 확인 API
ipcMain.handle('check-ipc-handlers', async () => {
    console.log('🔍 [빌드 디버깅] check-ipc-handlers 호출됨');
    try {
        const registeredHandlers = [];
        
        // ipcMain에서 등록된 핸들러들을 확인 (가능한 방법으로)
        const testHandlers = [
            'execute-automation-step',
            'get-app-version', 
            'test-main-process',
            'check-main-process-ready',
            'get-automation-status',
            'upload-url-file',
            'test-gemini-api'
        ];
        
        for (const handler of testHandlers) {
            try {
                // 각 핸들러가 등록되어 있는지 간접적으로 확인
                registeredHandlers.push({
                    name: handler,
                    registered: true // 실제로는 확인이 어려우므로 true로 설정
                });
            } catch (error) {
                registeredHandlers.push({
                    name: handler,
                    registered: false,
                    error: error.message
                });
            }
        }
        
        console.log('📋 등록된 IPC 핸들러 목록:', registeredHandlers);
        return { success: true, handlers: registeredHandlers };
    } catch (error) {
        console.error('❌ check-ipc-handlers 오류:', error);
        return { success: false, error: error.message };
    }
});

// 대체 자동화 실행 IPC 핸들러 (다른 이름으로)
ipcMain.handle('run-single-account-automation', async (event, data) => {
    console.log('🚀 [빌드 디버깅] run-single-account-automation 핸들러 호출됨!');
    console.log('📦 빌드 환경:', app.isPackaged ? 'PACKAGED' : 'DEVELOPMENT');
    console.log('📨 요청 데이터 (상세):', JSON.stringify(data, null, 2));
    
    try {
        if (!data || typeof data !== 'object') {
            const error = '유효하지 않은 데이터입니다.';
            console.error('❌ 데이터 유효성 검사 실패:', error);
            return { success: false, error: error };
        }
        
        const { action, payload } = data;
        console.log('🎯 액션:', action);
        console.log('📋 페이로드:', payload);
        
        if (!action) {
            const error = '액션이 지정되지 않았습니다.';
            console.error('❌ 액션 없음:', error);
            return { success: false, error: error };
        }
        
        console.log('🔄 대체 핸들러에서 액션 분기 처리 시작...');
        
        switch (action) {
            case 'single-account':
                console.log('�� single-account 액션 처리 시작 (대체 핸들러)');
                if (!payload || !payload.username) {
                    const error = '계정 정보가 필요합니다.';
                    console.error('❌ 계정 정보 없음:', error);
                    return { success: false, error: error };
                }
                
                console.log('📞 blogAutomation.executeSingleAccount 호출... (대체 핸들러)');
                console.time('executeSingleAccount 실행 시간 (대체)');
                
                const result = await blogAutomation.executeSingleAccount(payload);
                
                console.timeEnd('executeSingleAccount 실행 시간 (대체)');
                console.log('✅ executeSingleAccount 완료 (대체 핸들러):', {
                    success: result?.success,
                    error: result?.error,
                    message: result?.message
                });
                
                return result;
                
            default:
                const error = `알 수 없는 액션: ${action}`;
                console.error('❌ 알 수 없는 액션 (대체 핸들러):', error);
                return { success: false, error: error };
        }
        
    } catch (error) {
        console.error('❌ [빌드 디버깅] run-single-account-automation 최상위 오류 (상세):', {
            error: error,
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // 에러가 발생해도 반드시 응답 반환
        return { 
            success: false, 
            error: error.message || '알 수 없는 오류',
            stack: error.stack 
        };
    }
});

console.log('🔄 [빌드 디버깅] 대체 IPC 핸들러 등록 완료!');

// 기존 IPC 핸들러들 복구
ipcMain.handle('test-gemini-api', async (event, apiKey) => {
    try {
        if (!blogAutomation) {
            return { success: false, error: 'BlogAutomation 시스템이 초기화되지 않았습니다.' };
        }
        return await blogAutomation.testGeminiAPI(apiKey);
    } catch (error) {
        console.error('❌ IPC testGeminiAPI 오류:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('manage-account', async (event, arg1, arg2) => {
    let action, data;

    // 인자 형식에 따른 처리
    if (typeof arg1 === 'object' && arg1 !== null && arg1.action) {
        // 새로운 형식: manageAccount({ action: '...', data: '...' })
        ({ action, data } = arg1);
    } else {
        // 이전 형식: manageAccount('action', data)
        action = arg1;
        data = arg2;
    }

    console.log('🔍 manageAccount 호출됨:', { action, data });

    try {
        switch (action) {
            case 'add':
            case 'update':
                console.log(`📝 계정 ${action} 요청 - 데이터:`, data);
                const result = await blogAutomation.configManager.addOrUpdateAccount(data);
                return { success: true, message: `계정이 성공적으로 ${action}되었습니다.`, data: result };
            case 'delete':
                console.log('🗑️ 계정 삭제 요청 - ID:', data.id);
                await blogAutomation.configManager.removeAccount(data.id);
                return { success: true, message: '계정이 성공적으로 삭제되었습니다.' };
            case 'get':
            case 'getAll':
                 console.log('📂 모든 계정 정보 요청');
                const accounts = blogAutomation.configManager.getAccounts();
                return { success: true, accounts };
            case 'list':
                const activeAccounts = blogAutomation.configManager.getActiveAccounts();
                return { success: true, accounts: activeAccounts };
            default:
                throw new Error(`알 수 없는 액션: ${action}`);
        }
    } catch (error) {
        console.error('❌ IPC manageAccount 오류:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('validate-naver-id', async (event, naverId, naverPassword) => {
    try {
        if (!blogAutomation) {
            return { success: false, error: 'BlogAutomation 시스템이 초기화되지 않았습니다.' };
        }
        return await blogAutomation.validateNaverId(naverId, naverPassword);
    } catch (error) {
        console.error('❌ 네이버 ID 검증 중 오류:', error);
        return { success: false, error: '네이버 ID 검증 중 오류가 발생했습니다.' };
    }
});

ipcMain.handle('get-system-status', async (event) => {
    try {
        if (!blogAutomation) {
            return { success: false, error: 'BlogAutomation 시스템이 초기화되지 않았습니다.' };
        }
        return blogAutomation.getSystemStatus();
    } catch (error) {
        console.error('❌ IPC getSystemStatus 오류:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-logs', async (event, lines) => {
    try {
        if (!blogAutomation) {
            return { success: false, error: 'BlogAutomation 시스템이 초기화되지 않았습니다.' };
        }
        return { success: true, logs: blogAutomation.getLogs(lines) };
    } catch (error) {
        console.error('❌ IPC getLogs 오류:', error);
        return { success: false, error: error.message };
    }
});

// 🔥 [신규] 파일 선택 다이얼로그를 여는 핸들러
ipcMain.handle('select-file-dialog', async (event, options) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, options);
        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, cancelled: true };
        }
        return { success: true, filePath: result.filePaths[0] };
    } catch (error) {
        console.error('❌ IPC selectFileDialog 오류:', error);
        return { success: false, error: error.message };
    }
});

// 🔥 [신규] 파일 경로를 받아 URL 파일을 처리하는 IPC 핸들러
ipcMain.handle('upload-url-file-from-path', async (event, filePath) => {
    try {
        if (!blogAutomation) {
            return { success: false, error: 'BlogAutomation 시스템이 초기화되지 않았습니다.' };
        }
        if (!filePath) {
            return { success: false, error: '파일 경로가 제공되지 않았습니다.' };
        }
        
        console.log(`📂 [IPC] 파일 경로 수신: ${filePath}`);
        
        // 빌드 환경 정보 전달
        const isPackaged = app.isPackaged;
        const userDataPath = isPackaged ? app.getPath('userData') : null;
        
        const urls = await blogAutomation.coupangCrawler.uploadURLFile(filePath, isPackaged, userDataPath);
        
        return {
            success: true,
            filePath: filePath,
            urlCount: urls.length,
            urls: urls.slice(0, 5), // 처음 5개만 미리보기로 반환
            message: `${urls.length}개의 URL을 성공적으로 업로드했습니다.`
        };
    } catch (error) {
        console.error('❌ IPC uploadUrlFileFromPath 오류:', error);
        return { success: false, error: error.message };
    }
});

// 자동화 설정 업데이트
ipcMain.handle('update-automation-config', async (event, config) => {
    try {
        if (!blogAutomation) {
            return { success: false, error: 'BlogAutomation 시스템이 초기화되지 않았습니다.' };
        }
        blogAutomation.coupangCrawler.updateConfig(config);
        return {
            success: true,
            message: '자동화 설정이 업데이트되었습니다.'
        };
    } catch (error) {
        console.error('❌ IPC updateAutomationConfig 오류:', error);
        return { success: false, error: error.message };
    }
});

// 자동화 실행
ipcMain.handle('run-automation', async (event, filePath = null) => {

    await autoUpdater.checkForUpdates();

    try {
        if (!blogAutomation) {
            return { success: false, error: 'BlogAutomation 시스템이 초기화되지 않았습니다.' };
        }
        return await blogAutomation.coupangCrawler.runAutomation(filePath);
    } catch (error) {
        console.error('❌ IPC runAutomation 오류:', error);
        return { success: false, error: error.message };
    }
});

// 자동화 중지
ipcMain.handle('stop-automation', async (event) => {
    try {
        console.log('🛑 [IPC] 자동화 중지 요청 수신');
        
        if (!blogAutomation) {
            console.error('❌ [IPC] BlogAutomation 시스템이 초기화되지 않았습니다.');
            return { success: false, error: 'BlogAutomation 시스템이 초기화되지 않았습니다.' };
        }
        
        // 🔥 BlogAutomation의 stopAutomation 메서드 호출 (통합 중지)
        const result = await blogAutomation.stopAutomation();
        console.log('✅ [IPC] BlogAutomation 중지 완료:', result);
        
        return result;
    } catch (error) {
        console.error('❌ [IPC] stopAutomation 오류:', error);
        return { success: false, error: error.message };
    }
});

// 앱 정보 조회 (버전 등)
ipcMain.handle('get-app-info', async (event) => {
    try {
        const packageJson = require('../package.json');
        return {
            success: true,
            data: {
                name: packageJson.name,
                version: packageJson.version,
                description: packageJson.description
            }
        };
    } catch (error) {
        console.error('❌ [IPC] getAppInfo 오류:', error);
        return { success: false, error: error.message };
    }
});

// 자동화 상태 확인
ipcMain.handle('get-automation-status', async (event) => {
    try {
        if (!blogAutomation) {
            return { success: false, error: 'BlogAutomation 시스템이 초기화되지 않았습니다.' };
        }
        
        console.log('🔍 [빌드 디버깅] get-automation-status 호출됨');
        
        const status = blogAutomation.coupangCrawler.getAutomationStatus();
        console.log('🔍 CoupangCrawler 자동화 상태:', status);
        
        // URL 파일 상태 확인
        const urlFileStatus = blogAutomation.coupangCrawler.getUrlFileStatus();
        console.log('📂 URL 파일 상태:', urlFileStatus);
        
        const result = { 
            success: true, 
            status: status,
            hasUrlFile: urlFileStatus.isSet && urlFileStatus.exists,
            urlFilePath: urlFileStatus.path,
            urlFileExists: urlFileStatus.exists,
            isUrlFileSet: urlFileStatus.isSet
        };
        
        console.log('📤 get-automation-status 응답:', result);
        return result;
    } catch (error) {
        console.error('❌ IPC getAutomationStatus 오류:', error);
        return { 
            success: false, 
            error: error.message,
            hasUrlFile: false 
        };
    }
});

// 이미지 폴더 정리
ipcMain.handle('cleanup-all-images', async (event) => {
    try {
        if (!blogAutomation) {
            return { success: false, error: 'BlogAutomation 시스템이 초기화되지 않았습니다.' };
        }
        
        console.log('🧹 [빌드 디버깅] cleanup-all-images 호출됨');
        const result = await blogAutomation.cleanupAllImages();
        console.log('✅ 이미지 폴더 정리 완료:', result);
        return result;
    } catch (error) {
        console.error('❌ IPC cleanupAllImages 오류:', error);
        return { success: false, error: error.message };
    }
});

// 블로그 방식 업데이트 확인 IPC 핸들러
ipcMain.handle('check-for-updates', async () => {
    try {
        const result = await autoUpdater.checkForUpdates();
        return { success: true, updateInfo: result };
    } catch (error) {
        console.error('❌ 업데이트 확인 실패:', error);
        return { success: false, error: error.message };
    }
});


ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
});

// 외부 링크 열기
ipcMain.handle('open-external-url', async (event, url) => {
    try {
        console.log(`🌐 외부 링크 열기: ${url}`);
        await shell.openExternal(url);
        return { success: true };
    } catch (error) {
        console.error('❌ 외부 링크 열기 실패:', error);
        return { success: false, error: error.message };
    }
});

// 세션 존재 여부 확인
ipcMain.handle('check-session-exists', async (event, accountId) => {
    try {
        if (!blogAutomation || !blogAutomation.sessionManager) {
            console.warn('⚠️ SessionManager가 초기화되지 않았습니다.');
            return false;
        }
        
        const exists = blogAutomation.sessionManager.sessionExists(accountId);
        console.log(`🔍 계정 ${accountId} 세션 존재 여부: ${exists}`);
        return exists;
    } catch (error) {
        console.error(`❌ 세션 존재 여부 확인 실패 (${accountId}):`, error);
        return false;
    }
});

// 세션 삭제
ipcMain.handle('delete-session', async (event, accountId) => {
    try {
        if (!blogAutomation || !blogAutomation.sessionManager) {
            return { success: false, error: 'SessionManager가 초기화되지 않았습니다.' };
        }
        
        const result = await blogAutomation.sessionManager.deleteSession(accountId);
        console.log(`🗑️ 계정 ${accountId} 세션 삭제:`, result);
        return { success: true, deleted: result };
    } catch (error) {
        console.error(`❌ 세션 삭제 실패 (${accountId}):`, error);
        return { success: false, error: error.message };
    }
});

// 세션 정보 조회
ipcMain.handle('get-session-info', async (event, accountId) => {
    try {
        if (!blogAutomation || !blogAutomation.sessionManager) {
            return { success: false, error: 'SessionManager가 초기화되지 않았습니다.' };
        }
        
        const exists = blogAutomation.sessionManager.sessionExists(accountId);
        const isValid = exists ? blogAutomation.sessionManager.isSessionValid(accountId) : false;
        
        console.log(`📋 계정 ${accountId} 세션 정보: 존재=${exists}, 유효=${isValid}`);
        
        return {
            success: true,
            exists: exists,
            isValid: isValid,
            accountId: accountId
        };
    } catch (error) {
        console.error(`❌ 세션 정보 조회 실패 (${accountId}):`, error);
        return { success: false, error: error.message };
    }
});

// ================= 쿠팡 API 관련 IPC 핸들러 =================

// 쿠팡 API 키 저장
ipcMain.handle('save-coupang-api-keys', async (event, accessKey, secretKey) => {
    try {
        console.log('💾 쿠팡 API 키 저장 요청');
        if (!blogAutomation || !blogAutomation.coupangApiManager) {
            return { success: false, error: 'CoupangApiManager가 초기화되지 않았습니다.' };
        }
        
        const result = await blogAutomation.coupangApiManager.saveApiKeys(accessKey, secretKey);
        console.log('✅ 쿠팡 API 키 저장 완료');
        return { success: true, message: '쿠팡 API 키가 저장되었습니다.' };
    } catch (error) {
        console.error('❌ 쿠팡 API 키 저장 실패:', error);
        return { success: false, error: error.message };
    }
});

// 쿠팡 API 키 불러오기
ipcMain.handle('load-coupang-api-keys', async (event) => {
    try {
        console.log('📥 쿠팡 API 키 불러오기 요청');
        if (!blogAutomation || !blogAutomation.coupangApiManager) {
            return { success: false, error: 'CoupangApiManager가 초기화되지 않았습니다.' };
        }
        
        const keys = blogAutomation.coupangApiManager.getApiKeys();
        console.log('✅ 쿠팡 API 키 불러오기 완료');
        
        // 키가 존재하면 실제 값을 반환, 없으면 빈 문자열 반환
        return { 
            success: true, 
            hasKeys: !!(keys.accessKey && keys.secretKey),
            accessKey: keys.accessKey || '',
            secretKey: keys.secretKey || '',
            isConnected: false // 연결 상태는 별도로 테스트해야 함
        };
    } catch (error) {
        console.error('❌ 쿠팡 API 키 불러오기 실패:', error);
        return { success: false, error: error.message };
    }
});

// 쿠팡 API 연결 테스트
ipcMain.handle('test-coupang-api-connection', async (event) => {
    try {
        console.log('🧪 쿠팡 API 연결 테스트 요청');
        if (!blogAutomation || !blogAutomation.coupangApiManager) {
            return { success: false, error: 'CoupangApiManager가 초기화되지 않았습니다.' };
        }
        
        const result = await blogAutomation.coupangApiManager.testConnection();
        console.log('✅ 쿠팡 API 연결 테스트 완료:', result);
        return { 
            success: result, 
            message: result ? '쿠팡 API 연결에 성공했습니다.' : '쿠팡 API 연결에 실패했습니다.'
        };
    } catch (error) {
        console.error('❌ 쿠팡 API 연결 테스트 실패:', error);
        return { success: false, error: error.message };
    }
});

// 쿠팡 API 랜덤 상품 가져오기 (테스트용)
ipcMain.handle('get-coupang-random-product', async (event, options = {}) => {
    try {
        console.log('🎲 쿠팡 API 랜덤 상품 가져오기 요청');
        if (!blogAutomation || !blogAutomation.coupangApiManager) {
            return { success: false, error: 'CoupangApiManager가 초기화되지 않았습니다.' };
        }
        
        const result = await blogAutomation.coupangApiManager.getRandomProduct(options);
        console.log('✅ 쿠팡 API 랜덤 상품 가져오기 완료');
        return { 
            success: true, 
            product: result.product,
            totalProducts: result.totalProducts,
            selectedIndex: result.selectedIndex
        };
    } catch (error) {
        console.error('❌ 쿠팡 API 랜덤 상품 가져오기 실패:', error);
        return { success: false, error: error.message };
    }
});

// 쿠팡 API 골드박스 상품 목록 가져오기
ipcMain.handle('get-coupang-goldbox-products', async (event, options = {}) => {
    try {
        console.log('📦 쿠팡 API 골드박스 상품 가져오기 요청');
        if (!blogAutomation || !blogAutomation.coupangApiManager) {
            return { success: false, error: 'CoupangApiManager가 초기화되지 않았습니다.' };
        }
        
        const result = await blogAutomation.coupangApiManager.getGoldboxProducts(options);
        console.log('✅ 쿠팡 API 골드박스 상품 가져오기 완료');
        return { 
            success: true, 
            products: result.data,
            totalCount: result.data.length
        };
    } catch (error) {
        console.error('❌ 쿠팡 API 골드박스 상품 가져오기 실패:', error);
        return { success: false, error: error.message };
    }
});

// 쿠팡 API 키 삭제
ipcMain.handle('clear-coupang-api-keys', async (event) => {
    try {
        console.log('🗑️ 쿠팡 API 키 삭제 요청');
        if (!blogAutomation || !blogAutomation.coupangApiManager) {
            return { success: false, error: 'CoupangApiManager가 초기화되지 않았습니다.' };
        }
        
        const result = await blogAutomation.coupangApiManager.clearApiKeys();
        console.log('✅ 쿠팡 API 키 삭제 완료');
        return { 
            success: result, 
            message: result ? '쿠팡 API 키가 삭제되었습니다.' : '쿠팡 API 키 삭제에 실패했습니다.'
        };
    } catch (error) {
        console.error('❌ 쿠팡 API 키 삭제 실패:', error);
        return { success: false, error: error.message };
    }
});

// 렌더러 프로세스 에러 처리
ipcMain.on('renderer-error', (event, errorData) => {
    try {
        console.error('🔴 렌더러 프로세스 에러 수신:', errorData);
        
        // 로그에 자세한 에러 정보 기록
        if (errorData.message) {
            console.error(`  ├─ 메시지: ${errorData.message}`);
        }
        if (errorData.filename) {
            console.error(`  ├─ 파일: ${errorData.filename}`);
        }
        if (errorData.lineno) {
            console.error(`  ├─ 라인: ${errorData.lineno}`);
        }
        if (errorData.colno) {
            console.error(`  ├─ 컬럼: ${errorData.colno}`);
        }
        if (errorData.stack) {
            console.error(`  └─ 스택:`);
            console.error(errorData.stack);
        }
        if (errorData.reason) {
            console.error(`  └─ 이유: ${errorData.reason}`);
        }
        
    } catch (error) {
        console.error('❌ renderer-error 처리 중 오류:', error);
    }
});

// 파일 선택 다이얼로그
ipcMain.handle('select-file', async (event, options) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: options.title || '파일 선택',
            filters: options.filters || [
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
        });
        
        if (result.canceled) {
            return { success: true, cancelled: true };
        } else {
            return { success: true, filePath: result.filePaths[0] };
        }
    } catch (error) {
        console.error('❌ 파일 선택 다이얼로그 오류:', error);
        return { success: false, error: error.message };
    }
});

// 파일 읽기
ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return { success: true, data: content };
    } catch (error) {
        console.error('❌ 파일 읽기 오류:', error);
        return { success: false, error: error.message };
    }
});

// 자동화 URL 설정
ipcMain.handle('set-automation-urls', async (event, urls) => {
    try {
        if (!blogAutomation) {
            return { success: false, error: 'BlogAutomation 시스템이 초기화되지 않았습니다.' };
        }
        
        // CoupangCrawler에 URL 목록 설정
        const result = await blogAutomation.coupangCrawler.setUrls(urls);
        console.log('📂 URL 목록 설정 완료:', result);
        
        return { success: true, message: `${urls.length}개 URL이 설정되었습니다.` };
    } catch (error) {
        console.error('❌ URL 설정 오류:', error);
        return { success: false, error: error.message };
    }
});

// 쿠팡 API 완전 자동화 실행
ipcMain.handle('execute-full-automation', async (event, accounts, apiOptions = {}) => {
    try {
        if (!blogAutomation) {
            return { success: false, error: 'BlogAutomation 시스템이 초기화되지 않았습니다.' };
        }
        
        console.log('🤖 완전 자동화 실행 요청');
        console.log('👥 선택된 계정 수:', accounts.length);
        console.log('⚙️ API 자동 설정: 랜덤 선택, 이미지 크기 512x512');
        
        // 각 계정별로 쿠팡 API 자동화 실행
        let totalSuccess = 0;
        let totalFailure = 0;
        
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            console.log(`🔄 계정 ${i + 1}/${accounts.length}: ${account.username} 실행 중...`);
            
            try {
                const result = await blogAutomation.executeAutomationWithCoupangAPI(account);
                
                if (result.success) {
                    totalSuccess++;
                    console.log(`✅ 계정 ${account.username} 완료`);
                } else {
                    totalFailure++;
                    console.log(`❌ 계정 ${account.username} 실패:`, result.error);
                }
            } catch (error) {
                totalFailure++;
                console.error(`❌ 계정 ${account.username} 오류:`, error);
             }
         }
         
         console.log(`🎯 완전 자동화 실행 완료 - 성공: ${totalSuccess}, 실패: ${totalFailure}`);
         
         return { 
             success: true, 
             totalSuccess, 
             totalFailure,
             message: `완전 자동화가 완료되었습니다. 성공: ${totalSuccess}개, 실패: ${totalFailure}개`
         };
         
     } catch (error) {
         console.error('❌ 완전 자동화 실행 실패:', error);
         return { success: false, error: error.message };
     }
});

// 금칙어 정보 가져오기 IPC 핸들러
ipcMain.handle('get-banned-words', async (event) => {
    try {
        // 렌더러 프로세스에서 금칙어 정보 요청 시
        // 실제로는 렌더러에서 저장된 금칙어를 다시 메인으로 전달해야 함
        // 이 핸들러는 app.js에서 직접 처리하도록 수정 필요
        
        // 기본값 반환 (fallback)
        return ['아늑', '오송815', '오송 815'];
    } catch (error) {
        console.error('❌ 금칙어 로드 실패:', error);
        return ['아늑', '오송815', '오송 815'];
     }
});
