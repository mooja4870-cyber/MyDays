const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * 설정 관리 클래스
 * 앱 설정과 계정 정보를 관리합니다.
 */
class ConfigManager {
    constructor(appDataPath) {
        if (!appDataPath) {
            throw new Error("[ConfigManager] appDataPath가 제공되지 않았습니다.");
        }
        
        // 경로 설정 (주입받은 appDataPath 사용)
        this.configDir = path.join(appDataPath, 'config');
        
        this.configFile = path.join(this.configDir, 'app_config.json');
        this.accountsFile = path.join(this.configDir, 'accounts.json');
        
        this.defaultConfig = {
            version: '1.0.0',
            apiKeys: {
                claude: ''
            },
            automation: {
                headless: false,
                timeout: 30000,
                delay: 2000,
                maxRetries: 3
            },
            system: {
                tempDir: 'temp',
                logLevel: 'info',
                autoCleanup: true
            },
            lastUpdate: new Date().toISOString()
        };
        
        this.currentConfig = null;
        this.accounts = [];
        
        // 설정 디렉토리 생성 및 초기화
        this.initialize();
    }

    /**
     * 초기화
     */
    async initialize() {
        try {
            console.log(`🔍 ConfigManager 초기화 시작: ${this.configDir}`);
            
            // 상위 디렉토리들 확인 및 생성
            const parentDirs = [];
            let currentPath = this.configDir;
            
            // 존재하지 않는 상위 디렉토리들을 찾음
            while (!fs.existsSync(currentPath) && currentPath !== path.dirname(currentPath)) {
                parentDirs.unshift(currentPath);
                currentPath = path.dirname(currentPath);
            }
            
            // 차례대로 디렉토리 생성
            for (const dir of parentDirs) {
                try {
                    fs.mkdirSync(dir);
                    console.log(`📁 디렉토리 생성: ${dir}`);
                } catch (mkdirError) {
                    if (mkdirError.code !== 'EEXIST') {
                        console.error(`❌ 디렉토리 생성 실패: ${dir}`, mkdirError);
                        throw mkdirError;
                    }
                }
            }
            
            // 설정 디렉토리 최종 확인 및 생성
            if (!fs.existsSync(this.configDir)) {
                fs.mkdirSync(this.configDir, { recursive: true });
                console.log(`📁 설정 디렉토리 생성 (recursive): ${this.configDir}`);
            }
            
            // 디렉토리 쓰기 권한 확인
            try {
                fs.accessSync(this.configDir, fs.constants.W_OK);
                console.log('✅ 설정 디렉토리 쓰기 권한 확인 완료');
            } catch (accessError) {
                console.error('❌ 설정 디렉토리 쓰기 권한 없음:', accessError);
                throw new Error(`설정 디렉토리 쓰기 권한 없음: ${this.configDir}`);
            }
            
            // 테스트 파일로 실제 쓰기 테스트
            const testFile = path.join(this.configDir, `write_test_${Date.now()}.tmp`);
            try {
                fs.writeFileSync(testFile, 'test');
                fs.unlinkSync(testFile);
                console.log('✅ 설정 디렉토리 쓰기 테스트 성공');
            } catch (writeError) {
                console.error('❌ 설정 디렉토리 쓰기 테스트 실패:', writeError);
                throw new Error(`설정 디렉토리 쓰기 테스트 실패: ${writeError.message}`);
            }
            
            // 설정 파일 로드 또는 생성
            await this.loadConfig();
            await this.loadAccounts();
            
            console.log('✅ ConfigManager 초기화 완료');
            
        } catch (error) {
            console.error('❌ ConfigManager 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 설정 로드
     */
    async loadConfig() {
        try {
            if (fs.existsSync(this.configFile)) {
                const rawData = fs.readFileSync(this.configFile, 'utf8');
                this.currentConfig = JSON.parse(rawData);
                console.log('✅ 설정 파일 로드 완료');
            } else {
                this.currentConfig = { ...this.defaultConfig };
                await this.saveConfig();
                console.log('📄 기본 설정 파일 생성 완료');
            }
        } catch (error) {
            console.error('❌ 설정 로드 실패:', error);
            this.currentConfig = { ...this.defaultConfig };
        }
    }

    /**
     * 설정 저장
     */
    async saveConfig() {
        try {
            this.currentConfig.lastUpdate = new Date().toISOString();
            
            await fs.promises.writeFile(
                this.configFile,
                JSON.stringify(this.currentConfig, null, 2),
                'utf8'
            );
            
            console.log('✅ 설정 저장 완료');
            
        } catch (error) {
            console.error('❌ 설정 저장 실패:', error);
            throw error;
        }
    }

    /**
     * 계정 정보 로드 (백업 및 복구 기능 강화)
     */
    async loadAccounts() {
        try {
            console.log('📂 [계정 로드] 계정 정보 로드 시작...');
            console.log('📁 [계정 로드] 계정 파일 경로:', this.accountsFile);
            
            // 메인 계정 파일 확인
            if (fs.existsSync(this.accountsFile)) {
                try {
                    const rawData = fs.readFileSync(this.accountsFile, 'utf8').trim();
                    console.log('📄 [계정 로드] 파일 크기:', rawData.length, '바이트');
                    
                    // 파일이 비어있는 경우
                    if (!rawData || rawData === '') {
                        console.log('⚠️ [계정 로드] 빈 계정 파일 감지 - 백업에서 복구 시도');
                        const restored = await this.restoreFromBackup();
                        if (!restored) {
                            console.log('📄 [계정 로드] 백업 없음 - 빈 계정 목록으로 초기화');
                            this.accounts = [];
                            await this.saveAccounts();
                        }
                    } else {
                        try {
                            const parsedData = JSON.parse(rawData);
                            
                            // 배열이 아닌 경우 처리
                            if (!Array.isArray(parsedData)) {
                                console.warn('⚠️ [계정 로드] 배열이 아닌 데이터 형식 감지 - 백업에서 복구 시도');
                                const restored = await this.restoreFromBackup();
                                if (!restored) {
                                    this.accounts = [];
                                }
                                                    } else {
                            this.accounts = parsedData;
                            console.log(`✅ [계정 로드] 계정 정보 로드 완료: ${this.accounts.length}개 계정`);
                            
                            // [디버깅] 로드된 계정들의 linkPriceCid 확인
                            this.accounts.forEach(acc => {
                                console.log(`🔍 [ConfigManager 로드] 계정 ${acc.username}: linkPriceCid =`, acc.linkPriceCid);
                            });
                            
                            // 로드 성공 시 백업 생성
                            await this.createBackup();
                        }
                        } catch (parseError) {
                            console.error('❌ [계정 로드] JSON 파싱 오류:', parseError.message);
                            console.log('🔄 [계정 로드] 백업에서 복구 시도...');
                            const restored = await this.restoreFromBackup();
                            if (!restored) {
                                console.log('📄 [계정 로드] 백업 복구 실패 - 빈 계정 목록으로 초기화');
                                this.accounts = [];
                                await this.saveAccounts();
                            }
                        }
                    }
                } catch (readError) {
                    console.error('❌ [계정 로드] 파일 읽기 오류:', readError.message);
                    const restored = await this.restoreFromBackup();
                    if (!restored) {
                        this.accounts = [];
                        await this.saveAccounts();
                    }
                }
            } else {
                console.log('📄 [계정 로드] 계정 파일이 존재하지 않음 - 백업에서 복구 시도');
                const restored = await this.restoreFromBackup();
                if (!restored) {
                    console.log('📄 [계정 로드] 새 빈 계정 파일 생성');
                    this.accounts = [];
                    await this.saveAccounts();
                }
            }
        } catch (error) {
            console.error('❌ [계정 로드] 치명적 오류:', error);
            this.accounts = [];
            // 오류 발생 시 빈 계정 파일로 초기화
            try {
                await this.saveAccounts();
            } catch (saveError) {
                console.error('❌ [계정 로드] 계정 파일 초기화 실패:', saveError);
                throw saveError;
            }
        }
    }

    /**
     * 계정 정보 저장 (백업 기능 포함)
     */
    async saveAccounts() {
        try {
            console.log('💾 [계정 저장] 계정 정보 저장 시작...');
            console.log('📊 [계정 저장] 저장할 계정 수:', this.accounts.length);
            console.log('📁 [계정 저장] 계정 파일 경로:', this.accountsFile);
            
            // 설정 디렉토리 존재 확인 및 생성
            if (!fs.existsSync(this.configDir)) {
                console.log('📁 [계정 저장] 설정 디렉토리가 없음 - 생성 시도');
                fs.mkdirSync(this.configDir, { recursive: true });
                console.log('✅ [계정 저장] 설정 디렉토리 생성 완료');
            }
            
            // 디렉토리 쓰기 권한 재확인
            try {
                fs.accessSync(this.configDir, fs.constants.W_OK);
            } catch (accessError) {
                console.error('❌ [계정 저장] 설정 디렉토리 쓰기 권한 없음:', accessError);
                throw new Error(`설정 디렉토리 쓰기 권한 없음: ${this.configDir}`);
            }
            
            const dataToSave = JSON.stringify(this.accounts, null, 2);
            console.log('📄 [계정 저장] 저장할 데이터 크기:', dataToSave.length, '바이트');
            
            // 직접 저장 방식으로 변경 (임시 파일 없이)
            try {
                await fs.promises.writeFile(this.accountsFile, dataToSave, 'utf8');
                console.log('✅ [계정 저장] 계정 정보 저장 완료');
                
                // 저장된 파일 검증
                const savedData = fs.readFileSync(this.accountsFile, 'utf8');
                if (savedData === dataToSave) {
                    console.log('✅ [계정 저장] 파일 검증 완료');
                } else {
                    console.warn('⚠️ [계정 저장] 파일 검증 실패 - 데이터 불일치');
                }
                
                // 저장 성공 시 백업 생성
                await this.createBackup();
                
            } catch (writeError) {
                console.error('❌ [계정 저장] 직접 저장 실패:', writeError);
                
                // 대체 방법: 임시 파일 사용
                console.log('🔄 [계정 저장] 임시 파일 방식으로 재시도...');
                
                const tempFile = this.accountsFile + '.tmp';
                
                try {
                    // 임시 파일에 저장
            await fs.promises.writeFile(tempFile, dataToSave, 'utf8');
            console.log('📄 [계정 저장] 임시 파일 저장 완료');
            
                    // 기존 파일 삭제 (있다면)
                    if (fs.existsSync(this.accountsFile)) {
                        await fs.promises.unlink(this.accountsFile);
                        console.log('🗑️ [계정 저장] 기존 파일 삭제 완료');
                    }
                    
                    // 임시 파일을 메인 파일로 이동
            await fs.promises.rename(tempFile, this.accountsFile);
                    console.log('✅ [계정 저장] 임시 파일에서 이동 완료');
            
            // 저장 성공 시 백업 생성
            await this.createBackup();
            
                } catch (tempError) {
                    console.error('❌ [계정 저장] 임시 파일 방식도 실패:', tempError);
            
            // 임시 파일 정리
            if (fs.existsSync(tempFile)) {
                try {
                    fs.unlinkSync(tempFile);
                } catch (cleanupError) {
                    console.error('❌ [계정 저장] 임시 파일 정리 실패:', cleanupError);
                }
            }
            
                    throw tempError;
                }
            }
            
        } catch (error) {
            console.error('❌ [계정 저장] 계정 정보 저장 실패:', error);
            throw error;
        }
    }

    /**
     * 백업 파일 생성
     */
    async createBackup() {
        try {
            if (this.accounts.length === 0) {
                console.log('⚠️ [백업] 빈 계정 목록은 백업하지 않습니다');
                return;
            }
            
            const backupFile = this.accountsFile + '.backup';
            const backupData = {
                accounts: this.accounts,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            
            await fs.promises.writeFile(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
            console.log(`💾 [백업] 계정 백업 파일 생성 완료: ${backupFile}`);
            
        } catch (error) {
            console.error('❌ [백업] 백업 파일 생성 실패:', error);
            // 백업 실패는 치명적이지 않으므로 에러를 던지지 않음
        }
    }

    /**
     * 백업에서 복구
     */
    async restoreFromBackup() {
        try {
            const backupFile = this.accountsFile + '.backup';
            
            if (!fs.existsSync(backupFile)) {
                console.log('📄 [복구] 백업 파일이 존재하지 않습니다');
                return false;
            }
            
            const backupRawData = fs.readFileSync(backupFile, 'utf8').trim();
            if (!backupRawData) {
                console.log('⚠️ [복구] 빈 백업 파일');
                return false;
            }
            
            const backupData = JSON.parse(backupRawData);
            
            if (backupData.accounts && Array.isArray(backupData.accounts)) {
                this.accounts = backupData.accounts;
                console.log(`✅ [복구] 백업에서 복구 완료: ${this.accounts.length}개 계정`);
                console.log(`📅 [복구] 백업 생성일: ${backupData.timestamp}`);
                
                // 복구된 데이터를 메인 파일에 저장
                await this.saveAccounts();
                return true;
            } else {
                console.log('⚠️ [복구] 백업 파일의 계정 데이터가 유효하지 않습니다');
                return false;
            }
            
        } catch (error) {
            console.error('❌ [복구] 백업에서 복구 실패:', error);
            return false;
        }
    }

    /**
     * Claude API 키 설정
     * @param {string} apiKey API 키
     */
    async setClaudeApiKey(apiKey) {
        try {
            if (!apiKey || typeof apiKey !== 'string') {
                throw new Error('유효하지 않은 API 키입니다.');
            }
            
            this.currentConfig.apiKeys.claude = apiKey;
            await this.saveConfig();
            
            console.log('✅ Claude API 키 설정 완료');
            
        } catch (error) {
            console.error('❌ Claude API 키 설정 실패:', error);
            throw error;
        }
    }

    /**
     * API 키 조회
     * @returns {string} Claude API 키
     */
    getClaudeApiKey() {
        return this.currentConfig?.apiKeys?.claude || '';
    }

    /**
     * 계정 추가 또는 업데이트
     * @param {object} accountData - 추가 또는 업데이트할 계정 정보
     * @returns {Promise<object>} 처리된 계정 정보
     */
    async addOrUpdateAccount(accountData) {
        if (!accountData || !accountData.id) {
            console.error('❌ [계정 추가/업데이트] 유효하지 않은 계정 데이터:', accountData);
            throw new Error('유효하지 않은 계정 데이터입니다. ID가 필요합니다.');
        }
        
        console.log(`🔍 ConfigManager.addOrUpdateAccount 호출됨:`, { accountData });
        console.log(`🔍 [CID 디버깅] 전달받은 linkPriceCid:`, accountData.linkPriceCid);
        
        const existingAccountIndex = this.accounts.findIndex(acc => acc.id === accountData.id);
        
        if (existingAccountIndex !== -1) {
            console.log(`✅ 계정 업데이트: ${accountData.username || this.accounts[existingAccountIndex].username}`);
            const originalAccount = this.accounts[existingAccountIndex];
            
            // 필드명 통일: password와 naverPassword 모두 지원
            const updatedAccount = {
                ...originalAccount,
                ...accountData,
                updatedAt: new Date().toISOString()
            };
            
            // password 필드가 있으면 naverPassword에도 복사
            if (accountData.password) {
                updatedAccount.naverPassword = accountData.password;
            }
            
            this.accounts[existingAccountIndex] = updatedAccount;
            console.log(`🔍 [CID 디버깅] 업데이트된 계정의 linkPriceCid:`, this.accounts[existingAccountIndex].linkPriceCid);
        } else {
            console.log(`✅ 새 계정 추가: ${accountData.username}`);
            const newAccount = {
                ...accountData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // password 필드가 있으면 naverPassword에도 복사
            if (accountData.password) {
                newAccount.naverPassword = accountData.password;
            }
            
            this.accounts.push(newAccount);
            console.log(`🔍 [CID 디버깅] 새 계정의 linkPriceCid:`, newAccount.linkPriceCid);
        }
        
        await this.saveAccounts();
        
        const finalAccount = existingAccountIndex !== -1 
            ? this.accounts[existingAccountIndex] 
            : this.accounts[this.accounts.length - 1];
            
        return finalAccount;
    }

    /**
     * 계정 제거
     * @param {string} accountId 계정 ID 또는 사용자명
     */
    async removeAccount(accountId) {
        try {
            const initialLength = this.accounts.length;
            this.accounts = this.accounts.filter(acc => 
                acc.id !== accountId && acc.username !== accountId
            );
            
            if (this.accounts.length < initialLength) {
                await this.saveAccounts();
                console.log(`✅ 계정 삭제 완료: ${accountId}`);
                return true;
            } else {
                console.log(`⚠️ 삭제할 계정을 찾을 수 없습니다: ${accountId}`);
                return false;
            }
            
        } catch (error) {
            console.error('❌ 계정 삭제 실패:', error);
            throw error;
        }
    }

    /**
     * 계정 목록 조회
     * @returns {Array} 계정 목록 (비밀번호 제외)
     */
    getAccounts() {
        return this.accounts.map(acc => ({
            ...acc,
            password: acc.password || acc.naverPassword || '' // 비밀번호 그대로 표시
        }));
    }

    /**
     * 활성 계정 목록 조회
     * @returns {Array} 활성 계정 목록
     */
    getActiveAccounts() {
        return this.accounts.filter(acc => acc.isActive);
    }

    /**
     * 특정 계정 조회
     * @param {string} accountId 계정 ID 또는 사용자명
     * @returns {Object|null} 계정 정보
     */
    getAccount(accountId) {
        return this.accounts.find(acc => 
            acc.id === accountId || acc.username === accountId
        ) || null;
    }

    /**
     * 계정 상태 업데이트
     * @param {string} accountId 계정 ID
     * @param {boolean} isActive 활성 상태
     */
    async updateAccountStatus(accountId, isActive) {
        try {
            const account = this.accounts.find(acc => 
                acc.id === accountId || acc.username === accountId
            );
            
            if (account) {
                account.isActive = isActive;
                await this.saveAccounts();
                console.log(`✅ 계정 상태 업데이트: ${accountId} -> ${isActive ? '활성' : '비활성'}`);
                return true;
            } else {
                console.log(`⚠️ 계정을 찾을 수 없습니다: ${accountId}`);
                return false;
            }
            
        } catch (error) {
            console.error('❌ 계정 상태 업데이트 실패:', error);
            throw error;
        }
    }

    /**
     * 자동화 설정 업데이트
     * @param {Object} automationConfig 자동화 설정
     */
    async updateAutomationConfig(automationConfig) {
        try {
            this.currentConfig.automation = {
                ...this.currentConfig.automation,
                ...automationConfig
            };
            
            await this.saveConfig();
            console.log('✅ 자동화 설정 업데이트 완료');
            
        } catch (error) {
            console.error('❌ 자동화 설정 업데이트 실패:', error);
            throw error;
        }
    }

    /**
     * 시스템 설정 업데이트
     * @param {Object} systemConfig 시스템 설정
     */
    async updateSystemConfig(systemConfig) {
        try {
            this.currentConfig.system = {
                ...this.currentConfig.system,
                ...systemConfig
            };
            
            await this.saveConfig();
            console.log('✅ 시스템 설정 업데이트 완료');
            
        } catch (error) {
            console.error('❌ 시스템 설정 업데이트 실패:', error);
            throw error;
        }
    }

    /**
     * 전체 설정 조회
     * @returns {Object} 현재 설정
     */
    getConfig() {
        return { ...this.currentConfig };
    }

    /**
     * 자동화 설정 조회
     * @returns {Object} 자동화 설정
     */
    getAutomationConfig() {
        return { ...this.currentConfig.automation };
    }

    /**
     * 시스템 설정 조회
     * @returns {Object} 시스템 설정
     */
    getSystemConfig() {
        return { ...this.currentConfig.system };
    }

    /**
     * 설정 유효성 검증
     * @returns {Object} 검증 결과
     */
    validateConfig() {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // API 키 확인
        if (!this.currentConfig.apiKeys.claude) {
            validation.warnings.push('Claude API 키가 설정되지 않았습니다.');
        }

        // 계정 확인
        const activeAccounts = this.getActiveAccounts();
        if (activeAccounts.length === 0) {
            validation.warnings.push('활성 계정이 없습니다.');
        }

        // 필수 설정 확인
        if (!this.currentConfig.automation) {
            validation.isValid = false;
            validation.errors.push('자동화 설정이 누락되었습니다.');
        }

        if (!this.currentConfig.system) {
            validation.isValid = false;
            validation.errors.push('시스템 설정이 누락되었습니다.');
        }

        console.log(`🔍 설정 검증 완료: ${validation.isValid ? '통과' : '실패'}`);
        if (validation.errors.length > 0) {
            console.log(`❌ 오류: ${validation.errors.join(', ')}`);
        }
        if (validation.warnings.length > 0) {
            console.log(`⚠️ 경고: ${validation.warnings.join(', ')}`);
        }

        return validation;
    }

    /**
     * 설정 백업
     * @returns {Promise<string>} 백업 파일 경로
     */
    async backupConfig() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.join(this.configDir, 'backups');
            
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            const backupFile = path.join(backupDir, `config_backup_${timestamp}.json`);
            const backupData = {
                config: this.currentConfig,
                accounts: this.accounts,
                timestamp: new Date().toISOString()
            };
            
            await fs.promises.writeFile(
                backupFile,
                JSON.stringify(backupData, null, 2),
                'utf8'
            );
            
            console.log(`💾 설정 백업 완료: ${backupFile}`);
            return backupFile;
            
        } catch (error) {
            console.error('❌ 설정 백업 실패:', error);
            throw error;
        }
    }

    /**
     * 설정 복원
     * @param {string} backupFile 백업 파일 경로
     */
    async restoreConfig(backupFile) {
        try {
            if (!fs.existsSync(backupFile)) {
                throw new Error('백업 파일을 찾을 수 없습니다.');
            }
            
            const rawData = fs.readFileSync(backupFile, 'utf8');
            const backupData = JSON.parse(rawData);
            
            if (backupData.config) {
                this.currentConfig = backupData.config;
                await this.saveConfig();
            }
            
            if (backupData.accounts) {
                this.accounts = backupData.accounts;
                await this.saveAccounts();
            }
            
            console.log('✅ 설정 복원 완료');
            
        } catch (error) {
            console.error('❌ 설정 복원 실패:', error);
            throw error;
        }
    }

    /**
     * 설정 초기화
     */
    async resetConfig() {
        try {
            this.currentConfig = { ...this.defaultConfig };
            await this.saveConfig();
            
            console.log('✅ 설정 초기화 완료');
            
        } catch (error) {
            console.error('❌ 설정 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 계정 정보 초기화
     */
    async resetAccounts() {
        try {
            this.accounts = [];
            await this.saveAccounts();
            
            console.log('✅ 계정 정보 초기화 완료');
            
        } catch (error) {
            console.error('❌ 계정 정보 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * 상태 확인
     * @returns {Object}
     */
    getStatus() {
        return {
            configDirExists: fs.existsSync(this.configDir),
            configFileExists: fs.existsSync(this.configFile),
            accountsFileExists: fs.existsSync(this.accountsFile),
            hasClaudeApiKey: !!this.currentConfig?.apiKeys?.claude,
            accountCount: this.accounts.length,
            activeAccountCount: this.getActiveAccounts().length,
            configValid: this.validateConfig().isValid
        };
    }

    /**
     * 리소스 정리
     */
    async cleanup() {
        try {
            console.log('🧹 ConfigManager 리소스 정리...');
            
            // 현재 설정 저장
            if (this.currentConfig) {
                await this.saveConfig();
            }
            
            if (this.accounts) {
                await this.saveAccounts();
            }
            
            console.log('✅ ConfigManager 리소스 정리 완료');
            
        } catch (error) {
            console.error('❌ 리소스 정리 중 오류:', error);
        }
    }
}

module.exports = ConfigManager; 