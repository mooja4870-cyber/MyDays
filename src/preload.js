const { contextBridge, ipcRenderer } = require('electron');

/**
 * Electron API를 렌더러 프로세스에 안전하게 노출
 * contextBridge를 사용하여 보안을 유지하면서 메인 프로세스와 통신
 */
contextBridge.exposeInMainWorld('electronAPI', {
    // 자동화 실행 관련
    executeAutomationStep: (data) => ipcRenderer.invoke('execute-automation-step', data),
    
    // API 테스트
    testGeminiAPI: (apiKey) => ipcRenderer.invoke('test-gemini-api', apiKey),
    
    // 계정 관리
    manageAccount: (action, data) => {
        if (typeof action === 'object' && action !== null) {
            return ipcRenderer.invoke('manage-account', action);
        }
        return ipcRenderer.invoke('manage-account', action, data);
    },
    
    // 네이버 ID 검증
    validateNaverId: (naverId, naverPassword) => ipcRenderer.invoke('validate-naver-id', naverId, naverPassword),
    
    // 시스템 상태 및 로그
    getSystemStatus: () => ipcRenderer.invoke('get-system-status'),
    getLogs: (lines) => ipcRenderer.invoke('get-logs', lines),
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),
    
    // 쿠팡 자동화 관련
    uploadUrlFile: () => ipcRenderer.invoke('upload-url-file'),
    updateAutomationConfig: (config) => ipcRenderer.invoke('update-automation-config', config),
    runAutomation: () => ipcRenderer.invoke('run-automation'),
    stopAutomation: () => ipcRenderer.invoke('stop-automation'),
    getAutomationStatus: () => ipcRenderer.invoke('get-automation-status'),
    cleanupAllImages: () => ipcRenderer.invoke('cleanup-all-images'),
    
    // 자동 업데이트 관련
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
    onUpdateChecking: (callback) => ipcRenderer.on('update-checking', callback),
    onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', callback),
    onUpdateError: (callback) => ipcRenderer.on('update-error', callback),
    onUpdateLog: (callback) => ipcRenderer.on('update-log', callback),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    
    // 메인 프로세스 로그 수신
    onMainProcessLog: (callback) => {
        ipcRenderer.on('main-process-log', (event, logData) => {
            // logData가 유효한지 확인
            if (logData && typeof logData === 'object') {
                callback(logData);
            } else {
                console.warn('잘못된 logData 수신:', logData);
            }
        });
    },
    
    // 로그 수신 (간단한 형태)
    onLog: (callback) => {
        ipcRenderer.on('log-message', (event, level, message, data) => {
            callback(level, message, data);
        });
    },
    
    // URL 진행 상황 수신
    onUrlProgress: (callback) => {
        ipcRenderer.on('url-progress-update', (event, progressData) => {
            callback(progressData);
        });
    },
    
    // 다중 계정 교차 실행 진행 상황 수신
    onAccountProgressUpdate: (callback) => {
        ipcRenderer.on('account-progress-update', (event, progressData) => {
            callback(progressData);
        });
    },
    
    // 포스팅 대기 상태 수신
    onWaitingUpdate: (callback) => {
        ipcRenderer.on('waiting-update', (event, waitData) => {
            callback(waitData);
        });
    },
    
    // 포스트 카운트 실시간 업데이트 수신
    onPostCountUpdate: (callback) => {
        ipcRenderer.on('post-count-update', (event, countData) => {
            callback(countData);
        });
    },
    

    
    // 로그 수신 해제
    removeMainProcessLogListener: () => {
        ipcRenderer.removeAllListeners('main-process-log');
    },
    
    // 디버깅용 API 추가
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    testMainProcess: () => ipcRenderer.invoke('test-main-process'),
    checkMainProcessReady: () => ipcRenderer.invoke('check-main-process-ready'),
    checkIpcHandlers: () => ipcRenderer.invoke('check-ipc-handlers'),
    runSingleAccountAutomation: (data) => ipcRenderer.invoke('run-single-account-automation', data),
    
    // 이벤트 리스너 등록/해제
    onProgressUpdate: (callback) => {
        ipcRenderer.on('progress-update', (event, data) => callback(data));
    },
    
    removeProgressUpdateListener: () => {
        ipcRenderer.removeAllListeners('progress-update');
    },
    
    onSystemStatusUpdate: (callback) => {
        ipcRenderer.on('system-status-update', (event, data) => callback(data));
    },
    
    removeSystemStatusUpdateListener: () => {
        ipcRenderer.removeAllListeners('system-status-update');
    },
    
    // 일반적인 유틸리티 함수들
    showNotification: (title, body) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    },
    
    requestNotificationPermission: async () => {
        if ('Notification' in window) {
            return await Notification.requestPermission();
        }
        return 'denied';
    },
    
    // 새로 추가할 API들
    collectAccountSession: (accountId) => ipcRenderer.invoke('collect-account-session', accountId),
    compressSessionData: (sessionData) => ipcRenderer.invoke('compress-session-data', sessionData),
    
    // 세션 관리 API
    checkSessionExists: (accountId) => ipcRenderer.invoke('check-session-exists', accountId),
    deleteSession: (accountId) => ipcRenderer.invoke('delete-session', accountId),
    getSessionInfo: (accountId) => ipcRenderer.invoke('get-session-info', accountId),
    
    // zstd 압축 API
    getZstd: () => ipcRenderer.invoke('get-zstd'),
    
    // 외부 링크 열기
    openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
    
    // 파일 선택 및 읽기 API
    selectFile: (options) => ipcRenderer.invoke('select-file', options),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    setAutomationUrls: (urls) => ipcRenderer.invoke('set-automation-urls', urls),
    
    // 새로 추가할 API들
    getNaverAdData: (url) => ipcRenderer.invoke('get-naver-ad-data', url),
    
    // 파일 다이얼로그
    selectFileDialog: (options) => ipcRenderer.invoke('select-file-dialog', options),

    // URL 파일 업로드 (경로 전달 방식)
    uploadUrlFileFromPath: (filePath) => ipcRenderer.invoke('upload-url-file-from-path', filePath),
    
    // ===== 완전 자동화 관련 API =====
    // 쿠팡 API 키 관리
    saveCoupangApiKeys: (accessKey, secretKey) => ipcRenderer.invoke('save-coupang-api-keys', accessKey, secretKey),
    loadCoupangApiKeys: () => ipcRenderer.invoke('load-coupang-api-keys'),
    testCoupangApiConnection: () => ipcRenderer.invoke('test-coupang-api-connection'),
    
    // 쿠팡 API 상품 조회
    getGoldboxProducts: (options) => ipcRenderer.invoke('get-goldbox-products', options),
    getCoupangPLProducts: (options) => ipcRenderer.invoke('get-coupangpl-products', options),
    getAllProductUrls: (options) => ipcRenderer.invoke('get-all-product-urls', options),
    
    // 완전 자동화 실행
    executeFullAutomation: (accounts, apiOptions) => ipcRenderer.invoke('execute-full-automation', accounts, apiOptions),
    
    // 완전 자동화 진행 상황 수신
    onFullAutomationProgress: (callback) => {
        ipcRenderer.on('full-automation-progress', (event, progressData) => {
            callback(progressData);
        });
    },
    
    // 완전 자동화 완료 수신
    onFullAutomationComplete: (callback) => {
        ipcRenderer.on('full-automation-complete', (event, result) => {
            callback(result);
        });
    },
    
    // 아고다 자동화 진행 상황 수신
    onAgodaAutomationProgress: (callback) => {
        ipcRenderer.on('agoda-automation-progress', (event, progressData) => {
            callback(progressData);
        });
    },
    
    // 금칙어 정보 전송/수신
    getBannedWords: () => ipcRenderer.invoke('get-banned-words'),
    
    // 완전 자동화 에러 수신
    onFullAutomationError: (callback) => {
        ipcRenderer.on('full-automation-error', (event, errorData) => {
            callback(errorData);
        });
    },
    
    // 완전 자동화 관련 이벤트 리스너 해제
    removeFullAutomationListeners: () => {
        ipcRenderer.removeAllListeners('full-automation-progress');
        ipcRenderer.removeAllListeners('full-automation-complete');
        ipcRenderer.removeAllListeners('full-automation-error');
    },
});

// 개발 모드에서 디버깅을 위한 추가 정보 노출
if (process.env.NODE_ENV === 'development') {
    contextBridge.exposeInMainWorld('electronDev', {
        platform: process.platform,
        nodeVersion: process.versions.node,
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome
    });
}

console.log('🔗 Preload script 로드 완료');

/**
 * 렌더러 프로세스에서 발생하는 에러를 캐치하고 로그로 전송
 */
window.addEventListener('error', (event) => {
  console.error('렌더러 프로세스 에러:', event.error);
  // 메인 프로세스에 에러 전송 (가능한 경우)
  try {
    if (window.electronAPI) {
      // IPC를 통해 메인 프로세스에 에러 전송
      ipcRenderer.send('renderer-error', {
        message: event.error ? event.error.message : '알 수 없는 에러',
        stack: event.error ? event.error.stack : '',
        filename: event.filename || '',
        lineno: event.lineno || 0,
        colno: event.colno || 0
      });
    }
  } catch (err) {
    console.error('메인 프로세스에 에러 전송 실패:', err);
  }
});

/**
 * 처리되지 않은 Promise 거부를 캐치하고 로그로 전송
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('처리되지 않은 Promise 거부:', event.reason);
  // 메인 프로세스에 Promise 거부 전송 (가능한 경우)
  try {
    if (window.electronAPI) {
      ipcRenderer.send('renderer-error', {
        message: '처리되지 않은 Promise 거부',
        reason: event.reason ? event.reason.toString() : '알 수 없는 이유',
        stack: event.reason && event.reason.stack ? event.reason.stack : ''
      });
    }
  } catch (err) {
    console.error('메인 프로세스에 Promise 거부 전송 실패:', err);
  }
});

/**
 * DOM 로드 완료 후 초기화 작업 수행
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM 로드 완료 - Electron API 사용 가능');
  
  // 개발 모드에서 추가 로깅
  if (process.env.NODE_ENV === 'development') {
    console.log('개발 모드에서 실행 중');
  }
}); 