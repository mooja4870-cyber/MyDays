const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * 진행 상황 추적 클래스
 * 자동화 세션과 단계별 진행 상황을 추적하고 로그를 관리합니다.
 */
class ProgressTracker {
    constructor(logsPath) {
        if (!logsPath) {
            throw new Error("[ProgressTracker] logsPath가 제공되지 않았습니다.");
        }
        this.logDir = logsPath;
        
        this.progressFile = path.join(this.logDir, 'progress.json');
        this.logFile = path.join(this.logDir, 'automation.log');
        
        this.currentProgress = {
            sessionId: null,
            startTime: null,
            endTime: null,
            totalSteps: 0,
            currentStep: 0,
            status: 'idle', // idle, running, completed, failed, stopped
            steps: [],
            error: null,
            metadata: {}
        };
        
        this.stepDefinitions = {
            'login': { name: '로그인', weight: 10 },
            'crawling': { name: '쿠팡 크롤링', weight: 20 },
            'crawling_content': { name: '상품 크롤링 및 컨텐츠 생성', weight: 40 },
            'content_generation': { name: '콘텐츠 생성', weight: 30 },
            'image_processing': { name: '이미지 처리', weight: 20 },
            'blog_posting': { name: '블로그 포스팅', weight: 15 },
            'blog_publishing': { name: '블로그 발행', weight: 15 },
            'login_and_posting': { name: '로그인 및 블로그 포스팅', weight: 25 },
            'comments': { name: '댓글 작성', weight: 5 }
        };
        
        // 로그 디렉토리 생성
        this.ensureLogDirectory();
    }

    /**
     * 로그 디렉토리 생성
     */
    ensureLogDirectory() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
                console.log(`📁 로그 디렉토리 생성: ${this.logDir}`);
            }
        } catch (error) {
            console.error('❌ 로그 디렉토리 생성 실패:', error);
        }
    }

    /**
     * 새로운 세션 시작
     * @param {Object} metadata 세션 메타데이터
     * @returns {string} 세션 ID
     */
    startSession(metadata = {}) {
        try {
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            this.currentProgress = {
                sessionId: sessionId,
                startTime: new Date().toISOString(),
                endTime: null,
                totalSteps: Object.keys(this.stepDefinitions).length,
                currentStep: 0,
                status: 'running',
                steps: [],
                error: null,
                metadata: {
                    ...metadata,
                    version: '1.0.0',
                    userAgent: process.platform
                }
            };
            
            this.log('info', `🚀 새로운 자동화 세션 시작: ${sessionId}`);
            this.saveProgress();
            
            return sessionId;
            
        } catch (error) {
            console.error('❌ 세션 시작 실패:', error);
            throw error;
        }
    }

    /**
     * 단계 시작
     * @param {string} stepId 단계 ID
     * @param {Object} stepData 단계 데이터
     */
    startStep(stepId, stepData = {}) {
        try {
            if (!this.stepDefinitions[stepId]) {
                throw new Error(`알 수 없는 단계: ${stepId}`);
            }
            
            const step = {
                id: stepId,
                name: this.stepDefinitions[stepId].name,
                weight: this.stepDefinitions[stepId].weight,
                status: 'running',
                startTime: new Date().toISOString(),
                endTime: null,
                progress: 0,
                message: `${this.stepDefinitions[stepId].name} 시작`,
                error: null,
                data: stepData
            };
            
            // 기존 단계가 있다면 교체, 없다면 추가
            const existingIndex = this.currentProgress.steps.findIndex(s => s.id === stepId);
            if (existingIndex !== -1) {
                this.currentProgress.steps[existingIndex] = step;
            } else {
                this.currentProgress.steps.push(step);
                this.currentProgress.currentStep++;
            }
            
            this.log('info', `📋 단계 시작: ${step.name}`);
            this.saveProgress();
            
        } catch (error) {
            console.error(`❌ 단계 시작 실패 (${stepId}):`, error);
            this.log('error', `❌ 단계 시작 실패 (${stepId}): ${error.message}`);
        }
    }

    /**
     * 단계 진행률 업데이트
     * @param {string} stepId 단계 ID
     * @param {number} progress 진행률 (0-100)
     * @param {string} message 메시지
     */
    updateStepProgress(stepId, progress, message = '') {
        try {
            const step = this.currentProgress.steps.find(s => s.id === stepId);
            if (!step) {
                console.warn(`⚠️ 단계를 찾을 수 없습니다: ${stepId}`);
                return;
            }
            
            step.progress = Math.max(0, Math.min(100, progress));
            if (message) {
                step.message = message;
            }
            
            this.log('debug', `📊 ${step.name} 진행률: ${step.progress}% - ${message}`);
            this.saveProgress();
            
        } catch (error) {
            console.error(`❌ 단계 진행률 업데이트 실패 (${stepId}):`, error);
        }
    }

    /**
     * 단계 완료
     * @param {string} stepId 단계 ID
     * @param {Object} result 결과 데이터
     */
    completeStep(stepId, result = {}) {
        try {
            const step = this.currentProgress.steps.find(s => s.id === stepId);
            if (!step) {
                console.warn(`⚠️ 단계를 찾을 수 없습니다: ${stepId}`);
                return;
            }
            
            step.status = 'completed';
            step.endTime = new Date().toISOString();
            step.progress = 100;
            step.message = `${step.name} 완료`;
            step.result = result;
            
            // 실행 시간 계산
            if (step.startTime) {
                const duration = new Date(step.endTime) - new Date(step.startTime);
                step.duration = Math.round(duration / 1000); // 초 단위
            }
            
            this.log('info', `✅ 단계 완료: ${step.name} (${step.duration || 0}초)`);
            this.saveProgress();
            
            // 모든 단계가 완료되었는지 확인
            this.checkSessionCompletion();
            
        } catch (error) {
            console.error(`❌ 단계 완료 처리 실패 (${stepId}):`, error);
        }
    }

    /**
     * 단계 실패
     * @param {string} stepId 단계 ID
     * @param {Error|string} error 오류 정보
     */
    failStep(stepId, error) {
        try {
            const step = this.currentProgress.steps.find(s => s.id === stepId);
            if (!step) {
                console.warn(`⚠️ 단계를 찾을 수 없습니다: ${stepId}`);
                return;
            }
            
            step.status = 'failed';
            step.endTime = new Date().toISOString();
            step.error = error instanceof Error ? error.message : error;
            step.message = `${step.name} 실패: ${step.error}`;
            
            // 실행 시간 계산
            if (step.startTime) {
                const duration = new Date(step.endTime) - new Date(step.startTime);
                step.duration = Math.round(duration / 1000);
            }
            
            this.log('error', `❌ 단계 실패: ${step.name} - ${step.error}`);
            this.saveProgress();
            
            // 세션 전체를 실패로 마킹
            this.failSession(error);
            
        } catch (err) {
            console.error(`❌ 단계 실패 처리 실패 (${stepId}):`, err);
        }
    }

    /**
     * 세션 완료 확인
     */
    checkSessionCompletion() {
        try {
            const completedSteps = this.currentProgress.steps.filter(s => s.status === 'completed');
            const totalSteps = this.currentProgress.steps.length;
            
            if (completedSteps.length === totalSteps && totalSteps > 0) {
                this.completeSession();
            }
            
        } catch (error) {
            console.error('❌ 세션 완료 확인 실패:', error);
        }
    }

    /**
     * 세션 완료
     */
    completeSession() {
        try {
            this.currentProgress.status = 'completed';
            this.currentProgress.endTime = new Date().toISOString();
            
            // 전체 실행 시간 계산
            if (this.currentProgress.startTime) {
                const duration = new Date(this.currentProgress.endTime) - new Date(this.currentProgress.startTime);
                this.currentProgress.totalDuration = Math.round(duration / 1000);
            }
            
            this.log('info', `🎉 자동화 세션 완료: ${this.currentProgress.sessionId} (${this.currentProgress.totalDuration || 0}초)`);
            this.saveProgress();
            
        } catch (error) {
            console.error('❌ 세션 완료 처리 실패:', error);
        }
    }

    /**
     * 세션 실패
     * @param {Error|string} error 오류 정보
     */
    failSession(error) {
        try {
            this.currentProgress.status = 'failed';
            this.currentProgress.endTime = new Date().toISOString();
            this.currentProgress.error = error instanceof Error ? error.message : error;
            
            // 전체 실행 시간 계산
            if (this.currentProgress.startTime) {
                const duration = new Date(this.currentProgress.endTime) - new Date(this.currentProgress.startTime);
                this.currentProgress.totalDuration = Math.round(duration / 1000);
            }
            
            this.log('error', `💥 자동화 세션 실패: ${this.currentProgress.sessionId} - ${this.currentProgress.error}`);
            this.saveProgress();
            
        } catch (err) {
            console.error('❌ 세션 실패 처리 실패:', err);
        }
    }

    /**
     * 세션 중지
     */
    stopSession() {
        try {
            this.currentProgress.status = 'stopped';
            this.currentProgress.endTime = new Date().toISOString();
            
            // 실행 중인 단계들을 중지로 마킹
            this.currentProgress.steps.forEach(step => {
                if (step.status === 'running') {
                    step.status = 'stopped';
                    step.endTime = new Date().toISOString();
                    step.message = `${step.name} 중지됨`;
                }
            });
            
            // 전체 실행 시간 계산
            if (this.currentProgress.startTime) {
                const duration = new Date(this.currentProgress.endTime) - new Date(this.currentProgress.startTime);
                this.currentProgress.totalDuration = Math.round(duration / 1000);
            }
            
            this.log('warn', `⏹️ 자동화 세션 중지: ${this.currentProgress.sessionId}`);
            this.saveProgress();
            
        } catch (error) {
            console.error('❌ 세션 중지 처리 실패:', error);
        }
    }

    /**
     * 전체 진행률 계산
     * @returns {number} 전체 진행률 (0-100)
     */
    calculateOverallProgress() {
        try {
            if (this.currentProgress.steps.length === 0) {
                return 0;
            }
            
            let totalWeight = 0;
            let completedWeight = 0;
            
            this.currentProgress.steps.forEach(step => {
                totalWeight += step.weight;
                
                if (step.status === 'completed') {
                    completedWeight += step.weight;
                } else if (step.status === 'running') {
                    completedWeight += (step.weight * step.progress / 100);
                }
            });
            
            return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
            
        } catch (error) {
            console.error('❌ 전체 진행률 계산 실패:', error);
            return 0;
        }
    }

    /**
     * 현재 진행 상황 조회
     * @returns {Object} 진행 상황
     */
    getProgress() {
        const progress = { ...this.currentProgress };
        progress.overallProgress = this.calculateOverallProgress();
        return progress;
    }

    /**
     * 단계별 상태 요약
     * @returns {Object} 상태 요약
     */
    getStepSummary() {
        const summary = {
            total: this.currentProgress.steps.length,
            completed: 0,
            running: 0,
            failed: 0,
            stopped: 0,
            pending: 0
        };
        
        this.currentProgress.steps.forEach(step => {
            summary[step.status]++;
        });
        
        // 아직 시작되지 않은 단계들
        const definedSteps = Object.keys(this.stepDefinitions).length;
        summary.pending = Math.max(0, definedSteps - summary.total);
        
        return summary;
    }

    /**
     * 진행 상황 저장
     */
    saveProgress() {
        try {
            const progressData = {
                ...this.currentProgress,
                overallProgress: this.calculateOverallProgress(),
                lastUpdated: new Date().toISOString()
            };
            
            fs.writeFileSync(
                this.progressFile,
                JSON.stringify(progressData, null, 2),
                'utf8'
            );
            
        } catch (error) {
            console.error('❌ 진행 상황 저장 실패:', error);
        }
    }

    /**
     * 진행 상황 로드
     * @returns {Object|null} 저장된 진행 상황
     */
    loadProgress() {
        try {
            if (!fs.existsSync(this.progressFile)) {
                return null;
            }
            
            const rawData = fs.readFileSync(this.progressFile, 'utf8');
            const progressData = JSON.parse(rawData);
            
            // 진행 중인 세션이 있다면 복원
            if (progressData.status === 'running') {
                this.currentProgress = progressData;
                console.log(`📖 진행 상황 복원: ${progressData.sessionId}`);
            }
            
            return progressData;
            
        } catch (error) {
            console.error('❌ 진행 상황 로드 실패:', error);
            return null;
        }
    }

    /**
     * 로그 기록
     * @param {string} level 로그 레벨 (info, warn, error, debug)
     * @param {string} message 메시지
     */
    log(level, message) {
        try {
            const timestamp = new Date().toISOString();
            const sessionId = this.currentProgress.sessionId || 'no-session';
            const logEntry = `[${timestamp}] [${level.toUpperCase()}] [${sessionId}] ${message}\n`;
            
            // 콘솔 출력
            switch (level) {
                case 'error':
                    console.error(message);
                    break;
                case 'warn':
                    console.warn(message);
                    break;
                case 'debug':
                    // 디버그 모드에서만 출력
                    if (process.env.DEBUG) {
                        console.log(message);
                    }
                    break;
                default:
                    console.log(message);
            }
            
            // 파일에 기록
            fs.appendFileSync(this.logFile, logEntry, 'utf8');
            
        } catch (error) {
            console.error('❌ 로그 기록 실패:', error);
        }
    }

    /**
     * 로그 파일 읽기
     * @param {number} lines 읽을 라인 수 (기본값: 100)
     * @returns {Array} 로그 라인들
     */
    readLogs(lines = 100) {
        try {
            if (!fs.existsSync(this.logFile)) {
                return [];
            }
            
            const content = fs.readFileSync(this.logFile, 'utf8');
            const allLines = content.split('\n').filter(line => line.trim());
            
            // 최근 라인들만 반환
            return allLines.slice(-lines);
            
        } catch (error) {
            console.error('❌ 로그 읽기 실패:', error);
            return [];
        }
    }

    /**
     * 로그 파일 정리
     * @param {number} maxLines 최대 유지할 라인 수
     */
    cleanupLogs(maxLines = 1000) {
        try {
            if (!fs.existsSync(this.logFile)) {
                return;
            }
            
            const content = fs.readFileSync(this.logFile, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            if (lines.length > maxLines) {
                const keepLines = lines.slice(-maxLines);
                fs.writeFileSync(this.logFile, keepLines.join('\n') + '\n', 'utf8');
                console.log(`📝 로그 파일 정리: ${lines.length} -> ${keepLines.length} 라인`);
            }
            
        } catch (error) {
            console.error('❌ 로그 정리 실패:', error);
        }
    }

    /**
     * 상태 확인
     * @returns {Object}
     */
    getStatus() {
        return {
            logDirExists: fs.existsSync(this.logDir),
            progressFileExists: fs.existsSync(this.progressFile),
            logFileExists: fs.existsSync(this.logFile),
            hasActiveSession: this.currentProgress.status === 'running',
            sessionId: this.currentProgress.sessionId,
            overallProgress: this.calculateOverallProgress(),
            stepSummary: this.getStepSummary()
        };
    }

    /**
     * 리소스 정리
     */
    async cleanup() {
        try {
            console.log('🧹 ProgressTracker 리소스 정리...');
            
            // 진행 중인 세션이 있다면 중지
            if (this.currentProgress.status === 'running') {
                this.stopSession();
            }
            
            // 로그 정리
            this.cleanupLogs();
            
            console.log('✅ ProgressTracker 리소스 정리 완료');
            
        } catch (error) {
            console.error('❌ 리소스 정리 중 오류:', error);
        }
    }
}

module.exports = ProgressTracker; 