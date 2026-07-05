const path = require('path');
const fs = require('fs-extra');
const moduleModule = require('module');

console.log('🤖 [서버 구동] 브라우저 환경 실행을 위한 Electron 모의 모듈(Mock)을 구성합니다...');

// Electron 모듈 모의(Mocking) 설정
const originalRequire = moduleModule.prototype.require;
moduleModule.prototype.require = function(id) {
    if (id === 'electron') {
        return {
            app: {
                getVersion: () => '8.1.4',
                getName: () => 'nepas',
                getAppPath: () => __dirname,
                isPackaged: false,
                getPath: (name) => {
                    const dir = path.join(__dirname, 'userData', name);
                    fs.ensureDirSync(dir);
                    return dir;
                },
                on: () => {},
                whenReady: () => Promise.resolve(),
                quit: () => {
                    console.log('🚪 [Electron Mock] 앱 종료 요청 수신');
                    process.exit(0);
                }
            },
            nativeImage: {
                createFromPath: (imagePath) => {
                    return {
                        isEmpty: () => {
                            return !require('fs').existsSync(imagePath);
                        },
                        _imagePath: imagePath
                    };
                }
            },
            clipboard: {
                writeImage: (image) => {
                    const imagePath = image._imagePath;
                    console.log(`📋 [Electron Mock Clipboard] 이미지를 클립보드에 복사 중: ${imagePath}`);
                    try {
                        const { execSync } = require('child_process');
                        if (process.platform === 'darwin') {
                            execSync(`osascript -e 'set the clipboard to (read (POSIX file "${imagePath}") as JPEG picture)'`);
                            console.log('✅ [Electron Mock Clipboard] Mac osascript 클립보드 이미지 복사 성공!');
                        } else {
                            const powershellCmd = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetImage([System.Drawing.Image]::FromFile('${imagePath.replace(/'/g, "''")}'))`;
                            execSync(`powershell.exe -NoProfile -NonInteractive -Command "${powershellCmd}"`, { stdio: 'ignore' });
                            console.log('✅ [Electron Mock Clipboard] PowerShell 클립보드 이미지 복사 성공!');
                        }
                    } catch (err) {
                        console.error('❌ [Electron Mock Clipboard] 클립보드 이미지 복사 실패:', err.message);
                    }
                },
                writeText: (text) => {
                    try {
                        const { execSync, spawnSync } = require('child_process');
                        if (process.platform === 'darwin') {
                            spawnSync('pbcopy', [], { input: text });
                        } else {
                            execSync(`powershell.exe -NoProfile -NonInteractive -Command "Set-Clipboard -Value '${text.replace(/'/g, "''")}'"`, { stdio: 'ignore' });
                        }
                    } catch (err) {
                        console.error('❌ [Electron Mock Clipboard] 클립보드 텍스트 복사 실패:', err.message);
                    }
                }
            },
            BrowserWindow: class {
                constructor() {
                    this.webContents = {
                        send: (channel, data) => {
                            // SSE를 통해 웹브라우저로 실시간 로그 송출
                            if (channel === 'main-process-log' && global.sseClients && Array.isArray(global.sseClients)) {
                                global.sseClients.forEach(client => {
                                    try {
                                        client.write(`data: ${JSON.stringify(data)}\n\n`);
                                    } catch (e) {
                                        // 무시
                                    }
                                });
                            }
                        },
                        loadURL: () => {},
                        loadFile: () => {},
                        openDevTools: () => {},
                        closeDevTools: () => {}
                    };
                }
                loadURL() {}
                loadFile() {}
                on() {}
                once() {}
                show() {}
                hide() {}
                close() {}
                isDestroyed() { return true; }
            },
            ipcMain: {
                handle: () => {},
                on: () => {}
            },
            dialog: {
                showErrorBox: (title, message) => {
                    console.error(`💥 [Electron Mock Dialog] ${title}: ${message}`);
                }
            },
            shell: {}
        };
    }
    if (id === 'electron-updater') {
        return {
            autoUpdater: {
                on: () => {},
                checkForUpdatesAndNotify: () => Promise.resolve()
            }
        };
    }
    return originalRequire.apply(this, arguments);
};

// 메인 프로세스 로직 로드 및 구동
console.log('🚀 [서버 구동] 메인 엔진(src/main.js)을 기동하는 중...');
require('./src/main.js');
