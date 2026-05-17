const { LoginManager } = require('../modules/LoginManager');
const { CoupangCrawler } = require('../modules/CoupangCrawler');
const { ContentGenerator } = require('../modules/ContentGenerator');
const { ImageProcessor } = require('../modules/ImageProcessor');
const { BlogPublisher } = require('../modules/BlogPublisher');
const { SessionManager } = require('../modules/SessionManager');
const { ConfigManager } = require('../modules/ConfigManager');
const { ProgressTracker } = require('../modules/ProgressTracker');
const EventEmitter = require('events');

/**
 * 네파스 메인 클래스
 * 모든 자동화 기능을 통합 관리합니다.
 */
class BlogAutomation extends EventEmitter {
  constructor(config) {
    super();
    
    // 설정 관리자 초기화
    this.configManager = new ConfigManager(config);
    this.config = this.configManager.getConfig();
    
    // 진행 상황 추적기 초기화
    this.progressTracker = new ProgressTracker();
    
    // 각 모듈 인스턴스
    this.sessionManager = new SessionManager(this.config);
    this.loginManager = new LoginManager(this.config);
    this.coupangCrawler = new CoupangCrawler(this.config);
    this.contentGenerator = new ContentGenerator(this.config);
    this.imageProcessor = new ImageProcessor(this.config);
    this.blogPublisher = new BlogPublisher(this.config);
    
    // 상태 관리
    this.isRunning = false;
    this.currentStep = null;
    this.lastError = null;
    this.currentAccount = null; // 현재 로그인된 계정 정보
    
    this.setupEventListeners();
    
    console.log('네파스 시스템이 초기화되었습니다.');
  }

  /**
   * 이벤트 리스너 설정
   * 각 모듈에서 발생하는 이벤트를 처리합니다.
   */
  setupEventListeners() {
    // 진행 상황 업데이트 이벤트
    this.progressTracker.on('progress', (data) => {
      this.emit('progress-update', data);
    });

    // 로그인 매니저 이벤트
    this.loginManager.on('login-success', () => {
      this.progressTracker.updateStep('로그인 완료');
    });

    this.loginManager.on('login-error', (error) => {
      this.lastError = error;
      this.emit('error', { step: '로그인', error: error.message });
    });

    // 크롤러 이벤트
    this.coupangCrawler.on('crawl-progress', (data) => {
      this.progressTracker.updateStep(`크롤링 진행: ${data.current}/${data.total}`);
    });

    this.coupangCrawler.on('crawl-complete', (data) => {
      this.progressTracker.updateStep('크롤링 완료');
      this.emit('crawl-complete', data);
    });

    // 콘텐츠 생성기 이벤트
    this.contentGenerator.on('generation-progress', (data) => {
      this.progressTracker.updateStep(`콘텐츠 생성: ${data.step}`);
    });

    this.contentGenerator.on('generation-complete', (data) => {
      this.progressTracker.updateStep('콘텐츠 생성 완료');
    });

    // 이미지 처리기 이벤트
    this.imageProcessor.on('processing-progress', (data) => {
      this.progressTracker.updateStep(`이미지 처리: ${data.current}/${data.total}`);
    });

    // 블로그 발행기 이벤트
    this.blogPublisher.on('publish-progress', (data) => {
      this.progressTracker.updateStep(`발행 진행: ${data.step}`);
    });

    this.blogPublisher.on('publish-complete', (data) => {
      this.progressTracker.updateStep('발행 완료');
      this.emit('publish-complete', data);
    });
  }

  /**
   * 로그인 수행
   * @param {Object} credentials - 로그인 정보 { userId, password }
   * @returns {Promise<Object>} 로그인 결과
   */
  async login(credentials) {
    try {
      this.progressTracker.start('로그인 시작');
      
      const result = await this.loginManager.login(credentials);
      
      // 로그인 성공 시 계정 정보 저장
      if (result.success) {
        this.currentAccount = {
          id: credentials.userId || credentials.id,
          password: credentials.password,
          username: credentials.userId || credentials.id
        };
      }
      
      this.progressTracker.complete('로그인 완료');
      return result;
    } catch (error) {
      this.lastError = error;
      this.progressTracker.error('로그인 실패', error.message);
      throw error;
    }
  }

  /**
   * 쿠팡 상품 크롤링 시작
   * @param {Object} options - 크롤링 옵션
   * @returns {Promise<Object>} 크롤링 결과
   */
  async startCrawling(options) {
    try {
      this.isRunning = true;
      this.currentStep = 'crawling';
      this.progressTracker.start('크롤링 시작');

      // 세션 로드
      const session = await this.sessionManager.loadSession();
      if (!session) {
        throw new Error('세션이 없습니다. 먼저 로그인해주세요.');
      }

      // 크롤링 실행
      const crawlResult = await this.coupangCrawler.crawl(options);
      
      this.progressTracker.complete('크롤링 완료');
      return crawlResult;
    } catch (error) {
      this.lastError = error;
      this.progressTracker.error('크롤링 실패', error.message);
      throw error;
    } finally {
      this.isRunning = false;
      this.currentStep = null;
    }
  }

  /**
   * 콘텐츠 생성
   * @param {Object} productInfo - 상품 정보
   * @returns {Promise<Object>} 생성된 콘텐츠
   */
  async generateContent(productInfo) {
    try {
      this.isRunning = true;
      this.currentStep = 'content-generation';
      this.progressTracker.start('콘텐츠 생성 시작');

      // 제목 생성
      const title = await this.contentGenerator.generateTitle(productInfo);
      
      // 인사말 생성
      const greeting = await this.contentGenerator.generateGreeting(productInfo);
      
      // 본문 생성
      const content = await this.contentGenerator.generateMainContent(productInfo);
      
      // 상품 후기 생성
      const reviews = await this.contentGenerator.generateReviews(productInfo);

      const generatedContent = {
        title,
        greeting,
        content,
        reviews
      };

      this.progressTracker.complete('콘텐츠 생성 완료');
      return generatedContent;
    } catch (error) {
      this.lastError = error;
      this.progressTracker.error('콘텐츠 생성 실패', error.message);
      throw error;
    } finally {
      this.isRunning = false;
      this.currentStep = null;
    }
  }

  /**
   * 포스트 발행
   * @param {Object} postData - 발행할 포스트 데이터
   * @param {Object} account - 계정 정보 (선택사항)
   * @returns {Promise<Object>} 발행 결과
   */
  async publishPost(postData, account = null) {
    try {
      this.isRunning = true;
      this.currentStep = 'publishing';
      this.progressTracker.start('포스트 발행 시작');

      // 계정 정보 결정 (매개변수로 전달된 것이 우선, 없으면 저장된 것 사용)
      const useAccount = account || this.currentAccount;
      if (!useAccount) {
        console.warn('⚠️ 계정 정보가 없습니다. 세션 만료 시 재로그인을 할 수 없습니다.');
      }

      // 세션 확인 (계정 ID가 있으면 해당 계정의 세션 로드)
      let session;
      if (useAccount && useAccount.id) {
        session = await this.sessionManager.loadSession(useAccount.id);
      } else {
        session = await this.sessionManager.loadSession();
      }
      
      if (!session) {
        throw new Error('세션이 없습니다. 먼저 로그인해주세요.');
      }

      // 이미지 처리
      const processedImages = await this.imageProcessor.processImages(postData.images);
      
      // 포스트 데이터 준비
      const finalPostData = {
        ...postData,
        images: processedImages
      };

      // 포스트 발행 (계정 정보도 함께 전달)
      const publishResult = await this.blogPublisher.publish(finalPostData, session, useAccount);

      this.progressTracker.complete('포스트 발행 완료');
      return publishResult;
    } catch (error) {
      this.lastError = error;
      this.progressTracker.error('포스트 발행 실패', error.message);
      throw error;
    } finally {
      this.isRunning = false;
      this.currentStep = null;
    }
  }

  /**
   * 전체 자동화 프로세스 실행
   * @param {Object} options - 자동화 옵션
   * @returns {Promise<Object>} 전체 실행 결과
   */
  async runFullAutomation(options) {
    try {
      this.isRunning = true;
      this.progressTracker.start('전체 자동화 시작');

      // 1. 크롤링
      const crawlResult = await this.startCrawling(options.crawling);
      
      // 2. 콘텐츠 생성
      const contentResult = await this.generateContent(crawlResult.selectedProduct);
      
      // 3. 포스트 발행
      const publishResult = await this.publishPost({
        ...contentResult,
        ...crawlResult
      });

      this.progressTracker.complete('전체 자동화 완료');
      
      return {
        crawlResult,
        contentResult,
        publishResult
      };
    } catch (error) {
      this.lastError = error;
      this.progressTracker.error('전체 자동화 실패', error.message);
      throw error;
    } finally {
      this.isRunning = false;
      this.currentStep = null;
    }
  }

  /**
   * 현재 상태 반환
   * @returns {Object} 현재 상태 정보
   */
  async getStatus() {
    return {
      initialized: true,
      isRunning: this.isRunning,
      currentStep: this.currentStep,
      lastError: this.lastError ? this.lastError.message : null,
      hasSession: await this.sessionManager.hasValidSession(),
      progress: this.progressTracker.getProgress()
    };
  }

  /**
   * 진행 상황 반환
   * @returns {Object} 진행 상황 정보
   */
  getProgress() {
    return this.progressTracker.getProgress();
  }

  /**
   * 자동화 중지
   */
  async stop() {
    try {
      this.isRunning = false;
      this.currentStep = null;
      
      // 각 모듈의 작업 중지
      if (this.coupangCrawler) {
        await this.coupangCrawler.stop();
      }
      
      if (this.contentGenerator) {
        await this.contentGenerator.stop();
      }
      
      if (this.blogPublisher) {
        await this.blogPublisher.stop();
      }

      this.progressTracker.stop('사용자에 의해 중지됨');
      console.log('자동화가 중지되었습니다.');
    } catch (error) {
      console.error('자동화 중지 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 설정 업데이트
   * @param {Object} newConfig - 새로운 설정
   */
  updateConfig(newConfig) {
    this.configManager.updateConfig(newConfig);
    this.config = this.configManager.getConfig();
    
    // 각 모듈에 새 설정 적용
    this.loginManager.updateConfig(this.config);
    this.coupangCrawler.updateConfig(this.config);
    this.contentGenerator.updateConfig(this.config);
    this.imageProcessor.updateConfig(this.config);
    this.blogPublisher.updateConfig(this.config);
  }

  /**
   * 아고다 자동화 실행
   * @param {Array} accounts - 실행할 계정 목록
   * @param {string} country - 선택된 국가
   * @returns {Object} 실행 결과
   */
  async executeAgodaAutomation(accounts, country) {
    console.log(`🏨 아고다 자동화 시작: ${accounts.length}개 계정, 국가: ${country}`);
    
    try {
      // 아고다 모듈 경로 확인
      const path = require('path');
      const agodaPath = path.join(__dirname, '../../agoda');
      
      // 아고다 모듈 동적 로드
      const { getRandomHotelInfo } = require(path.join(agodaPath, 'index.js'));
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      
      for (const account of accounts) {
        try {
          console.log(`🏨 계정 ${account.naverId}으로 아고다 자동화 시작`);
          
          // 아고다 설정 업데이트
          const agodaConfig = path.join(agodaPath, 'config.js');
          const fs = require('fs');
          
          // 링크 프라이스 CID 설정
          if (account.linkPriceCid) {
            // config.js 파일 읽기
            let configContent = fs.readFileSync(agodaConfig, 'utf8');
            
            // CID 업데이트
            configContent = configContent.replace(
              /const LINK_PRICE_CID = ['"`].*?['"`];/,
              `const LINK_PRICE_CID = '${account.linkPriceCid}';`
            );
            
            // 국가 설정 업데이트 (index.js에서 초기화 부분)
            const indexPath = path.join(agodaPath, 'index.js');
            let indexContent = fs.readFileSync(indexPath, 'utf8');
            
            // 국가 설정 업데이트
            indexContent = indexContent.replace(
              /initializeCityData\(['"`].*?['"`]\)/,
              `initializeCityData('${country}')`
            );
            
            // 파일 저장
            fs.writeFileSync(agodaConfig, configContent);
            fs.writeFileSync(indexPath, indexContent);
            
            console.log(`✅ 아고다 설정 업데이트 완료: CID=${account.linkPriceCid}, 국가=${country}`);
          }
          
          // 아고다 호텔 정보 가져오기
          const hotelInfo = await getRandomHotelInfo('대한민국', null, account.linkPriceCid);
          
          if (!hotelInfo) {
            throw new Error('호텔 정보를 가져올 수 없습니다.');
          }
          
          console.log(`🏨 호텔 정보 수집 완료: ${hotelInfo.이름}`);
          
          // 제미나이로 블로그 글 작성
          const blogContent = await this.contentGenerator.generateAgodaContent(hotelInfo, account.geminiApi);
          
          // 🔥 BlogPublisher의 publishAgodaPost 메서드 사용 (재로그인 로직 포함)
          console.log(`📝 ${account.naverId} 계정으로 아고다 블로그 포스트 발행 시작...`);
          
          // 세션 데이터 로드 시도
          let sessionData = null;
          try {
            sessionData = await this.sessionManager.loadSession(account.id || account.naverId);
          } catch (sessionError) {
            console.warn(`⚠️ 세션 로드 실패: ${account.naverId} - ${sessionError.message}`);
          }
          
          // BlogPublisher를 사용하여 아고다 포스트 발행 (자동 재로그인 포함)
          const publishResult = await this.blogPublisher.publishAgodaPost({
            title: blogContent.title,
            content: blogContent.content,
            images: hotelInfo.이미지 || [],
            account: {
              id: account.id || account.naverId,
              username: account.naverId,
              password: account.naverPassword || account.password,
              blogId: account.blogId,
              categoryId: account.categoryId
            }
          }, sessionData, {
            id: account.id || account.naverId,
            username: account.naverId,
            password: account.naverPassword || account.password,
            blogId: account.blogId,
            categoryId: account.categoryId
          });
          
          if (publishResult.success) {
            successCount++;
            console.log(`✅ 계정 ${account.naverId} 아고다 자동화 완료`);
          } else {
            throw new Error(publishResult.error || '블로그 게시 실패');
          }
          
        } catch (error) {
          errorCount++;
          errors.push({
            account: account.naverId,
            error: error.message
          });
          console.error(`❌ 계정 ${account.naverId} 아고다 자동화 실패:`, error);
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
      // 현재 진행 중인 작업이 있다면 중지
      if (this.isRunning) {
        this.isRunning = false;
        console.log('🛑 아고다 자동화 중지됨');
      }
      
      return {
        success: true,
        message: '아고다 자동화가 중지되었습니다.'
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
   * 리소스 정리
   */
  async cleanup() {
    try {
      await this.stop();
      
      // 각 모듈 정리
      if (this.loginManager) {
        await this.loginManager.cleanup();
      }
      
      if (this.coupangCrawler) {
        await this.coupangCrawler.cleanup();
      }
      
      if (this.contentGenerator) {
        await this.contentGenerator.cleanup();
      }
      
      if (this.imageProcessor) {
        await this.imageProcessor.cleanup();
      }
      
      if (this.blogPublisher) {
        await this.blogPublisher.cleanup();
      }

      console.log('모든 리소스가 정리되었습니다.');
    } catch (error) {
      console.error('리소스 정리 중 오류 발생:', error);
    }
  }
}

module.exports = { BlogAutomation }; 