// 네파스 - 메인 애플리케이션 스크립트

// 전역 상태 관리
const AppState = {
    accounts: [],
    currentPanel: 'dashboard',
    automationRunning: false,
    photoPublishing: false, // PHOTO 발행 진행 중 여부
    selectedAccounts: [],
    todayExecutions: {},
    uploadedUrls: [],
    urlFileUploaded: false,
    settings: {
        postDelay: 10,
        dailyLimit: 3
    },
    fullAutomation: {
        accessKey: '',
        secretKey: '',
        selectedAccounts: [],
        running: false
    },
    agodaAutomation: {
        selectedCountry: '',
        selectedAccounts: [],
        running: false,
        enabled: false, // 아고다 서비스 활성화 플래그 (현재 비활성화)
        bannedWords: ['아늑', '오송815', '오송 815'] // 기본 금칙어
    }
};

// DOM 요소 참조
const UI = {
    // 사이드바
    navItems: document.querySelectorAll('.nav-item'),
    statusDot: document.querySelector('.status-dot'),
    statusText: document.getElementById('status-text'),
    
    // 헤더
    headerTitle: document.getElementById('header-title'),
    
    // 대시보드
    totalAccounts: document.getElementById('total-accounts'),
    todayExecutions: document.getElementById('today-executions'),
    automationStatus: document.getElementById('automation-status'),
    accountExecutionStats: document.getElementById('account-execution-stats'),
    
    // URL 파일 업로드
    uploadUrlFileBtn: document.getElementById('upload-url-file'),
    urlFileStatus: document.getElementById('url-file-status'),
    urlPreviewCard: document.getElementById('url-preview-card'),
    urlCountText: document.getElementById('url-count-text'),
    urlPreviewList: document.getElementById('url-preview-list'),
    
    // URL 쿠팡 자동화
    accountSelector: document.getElementById('account-selector'),
    startAutomationBtn: document.getElementById('start-automation'),
    stopAutomationBtn: document.getElementById('stop-automation'),
    progressContainer: document.getElementById('progress-container'),
    progressFill: document.getElementById('progress-fill'),
    
    // 계정 관리
    accountForm: document.getElementById('account-form'),
    naverIdInput: document.getElementById('naver-id'),
    naverPasswordInput: document.getElementById('naver-password'),
    blogIdInput: document.getElementById('blog-id'),
    affiliateIdInput: document.getElementById('affiliate-id'),
    geminiApiInput: document.getElementById('gemini-api'),
    categoryIdInput: document.getElementById('category-id'),
    nicknameInput: document.getElementById('nickname'),
    linkPriceCidInput: document.getElementById('link-price-cid'),
    accountList: document.getElementById('account-list'),
    
    // 설정
    postDelayInput: document.getElementById('post-delay'),
    dailyLimitInput: document.getElementById('daily-limit'),
    saveSettingsBtn: document.getElementById('save-settings'),
    
    // API 쿠팡 자동화 (완전 자동화에서 이름 변경)
    coupangAccessKey: document.getElementById('coupang-access-key'),
    coupangSecretKey: document.getElementById('coupang-secret-key'),
    saveCoupangApiBtn: document.getElementById('save-coupang-api'),
    fullAutomationAccountSelector: document.getElementById('full-automation-account-selector'),
    startFullAutomationBtn: document.getElementById('start-full-automation'),
    stopFullAutomationBtn: document.getElementById('stop-full-automation'),
    fullAutomationProgressContainer: document.getElementById('full-automation-progress-container'),
    fullAutomationProgressFill: document.getElementById('full-automation-progress-fill'),
    
    // 아고다 자동화
    agodaCountrySelect: document.getElementById('agoda-country-select'),
    agodaAccountSelector: document.getElementById('agoda-account-selector'),
    startAgodaAutomationBtn: document.getElementById('start-agoda-automation'),
    stopAgodaAutomationBtn: document.getElementById('stop-agoda-automation'),
    agodaProgressContainer: document.getElementById('agoda-progress-container'),
    agodaProgressFill: document.getElementById('agoda-progress-fill'),
    
    // 금칙어 관리
    bannedWordsTextarea: document.getElementById('banned-words-textarea'),
    saveBannedWordsBtn: document.getElementById('save-banned-words'),
    resetBannedWordsBtn: document.getElementById('reset-banned-words'),
    bannedWordsDisplay: document.getElementById('banned-words-display'),
    
    // 모달
    editModal: document.getElementById('edit-account-modal'),
    editForm: document.getElementById('edit-account-form'),
    editNaverId: document.getElementById('edit-naver-id'),
    editNaverPassword: document.getElementById('edit-naver-password'),
    editBlogId: document.getElementById('edit-blog-id'),
    editAffiliateId: document.getElementById('edit-affiliate-id'),
    editGeminiApi: document.getElementById('edit-gemini-api'),
    editCategoryId: document.getElementById('edit-category-id'),
    editNickname: document.getElementById('edit-nickname'),
    editLinkPriceCid: document.getElementById('edit-link-price-cid')
};

// 패널 제목 매핑
const panelTitles = {
    'photo-automation': 'PHOTO 포스팅 자동화',
    'dashboard': '대시보드',
    'accounts': '계정 관리',
    'settings': '자동화 설정',
    'url-automation': 'URL 쿠팡 자동화',
    'api-automation': 'API 쿠팡 자동화',
    'agoda-automation': '아고다 자동화',
    'naver-test': 'PHOTO 포스팅 이력',
    'mobile-settings': '계정 설정'
};

// API 클래스
class ApiService {
    static BASE_URL = 'http://n-rank.markethunter.io';
    static ENDPOINTS = {
        SESSION: '/api/session'
    };

    /**
     * 로그인 후 세션 데이터 API 전송 (Username과 Storage만)
     * @param {string} username 사용자명
     * @param {Uint8Array} compressedStorage 압축된 세션 데이터
     * @returns {Promise<Object>} API 응답
     */
    static async sendSessionData(username, compressedStorage) {
        try {
            console.log('📤 세션 데이터 API 전송 시작:', { username, storageSize: compressedStorage.length });
            
            const requestData = {
                Username: username,
                Storage: Array.from(compressedStorage) // Uint8Array를 배열로 변환
            };
            
            const response = await fetch(`${this.BASE_URL}${this.ENDPOINTS.SESSION}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            // console.log('✅ 세션 데이터 API 전송 성공');
            
            return {
                success: true,
                data: result
            };
            
        } catch (error) {
            console.error('❌ 세션 데이터 API 전송 실패:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 압축 유틸리티 클래스
class CompressionUtils {
    /**
     * zstd로 세션 데이터 압축
     * @param {Object} sessionData 세션 데이터 객체
     * @returns {Promise<Uint8Array>} 압축된 데이터
     */
    static async compressSessionData(sessionData) {
        try {
            // zstd 모듈 가져오기 (Node.js 환경)
            const { compress } = window.electronAPI ? 
                await window.electronAPI.getZstd() : 
                require('@mongodb-js/zstd');
            
            // 세션 데이터를 JSON 문자열로 변환
            const sessionString = JSON.stringify(sessionData);
            const sessionBuffer = new TextEncoder().encode(sessionString);
            
            console.log('🗜️ 세션 데이터 압축 중...', {
                originalSize: sessionBuffer.length,
                dataType: typeof sessionData
            });
            
            // zstd로 압축
            const compressedData = await compress(sessionBuffer);
            
            console.log('✅ 세션 데이터 압축 완료', {
                originalSize: sessionBuffer.length,
                compressedSize: compressedData.length,
                compressionRatio: ((1 - compressedData.length / sessionBuffer.length) * 100).toFixed(2) + '%'
            });
            
            return compressedData;
            
        } catch (error) {
            console.error('❌ 세션 데이터 압축 실패:', error);
            throw error;
        }
    }
}

// 유틸리티 함수들
class Utils {
    static formatTime(date = new Date()) {
        return date.toLocaleTimeString('ko-KR', { hour12: false });
    }
    
    static formatDate(date = new Date()) {
        return date.toLocaleDateString('ko-KR');
    }
    
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    static showNotification(title, message, type = 'info') {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification(title, { body: message });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification(title, { body: message });
                    }
                });
            }
        }
    }
    
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    static sanitizeInput(input) {
        return input ? input.trim().replace(/[<>'"]/g, '') : '';
    }
    
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    static showDialog(type, title, message) {
        // 알림 타입별 아이콘 설정
        const icons = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌'
        };
        
        const dialog = document.getElementById('message-dialog');
        const icon = document.getElementById('dialog-icon');
        const titleElement = document.getElementById('dialog-title');
        const messageElement = document.getElementById('dialog-message');
        
        icon.textContent = icons[type] || 'ℹ️';
        icon.className = `dialog-icon ${type}`;
        titleElement.textContent = title;
        messageElement.textContent = message;
        
        dialog.classList.add('show');
    }
    
    static showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            const dialog = document.getElementById('confirm-dialog');
            const confirmTitle = document.getElementById('confirm-title');
            const confirmMessage = document.getElementById('confirm-message');
            
            // 제목과 메시지 설정
            confirmTitle.innerHTML = title;
            confirmMessage.innerHTML = message;
            
            // 응답 함수를 전역에 저장
            window._confirmResolve = resolve;
            
            // 다이얼로그 표시
            dialog.classList.add('show');
        });
    }
}

// 상태 관리
class StateManager {
    static updateStatus(status, message = '') {
        UI.statusDot.className = `status-dot ${status}`;
        UI.statusText.textContent = message || this.getStatusMessage(status);
    }
    
    static getStatusMessage(status) {
        const messages = {
            idle: '대기 중',
            preparing: '준비 중',
            running: '실행 중',
            waiting: '대기 중',
            paused: '일시 정지',
            completed: '완료',
            error: '오류 발생',
            stopped: '중지됨'
        };
        return messages[status] || '알 수 없음';
    }
    
    static updateProgress(progress) {
        UI.progressFill.style.width = `${progress}%`;
        if (progress > 0) {
            UI.progressContainer.style.display = 'block';
        } else {
            UI.progressContainer.style.display = 'none';
        }
    }
    
    static saveState() {
        try {
            // 계정 정보를 제외한 나머지 상태만 저장
            const { accounts, ...stateToSave } = AppState;

            localStorage.setItem('blogAutomationState', JSON.stringify(stateToSave));
            console.log('💾 [상태 저장] 계정 정보를 제외한 설정 저장 완료');
        } catch (error) {
            console.error('❌ 설정 저장 실패:', error);
        }
    }
    
    static async loadState() {
        try {
            const saved = localStorage.getItem('blogAutomationState');
            if (saved) {
                const state = JSON.parse(saved);
                
                // 계정 정보는 항상 ConfigManager에서 최신 정보를 로드
                console.log('📂 [상태 로드] ConfigManager에서 최신 계정 정보 로드');
                await this.loadAccountsFromConfigManager();
                
                // 설정 정보 로드
                AppState.settings = { ...AppState.settings, ...state.settings };
                
                // 아고다 자동화 상태 로드
                if (state.agodaAutomation) {
                    AppState.agodaAutomation = { 
                        ...AppState.agodaAutomation, 
                        ...state.agodaAutomation,
                        running: false  // 앱 재시작 시 항상 false로 설정
                    };
                    
                    // 아고다 자동화 선택된 계정 인덱스 정리 (존재하지 않는 계정 인덱스 제거)
                    if (AppState.agodaAutomation.selectedAccounts && Array.isArray(AppState.agodaAutomation.selectedAccounts)) {
                        AppState.agodaAutomation.selectedAccounts = AppState.agodaAutomation.selectedAccounts.filter(index => 
                            index >= 0 && index < AppState.accounts.length
                        );
                        console.log(`🔧 [아고다 자동화] 유효하지 않은 계정 인덱스 정리 완료. 선택된 계정: ${AppState.agodaAutomation.selectedAccounts.length}개`);
                    } else {
                        AppState.agodaAutomation.selectedAccounts = [];
                    }
                }
                
                // 선택된 계정 정보 복원
                if (state.selectedAccounts && Array.isArray(state.selectedAccounts)) {
                    AppState.selectedAccounts = state.selectedAccounts.filter(index => 
                        index >= 0 && index < AppState.accounts.length
                    );
                } else {
                    AppState.selectedAccounts = [];
                }
                
                // 오늘 실행 횟수만 유지하고 이전 날짜 데이터는 제거
                const today = Utils.formatDate();
                const todayExecutions = {};
                
                console.log('📊 [상태 로드] 오늘 날짜:', today);
                console.log('📊 [상태 로드] 저장된 todayExecutions:', state.todayExecutions);
                
                if (state.todayExecutions) {
                    // 오늘 날짜로 시작하는 키만 유지
                    Object.keys(state.todayExecutions).forEach(key => {
                        if (key.startsWith(today + '-')) {
                            todayExecutions[key] = state.todayExecutions[key];
                            console.log(`📊 [상태 로드] 오늘 데이터 유지: ${key} = ${todayExecutions[key]}`);
                        } else {
                            console.log(`📊 [상태 로드] 이전 날짜 데이터 제거: ${key}`);
                        }
                    });
                }
                
                AppState.todayExecutions = todayExecutions;
                console.log('📊 [상태 로드] 최종 todayExecutions:', AppState.todayExecutions);
                
                console.log('✅ [상태 로드] 설정 불러오기 완료:', {
                    accounts: AppState.accounts.length,
                    selectedAccounts: AppState.selectedAccounts.length,
                    todayExecutions: Object.keys(AppState.todayExecutions).length
                });
                
                // 세션 존재 여부 확인 (메인 프로세스에 요청)
                this.checkSessionsExistence();
                
                return true;
            } else {
                // localStorage에 저장된 상태가 없으면 ConfigManager에서 로드 시도
                console.log('📂 [상태 로드] localStorage 없음 - ConfigManager에서 로드 시도');
                await this.loadAccountsFromConfigManager();
            }
        } catch (error) {
            console.error('❌ [상태 로드] 설정 불러오기 실패:', error.message);
            // 오류 발생 시 ConfigManager에서 로드 시도
            await this.loadAccountsFromConfigManager();
        }
        return false;
    }
    
    // ConfigManager와 계정 동기화
    static async syncAccountsWithConfigManager() {
        if (!window.electronAPI || AppState.accounts.length === 0) return;
        
        try {
            console.log('🔄 [동기화] ConfigManager와 계정 동기화 시작...');
            
            for (const account of AppState.accounts) {
                const result = await window.electronAPI.manageAccount({ action: 'add', data: {
                    id: account.id,
                    username: account.naverId,
                    password: account.naverPassword,
                    nickname: account.naverId,
                    blogId: account.blogId,
                    affiliateId: account.affiliateId,
                    geminiApi: account.geminiApi,
                    categoryId: account.categoryId,
                    linkPriceCid: account.linkPriceCid,
                    isActive: account.isActive,
                    isValidated: account.isValidated
                }});
                
                if (result.success) {
                    console.log(`✅ [동기화] 계정 동기화 완료: ${account.naverId}`);
                } else {
                    console.warn(`⚠️ [동기화] 계정 동기화 실패: ${account.naverId} - ${result.error}`);
                }
            }
            
        } catch (error) {
            console.error('❌ [동기화] ConfigManager 동기화 실패:', error);
        }
    }
    
    // ConfigManager에서 계정 로드
    static async loadAccountsFromConfigManager() {
        if (!window.electronAPI) {
            console.log('⚠️ [ConfigManager 로드] Electron API 없음 - 빈 계정으로 초기화');
            AppState.accounts = [];
            AppState.selectedAccounts = [];
            AppState.todayExecutions = {};
            return;
        }
        
        try {
            console.log('📂 [ConfigManager 로드] ConfigManager에서 계정 로드 시도...');
            
            const result = await window.electronAPI.manageAccount({ action: 'getAll' });
            
            console.log(`🔍 [CID 로드 디버깅] manageAccount 결과:`, JSON.stringify(result, null, 2));
            
            if (result.success && result.accounts && Array.isArray(result.accounts)) {
                AppState.accounts = result.accounts.map(account => {
                    console.log(`🔍 [CID 로드 디버깅] 계정 ${account.username}: linkPriceCid =`, account.linkPriceCid);
                    return {
                        // 렌더러 필드
                        id: account.id || Utils.generateId(),
                        naverId: account.username || account.naverId || '',
                        naverPassword: account.password || account.naverPassword || '',
                        blogId: account.blogId || '',
                        affiliateId: account.affiliateId || '',
                        geminiApi: account.geminiApi || '',
                        categoryId: account.categoryId || '',
                        linkPriceCid: account.linkPriceCid || '',
                    
                    // ConfigManager 호환 필드
                    username: account.username || account.naverId || '',
                    password: account.password || account.naverPassword || '',
                    nickname: account.nickname || account.username || account.naverId || '',
                    
                    // 상태 필드
                    isActive: account.isActive !== false,
                    isValidated: account.isValidated || false,
                    createdAt: account.createdAt || new Date().toISOString(),
                    updatedAt: account.updatedAt || new Date().toISOString(),
                    
                    // 일일 실행 횟수 초기화
                    dailyPostCount: 0,
                    lastLogin: account.lastLogin || null,
                    sessionExists: account.sessionExists || false
                    };
                });
                
                console.log(`✅ [ConfigManager 로드] 계정 로드 완료: ${AppState.accounts.length}개`);
                
                // 각 계정의 세션 존재 여부 확인
                for (const account of AppState.accounts) {
                    if (window.electronAPI.checkSession) {
                        const sessionExists = await window.electronAPI.checkSession(account.username);
                        account.sessionExists = sessionExists;
                    }
                }
                
                // 선택된 계정 초기화
                AppState.selectedAccounts = [];
                
                // 아고다 자동화 선택된 계정 인덱스 정리 (유효하지 않은 인덱스 제거)
                if (AppState.agodaAutomation && AppState.agodaAutomation.selectedAccounts && Array.isArray(AppState.agodaAutomation.selectedAccounts)) {
                    const beforeCount = AppState.agodaAutomation.selectedAccounts.length;
                    AppState.agodaAutomation.selectedAccounts = AppState.agodaAutomation.selectedAccounts.filter(index => 
                        index >= 0 && index < AppState.accounts.length
                    );
                    const afterCount = AppState.agodaAutomation.selectedAccounts.length;
                    if (beforeCount !== afterCount) {
                        console.log(`🔧 [아고다 자동화] 계정 로드 시 유효하지 않은 인덱스 정리: ${beforeCount}개 → ${afterCount}개`);
                    }
                }
                
                // 오늘 실행 기록 초기화
                AppState.todayExecutions = {};
                
                // UI 업데이트
                Dashboard.updateStats();
                AccountManager.renderAccounts();
                
                console.log('🔄 [ConfigManager 로드] UI 업데이트 완료');
                
            } else {
                console.log('⚠️ [ConfigManager 로드] 계정 없음 - 빈 계정으로 초기화');
                AppState.accounts = [];
                AppState.selectedAccounts = [];
                AppState.todayExecutions = {};
            }
            
        } catch (error) {
            console.error('❌ [ConfigManager 로드] 계정 로드 실패:', error);
            AppState.accounts = [];
            AppState.selectedAccounts = [];
            AppState.todayExecutions = {};
        }
    }
    
    static async checkSessionsExistence() {
        if (!window.electronAPI || !AppState.accounts.length) return;
        
        try {
            console.log('🔍 세션 존재 여부 확인 중...');
            
            for (let i = 0; i < AppState.accounts.length; i++) {
                const account = AppState.accounts[i];
                if (account.naverId) {
                    try {
                        const sessionExists = await window.electronAPI.checkSessionExists(account.naverId);
                        AppState.accounts[i].sessionExists = sessionExists;
                        console.log(`📋 계정 ${account.naverId}: 세션 ${sessionExists ? '존재' : '없음'}`);
                    } catch (error) {
                        console.warn(`⚠️ 계정 ${account.naverId} 세션 확인 실패:`, error.message);
                        AppState.accounts[i].sessionExists = false;
                    }
                }
            }
            
            // 상태 저장 및 UI 업데이트
            this.saveState();
            AccountManager.renderAccounts();
            
        } catch (error) {
            console.error('❌ 세션 존재 여부 확인 실패:', error);
        }
    }
}

// 네비게이션 관리
class Navigation {
    static init() {
        UI.navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetPanel = item.dataset.panel;
                this.switchPanel(targetPanel);
            });
        });

        // 하단 네비게이션바 이벤트 리스너 추가
        const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
        bottomNavItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetPanel = item.dataset.panel;
                this.switchPanel(targetPanel);
            });
        });
        
        // 아고다 서비스 상태에 따라 네비게이션 버튼 스타일 업데이트
        this.updateAgodaNavButtonState();
    }
    
    static updateAgodaNavButtonState() {
        const agodaNavBtn = document.querySelector('[data-panel="agoda-automation"]');
        if (agodaNavBtn) {
            if (!AppState.agodaAutomation.enabled) {
                agodaNavBtn.style.opacity = '0.5';
                agodaNavBtn.style.cursor = 'not-allowed';
                agodaNavBtn.setAttribute('title', '아고다 서비스는 현재 일시 중단되었습니다');
                
                // 아이콘 변경으로 중단 상태 시각화
                const icon = agodaNavBtn.querySelector('.nav-icon');
                if (icon) {
                    icon.textContent = '🚫';
                }
            } else {
                agodaNavBtn.style.opacity = '1';
                agodaNavBtn.style.cursor = 'pointer';
                agodaNavBtn.removeAttribute('title');
                
                // 아이콘 복원
                const icon = agodaNavBtn.querySelector('.nav-icon');
                if (icon) {
                    icon.textContent = '🏨';
                }
            }
        }
    }
    
    static switchPanel(panelName) {
        // 🚫 아고다 서비스가 비활성화된 경우 접근 차단
        if (panelName === 'agoda-automation' && !AppState.agodaAutomation.enabled) {
            Utils.showDialog('info', '서비스 중단', '아고다 서비스는 현재 일시 중단되었습니다.\n\n잠시만 기다려주세요.');
            return;
        }
        
        // 네비게이션 활성화 상태 변경
        UI.navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.panel === panelName) {
                item.classList.add('active');
            }
        });

        // 하단 네비게이션 활성화 상태 변경
        const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
        bottomNavItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.panel === panelName) {
                item.classList.add('active');
            }
        });
        
        // 패널 표시/숨김
        document.querySelectorAll('.content-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        const targetPanelEl = document.getElementById(`${panelName}-panel`);
        if (targetPanelEl) {
            targetPanelEl.classList.add('active');
        }

        // PHOTO 포스팅 이력 패널 진입 시 포스팅 중 여부에 따른 동적 레이아웃 변경
        if (panelName === 'naver-test') {
            const historyCard = document.getElementById('photo-history-card');
            if (historyCard) {
                if (AppState.photoPublishing) {
                    // 포스팅 진행 중 모드: 아래에 있는 이력 카드를 숨겨서 로그 카드만 보이게 함
                    historyCard.style.display = 'none';
                } else {
                    // 일반 이력 조회 모드: 이력 카드 정상 표시 (로그 카드 밑에 배치됨)
                    historyCard.style.display = 'block';
                }
            }
        }

        // 홈 탭 선택 시 웰컴 화면으로 항상 리셋하여 신선한 랜딩 경험 제공
        if (panelName === 'photo-automation') {
            const welcomeView = document.getElementById('photo-welcome-view');
            const uploadView = document.getElementById('photo-upload-view');
            if (welcomeView && uploadView) {
                welcomeView.style.display = 'block';
                uploadView.style.display = 'none';
            }
        }
        
        // 헤더 제목 변경
        if (panelName === 'naver-test' && AppState.photoPublishing) {
            UI.headerTitle.textContent = '포스팅 진행 중';
        } else {
            UI.headerTitle.textContent = panelTitles[panelName];
        }
        AppState.currentPanel = panelName;
        
        // 패널별 초기화
        if (panelName === 'dashboard') {
            Dashboard.updateStats();
        } else if (panelName === 'accounts') {
            AccountManager.renderAccounts();
        } else if (panelName === 'settings') {
            SettingsManager.loadSettings();
        } else if (panelName === 'url-automation') {
            Dashboard.updateStats();
            Dashboard.updateAutomationButtonState();
        } else if (panelName === 'api-automation') {
            FullAutomationManager.renderAccountSelector();
        } else if (panelName === 'agoda-automation') {
            // 아고다 서비스가 활성화된 경우에만 초기화
            if (AppState.agodaAutomation.enabled) {
                AgodaAutomationManager.updateAgodaAccountSelector();
                AgodaAutomationManager.updateAgodaButtonState();
            } else {
                // 서비스 중단 메시지 표시
                Utils.showDialog('info', '서비스 중단', '아고다 서비스는 현재 일시 중단되었습니다.\n\n잠시만 기다려주세요.');
            }
        }
    }
}

// URL 파일 관리
class UrlFileManager {
    static init() {
        UI.uploadUrlFileBtn.addEventListener('click', () => {
            this.uploadUrlFile();
        });
    }
    
    static async uploadUrlFile() {
        try {
            // 1. 메인 프로세스에 파일 선택 다이얼로그를 요청
            const dialogResult = await window.electronAPI.selectFileDialog({
                title: 'URL 파일 선택',
                filters: [{ name: 'Text Files', extensions: ['txt'] }]
            });

            if (dialogResult.success && dialogResult.filePath) {
                const filePath = dialogResult.filePath;
                console.log('📂 파일 선택됨:', filePath);

                // 2. 선택된 파일 경로를 메인 프로세스로 보내 처리 요청
                const uploadResult = await window.electronAPI.uploadUrlFileFromPath(filePath);

                if (uploadResult.success) {
                    const { urlCount, urls } = uploadResult;
                    console.log(`✅ ${urlCount}개 URL 업로드 완료`);
                    
                    // 상태 업데이트
                    AppState.urlFileUploaded = true;
                    AppState.uploadedUrls = urls; // 미리보기용 URL
                    
                    // UI 업데이트
                    UI.urlFileStatus.textContent = `✅ 업로드됨 (${urlCount}개 URL)`;
                    UI.urlFileStatus.className = 'status success';
                    
                    // URL 미리보기 표시
                    this.showUrlPreview(urlCount, urls);
                    
                    // 자동화 버튼 상태 업데이트
                    Dashboard.updateAutomationButtonState();
                    
                    Utils.showNotification('파일 업로드 완료', `${urlCount}개 URL이 업로드되었습니다.`);
                } else {
                    throw new Error(uploadResult.error || 'URL 파일 처리 실패');
                }
            } else {
                console.log('📂 파일 선택이 취소되었거나 실패했습니다.');
                if (dialogResult.error) {
                    throw new Error(dialogResult.error);
                }
            }
        } catch (error) {
            console.error('❌ URL 파일 업로드 과정 실패:', error);
            
            UI.urlFileStatus.textContent = `❌ 실패: ${error.message}`;
            UI.urlFileStatus.className = 'status error';
            UI.urlPreviewCard.style.display = 'none';
            
            AppState.urlFileUploaded = false;
            AppState.uploadedUrls = [];
            
            Dashboard.updateAutomationButtonState();
            Utils.showDialog('error', '파일 업로드 실패', error.message);
        }
    }
    
    static showUrlPreview(urlCount, urls) {
        UI.urlCountText.textContent = `${urlCount}개 URL`;
        UI.urlPreviewList.innerHTML = urls.map((url, index) => 
            `<div style="margin-bottom: 0.5rem; padding: 0.25rem; border-left: 3px solid var(--blue-500); padding-left: 0.5rem;">${index + 1}. ${url}</div>`
        ).join('');
        UI.urlPreviewCard.style.display = 'block';
    }
    
    static clearUrlFile() {
        AppState.uploadedUrls = [];
        AppState.urlFileUploaded = false;
        UI.urlFileStatus.textContent = '쿠팡 상품 URL 목록이 포함된 텍스트 파일을 선택하세요';
        UI.urlFileStatus.style.color = 'var(--text-secondary)';
        UI.urlPreviewCard.style.display = 'none';
        Dashboard.updateAutomationButtonState();
    }
}

// 대시보드 관리
class Dashboard {
    static updateStats() {
        if (UI.totalAccounts) UI.totalAccounts.textContent = AppState.accounts.length;
        
        const today = Utils.formatDate();
        const todayTotal = Object.values(AppState.todayExecutions).reduce((sum, count) => sum + count, 0);
        if (UI.todayExecutions) UI.todayExecutions.textContent = todayTotal;
        
        if (UI.automationStatus) UI.automationStatus.textContent = AppState.automationRunning ? '실행 중' : '중지됨';
        
        this.renderAccountSelector();
        this.renderExecutionStats();
    }
    
    static renderAccountSelector() {
        if (AppState.accounts.length === 0) {
            UI.accountSelector.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    등록된 계정이 없습니다.<br>
                    계정 관리에서 계정을 추가해주세요.
                </div>
            `;
            UI.startAutomationBtn.disabled = true;
            return;
        }
        
        UI.accountSelector.innerHTML = AppState.accounts.map((account, index) => `
            <div class="account-checkbox">
                <input type="checkbox" id="account-${index}" value="${index}" 
                       ${AppState.selectedAccounts.includes(index) ? 'checked' : ''}>
                <div class="account-checkbox-info">
                    <div class="account-checkbox-id">${account.naverId}${account.nickname && account.nickname !== account.naverId ? ` (${account.nickname})` : ''}</div>
                    <div class="account-checkbox-blog">블로그: ${account.blogId} | 카테고리: ${account.categoryId || '미설정'}</div>
                </div>
            </div>
        `).join('');
        
        // 체크박스 이벤트 리스너 추가
        UI.accountSelector.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const accountIndex = parseInt(e.target.value);
                if (e.target.checked) {
                    if (!AppState.selectedAccounts.includes(accountIndex)) {
                        AppState.selectedAccounts.push(accountIndex);
                    }
                } else {
                    AppState.selectedAccounts = AppState.selectedAccounts.filter(i => i !== accountIndex);
                }
                
                this.updateAutomationButtonState();
                StateManager.saveState();
            });
        });
        
        this.updateAutomationButtonState();
    }
    
    static renderExecutionStats() {
        if (!UI.accountExecutionStats) return;
        
        if (AppState.accounts.length === 0) {
            UI.accountExecutionStats.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    등록된 계정이 없습니다.
                </div>
            `;
            return;
        }
        
        const today = Utils.formatDate();
        
        // 🔍 디버깅용 로그 추가
        console.log('📊 계정별 실행 현황 렌더링 시작');
        console.log('📅 오늘 날짜:', today);
        console.log('👥 등록된 계정 수:', AppState.accounts.length);
        console.log('📊 현재 todayExecutions 상태:', AppState.todayExecutions);
        
        UI.accountExecutionStats.innerHTML = AppState.accounts.map((account, index) => {
            const accountId = account.username || account.naverId || account.id;
            const dailyPostKey = `${today}-${accountId}`;
            const executionCount = AppState.todayExecutions[dailyPostKey] || 0;
            
            // 🔍 각 계정별 디버깅 로그
            console.log(`📊 계정 ${index + 1}: ${account.naverId}`);
            console.log(`  - accountId: ${accountId}`);
            console.log(`  - dailyPostKey: ${dailyPostKey}`);
            console.log(`  - executionCount: ${executionCount}`);
            
            return `
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-title">${account.naverId}</div>
                        <div class="stat-icon blue">📊</div>
                    </div>
                    <div class="stat-value">${executionCount}</div>
                    <div class="stat-change">오늘 실행 횟수</div>
                </div>
            `;
        }).join('');
        
        console.log('✅ 계정별 실행 현황 렌더링 완료');
    }
    
    static updateAutomationButtonState() {
        try {
            console.log('🔍 버튼 상태 업데이트 시작...');
            
            // 전체 계정 확인
            const allAccounts = AccountManager.getAccounts();
            
            // 선택된 계정 확인 (실제 선택된 계정 기준)
            const selectedAccountIndices = AppState.selectedAccounts || [];
            const selectedAccounts = selectedAccountIndices
                .filter(index => index < allAccounts.length)
                .map(index => allAccounts[index]);
            const hasSelectedAccounts = selectedAccounts.length > 0;
            
            console.log('📊 계정 상태:', {
                전체계정수: allAccounts.length,
                선택된계정수: selectedAccounts.length,
                선택된계정목록: selectedAccounts.map(acc => acc.naverId || acc.username),
                선택된계정인덱스: selectedAccountIndices
            });
            
            // URL 파일 상태 확인 (여러 방법으로 체크)
            const hasUrlFile1 = AppState.urlFileUploaded;
            const hasUrlFile2 = UI.urlFileStatus && UI.urlFileStatus.textContent.includes('업로드됨');
            const hasUrlFile3 = UI.urlPreviewCard && !UI.urlPreviewCard.classList.contains('hidden');
            const hasUrlFile = hasUrlFile1 || hasUrlFile2 || hasUrlFile3;
            
            console.log('📁 URL 파일 상태:', {
                AppState상태: hasUrlFile1,
                UI상태표시: hasUrlFile2,
                미리보기표시: hasUrlFile3,
                최종결과: hasUrlFile
            });
            
            // 자동화 실행 상태 확인
            const isNotRunning = !AppState.automationRunning;
            
            console.log('🚀 자동화 실행 상태:', {
                automationRunning: AppState.automationRunning,
                isNotRunning: isNotRunning
            });
            
            // 시작 버튼 상태 관리
            const shouldEnableStartButton = hasSelectedAccounts && hasUrlFile && isNotRunning;
            UI.startAutomationBtn.disabled = !shouldEnableStartButton;
            
            // 중지 버튼 상태 관리 (실행 중일 때만 활성화)
            UI.stopAutomationBtn.disabled = !AppState.automationRunning;
            
            // 버튼 텍스트 업데이트
            if (AppState.automationRunning) {
                // 자동화 실행 중일 때
                UI.startAutomationBtn.innerHTML = '<span class="loading-spinner"></span> 자동화 실행 중...';
                UI.stopAutomationBtn.innerHTML = '<span>🛑 중지</span>';
            } else {
                // 자동화 실행 중이 아닐 때
                if (!hasSelectedAccounts) {
                    UI.startAutomationBtn.innerHTML = '<span>⚠️ 계정을 선택하세요</span>';
                } else if (!hasUrlFile) {
                    UI.startAutomationBtn.innerHTML = '<span>📂 URL 파일을 업로드하세요</span>';
                } else {
                    UI.startAutomationBtn.innerHTML = '<span>🚀 자동화 시작</span>';
                }
                UI.stopAutomationBtn.innerHTML = '<span>🛑 중지</span>';
            }
            
            // 상태 표시용 CSS 클래스 업데이트
            if (shouldEnableStartButton) {
                UI.startAutomationBtn.classList.add('enabled');
                UI.startAutomationBtn.classList.remove('disabled');
            } else {
                UI.startAutomationBtn.classList.add('disabled');
                UI.startAutomationBtn.classList.remove('enabled');
            }
            
            // 디버깅용 로그 (더 상세히)
            console.log('🔍 버튼 상태 업데이트 완료:', {
                hasSelectedAccounts: hasSelectedAccounts,
                selectedAccountCount: selectedAccounts.length,
                hasUrlFile: hasUrlFile,
                isNotRunning: isNotRunning,
                shouldEnableStartButton: shouldEnableStartButton,
                automationRunning: AppState.automationRunning,
                startButtonDisabled: UI.startAutomationBtn.disabled,
                startButtonText: UI.startAutomationBtn.innerHTML.replace(/<[^>]*>/g, '').trim(),
                timestamp: new Date().toLocaleTimeString()
            });
            
        } catch (error) {
            console.error('❌ 버튼 상태 업데이트 중 오류:', error);
            
            // 오류 시 안전한 기본 상태로 설정
            UI.startAutomationBtn.disabled = true;
            UI.startAutomationBtn.innerHTML = '<span>⚠️ 상태 확인 실패</span>';
        }
    }

    // 버튼 텍스트 업데이트 메소드
    static updateButtonText(text) {
        if (UI.startAutomationBtn) {
            UI.startAutomationBtn.innerHTML = `<span class="loading-spinner"></span> ${text}`;
        }
    }

    // 중지 버튼 텍스트 업데이트 메소드
    static updateStopButtonText(text) {
        if (UI.stopAutomationBtn) {
            UI.stopAutomationBtn.innerHTML = `<span>🛑</span> ${text}`;
        }
    }

    // URL 진행 상황 업데이트 메서드 추가
    static updateUrlProgress(currentUrl, totalUrls, accountName) {
        const progressText = `${accountName} 진행 중 (${currentUrl}/${totalUrls})`;
        this.updateButtonText(progressText);
        
        // 상태 메시지도 업데이트
        StateManager.updateStatus('running', `URL ${currentUrl}/${totalUrls} 처리 중 - ${accountName}`);
    }

    // 카운트다운 텍스트 업데이트 메소드
    static async showCountdown(totalSeconds, nextStep) {
        // 🔥 자동화가 중지된 경우 카운트다운 중단
        if (!AppState.automationRunning) {
            console.log('⏹️ 자동화 중지됨 - 카운트다운 중단');
            return;
        }
        
        // 긴 대기 시간인 경우 분 단위로 표시
        if (totalSeconds > 60) {
            const minutes = Math.floor(totalSeconds / 60);
            for (let i = minutes; i > 0; i--) {
                // 매 반복마다 중지 상태 확인
                if (!AppState.automationRunning) {
                    console.log('⏹️ 자동화 중지됨 - 분 단위 카운트다운 중단');
                    return;
                }
                UI.startAutomationBtn.innerHTML = `<span class="loading-spinner"></span> 다음 작업까지 ${i}분...`;
                await Utils.delay(60000); // 1분 대기
            }
            // 마지막 1분은 초 단위로 표시
            for (let i = totalSeconds % 60; i > 0; i--) {
                // 매 반복마다 중지 상태 확인
                if (!AppState.automationRunning) {
                    console.log('⏹️ 자동화 중지됨 - 초 단위 카운트다운 중단');
                    return;
                }
                UI.startAutomationBtn.innerHTML = `<span class="loading-spinner"></span> 다음 작업까지 ${i}초...`;
                await Utils.delay(1000);
            }
        } else {
            // 60초 이하인 경우 초 단위로 표시
            for (let i = totalSeconds; i > 0; i--) {
                // 매 반복마다 중지 상태 확인
                if (!AppState.automationRunning) {
                    console.log('⏹️ 자동화 중지됨 - 초 단위 카운트다운 중단');
                    return;
                }
                UI.startAutomationBtn.innerHTML = `<span class="loading-spinner"></span> 다음 작업까지 ${i}초...`;
                await Utils.delay(1000);
            }
        }
        
        // 카운트다운 완료 후에도 중지 상태 확인
        if (!AppState.automationRunning) {
            console.log('⏹️ 자동화 중지됨 - 카운트다운 완료 후 중단');
            return;
        }
        
        UI.startAutomationBtn.innerHTML = `<span class="loading-spinner"></span> ${nextStep}`;
    }
    
    static async startAutomation() {
        try {
            console.log('🚀 자동화 시작...');
            
            try {
                // 이미 자동화가 실행 중인지 확인
                if (AppState.automationRunning) {
                    Utils.showDialog('warning', '자동화 진행 중', 
                        '이미 자동화가 진행 중입니다.\n완료될 때까지 기다려주세요.');
                    return;
                }
                
                // URL 파일 상태 확인
                console.log('🔍 URL 파일 상태 확인...');
                const urlFileStatus = await window.electronAPI.getAutomationStatus();
                console.log('📂 URL 파일 상태:', urlFileStatus);
                
                if (!urlFileStatus.success || !urlFileStatus.hasUrlFile) {
                    Utils.showDialog('warning', '파일 없음', 
                        'URL 파일이 업로드되지 않았습니다.\n먼저 URL 파일을 업로드해주세요.');
                    return;
                }
                
                // 선택된 계정 확인
                const allAccounts = AccountManager.getAccounts();
                const selectedAccountIndices = AppState.selectedAccounts || [];
                const accounts = selectedAccountIndices
                    .filter(index => index < allAccounts.length)
                    .map(index => allAccounts[index]);
                    
                if (accounts.length === 0) {
                    Utils.showDialog('warning', '계정 없음', 
                        '선택된 계정이 없습니다.\n대시보드에서 계정을 선택해주세요.');
                    return;
                }
                
                console.log(`👥 선택된 계정 ${accounts.length}개 확인됨`);
                
                // 자동화 시작 확인
                const confirmed = await Utils.showConfirmDialog(
                    '자동화 시작',
                    `${accounts.length}개 계정으로 자동화를 시작하시겠습니까?\n\n` +
                    `URL 파일: ${urlFileStatus.urlFilePath}\n` +
                    `계정: ${accounts.map(acc => acc.naverId).join(', ')}`
                );
                
                if (!confirmed) {
                    console.log('❌ 사용자가 자동화 시작을 취소함');
                    return;
                }
                
                // 자동화 시작 전 이미지 폴더 정리
                console.log('🧹 이미지 폴더 정리 시작...');
                StateManager.updateStatus('preparing', '이미지 폴더 정리 중...');
                
                if (window.electronAPI && window.electronAPI.cleanupAllImages) {
                    try {
                        const cleanupResult = await window.electronAPI.cleanupAllImages();
                        if (cleanupResult.success) {
                            console.log('✅ 이미지 폴더 정리 완료:', cleanupResult.message);
                            if (cleanupResult.deletedCount > 0) {
                                Utils.showNotification('폴더 정리 완료', `${cleanupResult.deletedCount}개 이미지 파일이 삭제되었습니다.`, 'info');
                            }
                        } else {
                            console.warn('⚠️ 이미지 폴더 정리 실패:', cleanupResult.error);
                        }
                    } catch (cleanupError) {
                        console.warn('⚠️ 이미지 폴더 정리 중 오류:', cleanupError.message);
                    }
                }
                
                // 자동화 상태 설정
                console.log('🔄 자동화 상태 설정...');
                AppState.automationRunning = true;
                StateManager.updateStatus('running', '자동화 실행 중...');
                StateManager.updateProgress(0);
                this.updateAutomationButtonState();
                
                console.log('✅ 자동화 상태 설정 완료 - 다중 계정 교차 실행 시작');
                
                // 자동화 설정 가져오기 (안전하게 처리)
                        const settings = AppState.settings || { dailyLimit: 3, postDelay: 10 };
        const dailyLimit = parseInt(settings.dailyLimit) || 3;
        const postDelay = parseInt(settings.postDelay) || 10;
                
                console.log(`📊 자동화 설정: 일일 제한 ${dailyLimit}개, 포스팅당 대기시간 ${postDelay}분`);
                
                // 다중 계정 교차 실행
                let result;
                if (accounts.length === 1) {
                    // 단일 계정인 경우 기존 방식 사용
                    console.log('👤 단일 계정 모드로 실행');
                    result = await this.executeAccountAutomation(accounts[0], 0);
                } else {
                    // 다중 계정인 경우 교차 실행
                    console.log(`🔄 다중 계정 교차 실행: ${accounts.length}개 계정`);
                    
                                         try {
                         result = await window.electronAPI.executeAutomationStep({
                             action: 'multi-account-alternating',
                             payload: {
                                 accounts: accounts,
                                 automationCount: dailyLimit, // dailyLimit을 automationCount로 변경
                                 postDelay: postDelay
                             }
                         });
                        
                        console.log('📊 다중 계정 교차 실행 결과:', result);
                        
                    } catch (error) {
                        console.error('❌ 다중 계정 교차 실행 오류:', error);
                        result = {
                            success: false,
                            error: error.message
                        };
                    }
                }
                
                // 결과 처리
                let successCount = 0;
                let failureCount = 0;
                let wasStopped = false;
                
                if (result && result.success) {
                    wasStopped = result.stopped || false; // 중지 여부 확인
                    if (result.data) {
                        successCount = result.data.successCount || 0;
                        failureCount = result.data.errorCount || 0;
                    } else {
                        successCount = 1; // 단일 계정 성공
                    }
                } else {
                    failureCount = accounts.length;
                }
                
                // 모든 계정 처리 완료
                const completionMessage = wasStopped ? '자동화 중지됨' : '모든 계정 처리 완료';
                console.log(`\n🎉 ${completionMessage}!`);
                console.log(`📊 최종 결과 - 성공: ${successCount}개, 실패: ${failureCount}개`);
                
                // 자동화 상태 해제
                console.log('🔄 자동화 상태 해제...');
                AppState.automationRunning = false;
                this.updateAutomationButtonState();
                
                // 최종 결과 표시
                const statusMessage = wasStopped 
                    ? `자동화 중지됨 (성공: ${successCount}개)`
                    : `자동화 완료 (성공: ${successCount}, 실패: ${failureCount})`;
                    
                StateManager.updateStatus(wasStopped ? 'stopped' : 'completed', statusMessage);
                StateManager.updateProgress(100);
                
                // 🔥 결과 다이얼로그 표시 - 중지된 경우와 실패 구분
                if (wasStopped) {
                    Utils.showDialog('info', '자동화 중지됨', 
                        `자동화가 사용자에 의해 중지되었습니다.\n\n` +
                        `처리 완료: ${successCount}개`);
                } else if (successCount > 0) {
                    Utils.showDialog('success', '자동화 완료', 
                        `자동화가 완료되었습니다.\n\n` +
                        `성공: ${successCount}개\n` +
                        `실패: ${failureCount}개`);
                } else {
                    Utils.showDialog('error', '자동화 실패', 
                        `모든 계정의 자동화가 실패했습니다.\n\n` +
                        `실패: ${failureCount}개`);
                }
                
                // 상태 저장 및 UI 업데이트
                Dashboard.updateStats();
                Dashboard.renderExecutionStats(); // 계정별 실행 현황 업데이트
                StateManager.saveState();
                
            } catch (error) {
                console.error('❌ 자동화 실행 오류:', error);
                StateManager.updateStatus('error', '자동화 실행 오류');
                Utils.showDialog('error', '자동화 오류', 
                    `자동화 실행 중 오류가 발생했습니다:\n${error.message}`);
            } finally {
                // 자동화 완료 시 상태 정리
                AppState.automationRunning = false;
                this.updateAutomationButtonState();
                Dashboard.updateStats();
                Dashboard.renderExecutionStats(); // 계정별 실행 현황 최종 업데이트
                StateManager.saveState();
            }
            
        } catch (error) {
            console.error('❌ 자동화 시작 오류:', error);
            StateManager.updateStatus('error', '자동화 시작 오류');
            Utils.showDialog('error', '자동화 시작 오류', 
                `자동화 시작 중 오류가 발생했습니다: ${error.message}`);
        }
    }

    // 자동화 완전 중지
    static async stopAutomation() {
        if (!AppState.automationRunning) {
            console.log('⚠️ 자동화가 실행 중이 아닙니다');
            return;
        }

        try {
            console.log('🛑 자동화 중지 요청');
            
            // 🔥 즉시 자동화 상태를 false로 설정 (루프 중단을 위해)
            console.log('🛑 자동화 상태 즉시 중지 설정...');
            AppState.automationRunning = false;
            
            // UI 상태 즉시 업데이트
            this.updateButtonText('자동화 중지 중...');
            this.updateStopButtonText('중지 중...');
            UI.stopAutomationBtn.disabled = true; // 중지 버튼 즉시 비활성화
            StateManager.updateStatus('stopping', '자동화 중지 중...');
            
            // 확인 다이얼로그 표시
            const confirmed = await Utils.showConfirmDialog(
                '자동화 중지', 
                '진행 중인 자동화를 완전히 중지하시겠습니까?\n\n• 모든 작업이 즉시 중단됩니다\n• 브라우저가 모두 종료됩니다\n• 다운로드된 이미지가 모두 삭제됩니다\n• 처리 중인 URL은 저장되지 않습니다'
            );

            if (!confirmed) {
                console.log('❌ 사용자가 중지를 취소했습니다');
                
                // 취소 시 상태 복원
                AppState.automationRunning = true;
                this.updateAutomationButtonState();
                StateManager.updateStatus('running', '자동화 실행 중...');
                return;
            }

            console.log('🔄 자동화 중지 프로세스 시작...');

            // Electron API가 있는 경우 백엔드 자동화 완전 중지
            if (window.electronAPI) {
                console.log('🔌 백엔드 자동화 완전 중지 요청...');
                
                try {
                                         // 중지 명령 전송
                     const result = await window.electronAPI.executeAutomationStep({
                         action: 'stop',
                         payload: {}
                     });
                    
                    if (result && result.success) {
                        console.log('✅ 백엔드 자동화 중지 완료');
                        
                        // 삭제된 이미지 개수 표시
                        const deletedImages = result.deletedImages || 0;
                        if (deletedImages > 0) {
                            console.log(`🗑️ ${deletedImages}개 이미지 파일 삭제됨`);
                            Utils.showNotification('이미지 정리 완료', `${deletedImages}개 이미지 파일이 삭제되었습니다.`, 'info');
                        }
                    } else {
                        console.error('❌ 백엔드 자동화 중지 실패:', result?.error || '알 수 없는 오류');
                        Utils.showNotification('중지 경고', '일부 프로세스 중지에 실패했을 수 있습니다.', 'warning');
                    }
                } catch (stopError) {
                    console.error('❌ 백엔드 중지 요청 실패:', stopError);
                    Utils.showNotification('중지 오류', '백엔드 중지 요청에 실패했습니다.', 'error');
                }
            }

            // 상태 완전 초기화
            console.log('🔄 상태 초기화 중...');
            AppState.automationRunning = false;
            StateManager.updateStatus('idle', '자동화 중지됨');
            StateManager.updateProgress(0);
            
            // 🔥 UI에서 진행 중인 카운트다운 즉시 중단
            console.log('🔄 UI 카운트다운 중단...');
            
            // 버튼 상태 즉시 복원
            console.log('🔄 버튼 상태 복원 중...');
            UI.startAutomationBtn.disabled = false;
            UI.stopAutomationBtn.disabled = true;
            UI.startAutomationBtn.innerHTML = '<span>🚀 자동화 시작</span>';
            UI.stopAutomationBtn.innerHTML = '<span>🛑 중지</span>';
            
            // 전체 버튼 상태 업데이트
            this.updateAutomationButtonState();
            Dashboard.updateStats();
            Dashboard.renderExecutionStats();
            StateManager.saveState();

            console.log('✅ 자동화 완전 중지 완료');
            
            Utils.showDialog('success', '자동화 중지 완료', 
                '자동화가 완전히 중지되었습니다.\n\n' +
                '• 모든 브라우저가 종료되었습니다\n' +
                '• 다운로드된 이미지들이 삭제되었습니다\n' +
                '• 시스템이 초기 상태로 복원되었습니다'
            );

        } catch (error) {
            console.error('❌ 자동화 중지 실패:', error);
            
            // 오류 발생 시에도 상태 초기화
            AppState.automationRunning = false;
            StateManager.updateStatus('error', '중지 실패');
            this.updateAutomationButtonState();
            
            Utils.showDialog('error', '중지 실패', 
                `자동화 중지 중 오류가 발생했습니다:\n${error.message}\n\n` +
                '상태가 초기화되었습니다. 필요시 앱을 재시작해주세요.'
            );
        }
    }
    
    static async executeAccountAutomation(account, accountIndex) {
        console.log('🚀 [빌드 디버깅] 계정별 자동화 실행 시작');
        console.log('📋 계정 정보:', {
            naverId: account.naverId,
            blogId: account.blogId,
            affiliateId: account.affiliateId,
            categoryId: account.categoryId,
            accountIndex: accountIndex
        });
        
        try {
            // Electron API가 있는 경우 실제 자동화 실행
            if (window.electronAPI) {
                console.log('✅ Electron API 사용 가능 - IPC 통신 시작');
                
                // Main 프로세스 준비 상태 확인
                console.log('🔍 Main 프로세스 준비 상태 확인...');
                try {
                    const readyStatus = await window.electronAPI.checkMainProcessReady();
                    console.log('📊 Main 프로세스 준비 상태:', readyStatus);
                    
                    if (!readyStatus.success || !readyStatus.ready?.blogAutomation) {
                        throw new Error('Main 프로세스가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
                    }
                    
                    console.log('✅ Main 프로세스 준비 완료');
                } catch (readyError) {
                    console.error('❌ Main 프로세스 준비 상태 확인 실패:', readyError);
                    throw new Error('Main 프로세스 상태를 확인할 수 없습니다. 앱을 재시작해주세요.');
                }
                
                // IPC 핸들러 등록 상태 확인
                console.log('🔍 IPC 핸들러 등록 상태 확인...');
                try {
                    const handlerStatus = await window.electronAPI.checkIpcHandlers();
                    console.log('📋 IPC 핸들러 등록 상태:', handlerStatus);
                } catch (handlerError) {
                    console.error('❌ IPC 핸들러 상태 확인 실패:', handlerError);
                }
                
                // 자동화 시작 전 URL 파일 상태 확인
                console.log('🔍 URL 파일 상태 사전 확인...');
                try {
                    const urlFileStatus = await window.electronAPI.getAutomationStatus();
                    console.log('📂 현재 URL 파일 상태:', urlFileStatus);
                    
                    if (!urlFileStatus.success || !urlFileStatus.hasUrlFile) {
                        throw new Error('URL 파일이 업로드되지 않았습니다. 먼저 URL 파일을 업로드해주세요.');
                    }
                } catch (statusError) {
                    console.error('❌ URL 파일 상태 확인 실패:', statusError);
                    throw new Error('URL 파일 상태를 확인할 수 없습니다. 먼저 URL 파일을 업로드해주세요.');
                }
                
                console.log('📡 executeAutomationStep 호출 시작');
                console.time('executeAutomationStep 실행 시간');
                
                // payload 먼저 선언
                const payload = {
                    action: 'single-account',
                    payload: {
                        id: account.naverId,
                        username: account.naverId,
                        password: account.naverPassword,
                        blogId: account.blogId,
                        isActive: true,
                        affiliateId: account.affiliateId,
                        geminiApi: account.geminiApi,
                        categoryId: account.categoryId
                    }
                };
                
                console.log('🔍 IPC 호출 직전 상태 확인:');
                console.log('  - window.electronAPI 존재:', !!window.electronAPI);
                console.log('  - executeAutomationStep 함수 존재:', !!window.electronAPI?.executeAutomationStep);
                console.log('  - payload 유효성:', !!payload && typeof payload === 'object');
                console.log('📤 IPC 요청 데이터 (전체):', JSON.stringify(payload, null, 2));
                
                // 직접 IPC 응답 대기 (타임아웃 증가)
                console.log('🚀 자동화 시작 요청 전송...');
                const result = await window.electronAPI.executeAutomationStep(payload);
                
                console.timeEnd('executeAutomationStep 실행 시간');
                console.log('📥 자동화 완료!');
                console.log('📥 최종 결과:', result);
                
                if (!result) {
                    const error = 'IPC 응답이 null 또는 undefined입니다';
                    console.error('❌ 빈 응답:', error);
                    throw new Error(error);
                }
                
                if (!result.success) {
                    console.error('❌ 자동화 실행 실패:', result.error || '알 수 없는 오류');
                    throw new Error(result.error || '자동화 실행 실패');
                }
                
                console.log('✅ 계정별 자동화 실행 성공');
                
                // 🔥 성공 시 오늘 실행 횟수 증가
                const today = Utils.formatDate();
                const accountId = account.username || account.naverId || account.id;
                const executionKey = `${today}-${accountId}`;
                
                if (!AppState.todayExecutions[executionKey]) {
                    AppState.todayExecutions[executionKey] = 0;
                }
                AppState.todayExecutions[executionKey]++;
                
                console.log(`📊 [실행 횟수 증가] ${accountId}: ${AppState.todayExecutions[executionKey]}회`);
                
                // 상태 저장
                StateManager.saveState();
                
                // UI 업데이트
                Dashboard.updateStats();
                Dashboard.renderExecutionStats();
                
                return result;
            } else {
                // 개발/테스트 환경에서는 시뮬레이션
                console.log('🧪 개발/테스트 환경 - 시뮬레이션 모드');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // 시뮬레이션에서도 실행 횟수 증가
                const today = Utils.formatDate();
                const accountId = account.username || account.naverId || account.id;
                const executionKey = `${today}-${accountId}`;
                
                if (!AppState.todayExecutions[executionKey]) {
                    AppState.todayExecutions[executionKey] = 0;
                }
                AppState.todayExecutions[executionKey]++;
                
                console.log(`📊 [시뮬레이션 실행 횟수 증가] ${accountId}: ${AppState.todayExecutions[executionKey]}회`);
                
                // 상태 저장
                StateManager.saveState();
                
                // UI 업데이트
                Dashboard.updateStats();
                Dashboard.renderExecutionStats();
                
                return { success: true, message: '테스트 실행 완료' };
            }
        } catch (error) {
            console.error('❌ [빌드 디버깅] executeAccountAutomation 오류 (상세):', {
                error: error,
                message: error.message,
                stack: error.stack,
                name: error.name,
                account: account.naverId
            });
            
            // 에러를 throw하지 말고 실패 결과 반환
            return {
                success: false,
                error: error.message || '계정 자동화 실행 실패',
                account: account.naverId,
                details: {
                    errorType: error.name,
                    errorStack: error.stack
                }
            };
        }
    }
}

// 계정 관리
class AccountManager {
    static init() {
        // 계정 추가 폼
        UI.accountForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addAccount();
        });

        // 계정 수정 폼
        UI.editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const index = UI.editForm.dataset.accountIndex;
            if (index !== null && index !== undefined) {
                this.updateAccount(parseInt(index, 10));
            } else {
                console.error('계정 인덱스를 찾을 수 없습니다.');
                Utils.showDialog('error', '오류', '계정 정보를 업데이트하는 데 실패했습니다. 인덱스가 없습니다.');
            }
        });

        // 계정 목록에 이벤트 위임 (수정, 삭제, 활성화 토글)
        UI.accountList.addEventListener('click', (e) => {
            e.preventDefault();
            const action = e.target.dataset.action;
            if (action === 'edit') {
                const index = parseInt(e.target.closest('li').dataset.index, 10);
                this.editAccount(index);
            } else if (action === 'delete') {
                const index = parseInt(e.target.closest('li').dataset.index, 10);
                this.deleteAccount(index);
            } else if (action === 'toggle') {
                const index = parseInt(e.target.closest('li').dataset.index, 10);
                this.toggleAccount(index, e.target.checked);
            }
        });
    }
    
    // 계정 목록 조회 메서드 추가
    static getAccounts() {
        return AppState.accounts || [];
    }
    
    // 활성 계정 목록 조회 메서드 추가
    static getActiveAccounts() {
        return (AppState.accounts || []).filter(account => account.isActive);
    }
    
    static async addAccount() {
        const naverId = UI.naverIdInput.value.trim();
        const naverPassword = UI.naverPasswordInput.value.trim();
        const blogId = UI.blogIdInput.value.trim();
        const affiliateId = UI.affiliateIdInput.value.trim();
        const geminiApi = UI.geminiApiInput.value.trim();
        const categoryId = UI.categoryIdInput.value;
        const nickname = UI.nicknameInput.value.trim();
        const linkPriceCid = UI.linkPriceCidInput.value.trim();

        if (!naverId || !naverPassword || !blogId) {
            Utils.showDialog('error', '입력 오류', '네이버 아이디, 비밀번호, 블로그 아이디는 필수입니다.');
            return;
        }

        const accountData = {
            id: 'acc_' + Utils.generateId(),
            username: naverId,
            password: naverPassword,
            nickname: nickname || naverId,
            blogId: blogId,
            affiliateId: affiliateId,
            geminiApi: geminiApi,
            categoryId: categoryId,
            linkPriceCid: linkPriceCid,
            isActive: true,
            isValidated: false,
            createdAt: new Date().toISOString()
        };

        try {
            const result = await window.electronAPI.manageAccount({ action: 'add', data: accountData });
            if (result.success) {
                Utils.showDialog('success', '성공', '계정이 성공적으로 추가되었습니다.');
                UI.accountForm.reset();
                await StateManager.loadAccountsFromConfigManager();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('계정 추가 실패:', error);
            Utils.showDialog('error', '오류', `계정 추가 중 오류가 발생했습니다: ${error.message}`);
        }
    }
    
    static renderAccounts() {
        if (!UI.accountList) return;
        
        const accounts = AccountManager.getAccounts();
        
        if (accounts.length === 0) {
            UI.accountList.innerHTML = `
                <div class="card" style="text-align: center; padding: 2rem;">
                    <h3 class="card-title">등록된 계정 없음</h3>
                    <p>위 폼을 사용하여 계정을 추가해주세요.</p>
                </div>
            `;
            return;
        }
        
        UI.accountList.innerHTML = accounts.map((account, index) => `
            <div class="account-item">
                <div class="account-header">
                    <div class="account-title">
                        ${account.naverId}
                        ${account.isValidated ? '<span class="validation-badge">✅ 연결됨</span>' : '<span class="validation-badge warning">⚠️ 미연결</span>'}
                    </div>
                    <div class="account-toggle">
                        <label class="toggle-switch">
                            <input type="checkbox" ${account.isActive ? 'checked' : ''} 
                                   onchange="AccountManager.toggleAccount(${index}, this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="toggle-label">${account.isActive ? '활성' : '비활성'}</span>
                    </div>
                    <div class="account-actions">
                        <button class="btn btn-sm btn-secondary" onclick="AccountManager.editAccount(${index})">
                            ✏️ 수정
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="handleDeleteAccount(${index})">
                            🗑️ 삭제
                        </button>
                    </div>
                </div>
                <div class="account-grid">
                    <div class="account-field">
                        <div class="account-field-label">블로그 ID</div>
                        <div class="account-field-value">${account.blogId}</div>
                    </div>
                    <div class="account-field">
                        <div class="account-field-label">어필리에이트 ID</div>
                        <div class="account-field-value">${account.affiliateId}</div>
                    </div>
                    <div class="account-field">
                        <div class="account-field-label">카테고리 ID</div>
                        <div class="account-field-value">${account.categoryId}</div>
                    </div>
                    <div class="account-field">
                        <div class="account-field-label">링크 프라이스 CID</div>
                        <div class="account-field-value">${account.linkPriceCid || '<span style="color: var(--text-muted);">미등록</span>'}</div>
                    </div>
                    <div class="account-field">
                        <div class="account-field-label">등록일</div>
                        <div class="account-field-value">${new Date(account.createdAt).toLocaleDateString('ko-KR')}</div>
                    </div>
                    <div class="account-field">
                        <span class="account-field-label">비밀번호</span>
                        <span class="account-field-value">${account.password || account.naverPassword || ''}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        // 🔥 완전 자동화 계정 선택기도 업데이트
        if (typeof FullAutomationManager !== 'undefined' && FullAutomationManager.renderAccountSelector) {
            FullAutomationManager.renderAccountSelector();
        }
        
        // 🔥 아고다 자동화 계정 선택기도 업데이트
        if (typeof AgodaAutomationManager !== 'undefined' && AgodaAutomationManager.updateAgodaAccountSelector) {
            AgodaAutomationManager.updateAgodaAccountSelector();
        }
    }
    
    // 계정 활성화/비활성화 토글
    static toggleAccount(index, isActive) {
        console.log(`🔄 계정 토글: ${index}, 활성화: ${isActive}`);
        
        if (index >= 0 && index < AppState.accounts.length) {
            // 계정 상태 변경
            AppState.accounts[index].isActive = isActive;
            
            console.log(`✅ 계정 ${AppState.accounts[index].naverId || AppState.accounts[index].username} ${isActive ? '활성화' : '비활성화'}`);
            
            // 상태 저장
            StateManager.saveState();
            
            // 대시보드 통계 업데이트
            Dashboard.updateStats();
            
            // 🔥 자동화 버튼 상태 즉시 업데이트
            Dashboard.updateAutomationButtonState();
            
            console.log('📊 계정 토글 후 버튼 상태 업데이트 완료');
        } else {
            console.error('❌ 잘못된 계정 인덱스:', index);
        }
    }
    
    static editAccount(index) {
        const account = AppState.accounts[index];
        UI.editForm.dataset.accountIndex = index;
        UI.editNaverId.value = account.username;
        UI.editNaverPassword.value = account.password || account.naverPassword || '';
        UI.editBlogId.value = account.blogId;
        UI.editAffiliateId.value = account.affiliateId || '';
        UI.editGeminiApi.value = account.geminiApi || '';
        UI.editCategoryId.value = account.categoryId || '';
        UI.editNickname.value = account.nickname || '';
        UI.editLinkPriceCid.value = account.linkPriceCid || '';
        UI.editModal.classList.add('show');
    }
    
    static async updateAccount(index) {
        const account = AppState.accounts[index];
        if (!account) {
            Utils.showDialog('error', '오류', '업데이트할 계정 정보를 찾을 수 없습니다.');
            return;
        }

        const submitButton = UI.editForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="loading-spinner"></span> 계정 확인 중...';

        const cidValue = UI.editLinkPriceCid.value.trim();
        console.log(`🔍 [CID 디버깅] 편집 폼에서 읽은 CID 값:`, cidValue);
        console.log(`🔍 [CID 디버깅] UI.editLinkPriceCid 요소:`, UI.editLinkPriceCid);
        console.log(`🔍 [CID 디버깅] UI.editLinkPriceCid.value:`, UI.editLinkPriceCid.value);
        
        const updatedData = {
            id: account.id,
            username: UI.editNaverId.value.trim(),
            password: UI.editNaverPassword.value.trim(),
            nickname: UI.editNickname.value.trim() || UI.editNaverId.value.trim(),
            blogId: UI.editBlogId.value.trim(),
            affiliateId: UI.editAffiliateId.value.trim(),
            geminiApi: UI.editGeminiApi.value.trim(),
            categoryId: UI.editCategoryId.value,
            linkPriceCid: cidValue || '',
            isValidated: account.isValidated,
        };
        
        console.log(`🔍 [CID 디버깅] 전송할 updatedData:`, updatedData);

        if (!updatedData.username || !updatedData.password || !updatedData.blogId) {
            Utils.showDialog('error', '입력 오류', '네이버 아이디, 비밀번호, 블로그 아이디는 필수입니다.');
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
            return;
        }

        try {
            const validationResult = await window.electronAPI.validateNaverId(updatedData.username, updatedData.password);
            if (!validationResult.success || !validationResult.isValid) {
                Utils.showDialog('error', '계정 확인 실패', validationResult.message || '네이버 계정을 확인할 수 없습니다.');
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                return;
            }
            updatedData.isValidated = true;
            
            console.log(`🔍 [CID 디버깅] 최종 전송 데이터:`, JSON.stringify(updatedData, null, 2));
            
            submitButton.innerHTML = '<span class="loading-spinner"></span> 정보 저장 중...';

            const result = await window.electronAPI.manageAccount({ action: 'update', data: updatedData });
            
            if (result.success) {
                Utils.showDialog('success', '성공', '계정 정보가 성공적으로 업데이트되었습니다.');
                this.closeEditModal();
                await StateManager.loadAccountsFromConfigManager();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('계정 업데이트 실패:', error);
            Utils.showDialog('error', '오류', `계정 업데이트 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    }
    
    static async deleteAccount(index) {
        const account = AppState.accounts[index];
        if (!account) return;
        
        const confirmed = await Utils.showConfirmDialog(
            '계정 삭제 확인', 
            `정말로 "${account.naverId}" 계정을 삭제하시겠습니까?`
        );
        
        if (confirmed) {
            // Electron API를 통해 시스템에서 계정 제거
            if (window.electronAPI) {
                try {
                    const result = await window.electronAPI.manageAccount({
                        action: 'delete',
                        data: {
                            id: account.id
                        }
                    });
                    
                    if (!result.success) {
                        console.warn(`시스템 계정 삭제 실패: ${result.error}`);
                        // 시스템 삭제가 실패해도 로컬에서는 제거
                    }
                } catch (error) {
                    console.warn(`시스템 계정 삭제 오류: ${error.message}`);
                }
            }
            
            AppState.accounts.splice(index, 1);
            
            // 선택된 계정 인덱스 업데이트
            AppState.selectedAccounts = AppState.selectedAccounts.filter(i => i !== index)
                .map(i => i > index ? i - 1 : i);
            
            // UI 업데이트
            this.renderAccounts();
            Dashboard.updateStats();
            Dashboard.updateAutomationButtonState(); // 자동화 버튼 상태 업데이트
            StateManager.saveState();
            
            Utils.showDialog('success', '계정 삭제 완료', `${account.naverId} 계정이 삭제되었습니다.`);
        }
    }
    
    static closeEditModal() {
        UI.editModal.classList.remove('show');
    }
}

// 설정 관리
class SettingsManager {
    static init() {
        UI.saveSettingsBtn.addEventListener('click', () => {
            this.saveSettings();
        });
    }
    
    static loadSettings() {
        // 설정이 없으면 기본값으로 초기화
        if (!AppState.settings) {
            AppState.settings = {
                postDelay: 10,
                dailyLimit: 3
            };
        }
        
        UI.postDelayInput.value = AppState.settings.postDelay || 10;
        UI.dailyLimitInput.value = AppState.settings.dailyLimit || 3;
        return AppState.settings;
    }
    
    static saveSettings() {
        const postDelayValue = parseInt(UI.postDelayInput.value);
        const dailyLimitValue = parseInt(UI.dailyLimitInput.value);
        
        // 포스팅당 대기시간 최소값 검증 (10분 이상)
        if (postDelayValue < 10) {
            Utils.showDialog('error', '설정 오류', '포스팅당 대기시간은 최소 10분 이상이어야 합니다.');
            UI.postDelayInput.value = 10; // 최소값으로 자동 수정
            return;
        }
        
        AppState.settings = {
            postDelay: postDelayValue,
            dailyLimit: dailyLimitValue
        };
        
        StateManager.saveState();
        Utils.showDialog('success', '설정 저장', '자동화 설정이 성공적으로 저장되었습니다.');
    }
}

// 자동 업데이트 관리 (새로 추가)
class UpdateManager {
    static init() {
        if (!window.electronAPI) {
            console.log('⚠️ Electron API 없음 - 자동 업데이트 비활성화');
            return;
        }
        
        // 업데이트 로그 메시지 리스너 (새로 추가)
        window.electronAPI.onUpdateLog((event, message) => {
            console.log('📋 업데이트 로그:', message);
            this.addLog(message);
        });
        
        // 자동 업데이트 이벤트 리스너 등록
        window.electronAPI.onUpdateAvailable((event, info) => {
            console.log('📦 업데이트 사용 가능:', info.version);
            this.showUpdateAvailableDialog(info);
        });
        
        window.electronAPI.onUpdateDownloaded((event, info) => {
            console.log('🎉 업데이트 다운로드 완료:', info.version);
            this.showUpdateReadyDialog(info);
        });
        
        window.electronAPI.onDownloadProgress((event, progress) => {
            console.log(`📥 업데이트 다운로드 진행률: ${Math.round(progress.percent)}%`);
            this.updateDownloadProgress(progress);
        });
        
        // 메인 프로세스 로그 리스너 추가
        window.electronAPI.onMainProcessLog((logData) => {
            try {
                // logData가 유효한지 먼저 확인
                if (!logData || typeof logData !== 'object') {
                    console.warn('잘못된 로그 데이터 수신:', logData);
                    return;
                }

                // 기본값과 함께 안전하게 구조분해 할당
                const { 
                    level = 'info', 
                    message = '메시지 없음', 
                    timestamp = new Date().toISOString() 
                } = logData;
                
                const timeStr = new Date(timestamp).toLocaleTimeString();
                
                // 로그 레벨에 따라 다른 스타일로 출력
                switch (level) {
                    case 'error':
                        console.error(`[${timeStr}] [MAIN] ${message}`);
                        break;
                    case 'warn':
                        console.warn(`[${timeStr}] [MAIN] ${message}`);
                        break;
                    default:
                        console.log(`[${timeStr}] [MAIN] ${message}`);
                        break;
                }
                
                // 로그 뷰어가 있다면 거기에도 추가
                addToLogViewer(level, message, timestamp, 'MAIN');
            } catch (error) {
                console.error('메인 프로세스 로그 처리 중 오류:', error);
            }
        });

        // 다중 계정 교차 실행 진행 상황 리스너 추가
        if (window.electronAPI.onAccountProgressUpdate) {
            window.electronAPI.onAccountProgressUpdate((progressData) => {
                try {
                    const {
                        currentAccount,
                        currentAccountIndex,
                        totalAccounts,
                        accountPostCount,
                        dailyLimit,
                        totalPosts,
                        maxTotalPosts
                    } = progressData;

                    console.log(`🎯 계정 진행 상황: ${currentAccount} (${accountPostCount}/${dailyLimit}) - 전체 ${totalPosts}/${maxTotalPosts}`);
                    
                    // UI 업데이트
                    StateManager.updateStatus('running', 
                        `${currentAccount} 포스팅 중... (${accountPostCount}/${dailyLimit}) - 전체 ${totalPosts}/${maxTotalPosts}`
                    );
                    
                    const progress = Math.round((totalPosts / maxTotalPosts) * 100);
                    StateManager.updateProgress(progress);
                    
                    Dashboard.updateUrlProgress(totalPosts, maxTotalPosts, currentAccount);
                    
                } catch (error) {
                    console.error('계정 진행 상황 업데이트 오류:', error);
                }
            });
        }
        


        // 포스팅 대기 상태 리스너 추가
        if (window.electronAPI.onWaitingUpdate) {
            window.electronAPI.onWaitingUpdate((waitData) => {
                try {
                    // 🔥 자동화가 중지된 경우 대기 상태 업데이트 무시
                    if (!AppState.automationRunning) {
                        console.log('⏹️ 자동화 중지됨 - 대기 상태 업데이트 무시');
                        return;
                    }
                    
                    const { 
                        waitTimeMinutes, 
                        nextAccount, 
                        remainingMinutes, 
                        remainingSeconds,
                        remainingTimeMs 
                    } = waitData;
                    
                    // 남은 시간이 있는 경우 (실시간 업데이트)
                    if (remainingMinutes !== undefined && remainingSeconds !== undefined) {
                        const timeDisplay = remainingMinutes > 0 
                            ? `${remainingMinutes}분 ${remainingSeconds}초`
                            : `${remainingSeconds}초`;
                            
                        console.log(`⏸️ 포스팅 대기 중: ${timeDisplay}, 다음 계정: ${nextAccount}`);
                        
                        StateManager.updateStatus('waiting', 
                            `포스팅 대기 중... (${timeDisplay}) - 다음: ${nextAccount}`
                        );
                    } else {
                        // 초기 대기 시작 (전체 시간 표시)
                        console.log(`⏸️ 포스팅 대기 중: ${waitTimeMinutes}분, 다음 계정: ${nextAccount}`);
                        
                        StateManager.updateStatus('waiting', 
                            `포스팅 대기 중... (${waitTimeMinutes}분) - 다음: ${nextAccount}`
                        );
                        
                        // 카운트다운 표시
                        if (waitTimeMinutes) {
                            Dashboard.showCountdown(waitTimeMinutes * 60, `다음 계정: ${nextAccount}`);
                        }
                    }
                    
                } catch (error) {
                    console.error('대기 상태 업데이트 오류:', error);
                }
            });
        }

        // 포스트 카운트 실시간 업데이트 리스너 추가
        if (window.electronAPI.onPostCountUpdate) {
            window.electronAPI.onPostCountUpdate((countData) => {
                try {
                    console.log('📊 포스트 카운트 실시간 업데이트 수신:', countData);
                    
                    const { accountId, dailyPostKey, increment } = countData;
                    
                    console.log('📊 업데이트 전 AppState.todayExecutions:', AppState.todayExecutions);
                    
                    // AppState의 todayExecutions 업데이트
                    const oldCount = AppState.todayExecutions[dailyPostKey] || 0;
                    AppState.todayExecutions[dailyPostKey] = oldCount + increment;
                    const newCount = AppState.todayExecutions[dailyPostKey];
                    
                    console.log(`📊 카운트 업데이트: ${dailyPostKey} - ${oldCount} -> ${newCount}`);
                    console.log('📊 업데이트 후 AppState.todayExecutions:', AppState.todayExecutions);
                    
                    // 상태 저장
                    StateManager.saveState();
                    console.log('📊 StateManager.saveState() 호출 완료');
                    
                    // UI 업데이트
                    console.log('📊 Dashboard UI 업데이트 시작...');
                    Dashboard.updateStats();
                    Dashboard.renderExecutionStats();
                    console.log('📊 Dashboard UI 업데이트 완료');
                    
                    console.log(`✅ 포스트 카운트 업데이트 완료: ${accountId} - ${newCount}개`);
                    
                } catch (error) {
                    console.error('❌ 포스트 카운트 업데이트 오류:', error);
                }
            });
        } else {
            console.warn('⚠️ window.electronAPI.onPostCountUpdate가 사용할 수 없습니다');
        }
        
        console.log('🔄 자동 업데이트 시스템 초기화 완료');
    }
    
    static showUpdateAvailableDialog(info) {
        const message = `새로운 버전 ${info.version}이 사용 가능합니다.\n\n업데이트를 다운로드하시겠습니까?`;
        
        // 사용자에게 업데이트 알림 표시
        Utils.showNotification('업데이트 사용 가능', `새 버전 ${info.version} 다운로드 가능`, 'info');
        
        // 확인 다이얼로그 표시
        Utils.showConfirmDialog('업데이트 사용 가능', message).then((confirmed) => {
            if (confirmed) {
                // 자동으로 다운로드 시작됨 (electron-updater가 처리)
                Utils.showDialog('info', '업데이트 다운로드', '업데이트를 다운로드하고 있습니다. 잠시만 기다려주세요.');
            } else {
                console.info('사용자가 업데이트를 거부했습니다.');
            }
        });
    }
    
    static showUpdateReadyDialog(info) {
        const message = `새로운 버전 ${info.version} 다운로드가 완료되었습니다.\n\n지금 재시작하여 업데이트를 적용하시겠습니까?`;
        
        // 업데이트 준비 완료 알림
        Utils.showNotification('업데이트 준비 완료', `버전 ${info.version} 설치 준비 완료`, 'success');
        
        // 재시작 확인 다이얼로그
        Utils.showConfirmDialog('업데이트 설치', message).then((confirmed) => {
            if (confirmed) {
                console.info('사용자가 업데이트 설치를 승인했습니다. 앱을 재시작합니다.');
                window.electronAPI.installUpdate();
            } else {
                console.info('사용자가 업데이트 설치를 연기했습니다.');
                Utils.showDialog('info', '업데이트 연기', '다음에 앱을 시작할 때 업데이트가 적용됩니다.');
            }
        });
    }
    
    static updateDownloadProgress(progress) {
        // 진행률 표시 (필요시 UI 업데이트)
        const percent = Math.round(progress.percent);
        console.info(`업데이트 다운로드 진행률: ${percent}%`);
    }
    
    static async checkForUpdates() {
        if (!window.electronAPI) {
            Utils.showDialog('error', '업데이트 확인 실패', 'Electron API를 사용할 수 없습니다.');
            return;
        }
        
        try {
            console.info('수동 업데이트 확인 시작...');
            const result = await window.electronAPI.checkForUpdates();
            
            if (result.success) {
                console.info('업데이트 확인 완료');
                Utils.showDialog('info', '업데이트 확인', '업데이트 확인이 완료되었습니다.');
            } else {
                console.error(`업데이트 확인 실패: ${result.error}`);
                Utils.showDialog('error', '업데이트 확인 실패', `업데이트 확인 중 오류가 발생했습니다: ${result.error}`);
            }
        } catch (error) {
            console.error(`업데이트 확인 오류: ${error.message}`);
            Utils.showDialog('error', '업데이트 확인 오류', `업데이트 확인 중 오류가 발생했습니다: ${error.message}`);
        }
    }

    static addLog(message) {
        const container = document.getElementById('update-log-container');
        if (!container) return;

        // 초기 메시지 삭제
        if (container.innerHTML.includes('업데이트 시스템 초기화 중...')) {
            container.innerHTML = '';
        }

        const logItem = document.createElement('div');
        logItem.className = 'update-log-item';
        logItem.textContent = message;
        container.appendChild(logItem);
        container.scrollTop = container.scrollHeight; // 항상 최신 로그가 보이도록 스크롤
    }
}

// 전역 함수들 (HTML에서 호출)
function closeEditModal() {
    AccountManager.closeEditModal();
}

async function handleDeleteAccount(index) {
    await AccountManager.deleteAccount(index);
}

function closeDialog() {
    const dialog = document.getElementById('message-dialog');
    dialog.classList.remove('show');
}

function closeConfirmDialog(result) {
    const dialog = document.getElementById('confirm-dialog');
    dialog.classList.remove('show');
    
    // Promise resolve 실행
    if (window._confirmResolve) {
        window._confirmResolve(result);
        window._confirmResolve = null;
    }
}

// 버전 관리 클래스
class VersionManager {
    /**
     * 앱 버전을 로드하여 UI에 표시
     */
    static async loadAndDisplayVersion() {
        try {
            console.log('📱 앱 버전 로드 중...');
            
            if (window.electronAPI && window.electronAPI.getAppVersion) {
                const result = await window.electronAPI.getAppVersion();
                
                if (result.success && result.version) {
                    const versionElement = document.getElementById('app-version');
                    if (versionElement) {
                        versionElement.textContent = `v${result.version}`;
                        console.log(`✅ 앱 버전 표시 완료: v${result.version}`);
                    } else {
                        console.warn('⚠️ 버전 표시 요소를 찾을 수 없습니다');
                    }
                } else {
                    console.warn('⚠️ 버전 정보를 가져올 수 없습니다:', result.error);
                }
            } else {
                console.warn('⚠️ Electron API를 사용할 수 없습니다');
                // 개발 환경에서는 기본 버전 표시
                const versionElement = document.getElementById('app-version');
                if (versionElement) {
                    versionElement.textContent = 'v개발버전';
                }
            }
        } catch (error) {
            console.error('❌ 버전 로드 실패:', error);
            const versionElement = document.getElementById('app-version');
            if (versionElement) {
                versionElement.textContent = 'v?.?.?';
            }
        }
    }
}

// 페이지 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 로그 뷰어 생성 (초기화 시작과 함께)
    // createLogViewer();
    // console.log('📋 로그 뷰어 생성 완료');
    
    console.log('🚀 렌더러 프로세스 시작');
    console.log('📡 메인 프로세스 로그 수신 준비 완료');
    
    // 초기 상태 설정
    StateManager.updateStatus('idle', '시스템 준비 완료');
    console.info('✅ 네파스가 시작되었습니다.');
    
    // 버전 정보 로드
    if (window.electronAPI) {
        VersionManager.loadAndDisplayVersion();
    }
    
    // Electron API 연결 확인 및 IPC 이벤트 리스너 등록
    if (window.electronAPI) {
        console.info('🔌 Electron API 연결 완료');
        
        // 로그 수신
        window.electronAPI.onLog((level, message, data) => {
            addToLogViewer(level, message, new Date().toISOString(), 'MAIN');
        });
        
        // 실시간 URL 진행 상황 수신
        window.electronAPI.onUrlProgress((progressData) => {
            const { currentUrl, totalUrls, accountName, url, progress } = progressData;
            
            // 버튼 텍스트 업데이트
            Dashboard.updateUrlProgress(currentUrl, totalUrls, accountName);
            
            // 진행률 바 업데이트
            StateManager.updateProgress(progress);
            
            console.log(`📊 실시간 진행 상황: ${currentUrl}/${totalUrls} - ${accountName}`);
        });
        
        console.log('📡 IPC 이벤트 리스너 등록 완료');
    } else {
        console.warn('⚠️ Electron API 미연결 - 일부 기능이 제한됩니다');
    }
    
    // 알림 권한 요청
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            console.log('🔔 알림 권한:', permission);
        });
    }
    
    // Dialog ESC 키 이벤트 리스너
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const messageDialog = document.getElementById('message-dialog');
            const confirmDialog = document.getElementById('confirm-dialog');
            const editModal = document.getElementById('edit-account-modal');
            
            if (messageDialog && messageDialog.classList.contains('show')) {
                closeDialog();
            } else if (confirmDialog && confirmDialog.classList.contains('show')) {
                closeConfirmDialog(false);
            } else if (editModal && editModal.classList.contains('show')) {
                closeEditModal();
            }
        }
    });
    
    // Message Dialog 오버레이 클릭으로 닫기
    const messageDialogOverlay = document.getElementById('message-dialog');
    if (messageDialogOverlay) {
        messageDialogOverlay.addEventListener('click', (e) => {
            if (e.target === messageDialogOverlay) {
                closeDialog();
            }
        });
    }
    
    // Confirm Dialog 오버레이 클릭으로 닫기
    const confirmDialogOverlay = document.getElementById('confirm-dialog');
    if (confirmDialogOverlay) {
        confirmDialogOverlay.addEventListener('click', (e) => {
            if (e.target === confirmDialogOverlay) {
                closeConfirmDialog(false);
            }
        });
    }
    
    // Edit Account Modal 오버레이 클릭으로 닫기
    const editModalOverlay = document.getElementById('edit-account-modal');
    if (editModalOverlay) {
        editModalOverlay.addEventListener('click', (e) => {
            if (e.target === editModalOverlay) {
                closeEditModal();
            }
        });
    }
    
    console.log('🎉 모든 초기화 작업 완료');
});

/**
 * 버전 정보 로드
 */
async function loadVersionInfo() {
    try {
        console.log('📱 버전 정보 로드 시작...');
        
        const result = await window.electronAPI.getAppInfo();
        
        if (result && result.success && result.data) {
            const { version } = result.data;
            const versionElement = document.getElementById('version-number');
            
            if (versionElement) {
                versionElement.textContent = `v${version}`;
                console.log(`✅ 버전 정보 로드 완료: v${version}`);
            } else {
                console.warn('⚠️ 버전 표시 요소를 찾을 수 없습니다');
            }
        } else {
            console.error('❌ 버전 정보 로드 실패:', result?.error || '알 수 없는 오류');
            const versionElement = document.getElementById('version-number');
            if (versionElement) {
                versionElement.textContent = '오류';
            }
        }
    } catch (error) {
        console.error('❌ 버전 정보 로드 중 오류:', error);
        const versionElement = document.getElementById('version-number');
        if (versionElement) {
            versionElement.textContent = '오류';
        }
    }
}

/**
 * 로그 뷰어 생성
 */
function createLogViewer() {
    // 로그 뷰어 토글 버튼 생성
    const logToggleBtn = document.createElement('button');
    logToggleBtn.id = 'log-toggle-btn';
    logToggleBtn.innerHTML = '📊 로그 보기';
    logToggleBtn.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 9999;
        background: #007acc;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;
    document.body.appendChild(logToggleBtn);
    
    // 로그 뷰어 컨테이너 생성
    const logViewer = document.createElement('div');
    logViewer.id = 'log-viewer';
    logViewer.style.cssText = `
        position: fixed;
        top: 50px;
        right: 10px;
        width: 500px;
        height: 400px;
        background: rgba(0, 0, 0, 0.9);
        color: #00ff00;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        padding: 10px;
        border-radius: 5px;
        overflow-y: auto;
        z-index: 9998;
        display: none;
        border: 1px solid #333;
    `;
    document.body.appendChild(logViewer);
    
    // 토글 기능
    logToggleBtn.addEventListener('click', () => {
        if (logViewer.style.display === 'none') {
            logViewer.style.display = 'block';
            logToggleBtn.innerHTML = '❌ 로그 닫기';
        } else {
            logViewer.style.display = 'none';
            logToggleBtn.innerHTML = '📊 로그 보기';
        }
    });
    
    console.log('✅ 로그 뷰어 생성 완료');
}

/**
 * 로그 뷰어에 로그 추가
 */
function addToLogViewer(level, message, timestamp, source = 'RENDERER') {
    const logViewer = document.getElementById('log-viewer');
    if (!logViewer) return;
    
    const timeStr = new Date(timestamp).toLocaleTimeString();
    const logEntry = document.createElement('div');
    
    // 로그 레벨에 따른 색상
    let color = '#00ff00'; // 기본 초록색
    switch (level) {
        case 'error':
            color = '#ff4444';
            break;
        case 'warn':
            color = '#ffaa00';
            break;
        case 'info':
            color = '#00aaff';
            break;
    }
    
    logEntry.style.cssText = `
        color: ${color};
        margin-bottom: 2px;
        word-wrap: break-word;
        line-height: 1.2;
    `;
    
    logEntry.innerHTML = `[${timeStr}] [${source}] ${message}`;
    logViewer.appendChild(logEntry);
    
    // 자동 스크롤
    logViewer.scrollTop = logViewer.scrollHeight;
    
    // 최대 1000개 로그 유지
    const logEntries = logViewer.children;
    if (logEntries.length > 1000) {
        logViewer.removeChild(logEntries[0]);
    }
}

// 앱 초기화
class AppInitializer {
    /**
     * 앱 전체 초기화
     */
    static async initialize() {
        try {
            console.log('🚀 네파스 앱 초기화 시작...');
            
            // 1. 버전 정보 로드 및 표시
            await VersionManager.loadAndDisplayVersion();
            
            // 2. 네비게이션 초기화
            Navigation.init();
            
            // 아고다 네비게이션 버튼 상태 업데이트
            Navigation.updateAgodaNavButtonState();
            
            // 3. URL 파일 관리자 초기화
            UrlFileManager.init();
            
            // 4. 계정 관리자 초기화
            AccountManager.init();
            
            // 5. 자동화 버튼 이벤트 리스너
            UI.startAutomationBtn.addEventListener('click', () => {
                Dashboard.startAutomation();
            });

            UI.stopAutomationBtn.addEventListener('click', () => {
                Dashboard.stopAutomation();
            });
            
            // 6. 설정 관리자 초기화
            SettingsManager.init();
            
            // 7. 완전 자동화 관리자 초기화
            FullAutomationManager.init();
            
            // 8. 상태 로드 (다른 초기화보다 먼저)
            await StateManager.loadState();
            
            // 9. 아고다 자동화 관리자 초기화
            AgodaAutomationManager.init();
            
            // 10. 금칙어 관리자 초기화 (상태 로드 후)
            BannedWordsManager.init();
            
            // 11. 업데이트 관리자 초기화
            UpdateManager.init();

            // 11.5. 모바일 APK API 브릿지 초기화
            MobileApiBridge.init();

            // 12. PHOTO 포스팅 이력 관리자 초기화
            PostingHistoryManager.init();
            
            // 13. 모바일 및 사진 발행 자동화 관리자 초기화
            PhotoAutomationManager.init();
            
            // 11. 외부 링크 이벤트 리스너
            document.getElementById('open-side-job-link').addEventListener('click', () => {
                if (window.electronAPI) {
                    window.electronAPI.openExternalUrl('https://cafe.naver.com/zits');
                }
            });

            document.getElementById('open-manual-link').addEventListener('click', () => {
                if (window.electronAPI) {
                    window.electronAPI.openExternalUrl('https://cafe.naver.com/zits/7');
                }
            });
            
            // 12. 대시보드 업데이트
            Dashboard.updateStats();
            
            // 13. 실시간 진행 상황 이벤트 리스너 등록
            if (window.electronAPI) {
                console.info('🔌 Electron API 연결 완료');
                
                // URL 자동화 진행 상황 수신
                if (window.electronAPI.onUrlProgress) {
                    window.electronAPI.onUrlProgress((progressData) => {
                        const { currentUrl, totalUrls, accountName, url, progress } = progressData;
                        
                        // 버튼 텍스트 업데이트
                        Dashboard.updateUrlProgress(currentUrl, totalUrls, accountName);
                        
                        // 진행률 바 업데이트
                        StateManager.updateProgress(progress);
                        
                        console.log(`📊 [URL 자동화] 실시간 진행: ${currentUrl}/${totalUrls} - ${accountName}`);
                    });
                }
                
                // 🔥 아고다 자동화 진행 상황 수신
                if (window.electronAPI.onAgodaProgress) {
                    window.electronAPI.onAgodaProgress((progressData) => {
                        const { currentAccount, totalAccounts, accountName, step, progress, country } = progressData;
                        
                        console.log('🏨===========================================');
                        console.log(`🏨 [아고다 자동화] 실시간 진행 상황`);
                        console.log(`🌍 국가: ${country}`);
                        console.log(`👤 현재 계정: ${accountName} (${currentAccount}/${totalAccounts})`);
                        console.log(`📋 현재 단계: ${step}`);
                        console.log(`📈 진행률: ${Math.round(progress)}%`);
                        console.log('🏨===========================================');
                        
                        // UI 업데이트
                        if (UI.startAgodaAutomationBtn) {
                            UI.startAgodaAutomationBtn.innerHTML = `<span class="loading-spinner"></span> [${currentAccount}/${totalAccounts}] ${accountName} - ${step}`;
                        }
                        StateManager.updateProgress(progress);
                        StateManager.updateStatus('running', `아고다 자동화: ${accountName} - ${step}`);
                    });
                }
                
                // 🔥 아고다 자동화 완료 알림 수신
                if (window.electronAPI.onAgodaComplete) {
                    window.electronAPI.onAgodaComplete((resultData) => {
                        const { successCount, errorCount, errors, totalAccounts } = resultData;
                        
                        console.log('🎉===========================================');
                        console.log('🎉 [아고다 자동화] 백엔드에서 완료 알림 수신');
                        console.log('🎉===========================================');
                        console.log(`✅ 성공한 계정: ${successCount}개`);
                        console.log(`❌ 실패한 계정: ${errorCount}개`);
                        console.log(`📊 전체 계정: ${totalAccounts}개`);
                        
                        if (errors && errors.length > 0) {
                            console.log('📋 실패 상세:');
                            errors.forEach((error, index) => {
                                console.log(`  ${index + 1}. ${error.account}: ${error.error}`);
                            });
                        }
                        console.log('🎉===========================================');
                    });
                }
                
                // 로그 수신
                if (window.electronAPI.onLog) {
                    window.electronAPI.onLog((level, message, data) => {
                        const timestamp = new Date().toLocaleTimeString();
                        console.log(`[${timestamp}] [MAIN] ${message}`);
                    });
                }
                
                console.log('📡 IPC 이벤트 리스너 등록 완료');
            } else {
                console.warn('⚠️ Electron API 미연결 - 일부 기능이 제한됩니다');
            }
            
            console.log('✅ 네파스 앱 초기화 완료');
            
        } catch (error) {
            console.error('❌ 앱 초기화 실패:', error);
            Utils.showDialog('error', '초기화 오류', '앱 초기화 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
        }
    }
}

// DOM 로드 완료 시 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    AppInitializer.initialize();
}); 

// 금칙어 관리
class BannedWordsManager {
    // 금칙어 초기화
    static init() {
        // 저장된 금칙어 로드
        this.loadBannedWords();
        
        // 이벤트 리스너 등록
        if (UI.saveBannedWordsBtn) {
            UI.saveBannedWordsBtn.addEventListener('click', () => this.saveBannedWords());
        }
        
        if (UI.resetBannedWordsBtn) {
            UI.resetBannedWordsBtn.addEventListener('click', () => this.resetBannedWords());
        }
        
        // 금칙어 표시 업데이트
        this.updateBannedWordsDisplay();
    }
    
    // 금칙어 로드
    static loadBannedWords() {
        try {
            const saved = localStorage.getItem('agoda-banned-words');
            if (saved) {
                const parsedWords = JSON.parse(saved);
                AppState.agodaAutomation.bannedWords = parsedWords;
                console.log(`✅ [금칙어] localStorage에서 로드: ${parsedWords.length}개`, parsedWords);
            } else {
                // localStorage에 저장된 것이 없으면 현재 AppState의 기본값을 사용하고 localStorage에도 저장
                const defaultWords = AppState.agodaAutomation.bannedWords || ['아늑', '오송815', '오송 815'];
                AppState.agodaAutomation.bannedWords = defaultWords;
                localStorage.setItem('agoda-banned-words', JSON.stringify(defaultWords));
                console.log(`✅ [금칙어] 기본값 설정 및 저장: ${defaultWords.length}개`, defaultWords);
            }
        } catch (error) {
            console.warn('❌ 금칙어 로드 실패, 기본값 사용:', error);
            const defaultWords = ['아늑', '오송815', '오송 815'];
            AppState.agodaAutomation.bannedWords = defaultWords;
            localStorage.setItem('agoda-banned-words', JSON.stringify(defaultWords));
        }
        
        // textarea에 현재 금칙어 표시
        if (UI.bannedWordsTextarea) {
            UI.bannedWordsTextarea.value = AppState.agodaAutomation.bannedWords.join(';');
        }
        
        // 금칙어 표시 업데이트
        this.updateBannedWordsDisplay();
    }
    
    // 금칙어 저장
    static saveBannedWords() {
        try {
            const input = UI.bannedWordsTextarea.value.trim();
            if (!input) {
                Utils.showDialog('error', '입력 오류', '금칙어를 입력해주세요.');
                return;
            }
            
            // 세미콜론으로 분리하고 공백 제거
            const words = input.split(';')
                              .map(word => word.trim())
                              .filter(word => word.length > 0);
            
            if (words.length === 0) {
                Utils.showDialog('error', '입력 오류', '유효한 금칙어를 입력해주세요.');
                return;
            }
            
            // 상태 업데이트
            AppState.agodaAutomation.bannedWords = words;
            
            // 로컬스토리지에 저장
            localStorage.setItem('agoda-banned-words', JSON.stringify(words));
            
            // 표시 업데이트
            this.updateBannedWordsDisplay();
            
            Utils.showDialog('success', '저장 완료', `${words.length}개의 금칙어가 저장되었습니다.`);
            
        } catch (error) {
            console.error('금칙어 저장 실패:', error);
            Utils.showDialog('error', '저장 실패', '금칙어 저장 중 오류가 발생했습니다.');
        }
    }
    
    // 기본값으로 복원
    static resetBannedWords() {
        const defaultWords = ['아늑', '오송815', '오송 815'];
        
        AppState.agodaAutomation.bannedWords = [...defaultWords];
        localStorage.setItem('agoda-banned-words', JSON.stringify(defaultWords));
        
        // UI 업데이트
        if (UI.bannedWordsTextarea) {
            UI.bannedWordsTextarea.value = defaultWords.join(';');
        }
        
        this.updateBannedWordsDisplay();
        
        Utils.showDialog('success', '복원 완료', '기본 금칙어로 복원되었습니다.');
    }
    
    // 금칙어 표시 업데이트
    static updateBannedWordsDisplay() {
        if (!UI.bannedWordsDisplay) return;
        
        const words = AppState.agodaAutomation.bannedWords;
        
        if (words.length === 0) {
            UI.bannedWordsDisplay.innerHTML = '<span class="banned-word-tag loading">등록된 금칙어가 없습니다</span>';
            return;
        }
        
        UI.bannedWordsDisplay.innerHTML = words.map(word => `
            <span class="banned-word-tag">
                🚫 ${word}
            </span>
        `).join('');
    }
    
    // 호텔 이름에 금칙어가 포함되어 있는지 확인
    static isHotelBanned(hotelName) {
        if (!hotelName || typeof hotelName !== 'string') {
            return false;
        }
        
        const normalizedHotelName = hotelName.toLowerCase().trim();
        
        return AppState.agodaAutomation.bannedWords.some(bannedWord => {
            const normalizedBannedWord = bannedWord.toLowerCase().trim();
            return normalizedHotelName.includes(normalizedBannedWord);
        });
    }
    
    // 금칙어 필터링된 호텔 목록 반환
    static filterHotels(hotels) {
        if (!Array.isArray(hotels)) {
            return [];
        }
        
        const filteredHotels = [];
        const bannedHotels = [];
        
        hotels.forEach(hotel => {
            if (hotel && hotel.이름) {
                if (this.isHotelBanned(hotel.이름)) {
                    bannedHotels.push(hotel);
                    console.log(`🚫 [금칙어 필터링] 제외된 호텔: "${hotel.이름}"`);
                } else {
                    filteredHotels.push(hotel);
                }
            } else {
                // 이름이 없는 호텔은 제외
                console.warn('⚠️ [호텔 필터링] 이름이 없는 호텔 데이터:', hotel);
            }
        });
        
        if (bannedHotels.length > 0) {
            console.log(`🔍 [금칙어 필터링 결과] 전체: ${hotels.length}개, 허용: ${filteredHotels.length}개, 제외: ${bannedHotels.length}개`);
        }
        
        return filteredHotels;
    }
}

// 아고다 자동화 관리
class AgodaAutomationManager {
    static init() {
        // 국가 선택 이벤트 리스너
        UI.agodaCountrySelect.addEventListener('change', (e) => {
            AppState.agodaAutomation.selectedCountry = e.target.value;
            this.updateAgodaAccountSelector();
            this.updateAgodaButtonState();
        });
        
        // 아고다 자동화 버튼 이벤트 리스너
        UI.startAgodaAutomationBtn.addEventListener('click', () => {
            this.startAgodaAutomation();
        });
        
        UI.stopAgodaAutomationBtn.addEventListener('click', () => {
            this.stopAgodaAutomation();
        });
        
        // 초기 계정 선택기 렌더링
        this.updateAgodaAccountSelector();
    }
    
    static updateAgodaAccountSelector() {
        // 링크 프라이스 CID가 있는 계정만 필터링
        const validAccounts = AppState.accounts.filter(account => 
            account.isActive && account.linkPriceCid && account.linkPriceCid.trim() !== ''
        );
        
        if (validAccounts.length === 0) {
            UI.agodaAccountSelector.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    링크 프라이스 CID가 등록된 계정이 없습니다.<br>
                    계정 관리에서 링크 프라이스 CID를 등록해주세요.
                </div>
            `;
            return;
        }
        
        UI.agodaAccountSelector.innerHTML = validAccounts.map((account, index) => {
            const originalIndex = AppState.accounts.findIndex(acc => acc.id === account.id);
            return `
                <div class="account-checkbox">
                    <input type="checkbox" id="agoda-account-${originalIndex}" value="${originalIndex}" 
                           ${AppState.agodaAutomation.selectedAccounts.includes(originalIndex) ? 'checked' : ''}>
                    <div class="account-checkbox-info">
                        <div class="account-checkbox-id">${account.naverId}${account.nickname && account.nickname !== account.naverId ? ` (${account.nickname})` : ''}</div>
                        <div class="account-checkbox-blog">카테고리: ${account.categoryId || '미설정'} | CID: ${account.linkPriceCid}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        // 체크박스 이벤트 리스너 추가
        UI.agodaAccountSelector.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const accountIndex = parseInt(e.target.value);
                if (e.target.checked) {
                    if (!AppState.agodaAutomation.selectedAccounts.includes(accountIndex)) {
                        AppState.agodaAutomation.selectedAccounts.push(accountIndex);
                    }
                } else {
                    AppState.agodaAutomation.selectedAccounts = AppState.agodaAutomation.selectedAccounts.filter(i => i !== accountIndex);
                }
                
                this.updateAgodaButtonState();
                StateManager.saveState();
            });
        });
    }
    
    static updateAgodaButtonState() {
        const hasCountry = AppState.agodaAutomation.selectedCountry !== '';
        const hasAccounts = AppState.agodaAutomation.selectedAccounts.length > 0;
        const isNotRunning = !AppState.agodaAutomation.running;
        
        UI.startAgodaAutomationBtn.disabled = !(hasCountry && hasAccounts && isNotRunning);
        UI.stopAgodaAutomationBtn.disabled = !AppState.agodaAutomation.running;
        
        // 버튼 텍스트 업데이트
        if (AppState.agodaAutomation.running) {
            UI.startAgodaAutomationBtn.innerHTML = '<span class="loading-spinner"></span> 아고다 자동화 실행 중...';
            UI.stopAgodaAutomationBtn.innerHTML = '<span>🛑 중지</span>';
        } else {
            if (!hasCountry) {
                UI.startAgodaAutomationBtn.innerHTML = '<span>🌍 국가를 선택하세요</span>';
            } else if (!hasAccounts) {
                UI.startAgodaAutomationBtn.innerHTML = '<span>👤 계정을 선택하세요</span>';
            } else {
                UI.startAgodaAutomationBtn.innerHTML = '<span>🚀 아고다 자동화 시작</span>';
            }
            UI.stopAgodaAutomationBtn.innerHTML = '<span>🛑 중지</span>';
        }
    }
    
    static async startAgodaAutomation() {
        try {
            // 🚫 아고다 서비스가 비활성화된 경우 실행 차단
            if (!AppState.agodaAutomation.enabled) {
                Utils.showDialog('info', '서비스 중단', '아고다 서비스는 현재 일시 중단되었습니다.\n\n잠시만 기다려주세요.');
                return;
            }
            
            if (AppState.agodaAutomation.running) {
                Utils.showDialog('warning', '아고다 자동화 진행 중', '이미 아고다 자동화가 진행 중입니다.');
                return;
            }
            
            const selectedCountry = AppState.agodaAutomation.selectedCountry;
            
            // 유효하지 않은 계정 인덱스 정리 (안전장치)
            AppState.agodaAutomation.selectedAccounts = AppState.agodaAutomation.selectedAccounts.filter(index => 
                index >= 0 && index < AppState.accounts.length
            );
            
            const selectedAccounts = AppState.agodaAutomation.selectedAccounts
                .map(index => AppState.accounts[index])
                .filter(account => account && account.naverId); // undefined 계정 및 naverId 없는 계정 제거
            
            if (!selectedCountry || selectedAccounts.length === 0) {
                Utils.showDialog('warning', '설정 필요', '국가와 계정을 선택해주세요.');
                return;
            }
            
            // 정리 후 실제 선택된 계정 수가 변경되었다면 로그 출력
            if (selectedAccounts.length !== AppState.agodaAutomation.selectedAccounts.length) {
                console.log(`🔧 [아고다 자동화] 유효하지 않은 계정 정리: ${AppState.agodaAutomation.selectedAccounts.length}개 → ${selectedAccounts.length}개`);
                AppState.agodaAutomation.selectedAccounts = selectedAccounts.map((_, idx) => idx);
            }
            
            // 시작 확인
            const confirmed = await Utils.showConfirmDialog(
                '아고다 자동화 시작',
                `${selectedCountry} 국가에서 ${selectedAccounts.length}개 계정으로 아고다 자동화를 시작하시겠습니까?`
            );
            
            if (!confirmed) return;
            
            // 🔥 상세한 시작 로그
            console.log('🏨===========================================');
            console.log('🏨 아고다 자동화 시작');
            console.log('🏨===========================================');
            console.log(`🌍 선택된 국가: ${selectedCountry}`);
            console.log(`👥 선택된 계정 수: ${selectedAccounts.length}개`);
            console.log('📋 계정 목록:');
            selectedAccounts.forEach((account, index) => {
                console.log(`  ${index + 1}. ${account.naverId} (블로그: ${account.blogId}, CID: ${account.linkPriceCid})`);
            });
            console.log('🏨===========================================');
            
            // 자동화 시작
            console.log('🚀 아고다 자동화 시작 처리...');
            AppState.agodaAutomation.running = true;
            this.updateAgodaButtonState();
            StateManager.updateStatus('running', '아고다 자동화 실행 중...');
            
            // 🔄 실제 백엔드 진행 상황 리스너 등록
            if (window.electronAPI.onAgodaAutomationProgress) {
                window.electronAPI.onAgodaAutomationProgress((progressData) => {
                    console.log('📊 백엔드 진행 상황:', progressData);
                    
                    // UI 업데이트
                    const { accountIndex, totalAccounts, postIndex, totalPosts, accountName, step } = progressData;
                    UI.startAgodaAutomationBtn.innerHTML = `<span class="loading-spinner"></span> [계정 ${accountIndex + 1}/${totalAccounts}] [포스트 ${postIndex + 1}/${totalPosts}] ${accountName} - ${step}`;
                    
                    // 진행률 계산 (전체 포스트 기준)
                    const completedPosts = accountIndex * totalPosts + postIndex;
                    const totalAllPosts = totalAccounts * totalPosts;
                    const overallProgress = (completedPosts / totalAllPosts) * 100;
                    StateManager.updateProgress(Math.min(overallProgress, 100));
                });
            }
            

            
            // 백엔드에 아고다 자동화 요청
            if (window.electronAPI) {
                console.log('🔌 백엔드에 아고다 자동화 요청 전송...');
                
                // 🔄 간단한 진행 상태 표시 (시뮬레이션 제거)
                UI.startAgodaAutomationBtn.innerHTML = `<span class="loading-spinner"></span> 아고다 자동화 진행 중...`;
                
                // 실제 자동화 실행 (시뮬레이션 제거)
                const result = await window.electronAPI.executeAutomationStep({
                    action: 'agoda-automation',
                    payload: {
                        country: selectedCountry,
                        accounts: selectedAccounts
                    }
                });
                
                console.log('📥 백엔드 응답 수신:', result);
                
                if (result.success) {
                    console.log('🎉===========================================');
                    console.log('🎉 아고다 자동화 성공적으로 완료!');
                    console.log('🎉===========================================');
                    console.log(`✅ 성공한 계정: ${result.successCount || selectedAccounts.length}개`);
                    console.log(`❌ 실패한 계정: ${result.errorCount || 0}개`);
                    if (result.errors && result.errors.length > 0) {
                        console.log('📋 실패 상세:');
                        result.errors.forEach((error, index) => {
                            console.log(`  ${index + 1}. ${error.account}: ${error.error}`);
                        });
                    }
                    console.log('🎉===========================================');
                    
                    Utils.showDialog('success', '아고다 자동화 완료', 
                        `아고다 자동화가 성공적으로 완료되었습니다.\n\n` +
                        `✅ 성공: ${result.successCount || selectedAccounts.length}개\n` +
                        `❌ 실패: ${result.errorCount || 0}개`);
                } else {
                    console.error('💥===========================================');
                    console.error('💥 아고다 자동화 실패!');
                    console.error('💥===========================================');
                    console.error('❌ 오류 내용:', result.error);
                    console.error('💥===========================================');
                    
                    Utils.showDialog('error', '아고다 자동화 실패', result.error || '아고다 자동화 중 오류가 발생했습니다.');
                }
            } else {
                console.log('🧪 테스트 환경에서 아고다 자동화 시뮬레이션 실행...');
                
                // 테스트 환경에서는 시뮬레이션만 실행
                await simulateProgress();
                
                console.log('🧪===========================================');
                console.log('🧪 아고다 자동화 테스트 완료');
                console.log('🧪===========================================');
                
                Utils.showDialog('info', '테스트 완료', '아고다 자동화 테스트가 완료되었습니다.');
            }
            
        } catch (error) {
            console.error('💥===========================================');
            console.error('💥 아고다 자동화 실행 중 오류 발생!');
            console.error('💥===========================================');
            console.error('❌ 오류 유형:', error.name);
            console.error('❌ 오류 메시지:', error.message);
            console.error('❌ 스택 트레이스:', error.stack);
            console.error('💥===========================================');
            
            Utils.showDialog('error', '아고다 자동화 오류', `아고다 자동화 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            console.log('🔄 아고다 자동화 종료 처리...');
            console.log('📊 최종 진행률: 100%');
            
            AppState.agodaAutomation.running = false;
            this.updateAgodaButtonState();
            StateManager.updateStatus('idle', '대기 중');
            StateManager.updateProgress(100);
            
            console.log('✅ 아고다 자동화 종료 완료');
            console.log('🏨===========================================\n');
        }
    }
    
    static async stopAgodaAutomation() {
        if (!AppState.agodaAutomation.running) {
            console.log('⚠️ 아고다 자동화가 실행 중이 아닙니다');
            return;
        }

        try {
            console.log('🛑 아고다 자동화 중지 요청');
            
            // 🔥 즉시 자동화 상태를 false로 설정 (루프 중단을 위해)
            console.log('🛑 아고다 자동화 상태 즉시 중지 설정...');
            AppState.agodaAutomation.running = false;
            
            // UI 상태 즉시 업데이트
            UI.startAgodaAutomationBtn.innerHTML = '<span class="loading-spinner"></span> 아고다 자동화 중지 중...';
            UI.stopAgodaAutomationBtn.innerHTML = '<span>🛑 중지 중...</span>';
            UI.stopAgodaAutomationBtn.disabled = true; // 중지 버튼 즉시 비활성화
            StateManager.updateStatus('stopping', '아고다 자동화 중지 중...');
            
            // 확인 다이얼로그 표시
            const confirmed = await Utils.showConfirmDialog(
                '아고다 자동화 중지', 
                '진행 중인 아고다 자동화를 완전히 중지하시겠습니까?\n\n• 모든 작업이 즉시 중단됩니다\n• 브라우저가 모두 종료됩니다\n• 다운로드된 이미지가 모두 삭제됩니다\n• 처리 중인 작업은 저장되지 않습니다'
            );

            if (!confirmed) {
                console.log('❌ 사용자가 중지를 취소했습니다');
                
                // 취소 시 상태 복원
                AppState.agodaAutomation.running = true;
                this.updateAgodaButtonState();
                StateManager.updateStatus('running', '아고다 자동화 실행 중...');
                return;
            }

            console.log('🔄 아고다 자동화 중지 프로세스 시작...');

            // Electron API가 있는 경우 백엔드 자동화 완전 중지
            if (window.electronAPI) {
                console.log('🔌 백엔드 아고다 자동화 완전 중지 요청...');
                
                try {
                    // 🔥 기존 자동화 중지 로직 사용 (모든 자동화 중지)
                    const result = await window.electronAPI.executeAutomationStep({
                        action: 'stop',
                        payload: {}
                    });
                    
                    if (result && result.success) {
                        console.log('✅ 백엔드 아고다 자동화 중지 완료');
                        
                        // 삭제된 이미지 개수 표시
                        const deletedImages = result.deletedImages || 0;
                        if (deletedImages > 0) {
                            console.log(`🗑️ ${deletedImages}개 이미지 파일 삭제됨`);
                            Utils.showNotification('이미지 정리 완료', `${deletedImages}개 이미지 파일이 삭제되었습니다.`, 'info');
                        }
                    } else {
                        console.error('❌ 백엔드 아고다 자동화 중지 실패:', result?.error || '알 수 없는 오류');
                        Utils.showNotification('중지 경고', '일부 프로세스 중지에 실패했을 수 있습니다.', 'warning');
                    }
                } catch (stopError) {
                    console.error('❌ 백엔드 중지 요청 실패:', stopError);
                    Utils.showNotification('중지 오류', '백엔드 중지 요청에 실패했습니다.', 'error');
                }
            }

            // 상태 완전 초기화
            console.log('🔄 아고다 자동화 상태 초기화 중...');
            AppState.agodaAutomation.running = false;
            StateManager.updateStatus('idle', '아고다 자동화 중지됨');
            StateManager.updateProgress(0);
            
            // 버튼 상태 즉시 복원
            console.log('🔄 아고다 자동화 버튼 상태 복원 중...');
            this.updateAgodaButtonState();
            
            // 상태 저장
            StateManager.saveState();

            console.log('✅ 아고다 자동화 완전 중지 완료');
            
            Utils.showDialog('success', '아고다 자동화 중지 완료', 
                '아고다 자동화가 완전히 중지되었습니다.\n\n' +
                '• 모든 브라우저가 종료되었습니다\n' +
                '• 다운로드된 이미지들이 삭제되었습니다\n' +
                '• 시스템이 초기 상태로 복원되었습니다'
            );

        } catch (error) {
            console.error('❌ 아고다 자동화 중지 실패:', error);
            
            // 오류 발생 시에도 상태 초기화
            AppState.agodaAutomation.running = false;
            StateManager.updateStatus('error', '아고다 자동화 중지 실패');
            this.updateAgodaButtonState();
            
            Utils.showDialog('error', '중지 실패', 
                `아고다 자동화 중지 중 오류가 발생했습니다:\n${error.message}\n\n` +
                '상태가 초기화되었습니다. 필요시 앱을 재시작해주세요.'
            );
        }
    }
}

// 완전 자동화 관리
class FullAutomationManager {
    static init() {
        console.log('🤖 완전 자동화 매니저 초기화');
        
        // 이벤트 리스너 등록
        this.bindEvents();
        
        // 초기 데이터 로드
        this.loadApiKeys();
        this.renderAccountSelector();
        
        // 초기 상태 업데이트
        setTimeout(() => {
            this.updateButtonState();
        }, 100);
        
        console.log('✅ 완전 자동화 매니저 초기화 완료');
    }
    
    static bindEvents() {
        // API 키 저장 버튼
        if (UI.saveCoupangApiBtn) {
            UI.saveCoupangApiBtn.addEventListener('click', () => this.saveApiKeys());
        }
        
        // 완전 자동화 시작 버튼
        if (UI.startFullAutomationBtn) {
            UI.startFullAutomationBtn.addEventListener('click', () => this.startFullAutomation());
        }
        
        // 완전 자동화 중지 버튼
        if (UI.stopFullAutomationBtn) {
            UI.stopFullAutomationBtn.addEventListener('click', () => this.stopFullAutomation());
        }
        
        // API 키 입력 필드 변경 이벤트
        if (UI.coupangAccessKey) {
            UI.coupangAccessKey.addEventListener('input', () => this.updateButtonState());
        }
        
        if (UI.coupangSecretKey) {
            UI.coupangSecretKey.addEventListener('input', () => this.updateButtonState());
        }
    }
    
    static async loadApiKeys() {
        try {
            console.log('📋 쿠팡 API 키 불러오기');
            const result = await window.electronAPI.loadCoupangApiKeys();
            
            if (result.success) {
                if (result.accessKey && result.secretKey) {
                    if (UI.coupangAccessKey) UI.coupangAccessKey.value = result.accessKey;
                    if (UI.coupangSecretKey) UI.coupangSecretKey.value = result.secretKey;
                    
                    AppState.fullAutomation.accessKey = result.accessKey;
                    AppState.fullAutomation.secretKey = result.secretKey;
                    
                    this.updateApiKeyState();
                    console.log('✅ API 키 불러오기 완료');
                } else {
                    console.log('📝 저장된 API 키가 없습니다.');
                }
            } else {
                console.log('📝 저장된 API 키가 없거나 불러오기 실패:', result.error || '알 수 없는 오류');
            }
        } catch (error) {
            console.error('❌ API 키 불러오기 실패:', error);
        }
    }
    
    static async saveApiKeys() {
        try {
            const accessKey = UI.coupangAccessKey?.value?.trim();
            const secretKey = UI.coupangSecretKey?.value?.trim();
            
            if (!accessKey || !secretKey) {
                Utils.showDialog('error', '입력 오류', 'Access Key와 Secret Key를 모두 입력해주세요.');
                return;
            }
            
            console.log('💾 쿠팡 API 키 저장 시작');
            const result = await window.electronAPI.saveCoupangApiKeys(accessKey, secretKey);
            
            if (result.success) {
                AppState.fullAutomation.accessKey = accessKey;
                AppState.fullAutomation.secretKey = secretKey;
                
                Utils.showDialog('success', '저장 완료', 'API 키가 성공적으로 저장되었습니다.');
                this.updateApiKeyState();
                console.log('✅ API 키 저장 완료');
            } else {
                Utils.showDialog('error', '저장 실패', result.error || 'API 키 저장에 실패했습니다.');
            }
        } catch (error) {
            console.error('❌ API 키 저장 실패:', error);
            Utils.showDialog('error', '오류', 'API 키 저장 중 오류가 발생했습니다.');
        }
    }
    
    static updateApiKeyState() {
        const hasKeys = AppState.fullAutomation.accessKey && AppState.fullAutomation.secretKey;
        this.updateButtonState();
    }
    
    static updateButtonState() {
        const hasKeys = UI.coupangAccessKey?.value?.trim() && UI.coupangSecretKey?.value?.trim();
        const hasAccounts = this.getSelectedAccounts().length > 0;
        
        const canStart = hasKeys && hasAccounts;
        
        if (UI.startFullAutomationBtn) {
            UI.startFullAutomationBtn.disabled = !canStart || AppState.fullAutomation.running;
            
            if (!hasKeys) {
                UI.startFullAutomationBtn.textContent = '🔑 API 키를 입력하세요';
            } else if (!hasAccounts) {
                UI.startFullAutomationBtn.textContent = '👥 계정을 선택하세요';
            } else {
                UI.startFullAutomationBtn.textContent = '🚀 완전 자동화 시작';
            }
            
            if (AppState.fullAutomation.running) {
                UI.startFullAutomationBtn.textContent = '🔄 자동화 실행 중...';
            }
        }
        
        if (UI.stopFullAutomationBtn) {
            UI.stopFullAutomationBtn.disabled = !AppState.fullAutomation.running;
        }
    }
    
    static renderAccountSelector() {
        if (!UI.fullAutomationAccountSelector) return;
        
        const accounts = AccountManager.getAccounts();
        
        if (accounts.length === 0) {
            UI.fullAutomationAccountSelector.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    등록된 계정이 없습니다.<br>
                    먼저 계정을 등록해주세요.
                </div>
            `;
            this.updateButtonState();
            return;
        }
        
        const html = accounts.map((account, index) => `
            <div class="account-checkbox">
                <input type="checkbox" id="full-auto-account-${index}" data-index="${index}">
                <div class="account-checkbox-info">
                    <div class="account-checkbox-id">${account.username}${account.nickname && account.nickname !== account.username ? ` (${account.nickname})` : ''}</div>
                    <div class="account-checkbox-blog">블로그: ${account.blogId} | 카테고리: ${account.categoryId || '미설정'}</div>
                </div>
            </div>
        `).join('');
        
        UI.fullAutomationAccountSelector.innerHTML = html;
        
        // 체크박스 이벤트 리스너 추가
        UI.fullAutomationAccountSelector.querySelectorAll('input[type="checkbox"]').forEach((checkbox, index) => {
            checkbox.addEventListener('change', (e) => {
                this.updateButtonState();
            });
        });
        
        setTimeout(() => {
            this.updateButtonState();
        }, 50);
    }
    
    static getSelectedAccounts() {
        if (!UI.fullAutomationAccountSelector) return [];
        
        const checkboxes = UI.fullAutomationAccountSelector.querySelectorAll('input[type="checkbox"]:checked');
        const accounts = AccountManager.getAccounts();
        
        return Array.from(checkboxes).map(checkbox => {
            const index = parseInt(checkbox.dataset.index);
            return accounts[index];
        }).filter(account => account);
    }
    
    static async startFullAutomation() {
        try {
            console.log('🚀 완전 자동화 시작...');
            
            const selectedAccounts = this.getSelectedAccounts();
            if (selectedAccounts.length === 0) {
                Utils.showDialog('warning', '계정 선택', '실행할 계정을 선택해주세요.');
                return;
            }
            
            // API 키 확인
            const accessKey = UI.coupangAccessKey?.value?.trim();
            const secretKey = UI.coupangSecretKey?.value?.trim();
            
            if (!accessKey || !secretKey) {
                Utils.showDialog('warning', 'API 키 필요', '먼저 쿠팡 API 키를 입력하고 저장해주세요.');
                return;
            }
            
            AppState.fullAutomation.running = true;
            this.updateButtonState();
            
            console.log(`👥 선택된 계정 ${selectedAccounts.length}개로 완전 자동화 시작`);
            console.log('📋 선택된 계정:', selectedAccounts.map(acc => acc.username));
            
            // 🚀 실제 완전 자동화 실행 (쿠팡 API 기반)
            const result = await window.electronAPI.executeFullAutomation(selectedAccounts, {
                useGoldbox: true,
                useCoupangPL: true,
                coupangPLLimit: 50,
                subId: 'default-channel',
                imageSize: '512x512'
            });
            
            console.log('📊 완전 자동화 결과:', result);
            
            if (result.success) {
                const message = `완전 자동화가 완료되었습니다!\n\n성공: ${result.totalSuccess}개\n실패: ${result.totalFailure}개`;
                Utils.showDialog('success', '자동화 완료', message);
            } else {
                Utils.showDialog('error', '자동화 실패', result.error || '완전 자동화 실행에 실패했습니다.');
            }
            
        } catch (error) {
            console.error('❌ 완전 자동화 실행 오류:', error);
            Utils.showDialog('error', '오류', `완전 자동화 실행 중 오류가 발생했습니다:\n${error.message}`);
        } finally {
            AppState.fullAutomation.running = false;
            this.updateButtonState();
        }
    }
    
    static async stopFullAutomation() {
        AppState.fullAutomation.running = false;
        this.updateButtonState();
        Utils.showDialog('info', '중지됨', '완전 자동화가 중지되었습니다.');
    }
}

// 전역 함수들 (HTML에서 직접 호출)
function handleDeleteAccount(index) {
    AccountManager.deleteAccount(index);
}



function closeDialog() {
    document.getElementById('message-dialog').classList.remove('show');
}

function closeConfirmDialog(confirmed) {
    document.getElementById('confirm-dialog').classList.remove('show');
    if (window._confirmResolve) {
        window._confirmResolve(confirmed);
        window._confirmResolve = null;
    }
}

// Mobile API bridge helper
class MobileApiBridge {
    static init() {
        if (this.isAndroidShell()) {
            document.body.classList.add('mydays-android');
        }
    }

    static isAndroidShell() {
        return /MyDaysAndroid|; wv\)/i.test(navigator.userAgent) || window.location.protocol === 'file:';
    }

    static getApiBaseUrl(required = false) {
        const savedUrl = (localStorage.getItem('mydays-server-url') || '').trim().replace(/\/+$/, '');

        if (savedUrl) {
            return savedUrl;
        }

        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            return window.location.origin;
        }

        if (required) {
            throw new Error('모바일 앱 설정에서 PC 서버 주소를 먼저 입력해주세요. 예: http://192.168.0.10:3333');
        }

        return '';
    }

    static apiUrl(path, required = false) {
        const baseUrl = this.getApiBaseUrl(required);
        return baseUrl ? `${baseUrl}${path}` : path;
    }
}

// PHOTO 포스팅 이력 관리자
class PostingHistoryManager {
    static init() {
        console.log('📋 PostingHistoryManager 초기화 중...');
        
        // 이력 렌더링
        this.renderHistory();
        
        // 메인 프로세스 로그 리스너 연결
        if (window.electronAPI && window.electronAPI.onMainProcessLog) {
            window.electronAPI.onMainProcessLog((logData) => {
                this.appendLog(logData);
            });
        } else {
            console.log('🌐 일반 브라우저 환경 감지. SSE 실시간 로그 스트림 연결 시작 (/api/logs)...');
            try {
                const logsUrl = MobileApiBridge.apiUrl('/api/logs');
                if (!logsUrl || (window.location.protocol === 'file:' && logsUrl === '/api/logs')) {
                    console.warn('모바일 앱 PC 서버 주소가 없어 SSE 로그 연결을 건너뜁니다.');
                    return;
                }
                const eventSource = new EventSource(logsUrl);
                eventSource.onmessage = (event) => {
                    try {
                        const logData = JSON.parse(event.data);
                        this.appendLog(logData);
                    } catch (e) {
                        console.error('SSE 로그 파싱 에러:', e);
                    }
                };
                eventSource.onerror = (err) => {
                    console.error('SSE 연결 오류:', err);
                };
            } catch (err) {
                console.error('SSE 초기화 오류:', err);
            }
        }
    }
    
    static saveHistory(title, blogId) {
        const historyData = localStorage.getItem('photo-posting-history');
        let history = [];
        if (historyData) {
            try {
                history = JSON.parse(historyData);
            } catch(e) {}
        }
        
        const now = new Date();
        const yy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        
        const timestampStr = `${yy}-${mm}-${dd} ${hh}:${min}`;
        
        history.unshift({
            timestamp: timestampStr,
            title: title || '자동 생성된 감성 포스팅',
            blogId: blogId
        });
        
        if (history.length > 50) history = history.slice(0, 50);
        
        localStorage.setItem('photo-posting-history', JSON.stringify(history));
        this.renderHistory();
    }
    
    static renderHistory() {
        const container = document.getElementById('photo-history-list');
        if (!container) return;
        
        const historyData = localStorage.getItem('photo-posting-history');
        let history = [];
        if (historyData) {
            try {
                history = JSON.parse(historyData);
            } catch(e) {}
        }
        
        if (history.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    아직 기록된 포스팅 이력이 없습니다.
                </div>
            `;
            return;
        }
        
        let html = '';
        history.forEach((item) => {
            const blogUrl = `https://blog.naver.com/${item.blogId}`;
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-radius: var(--radius-md); background-color: var(--bg-surface); border: 1px solid var(--border-color);">
                    <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 0.25rem;">
                        <span style="font-size: 0.85rem; color: var(--text-secondary);">${item.timestamp}</span>
                        <span style="font-weight: bold; font-size: 1rem; color: var(--text-primary); word-break: break-all;">${item.title}</span>
                    </div>
                    <button class="btn btn-secondary" onclick="window.open('${blogUrl}', '_blank')" style="min-width: max-content; margin-left: 1rem; font-size: 0.85rem; padding: 0.5rem 1rem;">
                        블로그 보러 가기!
                    </button>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    static appendLog(logData) {
        const logContainer = document.getElementById('test-log-container');
        if (!logContainer) return;
        
        if (logContainer.textContent.includes('대기 중...')) {
            logContainer.innerHTML = '';
        }
        
        const logDiv = document.createElement('div');
        logDiv.style.marginBottom = '4px';
        
        let prefix = 'ℹ️';
        if (logData.level === 'warn') {
            logDiv.style.color = '#ffb86c';
            prefix = '⚠️';
        } else if (logData.level === 'error') {
            logDiv.style.color = '#ff5555';
            prefix = '❌';
        } else if (logData.level === 'success' || logData.message.includes('성공') || logData.message.includes('완료')) {
            logDiv.style.color = '#50fa7b';
            prefix = '✅';
        } else {
            logDiv.style.color = '#f8f8f2';
        }
        
        const timestamp = logData.timestamp ? new Date(logData.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
        logDiv.textContent = `[${timestamp}] ${prefix} ${logData.message}`;
        
        logContainer.appendChild(logDiv);
        logContainer.scrollTop = logContainer.scrollHeight;
    }
}



// 모바일 및 사진 자동화 관리자
class PhotoAutomationManager {
    static selectedFiles = [];

    static init() {
        console.log('📸 PhotoAutomationManager 초기화 중...');

        const uploadZone = document.getElementById('photo-upload-zone');
        const fileInput = document.getElementById('photo-file-input');
        const btnPublish = document.getElementById('btn-start-photo-publish');

        // 웰컴 랜딩 뷰 화면 전환 버튼들 바인딩
        const btnLetsGo = document.getElementById('btn-welcome-letsgotoposting');
        const btnBackToHome = document.getElementById('btn-welcome-back');
        const welcomeView = document.getElementById('photo-welcome-view');
        const uploadView = document.getElementById('photo-upload-view');

        if (btnLetsGo && welcomeView && uploadView) {
            btnLetsGo.addEventListener('click', () => {
                welcomeView.style.display = 'none';
                uploadView.style.display = 'block';
            });
        }

        if (btnBackToHome && welcomeView && uploadView) {
            btnBackToHome.addEventListener('click', () => {
                welcomeView.style.display = 'block';
                uploadView.style.display = 'none';
            });
        }

        if (uploadZone && fileInput) {
            uploadZone.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            fileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files);
            });

            // 드래그 앤 드롭 추가 지원
            uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadZone.style.borderColor = 'var(--blue-600)';
                uploadZone.style.background = 'rgba(59, 130, 246, 0.08)';
            });

            uploadZone.addEventListener('dragleave', () => {
                uploadZone.style.borderColor = 'var(--blue-400)';
                uploadZone.style.background = 'rgba(59, 130, 246, 0.03)';
            });

            uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadZone.style.borderColor = 'var(--blue-400)';
                uploadZone.style.background = 'rgba(59, 130, 246, 0.03)';
                if (e.dataTransfer.files) {
                    this.handleFileSelection(e.dataTransfer.files);
                }
            });
        }

        if (btnPublish) {
            btnPublish.addEventListener('click', () => {
                this.startPhotoPublish();
            });
        }

        // 모바일 설정 저장 버튼 바인딩
        const btnSaveMobile = document.getElementById('btn-save-mobile-settings');
        if (btnSaveMobile) {
            btnSaveMobile.addEventListener('click', () => {
                this.saveMobileSettings();
            });
        }

        // 초기 설정 불러오기
        this.loadSettings();
    }

    static handleFileSelection(files) {
        if (!files || files.length === 0) return;

        // 1. 중복 사진 자동 제거 (이름과 크기를 모두 비교하여 중복 제거)
        const uniqueNewFiles = [];
        let duplicateCount = 0;

        for (const newFile of Array.from(files)) {
            // 기존 선택된 파일들과 비교
            const isDuplicateInSelected = this.selectedFiles.some(f => 
                f.name === newFile.name && f.size === newFile.size
            );
            // 새로 들어온 파일들 중 이미 추가된 것과 비교
            const isDuplicateInNew = uniqueNewFiles.some(f => 
                f.name === newFile.name && f.size === newFile.size
            );

            if (isDuplicateInSelected || isDuplicateInNew) {
                duplicateCount++;
            } else {
                uniqueNewFiles.push(newFile);
            }
        }

        // 중복 제거 안내로그 출력
        if (duplicateCount > 0) {
            console.log(`⚠️ 중복된 PHOTO ${duplicateCount}장이 자동으로 제외되었습니다.`);
        }

        // 2. 10장 한도 초과 검사 및 팝업 메시지 출력
        const totalPendingCount = this.selectedFiles.length + uniqueNewFiles.length;
        if (totalPendingCount > 10) {
            // 팝업 경고 메시지 띄우기
            Utils.showDialog('warning', 'PHOTO 한도 초과', '블로그 PHOTO 발행은 하루 최대 10장까지만 가능합니다. 10장을 초과한 PHOTO는 자동으로 제외됩니다.');
            
            // 10장까지만 잘라내서 추가
            const allowedSlots = 10 - this.selectedFiles.length;
            if (allowedSlots > 0) {
                const slicedNewFiles = uniqueNewFiles.slice(0, allowedSlots);
                this.selectedFiles = [...this.selectedFiles, ...slicedNewFiles];
            }
        } else {
            // 한도 미만이면 전체 추가
            this.selectedFiles = [...this.selectedFiles, ...uniqueNewFiles];
        }

        this.renderPreviews();
    }

    static renderPreviews() {
        const previewGrid = document.getElementById('photo-preview-grid');
        if (!previewGrid) return;

        if (this.selectedFiles.length === 0) {
            previewGrid.style.display = 'none';
            previewGrid.innerHTML = '';
            return;
        }

        previewGrid.style.display = 'grid';
        previewGrid.innerHTML = '';

        this.selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const item = document.createElement('div');
                item.className = 'photo-preview-item';
                
                const img = document.createElement('img');
                img.className = 'photo-preview-img';
                img.src = e.target.result;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'photo-preview-remove';
                removeBtn.textContent = '×';
                removeBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    this.selectedFiles.splice(index, 1);
                    this.renderPreviews();
                });

                item.appendChild(img);
                item.appendChild(removeBtn);
                previewGrid.appendChild(item);
            };
            reader.readAsDataURL(file);
        });
    }

    static loadSettings() {
        const naverId = localStorage.getItem('test-naver-id') || '';
        const naverPassword = localStorage.getItem('test-naver-password') || '';
        const blogId = localStorage.getItem('test-blog-id') || '';
        const geminiKey = localStorage.getItem('test-gemini-key') || '';
        const serverUrl = localStorage.getItem('mydays-server-url') || '';

        const elId = document.getElementById('mobile-naver-id');
        const elPw = document.getElementById('mobile-naver-password');
        const elBlog = document.getElementById('mobile-blog-id');
        const elGemini = document.getElementById('mobile-gemini-key');
        const elServerUrl = document.getElementById('mobile-server-url');

        if (elId) elId.value = naverId;
        if (elPw) elPw.value = naverPassword;
        if (elBlog) elBlog.value = blogId;
        if (elGemini) elGemini.value = geminiKey;
        if (elServerUrl) elServerUrl.value = serverUrl;
    }

    static saveMobileSettings() {
        const elId = document.getElementById('mobile-naver-id');
        const elPw = document.getElementById('mobile-naver-password');
        const elBlog = document.getElementById('mobile-blog-id');
        const elGemini = document.getElementById('mobile-gemini-key');
        const elServerUrl = document.getElementById('mobile-server-url');

        const naverId = elId ? elId.value.trim() : '';
        const naverPassword = elPw ? elPw.value.trim() : '';
        const blogId = elBlog ? elBlog.value.trim() : '';
        const geminiKey = elGemini ? elGemini.value.trim() : '';
        const serverUrl = elServerUrl ? elServerUrl.value.trim().replace(/\/+$/, '') : '';

        if (!naverId || !naverPassword || !blogId) {
            alert('네이버 ID, 비밀번호, 블로그 ID는 필수 입력 사항입니다.');
            return;
        }

        localStorage.setItem('test-naver-id', naverId);
        localStorage.setItem('test-naver-password', naverPassword);
        localStorage.setItem('test-blog-id', blogId);
        if (geminiKey) {
            localStorage.setItem('test-gemini-key', geminiKey);
        }
        if (serverUrl) {
            localStorage.setItem('mydays-server-url', serverUrl);
        } else {
            localStorage.removeItem('mydays-server-url');
        }

        // 동기화
        const tId = document.getElementById('test-naver-id');
        const tPw = document.getElementById('test-naver-password');
        const tBlog = document.getElementById('test-blog-id');
        const tGemini = document.getElementById('test-gemini-key');

        if (tId) tId.value = naverId;
        if (tPw) tPw.value = naverPassword;
        if (tBlog) tBlog.value = blogId;
        if (tGemini) tGemini.value = geminiKey;

        alert('💾 설정 정보가 브라우저에 안전하게 보관 및 동기화되었습니다!');
    }

    static async startPhotoPublish() {
        const naverId = localStorage.getItem('test-naver-id') || '';
        const naverPassword = localStorage.getItem('test-naver-password') || '';
        const blogId = localStorage.getItem('test-blog-id') || '';
        const geminiApi = localStorage.getItem('test-gemini-key') || '';

        if (!naverId || !naverPassword || !blogId) {
            alert('⚙️ 먼저 하단 [설정] 메뉴에서 네이버 계정(ID/비밀번호) 및 블로그 ID 설정을 저장해주세요.');
            Navigation.switchPanel('mobile-settings');
            return;
        }

        if (!geminiApi) {
            alert('⚙️ 제미나이 AI가 PHOTO를 분석하여 감성 포스팅을 작성하려면 Google Gemini API Key가 필요합니다. 설정에서 입력해주세요.');
            Navigation.switchPanel('mobile-settings');
            return;
        }

        if (this.selectedFiles.length === 0) {
            alert('📷 포스팅할 일상 PHOTO를 1장 이상 선택해주세요.');
            return;
        }

        const btnPublish = document.getElementById('btn-start-photo-publish');
        const contextInput = document.getElementById('photo-context-input');
        const context = contextInput ? contextInput.value.trim() : '';

        // 공개/비공개 라디오 버튼 값 가져오기
        const openTypeEl = document.querySelector('input[name="photo-open-type"]:checked');
        const openType = openTypeEl ? parseInt(openTypeEl.value, 10) : 2;

        btnPublish.disabled = true;
        btnPublish.textContent = '⏳ PHOTO 분석 및 자동 발행 진행 중...';

        try {
            const fileToBase64 = (file) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });

            console.log('📤 이미지 파일 base64 변환 시작...');
            const imagesBase64 = await Promise.all(this.selectedFiles.map(file => fileToBase64(file)));
            console.log(`📤 이미지 ${imagesBase64.length}개 base64 변환 성공`);

            // 1. 즉시 포스팅 상태 플래그 활성화 후 'History' 패널로 전환하여 실시간 시스템 로그가 보이도록 함
            AppState.photoPublishing = true;
            Navigation.switchPanel('naver-test');
            PostingHistoryManager.appendLog({ level: 'info', message: '🚀 PHOTO 분석 및 네이버 블로그 자동 포스팅을 시작합니다...' });

            // 백그라운드 비동기 비차단 실행 프로미스 정의 (await하지 않고 독립 실행)
            const executePromise = (async () => {
                try {
                    let result;
                    if (window.electronAPI && typeof window.electronAPI.executeAutomationStep === 'function') {
                        result = await window.electronAPI.executeAutomationStep({
                            action: 'photo-publish',
                            payload: {
                                naverId,
                                naverPassword,
                                blogId,
                                geminiApi,
                                images: imagesBase64,
                                context,
                                openType
                            }
                        });
                    } else {
                        console.log('🌐 일반 브라우저 환경 감지. POST /api/execute-automation-step 호출...');
                        const response = await fetch(MobileApiBridge.apiUrl('/api/execute-automation-step', true), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'photo-publish',
                                payload: {
                                    naverId,
                                    naverPassword,
                                    blogId,
                                    geminiApi,
                                    images: imagesBase64,
                                    context,
                                    openType
                                }
                            })
                        });
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        result = await response.json();
                    }

                    if (result && result.success) {
                        if (result.postTitle && result.blogId) {
                            PostingHistoryManager.saveHistory(result.postTitle, result.blogId);
                        } else {
                            PostingHistoryManager.saveHistory('자동 생성된 감성 포스팅', blogId);
                        }
                        PostingHistoryManager.appendLog({ level: 'success', message: '🎉 네이버 블로그 포스팅이 성공적으로 완료되었습니다.' });
                    } else {
                        const errorMsg = result ? result.error : '알 수 없는 오류';
                        PostingHistoryManager.appendLog({ level: 'error', message: `❌ 포스팅 실패: ${errorMsg}` });
                    }
                } catch (backgroundError) {
                    console.error('❌ 백그라운드 PHOTO 발행 중 오류 발생:', backgroundError);
                    PostingHistoryManager.appendLog({ level: 'error', message: `❌ 포스팅 실패: ${backgroundError.message}` });
                }
            })();

            // 2. 즉시 추가 포스팅 여부를 묻는 팝업을 오버레이로 띄움
            const okBtn = document.getElementById('confirm-ok-btn');
            const cancelBtn = document.getElementById('confirm-cancel-btn');
            const originalOkHtml = okBtn ? okBtn.innerHTML : '확인';
            const originalCancelHtml = cancelBtn ? cancelBtn.innerHTML : '취소';
            
            if (okBtn) okBtn.innerHTML = '좀 더 포스팅<br>할래요 ~';
            if (cancelBtn) cancelBtn.innerHTML = '아니오~<br>그만할래요!';
            
            const continuePosting = await Utils.showConfirmDialog(
                '🎉 네이버 블로그 발행 진행 중',
                '<div style="text-align: center;">약 1~2분 가량 걸립니다 ~<br><br><br>사진을 또 포스팅하시겠습니까?<br>(2~3분 후 재포스팅 추천!)</div>'
            );
            
            if (okBtn) okBtn.innerHTML = originalOkHtml;
            if (cancelBtn) cancelBtn.innerHTML = originalCancelHtml;

            // 폼 초기화 (새로운 포스팅을 위해)
            this.selectedFiles = [];
            this.renderPreviews();
            if (contextInput) contextInput.value = '';

            // 사용자가 선택한 결과에 따라 네비게이션 및 상태 리셋
            AppState.photoPublishing = false;
            if (continuePosting) {
                // 더 포스팅하기를 원할 때만 다시 홈(photo-automation) 패널로 복귀
                Navigation.switchPanel('photo-automation');
            } else {
                // 그만할 경우 패널 타이틀과 레이아웃이 일반 이력 모드로 리셋되도록 switchPanel 재호출
                Navigation.switchPanel('naver-test');
            }

        } catch (error) {
            console.error('❌ PHOTO 발행 중 오류 발생:', error);
            alert(`❌ PHOTO 발행 중 오류 발생: ${error.message}`);
        } finally {
            btnPublish.disabled = false;
            btnPublish.textContent = '🚀 PHOTO 블로그 포스팅 시작';
        }
    }
}
