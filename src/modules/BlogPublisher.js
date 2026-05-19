const { chromium } = require('playwright');
const EventEmitter = require('events');
const { clipboard, nativeImage } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const BrowserUtils = require('./BrowserUtils');
const { spawn } = require('child_process');
const ContentGenerator = require('./ContentGenerator'); // 의존성 추가
// clipboardy는 dynamic import로 로드 (ES Module)

/**
 * 네이버 블로그 발행 클래스
 * Playwright를 사용하여 네이버 블로그에 포스트를 발행합니다.
 */
class BlogPublisher extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    
    // CATEGORY_ID 타입 안전성 보장 (String 변환)
    if (config && config.CATEGORY_ID !== undefined && config.CATEGORY_ID !== null) {
      config.CATEGORY_ID = String(config.CATEGORY_ID);
    }
    
    this.browser = null;
    this.page = null;
    this.isPublishing = false;
    this.contentGenerator = new ContentGenerator(); // ContentGenerator 인스턴스화
    // API 키는 필요할 때 설정하도록 변경

    // 인용구 스타일 선택 (포스트별로 통일성 유지)
    this.selectedQuotationStyle = null;
    
    // 네이버 블로그 관련 URL (카테고리 ID 포함)
    if (config.CATEGORY_ID && config.CATEGORY_ID.trim() !== '') {
      this.BLOG_WRITE_URL = `https://blog.naver.com/${config.BLOG_ID}/postwrite?categoryNo=${config.CATEGORY_ID}`;
      console.log(`📂 카테고리 ID ${config.CATEGORY_ID}가 포함된 포스팅 URL로 초기화됨`);
    } else {
      this.BLOG_WRITE_URL = `https://blog.naver.com/${config.BLOG_ID}/postwrite`;
      console.log('📝 기본 포스팅 URL로 초기화됨 (카테고리 ID 없음)');
    }
    this.BLOG_MAIN_URL = `https://blog.naver.com/${config.BLOG_ID}`;
    
    console.log('블로그 발행기가 초기화되었습니다.');
    console.log(`🔗 포스팅 URL: ${this.BLOG_WRITE_URL}`);
  }

  /**
   * 브라우저 시작 및 세션 복원
   * @param {Object} sessionData - 로그인 세션 데이터
   */
  async startBrowserWithSession(sessionData) {
    try {
      this.browser = await chromium.launch(
        BrowserUtils.getBrowserLaunchOptions(false) // headless: false
      );

      const context = await this.browser.newContext(
        BrowserUtils.getContextOptions()
      );

      // 클립보드 권한 명시적 허용
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
        origin: 'https://blog.naver.com'
      });

      // 세션 쿠키 복원
      if (sessionData.cookies) {
        await context.addCookies(sessionData.cookies);
      }

      this.page = await context.newPage();
      
      // 🔒 브라우저 연결 모니터링 시작 (세션 보호)
      if (this.sessionManager && sessionData.accountId) {
        console.log('🔍 브라우저 연결 모니터링 시작...');
        await this.sessionManager.monitorBrowserConnection(this.page, sessionData.accountId);
      }
      
      // localStorage, sessionStorage 복원
      if (sessionData.localStorage || sessionData.sessionStorage) {
        // 일단 네이버 메인으로 이동해서 스토리지 복원
        await this.page.goto('https://www.naver.com', { waitUntil: 'networkidle' });
        
        if (sessionData.localStorage) {
          await this.page.evaluate((localStorageData) => {
            for (const [key, value] of Object.entries(localStorageData)) {
              window.localStorage.setItem(key, value);
            }
          }, sessionData.localStorage);
        }
        
        if (sessionData.sessionStorage) {
          await this.page.evaluate((sessionStorageData) => {
            for (const [key, value] of Object.entries(sessionStorageData)) {
              window.sessionStorage.setItem(key, value);
            }
          }, sessionData.sessionStorage);
        }
      }
      
      // 자동화 탐지 우회
      await BrowserUtils.addAntiDetectionScript(this.page);

      console.log('브라우저가 시작되고 세션이 복원되었습니다.');
    } catch (error) {
      console.error('브라우저 시작 중 오류:', error);
      throw error;
    }
  }

  /**
   * 로그인 상태 확인 (강화된 버전)
   * @returns {Promise<boolean>} 로그인 상태
   */
  async checkLoginStatus() {
    try {
      await this.page.goto(this.BLOG_MAIN_URL, { 
        waitUntil: 'networkidle',
        timeout: 120000 
      });

      // SessionManager의 로그인 폼 체크 기능 사용
      const SessionManager = require('./SessionManager');
      const sessionManager = new SessionManager(global.paths.sessionsPath);
      
      // 로그인 폼이 페이지에 있는지 확인
      const loginFormPresent = await sessionManager.isLoginFormPresent(this.page);
      
      if (loginFormPresent) {
        console.log('❌ 네이버 블로그에서 로그인 폼 감지됨 - 세션 만료');
        return false;
      }

      // 추가 로그인 상태 확인 (기존 방식)
      const loginButton = await this.page.$('#gnb_login_button');
      const isLoggedIn = !loginButton;

      if (isLoggedIn) {
        console.log('✅ 네이버 블로그 로그인 상태 확인됨');
      } else {
        console.log('❌ 네이버 블로그 로그인이 필요함');
      }

      return isLoggedIn;
    } catch (error) {
      console.error('❌ 로그인 상태 확인 중 오류:', error);
      return false;
    }
  }

  /**
   * 포스트 작성 페이지로 이동
   * @returns {Promise<boolean>} 성공 시 true, 로그인 폼 감지 시 false
   */
  async navigateToWritePage() {
    try {
      this.emit('publish-progress', { step: '포스트 작성 페이지로 이동' });
      
      // 🔥 새로운 포스트 시작 시 인용구 스타일 초기화
      this.selectedQuotationStyle = null;
      console.log('🔄 인용구 스타일 초기화 완료 (새로운 포스트)');
      
      await this.page.goto(this.BLOG_WRITE_URL, { 
        waitUntil: 'networkidle',
        timeout: 120000 
      });

      // 🔥 페이지 이동 후 로그인 폼이 나타났는지 확인
      const SessionManager = require('./SessionManager');
      const sessionManager = new SessionManager(global.paths.sessionsPath);
      
      const loginFormPresent = await sessionManager.isLoginFormPresent(this.page);
      if (loginFormPresent) {
        console.log('🚨 포스트 작성 페이지에서 로그인 폼 감지됨 - 재로그인 필요');
        return false; // 에러를 던지지 않고 false 리턴
      }

      // "작성 중인 글이 있습니다" 팝업 처리
      try {
        const popupSelector = '.se-popup-container.__se-pop-layer';
        await this.page.waitForSelector(popupSelector, { timeout: 3000 });
        
        console.log('📝 "작성 중인 글이 있습니다" 팝업 감지');
        
        // "취소" 버튼 클릭
        const cancelButton = await this.page.$('.se-popup-button-cancel');
        if (cancelButton) {
          await cancelButton.click();
          console.log('✅ "취소" 버튼 클릭 완료');
          await this.page.waitForTimeout(2000);
        }
      } catch (popupError) {
        // 팝업이 없으면 무시하고 계속 진행
        console.log('ℹ️ 작성 중인 글 팝업 없음 - 정상 진행');
      }

      // 스마트 에디터 로딩 대기
      await this.page.waitForSelector('.se-container', { timeout: 120000 });
      
      // 🔥 도움말 패널 닫기 (포스트 작성 페이지 이동 후)
      await this.closeHelpPanelIfVisible();
      
      // 정렬 버튼 클릭 (가운데 정렬 설정)
      try {
        console.log('🎯 텍스트 가운데 정렬 설정 시작...');
        
        // 첫 번째: 정렬 툴바 버튼 클릭
        const alignToolbarButton = await this.page.$('.se-toolbar-item.se-toolbar-item-align');
        if (alignToolbarButton) {
          await alignToolbarButton.click();
          console.log('✅ 정렬 툴바 버튼 클릭 완료');
          await this.page.waitForTimeout(2000);
          
          // 두 번째: 가운데 정렬 버튼 클릭
          const centerAlignButton = await this.page.$('.__se-sentry.se-toolbar-option-icon-button.se-toolbar-option-align-center-button.se-is-selected');
          if (centerAlignButton) {
            await centerAlignButton.click();
            console.log('✅ 가운데 정렬 버튼 클릭 완료');
            await this.page.waitForTimeout(1000);
          } else {
            // 선택되지 않은 가운데 정렬 버튼 찾기
            const centerAlignButtonAlt = await this.page.$('.__se-sentry.se-toolbar-option-icon-button.se-toolbar-option-align-center-button');
            if (centerAlignButtonAlt) {
              await centerAlignButtonAlt.click();
              console.log('✅ 가운데 정렬 버튼 클릭 완료 (대체)');
              await this.page.waitForTimeout(500);
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ 정렬 버튼 클릭 실패 (무시하고 계속):', error.message);
      }
      
      console.log('✅ 포스트 작성 페이지 이동 완료');
      await this.page.waitForTimeout(2000);
      
      return true; // 성공 시 true 리턴
      
    } catch (error) {
      console.error('포스트 작성 페이지 이동 중 오류:', error);
      throw error;
    }
  }

  /**
   * 제목 입력
   * @param {string} title - 포스트 제목
   */
  async enterTitle(title) {
    try {
      this.emit('publish-progress', { step: '제목 입력' });
      
      // 제목 입력 영역 (textarea 또는 placeholder) 찾기
      const selectors = [
        '.se-document-title textarea',
        '[class*="se-title-text"] textarea',
        'textarea.se-bare-textarea',
        '[class*="se-title-text"] [class*="se-placeholder"]'
      ];
      
      let titleInput = null;
      for (const selector of selectors) {
        try {
          titleInput = await this.page.waitForSelector(selector, { timeout: 3000 });
          if (titleInput) {
            console.log(`✅ 제목 입력 요소 발견: ${selector}`);
            break;
          }
        } catch (e) {
          // 다음 셀렉터 시도
        }
      }
      
      if (!titleInput) {
        throw new Error('제목 입력 영역을 찾을 수 없습니다');
      }
      
      // 기존 제목 지우고 새 제목 입력
      await titleInput.click();
      await this.page.waitForTimeout(500);
      await this.page.keyboard.press('Control+A');
      await this.page.waitForTimeout(200);
      await this.page.keyboard.press('Backspace');
      await this.page.waitForTimeout(200);
      
      // 대제목 클립보드 복사 후 붙여넣기로 1초 만에 입력 완성 (중간 포커싱 이탈 완벽 방지)
      try {
        await this.copyTextToClipboard(title);
        await this.page.keyboard.press('Control+V');
        console.log('✅ 제목 클립보드 복사 붙여넣기 완료');
      } catch (pasteError) {
        console.warn('⚠️ 제목 붙여넣기 실패, 직접 타이핑으로 백업:', pasteError.message);
        await this.page.keyboard.type(title, { delay: 20 });
      }
      
      await this.page.waitForTimeout(1000);
      console.log(`제목 입력 완료: ${title}`);
    } catch (error) {
      console.error('제목 입력 중 오류:', error);
      throw error;
    }
  }

  /**
   * clipboardy 라이브러리 동적 로드
   * @returns {Promise<Object>} clipboardy 모듈
   */
  async loadClipboardy() {
    try {
      if (!this.clipboardy) {
        const clipboardyModule = await import('clipboardy');
        this.clipboardy = clipboardyModule.default; // default export 사용
      }
      return this.clipboardy;
    } catch (error) {
      console.warn('⚠️ clipboardy 로드 실패:', error.message);
      return null;
    }
  }

  /**
   * 텍스트를 클립보드로 복사 (clipboardy 사용)
   * @param {string} text - 복사할 텍스트
   */
  async copyTextToClipboard(text) {
    try {
      console.log('📋 클립보드 복사 시작...');
      console.log(`📋 복사할 텍스트 길이: ${text.length}자`);
      
      // clipboardy 동적 로드 및 사용
      const clipboardy = await this.loadClipboardy();
      
      if (clipboardy) {
        try {
          // clipboardy.writeSync 사용 (이제 올바르게 접근)
          clipboardy.writeSync(text);
          console.log('✅ clipboardy 텍스트 복사 성공');
          return;
        } catch (clipboardyError) {
          console.warn('⚠️ clipboardy 복사 실패:', clipboardyError.message);
          // 대체 방법으로 계속 진행
        }
      }
      
      // 대체 방법 1: Electron clipboard API 사용
      try {
        console.log('🔄 대체 방법 1: Electron clipboard API 사용...');
        clipboard.writeText(text);
        console.log('✅ Electron clipboard API 대체 방법 성공');
        return;
      } catch (electronError) {
        console.warn('⚠️ Electron clipboard API 실패:', electronError.message);
        
        // 대체 방법 2: clip.exe 사용
        try {
          console.log('🔄 대체 방법 2: clip.exe 사용...');
        await this.fallbackClipboardCopy(text);
          console.log('✅ clip.exe 대체 방법 성공');
          return;
      } catch (fallbackError) {
          console.error('❌ 모든 클립보드 복사 방법 실패:', fallbackError.message);
          throw new Error(`클립보드 복사 실패: clipboardy(${clipboardy ? '실패' : '로드 실패'}), Electron(${electronError.message}), clip.exe(${fallbackError.message})`);
      }
      }
      
    } catch (error) {
      console.error('❌ 클립보드 복사 중 오류:', error.message);
      throw error;
    }
  }

  /**
   * 대체 클립보드 복사 방법 (clip.exe 사용)
   * @param {string} text - 복사할 텍스트
   */
  async fallbackClipboardCopy(text) {
    try {
      console.log('🔄 대체 클립보드 복사 방법 시도...');
      
      // clip.exe 사용 (Windows 내장)
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
        
        // 타임아웃 설정 (빠른 처리)
        setTimeout(() => {
          clipProcess.kill();
          reject(new Error('clip.exe 타임아웃'));
        }, 3000); // 3초로 단축
      });
      
    } catch (error) {
      throw new Error(`대체 클립보드 복사 실패: ${error.message}`);
    }
  }

  /**
   * 이미지를 클립보드로 복사 (Electron API 방식)
   * @param {string} imagePath 이미지 파일 경로
   */
  async copyImageToClipboard(imagePath) {
    try {
      console.log(`📋 이미지 클립보드 복사 시작 (Electron API): ${path.basename(imagePath)}`);
      
      // 파일 존재 확인
      if (!require('fs').existsSync(imagePath)) {
        throw new Error(`이미지 파일이 존재하지 않습니다: ${imagePath}`);
      }
      
      const image = nativeImage.createFromPath(imagePath);
      
      if (image.isEmpty()) {
        throw new Error(`이미지 파일을 로드할 수 없습니다: ${imagePath}`);
      }
      
      clipboard.writeImage(image);
      
      console.log(`✅ 이미지 클립보드 복사 성공: ${path.basename(imagePath)}`);
      
    } catch (error) {
      console.error('이미지 클립보드 복사 실패:', error);
      throw error;
    }
  }

  /**
   * 파일 경로에서 MIME 타입 추출
   * @param {string} filePath 파일 경로
   * @returns {string} MIME 타입
   */
  getMimeTypeFromPath(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.gif':
        return 'image/gif';
      case '.webp':
        return 'image/webp';
      case '.bmp':
        return 'image/bmp';
      default:
        return 'image/jpeg'; // 기본값
    }
  }

  /**
   * 단일 이미지 삽입 (클립보드 복사 붙여넣기)
   * @param {string} imagePath - 이미지 파일 경로
   */
  async insertSingleImage(imagePath) {
    try {
      console.log(`📸 이미지 삽입 시작: ${path.basename(imagePath)}`);
      
      // 1단계: 이미지를 클립보드로 복사
      await this.copyImageToClipboard(imagePath);
      
      // 2단계: 에디터에 포커스 및 붙여넣기
      console.log('📝 에디터에 이미지 붙여넣기 중...');
      await this.page.keyboard.press('Control+V');
      
      // 3단계: 이미지 업로드 완료 대기
      console.log('⏳ 이미지 업로드 완료 대기 중...');
      await this.page.waitForTimeout(3000); // 업로드 및 렌더링 대기
      
      console.log(`✅ 이미지 삽입 완료: ${path.basename(imagePath)}`);
      
    } catch (error) {
      console.error(`❌ 단일 이미지 삽입 실패: ${imagePath}`, error);
      throw error;
    }
  }

  /**
   * 도움말 패널 닫기 (보이는 경우만)
   */
  async closeHelpPanelIfVisible() {
    try {
      // 도움말 패널이 활성화되어 있는지 확인
      const helpPanel = await this.page.$('.se-help-panel.se-is-on');
      
      if (helpPanel) {
        console.log('📚 도움말 패널 감지 - 닫기 버튼 클릭');
        
        // 닫기 버튼 클릭
        const closeButton = await this.page.$('.se-help-panel-close-button');
        if (closeButton) {
          await closeButton.click();
          console.log('✅ 도움말 패널 닫기 완료');
          await this.page.waitForTimeout(1000); // 닫기 애니메이션 대기
        }
      } else {
        console.log('ℹ️ 도움말 패널 없음 - 정상 진행');
      }
    } catch (error) {
      console.error('도움말 패널 닫기 중 오류:', error);
      // 도움말 패널 닫기 실패는 치명적이지 않으므로 계속 진행
    }
  }

  /**
   * 이미지 업로드 (클립보드 복사 붙여넣기 방식)
   * @param {Array} imagePaths - 업로드할 이미지 파일 경로 목록
   * @returns {Promise<Array>} 업로드된 이미지 정보
   */
  async uploadImages(imagePaths) {
    try {
      this.emit('publish-progress', { step: '이미지 업로드 시작' });
      
      if (!imagePaths || imagePaths.length === 0) {
        console.log('업로드할 이미지가 없습니다.');
        return [];
      }

      const uploadedImages = [];
      
      // 본문 에디터 영역 찾기
      const editorSelectors = [
        '.se-component-content',
        '.se-text-paragraph', 
        '[contenteditable="true"]',
        '.editor-content'
      ];
      
      let editorElement = null;
      for (const selector of editorSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 3000 });
          editorElement = await this.page.$(selector);
          if (editorElement) {
            console.log(`에디터 발견: ${selector}`);
            break;
          }
        } catch (e) {
          // 다음 셀렉터 시도
        }
      }

      if (!editorElement) {
        throw new Error('에디터를 찾을 수 없어 이미지 업로드를 할 수 없습니다.');
      }

      // 각 이미지를 클립보드로 복사해서 붙여넣기
      for (let i = 0; i < imagePaths.length; i++) {
        const imagePath = imagePaths[i];
        
        try {
          this.emit('publish-progress', { 
            step: `이미지 업로드 (${i + 1}/${imagePaths.length})` 
          });

          console.log(`📸 이미지 복사 붙여넣기 시작: ${path.basename(imagePath)}`);

          // 1단계: 이미지를 클립보드로 복사
          console.log(`📋 1단계: 이미지 클립보드 복사 중...`);
          await this.copyImageToClipboard(imagePath);
          console.log(`✅ 1단계: 이미지 클립보드 복사 완료`);
          await this.page.waitForTimeout(500);
          
          // 2단계: 에디터에 포커스
          console.log(`🎯 2단계: 에디터 포커스 설정 중...`);
          await editorElement.click();
          console.log(`✅ 2단계: 에디터 포커스 설정 완료`);
          await this.page.waitForTimeout(200);
          
          // 3단계: Ctrl+V로 붙여넣기
          console.log(`📝 3단계: 이미지 붙여넣기 중...`);
          await this.page.keyboard.press('Control+V');
          console.log(`✅ 3단계: 이미지 붙여넣기 완료`);
          await this.page.waitForTimeout(2000); // 이미지 로딩 대기

          uploadedImages.push({
            path: imagePath,
            index: i,
            filename: path.basename(imagePath),
            method: 'clipboard'
          });
          
          console.log(`🎉 이미지 복사 붙여넣기 완료: ${path.basename(imagePath)}`);
          
        } catch (error) {
          console.error(`❌ 이미지 붙여넣기 실패 (${i + 1}):`, error.message);
          throw new Error(`이미지 ${i + 1} 붙여넣기 실패: ${error.message}`);
        }
      }

      console.log(`✅ 모든 이미지 업로드 완료: ${uploadedImages.length}개`);
      return uploadedImages;
      
    } catch (error) {
      console.error('이미지 업로드 처리 중 오류:', error);
      throw error;
    }
  }

  /**
   * 아고다 제휴마케팅 문구 추가
   * 본문 작성 전에 의무 표시 문구를 추가합니다.
   */
  async addAgodaPartnershipNotice() {
    try {
      this.emit('publish-progress', { step: '제휴마케팅 문구 추가' });
      console.log('📝 아고다 제휴마케팅 문구 추가 시작...');
      
      const partnershipNotice = "이 포스팅은 제휴마케팅이 포함된 광고로 커미션을 지급 받습니다";
      
      // 스마트 에디터의 본문 영역 찾기 및 포커스 설정
      const contentFrame = await this.page.frame('se_iframe');
      
      if (!contentFrame) {
        // iframe을 사용하지 않는 경우 - 직접 본문 에디터 찾기
        console.log('📝 일반 에디터 모드 - 본문 영역 찾는 중...');
        
        // 본문 컨테이너 대기
        await this.page.waitForSelector('.se-component-content', { timeout: 120000 });
        
        // 실제 텍스트 입력 영역 찾기
        const textParagraph = await this.page.$('.se-text-paragraph');
        if (!textParagraph) {
          throw new Error('본문 텍스트 영역을 찾을 수 없습니다');
        }
        
        console.log('✅ 본문 텍스트 영역 발견: .se-text-paragraph');
        
        // 본문 영역에 포커스 설정
        await textParagraph.click();
        await this.page.waitForTimeout(1000);
        
        // 플레이스홀더가 있는 경우 클릭하여 활성화
        const placeholder = await this.page.$('.se-placeholder');
        if (placeholder) {
          await placeholder.click();
          await this.page.waitForTimeout(500);
          console.log('📝 플레이스홀더 클릭으로 에디터 활성화');
        }
        
        // 제휴마케팅 문구 입력 (클립보드 복사 후 붙여넣기, 실패 시 직접 타이핑)
        try {
          await this.copyTextToClipboard(partnershipNotice);
          await this.page.keyboard.press('Control+V');
          console.log('✅ 클립보드를 통한 제휴마케팅 문구 입력 완료');
        } catch (clipboardError) {
          console.warn('⚠️ 클립보드 복사 실패, 직접 타이핑으로 전환:', clipboardError.message);
          
          // 클립보드 실패 시 직접 타이핑
          await this.page.keyboard.type(partnershipNotice, { delay: 50 }); // 빠른 타이핑
          console.log('✅ 직접 타이핑으로 제휴마케팅 문구 입력 완료');
        }
        
        // Enter 3번으로 본문과 분리
        await this.page.keyboard.press('Enter');
        await this.page.keyboard.press('Enter');
        await this.page.keyboard.press('Enter');
        
        console.log('✅ 문구 후 줄바꿈 3번 완료');
        
      } else {
        // iframe 내부의 에디터 처리
        console.log('📝 iframe 에디터 모드 - 본문 영역 찾는 중...');
        
        // iframe 내부에서 본문 영역 찾기
        await contentFrame.waitForSelector('.se-component-content', { timeout: 120000 });
        
        const textParagraph = await contentFrame.$('.se-text-paragraph');
        if (!textParagraph) {
          throw new Error('iframe 내 본문 텍스트 영역을 찾을 수 없습니다');
        }
        
        console.log('✅ iframe 내 본문 텍스트 영역 발견: .se-text-paragraph');
        
        // iframe 내 본문 영역에 포커스 설정
        await textParagraph.click();
        await this.page.waitForTimeout(1000);
        
        // iframe 내 플레이스홀더 처리
        const placeholder = await contentFrame.$('.se-placeholder');
        if (placeholder) {
          await placeholder.click();
          await this.page.waitForTimeout(500);
          console.log('📝 iframe 내 플레이스홀더 클릭으로 에디터 활성화');
        }
        
        // 제휴마케팅 문구 입력 (클립보드 복사 후 붙여넣기, 실패 시 직접 타이핑)
        try {
          await this.copyTextToClipboard(partnershipNotice);
          await this.page.keyboard.press('Control+V');
          console.log('✅ 클립보드를 통한 제휴마케팅 문구 입력 완료');
        } catch (clipboardError) {
          console.warn('⚠️ 클립보드 복사 실패, 직접 타이핑으로 전환:', clipboardError.message);
          
          // 클립보드 실패 시 직접 타이핑
          await this.page.keyboard.type(partnershipNotice, { delay: 50 }); // 빠른 타이핑
          console.log('✅ 직접 타이핑으로 제휴마케팅 문구 입력 완료');
        }
        
        // Enter 3번으로 본문과 분리
        await this.page.keyboard.press('Enter');
        await this.page.keyboard.press('Enter');
        await this.page.keyboard.press('Enter');
        
        console.log('✅ 문구 후 줄바꿈 3번 완료');
      }
      
      console.log('🎉 아고다 제휴마케팅 문구 추가 완료');
      
    } catch (error) {
      console.error('❌ 제휴마케팅 문구 추가 중 오류:', error);
      throw error;
    }
  }

  /**
   * 쿠팡 파트너스 수수료 문구 추가
   * 본문 작성 전에 의무 표시 문구를 추가합니다.
   */
  async addPartnershipNotice() {
    try {
      this.emit('publish-progress', { step: '파트너스 수수료 문구 추가' });
      console.log('📝 쿠팡 파트너스 수수료 문구 추가 시작...');
      
      const partnershipNotice = "이 포스팅은 쿠팡 파트너스 활동의 일환으로 수수료를 지급받습니다";
      
      // 스마트 에디터의 본문 영역 찾기 및 포커스 설정
      const contentFrame = await this.page.frame('se_iframe');
      
      if (!contentFrame) {
        // iframe을 사용하지 않는 경우 - 직접 본문 에디터 찾기
        console.log('📝 일반 에디터 모드 - 본문 영역 찾는 중...');
        
        // 본문 컨테이너 대기
        await this.page.waitForSelector('.se-component-content', { timeout: 120000 });
        
        // 실제 텍스트 입력 영역 찾기
        const textParagraph = await this.page.$('.se-text-paragraph');
        if (!textParagraph) {
          throw new Error('본문 텍스트 영역을 찾을 수 없습니다');
        }
        
        console.log('✅ 본문 텍스트 영역 발견: .se-text-paragraph');
        
        // 본문 영역에 포커스 설정
        await textParagraph.click();
        await this.page.waitForTimeout(1000);
        
        // 플레이스홀더가 있는 경우 클릭하여 활성화
        const placeholder = await this.page.$('.se-placeholder');
        if (placeholder) {
          await placeholder.click();
          await this.page.waitForTimeout(500);
          console.log('📝 플레이스홀더 클릭으로 에디터 활성화');
        }
        
        // 파트너스 문구 입력 (클립보드 복사 후 붙여넣기, 실패 시 직접 타이핑)
        try {
          await this.copyTextToClipboard(partnershipNotice);
          await this.page.keyboard.press('Control+V');
          console.log('✅ 클립보드를 통한 파트너스 수수료 문구 입력 완료');
        } catch (clipboardError) {
          console.warn('⚠️ 클립보드 복사 실패, 직접 타이핑으로 전환:', clipboardError.message);
          
          // 클립보드 실패 시 직접 타이핑
          await this.page.keyboard.type(partnershipNotice, { delay: 50 }); // 빠른 타이핑
          console.log('✅ 직접 타이핑으로 파트너스 수수료 문구 입력 완료');
        }
        
        // Enter 3번으로 본문과 분리
        await this.page.keyboard.press('Enter');
        await this.page.keyboard.press('Enter');
        await this.page.keyboard.press('Enter');
        
        console.log('✅ 문구 후 줄바꿈 3번 완료');
        
      } else {
        // iframe 내부의 에디터 처리
        console.log('📝 iframe 에디터 모드 - 본문 영역 찾는 중...');
        
        // iframe 내부에서 본문 영역 찾기
        await contentFrame.waitForSelector('.se-component-content', { timeout: 120000 });
        
        const textParagraph = await contentFrame.$('.se-text-paragraph');
        if (!textParagraph) {
          throw new Error('iframe 내 본문 텍스트 영역을 찾을 수 없습니다');
        }
        
        console.log('✅ iframe 내 본문 텍스트 영역 발견: .se-text-paragraph');
        
        // iframe 내 본문 영역에 포커스 설정
        await textParagraph.click();
        await this.page.waitForTimeout(1000);
        
        // iframe 내 플레이스홀더 처리
        const placeholder = await contentFrame.$('.se-placeholder');
        if (placeholder) {
          await placeholder.click();
          await this.page.waitForTimeout(500);
          console.log('📝 iframe 내 플레이스홀더 클릭으로 에디터 활성화');
        }
        
        // 파트너스 문구 입력 (클립보드 복사 후 붙여넣기, 실패 시 직접 타이핑)
        try {
          await this.copyTextToClipboard(partnershipNotice);
          await this.page.keyboard.press('Control+V');
          console.log('✅ 클립보드를 통한 파트너스 수수료 문구 입력 완료');
        } catch (clipboardError) {
          console.warn('⚠️ 클립보드 복사 실패, 직접 타이핑으로 전환:', clipboardError.message);
          
          // 클립보드 실패 시 직접 타이핑
          await this.page.keyboard.type(partnershipNotice, { delay: 50 }); // 빠른 타이핑
          console.log('✅ 직접 타이핑으로 파트너스 수수료 문구 입력 완료');
        }
        
        // Enter 3번으로 본문과 분리
        await this.page.keyboard.press('Enter');
        await this.page.keyboard.press('Enter');
        await this.page.keyboard.press('Enter');
        
        console.log('✅ 문구 후 줄바꿈 3번 완료');
      }
      
      console.log('🎉 쿠팡 파트너스 수수료 문구 추가 완료');
      
    } catch (error) {
      console.error('❌ 파트너스 수수료 문구 추가 중 오류:', error);
      throw error;
    }
  }

  /**
   * 인용구 스타일 선택 (한 포스팅 내에서 동일한 스타일 사용)
   * @returns {string} 선택된 인용구 스타일
   */
  selectQuotationStyle() {
    // 사장님의 요청으로 가장 마음에 들어하시는 '인용구 3 (말풍선 스타일 - quotation_bubble)'으로 100% 고정합니다.
    this.selectedQuotationStyle = 'quotation_bubble';
    console.log(`📋 [스타일 완전 고정] 포스트용 소제목 인용구를 '인용구 3(말풍선 - quotation_bubble)' 스타일로 고정했습니다.`);
    
    return this.selectedQuotationStyle;
  }

  /**
   * 인용구를 사용한 소제목 입력
   * @param {string} subtitle - 입력할 소제목
   */
  async insertSubtitleWithQuotation(subtitle) {
    try {
      console.log(`📋 인용구를 사용한 소제목 입력 시작: ${subtitle}`);
      
      // 기존 상태 완전 초기화
      await this.page.keyboard.press('Escape');
      await this.page.keyboard.press('Escape');
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(300);
      
      // 현재 커서 위치 확인 및 정리
      await this.page.keyboard.press('End');
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(200);
      
      // 인용구 스타일 선택 (포스트별로 통일성 유지)
      const quotationStyle = this.selectQuotationStyle();
      
      // 1단계: 인용구 선택 버튼 클릭
      console.log('🔹 1단계: 인용구 선택 버튼 클릭 중...');
      const quotationButton = await this.page.waitForSelector('[data-name="quotation"]', { timeout: 5000 });
      await quotationButton.click();
      console.log('✅ 1단계: 인용구 선택 버튼 클릭 완료');
      await this.page.waitForTimeout(800); // 충분한 대기 시간
      
      // 2단계: 인용구 스타일 선택
      console.log(`🔹 2단계: 인용구 스타일 선택 중 (${quotationStyle})...`);
      const quotationStyleButton = await this.page.waitForSelector(`[data-value="${quotationStyle}"]`, { timeout: 5000 });
      await quotationStyleButton.click();
      console.log(`✅ 2단계: 인용구 스타일 선택 완료 (${quotationStyle})`);
      await this.page.waitForTimeout(1000); // 인용구 적용 충분한 대기
      
      // 3단계: 소제목 입력
      console.log(`🔹 3단계: 소제목 입력 중 (${subtitle})...`);
          try {
        await this.copyTextToClipboard(subtitle);
        await this.page.keyboard.press('Control+v');
        console.log('✅ 3단계: 소제목 클립보드 입력 완료');
          } catch (clipboardError) {
        console.warn('⚠️ 소제목 클립보드 복사 실패, 직접 타이핑:', clipboardError.message);
        await this.page.keyboard.type(subtitle, { delay: 30 });
        console.log('✅ 3단계: 소제목 직접 타이핑 입력 완료');
          }
          
      // 소제목 입력 후 대기
      await this.page.waitForTimeout(500);
      
      // 4단계: 아래방향키 두 번 입력 (본문 작성 위치로 이동)
      console.log('🔹 4단계: 아래방향키 두 번 입력으로 본문 작성 위치로 이동...');
      console.log('⬇️ 첫 번째 아래방향키 입력...');
      await this.page.keyboard.press('ArrowDown');
      await this.page.waitForTimeout(300);
      console.log('⬇️ 두 번째 아래방향키 입력...');
      await this.page.keyboard.press('ArrowDown');
      await this.page.waitForTimeout(300);
      console.log('✅ 4단계: 아래방향키 두 번 입력 완료');
      
      console.log(`🎉 인용구 소제목 입력 완료: ${subtitle}`);
      
    } catch (error) {
      console.error('❌ 인용구 소제목 입력 실패:', error);
      throw error;
    }
  }

  /**
   * AI를 이용해 문단에 맞는 소제목을 생성합니다.
   * @param {string} paragraph - 문단 내용
   * @param {string} productName - 상품명
   * @param {Object} account - 계정 정보 (Gemini API 키 포함)
   * @returns {Promise<string>} 생성된 소제목
   */
  async generateSubtitle(paragraph, productName, account) {
    try {
      // 계정 정보에서 Gemini API 키 가져오기
      const geminiApiKey = account?.geminiApi || this.config?.geminiApi || this.config?.GEMINI_API_KEY;
      
      if (!geminiApiKey) {
        console.warn('⚠️ Gemini API 키가 없습니다. 기본 소제목을 사용합니다.');
        return this.generateDefaultSubtitle(productName);
      }
      
      // ContentGenerator API 키 설정
      if (!this.contentGenerator.apiKey || this.contentGenerator.apiKey !== geminiApiKey) {
        try {
          this.contentGenerator.setApiKey(geminiApiKey);
          console.log('✅ Gemini API 키 설정 완료');
        } catch (apiError) {
          console.error('❌ Gemini API 키 설정 실패:', apiError.message);
          return this.generateDefaultSubtitle(productName);
        }
      }
      
      this.emit('publish-progress', { step: '소제목 생성 중...' });
      const subtitle = await this.contentGenerator.generateSubtitle(productName, paragraph);
      console.log(`✨ AI 생성 소제목: "${subtitle}"`);
      return subtitle.slice(0, 70); // 70자 제한
      
    } catch (error) {
      console.error('❌ AI 소제목 생성 실패:', error);
      return this.generateDefaultSubtitle(productName);
    }
  }

  /**
   * 기본 소제목 생성 (AI 실패 시 사용)
   * @param {string} productName - 상품명
   * @returns {string} 기본 소제목
   */
  generateDefaultSubtitle(productName) {
    const defaultSubtitles = [
      '제품 소개',
      '주요 특징',
      '사용 경험',
      '품질 체크',
      '구매 정보',
      '추천 이유',
      '마무리'
    ];
    
    const randomIndex = Math.floor(Math.random() * defaultSubtitles.length);
    const subtitle = defaultSubtitles[randomIndex];
    console.log(`📝 기본 소제목 사용: "${subtitle}"`);
    return subtitle;
  }

  /**
   * 본문 내용 입력
   * @param {string} content - 본문 내용
   * @param {Array<string>} imagePaths - 이미지 파일 경로 목록
   * @param {string} productName - 상품명 (소제목 생성용)
   * @param {Object} account - 계정 정보 (Gemini API 키 포함)
   */
  async enterContent(content, imagePaths = [], productName, account) {
    try {
      this.emit('publish-progress', { step: '본문 내용 및 이미지 입력' });
      
      const paragraphs = content.split('\n\n');
      const contentFrame = await this.page.frame('se_iframe');
      const targetPage = contentFrame || this.page;

      // 🎯 [방탄 포커스 전환] 본문 작성 시작 전 제목 영역에서 본문 영역으로 포커스를 전환하여,
      // '말풍선 빼기' 등의 옵션 상태에서도 텍스트가 제목 칸으로 올라가는 현상을 완벽히 방지합니다.
      console.log('🎯 [포커스 전환] 본문 입력 영역으로 포커스를 이동합니다...');
      try {
        // 1단계: 마우스 강제 클릭을 통한 1차 탈출 시도 (Primary Focus)
        const textParagraph = await targetPage.$('.se-text-paragraph, [contenteditable="true"]');
        if (textParagraph) {
          try {
            await textParagraph.scrollIntoViewIfNeeded();
            await textParagraph.click({ force: true });
            await this.page.waitForTimeout(500);
            console.log('✅ [포커스 전환] 1단계: 본문 텍스트 영역 클릭 완료');
          } catch(e) {
            console.warn('⚠️ 본문 클릭 중 오류:', e.message);
          }
        }
        
        // 2단계: 활성 요소(Active Element) 정밀 감시 및 Tab 키 강제 탈출 (Fallback)
        // 네이버 스마트에디터의 구조적 한계(제목 칸 갇힘 현상)를 원천 차단합니다.
        let escapeAttempts = 0;
        let isStillInTitle = true;
        
        while (isStillInTitle && escapeAttempts < 3) {
          isStillInTitle = await targetPage.evaluate(() => {
            const active = document.activeElement;
            if (!active) return false;
            const className = typeof active.className === 'string' ? active.className : '';
            return className.includes('se-document-title') || active.tagName === 'TEXTAREA' || active.placeholder === '제목';
          });

          if (isStillInTitle) {
            console.warn(`⚠️ [포커스 경고] 커서가 아직 제목 칸에 갇혀 있습니다! Tab 키 강제 탈출 시도 (${escapeAttempts + 1}/3)`);
            await this.page.keyboard.press('Tab');
            await this.page.waitForTimeout(500);
            escapeAttempts++;
          } else {
            console.log('✅ [포커스 전환] 2단계: 커서가 본문 영역에 안전하게 탈출했음을 확인했습니다.');
          }
        }
        
        // 3단계: 만약 Tab 키로도 탈출하지 못했다면 비상 수단으로 좌표 강제 클릭
        if (isStillInTitle) {
            console.warn('⚠️ [비상 탈출] 커서가 제목 칸에서 빠져나오지 못했습니다. 본문 좌표 강제 클릭 시도.');
            await this.page.mouse.click(300, 500); // 화면 중앙 하단 임의 위치 클릭
            await this.page.waitForTimeout(500);
        }
        
      } catch (focusError) {
        console.warn('⚠️ 본문 포커스 전환 실패 (무시하고 계속):', focusError.message);
      }

      // 📸 [방탄 루프 횟수 제어] 텍스트 개수와 이미지 개수를 연동하여 
      // 어떠한 옵션 조합에서도 이미지와 텍스트가 유실 없이 100% 매칭되도록 보장합니다.
      const loopCount = imagePaths.length > 0 ? Math.max(paragraphs.length, imagePaths.length) : paragraphs.filter(p => p.trim()).length;
      
      for (let i = 0; i < loopCount; i++) {
        let paragraph = paragraphs[i] ? paragraphs[i].trim() : '';
        const imageToInsert = imagePaths && imagePaths[i] && require('fs').existsSync(imagePaths[i]) ? imagePaths[i] : null;
        
        // 🎯 [방탄 포커스 고정] 이전 루프에서 이미지가 삽입된 후 포커스가 이미지 블록에 갇히는 현상을 완벽히 차단합니다.
        // 각 섹션 루프 시작 시점에 본문 최하단의 빈 문단(.se-text-paragraph)을 한 번 더 정밀 클릭하여 초점을 확실히 고정시킵니다.
        if (i > 0) {
          console.log(`🎯 [루프 포커스 재조정] ${i + 1}번째 섹션 시작 전 본문 최하단 문단에 초점을 맞춥니다...`);
          try {
            const textParagraphs = await targetPage.$$('.se-text-paragraph');
            if (textParagraphs && textParagraphs.length > 0) {
              const lastParagraph = textParagraphs[textParagraphs.length - 1];
              await lastParagraph.click();
              await this.page.waitForTimeout(500);
              console.log('✅ [루프 포커스 재조정] 최하단 문단 클릭 완료');
            }
          } catch (e) {
            console.warn('⚠️ 루프 포커스 재조정 실패:', e.message);
          }
        }
        
        // 🔥 말풍선 소제목 넣기/빼기 처리
        if (this.config.useBubble !== false) {
          if (paragraph || imageToInsert) {
            console.log(`🔹 [말풍선 옵션 활성] ${i + 1}번째 섹션 소제목 생성 및 삽입 중...`);
            // 🔥 소제목 생성 (AI 기반)
            const subtitle = await this.generateSubtitle(paragraph || '오늘의 순간', productName, account);
            await this.insertSubtitleWithQuotation(subtitle);
          }
        } else {
          console.log(`🔹 [말풍선 옵션 비활성] ${i + 1}번째 섹션 소제목 삽입을 건너뜁니다.`);
        }
        
        // 🔥 60자 설명문 넣기/빼기 처리 (또는 사장님의 천재적 아이디어인 사진 인덱스 자동 표기 처리)
        if (this.config.useDescription !== false && paragraph && paragraph.trim() !== '') {
          console.log(`🔹 [설명문 옵션 활성] ${i + 1}번째 섹션 본문 텍스트 입력 중...`);
          // 🔥 문장별 줄바꿈 추가 (숫자 뒤의 마침표는 제외)
          paragraph = paragraph.replace(/(?<!\d)[.!?]\s*/g, '$&\n').trim();
          console.log(`📝 문단 내용 (줄바꿈 적용):\n${paragraph}`);
            
          // 문단 내용 입력
          try {
            await this.copyTextToClipboard(paragraph);
            await targetPage.keyboard.press('Control+V');
          } catch (clipboardError) {
            console.warn(`⚠️ 문단 클립보드 복사 실패, 직접 타이핑:`, clipboardError.message);
            await targetPage.keyboard.type(paragraph, { delay: 40 });
          }
          await targetPage.waitForTimeout(500);
        } else if (this.config.useBubble === false && this.config.useDescription === false) {
          // 📸 [천재적 아이디어 반영] 둘 다 빠진 특수 옵션 상태에서는 
          // 네이버 에디터 포커싱 안정화를 위해 숫자 인덱스(예: "1", "2")를 아주 귀엽게 본문에 심어줍니다.
          const indexText = `${i + 1}`;
          console.log(`🔹 [말풍선+설명문 비활성] 에디터 안정화 및 사진 구분을 위해 인덱스 문자 "${indexText}" 입력 중...`);
          try {
            await this.copyTextToClipboard(indexText);
            await targetPage.keyboard.press('Control+V');
          } catch (clipboardError) {
            await targetPage.keyboard.type(indexText, { delay: 40 });
          }
          await targetPage.waitForTimeout(500);
        } else {
          console.log(`🔹 [설명문 옵션 비활성 또는 문단 없음] ${i + 1}번째 섹션 본문 입력을 건너뜁니다.`);
        }
          
        // 이미지 삽입
        if (imageToInsert) {
          console.log(`📸 ${i + 1}번째 이미지 삽입`);
          // 이미지 삽입 전 확실히 텍스트 줄로 내려가기 위해 ArrowDown 후 Enter
          await this.page.keyboard.press('ArrowDown');
          await this.page.waitForTimeout(200);
          await this.page.keyboard.press('Enter');
          await this.page.waitForTimeout(500);
          
          await this.insertSingleImage(imageToInsert);
          
          // 이미지 삽입 후 이미지 컴포넌트 포커스를 탈출하기 위해 ArrowDown 후 Enter
          await this.page.keyboard.press('ArrowDown');
          await this.page.waitForTimeout(200);
          await this.page.keyboard.press('Enter');
          await this.page.waitForTimeout(500);
        } else {
          await this.page.keyboard.press('ArrowDown');
          await this.page.waitForTimeout(100);
          await this.page.keyboard.press('Enter');
          await this.page.waitForTimeout(100);
          await this.page.keyboard.press('Enter');
          await this.page.waitForTimeout(100);
        }
        await this.page.waitForTimeout(1500);
      }
      
      console.log('✅ 모든 문단과 이미지 입력 완료');
      
    } catch (error) {
      console.error('본문 내용 입력 중 오류:', error);
      throw error;
    }
  }

  /**
   * 어필리에이트 OG 링크 추가
   * @param {string} affiliateUrl - 어필리에이트 URL
   */
  async addAffiliateOGLink(affiliateUrl) {
    try {
      this.emit('publish-progress', { step: '어필리에이트 URL 추가' });
      
      console.log(`🔗 어필리에이트 URL 추가 시작: ${affiliateUrl}`);
      
      // 클립보드 권한 재확인 및 설정
      try {
        await this.page.evaluate(() => {
          if (navigator.permissions) {
            navigator.permissions.query({name: 'clipboard-write'}).then(result => {
              console.log('클립보드 쓰기 권한:', result.state);
            });
          }
        });
      } catch (error) {
        console.log('클립보드 권한 확인 실패 (무시하고 계속):', error.message);
      }
      
      // iframe 내에서 작업하는지 확인
      const contentFrame = await this.page.frame('se_iframe');
      let workingPage = contentFrame || this.page;
      
      // 본문 끝으로 커서 이동
      await this.page.keyboard.press('Control+End');
      await this.page.waitForTimeout(1000);
      
      // 새 줄 추가
      await this.page.keyboard.press('Enter');
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(500);
      
      console.log('📝 본문 끝에 커서 위치 설정 완료');
      
      // OG링크 추가 시도
      try {
        // 1단계: [data-name="oglink"] 클릭
        const oglinkButton = await workingPage.$('[data-name="oglink"]');
        if (!oglinkButton) {
          // 메인 페이지에서 oglink 버튼 찾기
          const mainOglinkButton = await this.page.$('[data-name="oglink"]');
          if (!mainOglinkButton) {
            throw new Error('OG링크 버튼을 찾을 수 없습니다');
          }
          await mainOglinkButton.click();
          console.log('✅ 1단계: 메인 페이지에서 OG링크 버튼 클릭 완료');
        } else {
          await oglinkButton.click();
          console.log('✅ 1단계: iframe에서 OG링크 버튼 클릭 완료');
        }
        
        // headless 모드에서 더 긴 대기 시간
        await this.page.waitForTimeout(5000);
        
        // 2단계: [class="se-popup-oglink-input"]에 affiliateUrl 입력
        const oglinkInput = await this.page.$('.se-popup-oglink-input');
        if (!oglinkInput) {
          throw new Error('OG링크 입력창을 찾을 수 없습니다');
        }
        
        // 기존 내용 지우고 URL 붙여넣기
        await oglinkInput.click();
        await this.page.keyboard.press('Control+A');
        
        // 어필리에이트 URL 입력 (클립보드 복사 후 붙여넣기, 실패 시 직접 타이핑)
        try {
          await this.copyTextToClipboard(affiliateUrl);
          await this.page.keyboard.press('Control+V');
          console.log('✅ 2단계: OG링크 입력창에 어필리에이트 URL 클립보드 붙여넣기 완료');
        } catch (clipboardError) {
          console.warn('⚠️ 어필리에이트 URL 클립보드 복사 실패, 직접 타이핑:', clipboardError.message);
          
          // 클립보드 실패 시 직접 타이핑
          await this.page.keyboard.type(affiliateUrl, { delay: 50 }); // 빠른 타이핑
          console.log('✅ 2단계: OG링크 입력창에 어필리에이트 URL 직접 타이핑 완료');
        }
        
        await this.page.waitForTimeout(3000);
        
        // 3단계: [class="se-popup-oglink-button"] 클릭
        const oglinkSubmitButton = await this.page.$('.se-popup-oglink-button');
        if (!oglinkSubmitButton) {
          throw new Error('OG링크 확인 버튼을 찾을 수 없습니다');
        }
        
        await oglinkSubmitButton.click();
        console.log('✅ 3단계: OG링크 확인 버튼 클릭 완료');
        
        // headless 모드에서 더 긴 대기 시간 (OG 정보 로딩 대기)
        await this.page.waitForTimeout(8000);
        
        // 4단계: [class="se-oglink-frame"] 생성 확인 (더 많은 재시도)
        let oglinkFrame = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!oglinkFrame && retryCount < maxRetries) {
          oglinkFrame = await this.page.$('.se-oglink-frame');
          if (!oglinkFrame) {
            console.warn(`⚠️ OG링크 프레임 생성 대기 중... (${retryCount + 1}/${maxRetries})`);
            await this.page.waitForTimeout(3000);
            retryCount++;
          }
        }
        
        if (!oglinkFrame) {
          throw new Error('OG링크 프레임 생성 실패');
        }
        
        console.log('✅ 4단계: OG링크 프레임 생성 확인 완료');
        
        // 5단계: [class="se-popup-button se-popup-button-confirm"] 클릭
        const confirmButton = await this.page.$('.se-popup-button.se-popup-button-confirm');
        if (confirmButton) {
          await confirmButton.click();
          console.log('✅ 5단계: 팝업 확인 버튼 클릭 완료');
          await this.page.waitForTimeout(1000);
        } else {
          console.log('ℹ️ 팝업 확인 버튼이 없거나 이미 닫힘');
        }
        
        console.log('🎉 어필리에이트 URL OG링크 추가 완료');
        
      } catch (ogLinkError) {
        console.warn('⚠️ OG링크 추가 실패, 텍스트 링크로 대체:', ogLinkError.message);
        
        // 대체 방법: 단순 텍스트 링크 추가
        try {
          // 팝업이 열려있다면 닫기
          const cancelButton = await this.page.$('.se-popup-button-cancel');
          if (cancelButton) {
            await cancelButton.click();
            await this.page.waitForTimeout(1000);
          }
          
          // ESC 키로 팝업 닫기 시도
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(1000);
          
          // 본문 끝으로 이동
          await this.page.keyboard.press('Control+End');
          await this.page.keyboard.press('Enter');
          await this.page.keyboard.press('Enter');
          
          // 텍스트 링크 추가
          await this.page.keyboard.type(affiliateUrl, { delay: 50 }); // 빠른 타이핑
          
          console.log('✅ 텍스트 링크로 어필리에이트 URL 추가 완료');
          
        } catch (fallbackError) {
          console.warn('⚠️ 텍스트 링크 추가도 실패, 링크 없이 계속 진행:', fallbackError.message);
        }
      }
      
    } catch (error) {
      console.error('❌ 어필리에이트 URL 추가 중 오류:', error);
      // OG링크 추가 실패는 치명적이지 않으므로 경고만 출력하고 계속 진행
      console.warn('⚠️ 어필리에이트 링크 추가에 실패했지만 포스팅을 계속 진행합니다.');
    }
  }

  /**
   * 카테고리 설정
   * @param {number} categoryId - 카테고리 ID
   */
  async setCategory(categoryId) {
    try {
      this.emit('publish-progress', { step: '카테고리 설정' });
      
      // 카테고리 선택 버튼 클릭
      const categoryButton = await this.page.$('.category_select_area');
      if (categoryButton) {
        await categoryButton.click();
        await this.page.waitForTimeout(1000);
        
        // 특정 카테고리 선택 (ID 기반)
        const categoryOption = await this.page.$(`[data-category-id="${categoryId}"]`);
        if (categoryOption) {
          await categoryOption.click();
          console.log(`카테고리 설정 완료: ${categoryId}`);
        } else {
          console.log('지정된 카테고리를 찾을 수 없습니다. 기본 카테고리 사용');
        }
      }
    } catch (error) {
      console.error('카테고리 설정 중 오류:', error);
      // 카테고리 설정 실패는 치명적이지 않으므로 계속 진행
    }
  }

  /**
   * 공개 설정
   * @param {number} openType - 공개 타입 (0: 비공개, 2: 공개)
   */
  async setPrivacy(openType) {
    try {
      this.emit('publish-progress', { step: '공개 설정' });
      
      const targetType = parseInt(openType, 10);
      if (targetType === 0) {
        // 비공개 설정
        console.log('🔒 비공개 설정 시도 중...');
        const selectors = [
          'input[value="PRIVATE"]',
          'xpath=//label[contains(text(), "비공개")]',
          'xpath=//span[contains(text(), "비공개")]',
          'xpath=//label[contains(., "비공개")]',
          'xpath=//*[text()="비공개"]'
        ];
        
        let clicked = false;
        for (const selector of selectors) {
          try {
            const element = await this.page.$(selector);
            if (element) {
              await element.click();
              console.log(`✅ 비공개 셀렉터 클릭 성공: ${selector}`);
              clicked = true;
              break;
            }
          } catch (e) {
            console.log(`⚠️ 셀렉터 ${selector} 클릭 실패:`, e.message);
          }
        }
        
        if (!clicked) {
          console.warn('⚠️ 모든 비공개 설정 셀렉터가 감지되지 않았습니다. 기본 설정을 따릅니다.');
        }
      } else {
        // 공개 설정 (기본값)
        console.log('🔓 공개 설정 시도 중...');
        const selectors = [
          'input[value="PUBLIC"]',
          'xpath=//label[contains(text(), "전체공개")]',
          'xpath=//span[contains(text(), "전체공개")]',
          'xpath=//label[contains(., "전체공개")]',
          'xpath=//*[text()="전체공개"]'
        ];
        
        let clicked = false;
        for (const selector of selectors) {
          try {
            const element = await this.page.$(selector);
            if (element) {
              await element.click();
              console.log(`✅ 공개 셀렉터 클릭 성공: ${selector}`);
              clicked = true;
              break;
            }
          } catch (e) {
            console.log(`⚠️ 셀렉터 ${selector} 클릭 실패:`, e.message);
          }
        }
      }
      
      console.log(`공개 설정 완료: ${targetType === 0 ? '비공개' : '공개'}`);
    } catch (error) {
      console.error('공개 설정 중 오류:', error);
    }
  }

  /**
   * 태그 입력
   * @param {Array} tags - 태그 목록
   */
  async enterTags(tags) {
    try {
      this.emit('publish-progress', { step: '태그 입력' });
      
      if (!tags || tags.length === 0) {
        return;
      }

      const tagInput = await this.page.$('.tag_input_area input');
      if (tagInput) {
        for (const tag of tags) {
          await tagInput.type(tag, { delay: 80 });
          await this.page.keyboard.press('Enter');
          await this.page.waitForTimeout(1000);
        }
        
        console.log(`태그 입력 완료: ${tags.join(', ')}`);
      }
    } catch (error) {
      console.error('태그 입력 중 오류:', error);
      // 태그 입력 실패는 치명적이지 않으므로 계속 진행
    }
  }

  /**
   * 포스트 발행
   * @returns {Promise<Object>} 발행 결과
   */
  async publishPost(postData = null, account = null) {
    try {
      this.emit('publish-progress', { step: '포스트 발행 중' });
      
      // 1단계: 첫 번째 발행 버튼 클릭
      const publishButton = await this.page.$('.publish_btn__m9KHH, .publish_btn, .se-publish-btn');
      if (!publishButton) {
        throw new Error('발행 버튼을 찾을 수 없습니다');
      }

      await publishButton.click();
      console.log('✅ 1단계: 발행 설정 레이어 열기 완료');
      
      // 2단계: 발행 설정 레이어가 나타날 때까지 대기
      await this.page.waitForSelector('.layer_publish__vA9PX', { timeout: 120000 });
      console.log('✅ 발행 설정 레이어 감지');
      await this.page.waitForTimeout(1000); // 레이어 애니메이션 완료 대기
      
      // ⚠️ 중요: 네이버 스마트에디터의 공개 설정, 카테고리 설정, 태그 입력은
      // 발행 설정 레이어(.layer_publish__vA9PX)가 반드시 완전히 열린 상태에서 실행해야만 실제 DOM에 존재하고 반영됩니다!
      if (postData) {
        console.log('📝 발행 레이어 내부 설정 적용 시작...');
        
        // 2-1. 카테고리 설정
        if (postData.categoryId || (account && account.categoryId)) {
          await this.setCategory(postData.categoryId || account.categoryId);
        }
        
        // 2-2. 공개 설정 (전체공개 / 비공개)
        if (postData.openType !== undefined && postData.openType !== null) {
          await this.setPrivacy(postData.openType);
        }
        
        // 2-3. 태그 입력
        if (postData.tags) {
          await this.enterTags(postData.tags);
        }
      }
      
      // 3단계: 최종 발행 버튼 클릭
      const finalPublishButton = await this.page.$('.confirm_btn__WEaBq[data-testid="seOnePublishBtn"]');
      if (!finalPublishButton) {
        throw new Error('최종 발행 버튼을 찾을 수 없습니다');
      }

      await finalPublishButton.click();
      console.log('✅ 2단계: 최종 발행 버튼 클릭 완료');
      
      // 4단계: 발행 완료 대기 (URL 변경 또는 성공 메시지 확인)
      await this.page.waitForTimeout(5000);
      
      // 발행 설정 레이어가 사라졌는지 확인
      const publishLayerExists = await this.page.$('.layer_publish__vA9PX');
      const isLayerGone = !publishLayerExists;
      
      // 현재 URL 확인하여 발행 성공 여부 판단
      const currentUrl = this.page.url();
      const isPublished = !currentUrl.includes('postwrite') || isLayerGone;
      
      if (isPublished) {
        console.log('✅ 포스트가 성공적으로 발행되었습니다');
        return {
          success: true,
          url: currentUrl,
          timestamp: Date.now()
        };
      } else {
        // 추가 대기 후 재확인
        await this.page.waitForTimeout(3000);
        const finalUrl = this.page.url();
        const finalCheck = !finalUrl.includes('postwrite');
        
        if (finalCheck) {
          console.log('✅ 포스트 발행 완료 (지연 확인)');
          return {
            success: true,
            url: finalUrl,
            timestamp: Date.now()
          };
        } else {
          throw new Error('포스트 발행 확인 실패 - 설정을 다시 확인해주세요');
        }
      }
    } catch (error) {
      console.error('❌ 포스트 발행 중 오류:', error);
      throw error;
    }
  }

  /**
   * 로그인 후 포스트 발행 (같은 브라우저 사용)
   * @param {Object} postData - 발행할 포스트 데이터
   * @param {Object} account - 계정 정보 (username, password, blogId 포함)
   * @returns {Promise<Object>} 발행 결과
   */
  async loginAndPublish(postData, account) {
    if (this.isPublishing) {
      throw new Error('이미 발행이 진행 중입니다.');
    }

    try {
      this.isPublishing = true;
      
      console.log('로그인 후 네이버 블로그 포스트 발행을 시작합니다.');
      this.emit('publish-progress', { step: '로그인 + 발행 시작' });

      // 1. 브라우저 시작
      console.log('🚀 [빌드 디버깅] 브라우저 시작 시도...');
      try {
        const browserOptions = BrowserUtils.getBrowserLaunchOptions(false); // headless: false로 브라우저 표시
        console.log('🔧 [빌드 디버깅] 브라우저 옵션:', {
          executablePath: browserOptions.executablePath,
          headless: browserOptions.headless,
          argsCount: browserOptions.args?.length
        });
        
        this.browser = await chromium.launch(browserOptions);
        console.log('✅ [빌드 디버깅] 브라우저 시작 성공');
      } catch (browserError) {
        console.error('❌ [빌드 디버깅] 브라우저 시작 실패:', {
          error: browserError.message,
          stack: browserError.stack,
          name: browserError.name
        });
        throw new Error(`브라우저 시작 실패: ${browserError.message}`);
      }

      console.log('🔧 [빌드 디버깅] 브라우저 컨텍스트 생성 중...');
      try {
        const context = await this.browser.newContext(
          BrowserUtils.getContextOptions()
        );
        console.log('✅ [빌드 디버깅] 브라우저 컨텍스트 생성 성공');

        // 클립보드 권한 명시적 허용
        await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
          origin: 'https://blog.naver.com'
        });

        this.page = await context.newPage();
        
        // 자동화 탐지 우회
        await BrowserUtils.addAntiDetectionScript(this.page);

        console.log('✅ [빌드 디버깅] 브라우저 페이지 준비 완료');
      } catch (contextError) {
        console.error('❌ [빌드 디버깅] 브라우저 컨텍스트/페이지 생성 실패:', {
          error: contextError.message,
          stack: contextError.stack
        });
        throw new Error(`브라우저 컨텍스트 생성 실패: ${contextError.message}`);
      }

      // 2. 세션 확인 및 로그인 처리
      const LoginManager = require('./LoginManager');
      const loginManager = new LoginManager(global.paths.sessionsPath);
      
      const userId = account.username || account.id || account.naverId;
      let sessionData = null;
      let loginSuccess = false;

      // 2-1. 기존 세션 확인 및 유효성 검증 (시간 제한 없이)
      console.log(`🔍 세션 확인 중: ${userId}`);
      const canUseSession = await loginManager.sessionManager.canUseSession(userId, 999999); // 무제한 사용
      
      if (canUseSession) {
        console.log(`🔄 유효한 세션 발견: ${userId}`);
        console.log('💾 저장된 세션 복원 시도...');
        
        try {
          sessionData = await loginManager.sessionManager.loadSession(userId);
          
          if (sessionData && sessionData.cookies && sessionData.cookies.length > 0) {
            // 현재 브라우저에 세션 쿠키 적용
            await context.addCookies(sessionData.cookies);
            
            // localStorage, sessionStorage 복원
            if (sessionData.localStorage || sessionData.sessionStorage) {
              await this.page.goto('https://www.naver.com', { waitUntil: 'networkidle' });
              
              if (sessionData.localStorage) {
                await this.page.evaluate((localStorageData) => {
                  for (const [key, value] of Object.entries(localStorageData)) {
                    window.localStorage.setItem(key, value);
                  }
                }, sessionData.localStorage);
              }
              
              if (sessionData.sessionStorage) {
                await this.page.evaluate((sessionStorageData) => {
                  for (const [key, value] of Object.entries(sessionStorageData)) {
                    window.sessionStorage.setItem(key, value);
                  }
                }, sessionData.sessionStorage);
              }
            }
            
            // 로그인 상태 확인
            const isLoggedIn = await this.checkLoginStatus();
            if (isLoggedIn) {
              console.log('✅ 기존 세션으로 로그인 확인 완료');
              loginSuccess = true;
            } else {
              console.log('⚠️ 기존 세션이 유효하지 않음, 새로 로그인 필요');
              // 🔥 세션이 유효하지 않아도 삭제하지 않음 (세션 보존 우선)
              console.log('🔄 세션이 유효하지 않지만 파일은 보존하고 새로 로그인 시도');
            }
          }
        } catch (error) {
          console.log('⚠️ 세션 복원 실패:', error.message);
          // 🔥 세션 복원 실패해도 세션을 삭제하지 않음 (세션 보존 우선)
          console.log('🔄 세션 복원 실패했지만 세션 파일은 보존하고 새로 로그인 시도');
        }
      } else {
        console.log('📝 유효한 세션이 없음, 새로 로그인 필요');
      }

      // 2-2. 세션이 유효하지 않으면 새로 로그인
      if (!loginSuccess) {
        console.log('🔐 네이버 로그인 시작...');
        this.emit('publish-progress', { step: '네이버 로그인 중' });
        
        // 같은 브라우저와 페이지 사용
        loginManager.browser = this.browser;
        loginManager.page = this.page;
        
        const loginResult = await loginManager.loginNaver(userId, account.password);
        
        if (!loginResult.success) {
          throw new Error(`로그인 실패: ${loginResult.error}`);
        }
        
        console.log('✅ 네이버 로그인 성공');
        
        // 세션 API 전송 결과 확인
        if (loginResult.apiResult) {
          if (loginResult.apiResult.success) {
            // console.log('✅ 세션 데이터 API 전송 성공');
          } else {
            // console.warn('⚠️ 세션 데이터 API 전송 실패:', loginResult.apiResult.error);
          }
        }
        
        loginSuccess = true;
      }

      // 3. 포스트 작성 페이지로 이동
      const writePageSuccess = await this.navigateToWritePage();
      
      // 로그인 폼이 감지된 경우 (이미 새로 로그인했는데도 실패하면 에러)
      if (!writePageSuccess) {
        throw new Error('새로 로그인한 후에도 포스트 작성 페이지에서 로그인 폼이 감지되었습니다.');
      }

      // 4. 제목 입력
      if (postData.title) {
        await this.enterTitle(postData.title);
      }

      // 5. 제휴마케팅 문구 추가 (아고다 또는 쿠팡 - 어필리에이트 URL이 있고 일상 사진 포스팅이 아닐 때만 추가)
      const isAgoda = postData.tags && postData.tags.includes('아고다');
      if (isAgoda) {
        await this.addAgodaPartnershipNotice();
      } else if (postData.affiliateUrl && !postData.isPhotoPublish) {
        await this.addPartnershipNotice();
      }

      // 6. 어필리에이트 URL 추가 (파트너스 문구 바로 다음에)
      if (postData.affiliateUrl) {
        try {
          await this.addAffiliateOGLink(postData.affiliateUrl);
        } catch (ogLinkError) {
          console.warn('⚠️ OG링크 추가 실패, 포스팅은 계속 진행:', ogLinkError.message);
        }
      }

      // 7. 본문 내용 및 이미지 입력
      if (postData.content || postData.mainContent) {
        const content = postData.content || postData.mainContent;
        const images = postData.images || [];
        const productName = postData.title || '';
        await this.enterContent(content, images, productName, account);
      }

      // 8-11. 포스트 발행 (공개 설정, 카테고리 설정, 태그 입력을 발행 레이어가 열린 후에 처리하도록 파라미터 전달)
      const publishResult = await this.publishPost(postData, account);

      // 12. 발행 완료 후 세션 다시 저장 (최신 상태 유지)
      console.log('💾 포스팅 완료 후 세션 재저장 중...');
      try {
        await loginManager.sessionManager.saveSession(this.page, userId, userId);
        console.log('✅ 포스팅 완료 후 세션 재저장 성공');
      } catch (sessionSaveError) {
        console.warn('⚠️ 포스팅 완료 후 세션 재저장 실패:', sessionSaveError.message);
        // 세션 저장 실패해도 포스팅은 성공했으므로 계속 진행
      }

      // 13. 세션 저장 완료 후 브라우저 정리
      console.log('🔄 세션 저장 완료, 브라우저 정리 중...');
      await this.cleanup();
      console.log('✅ 브라우저 정리 완료');

      this.emit('publish-progress', { step: '발행 완료' });
      
      const result = {
        success: true,
        data: {
          ...publishResult,
          title: postData.title,
          uploadedImages: (postData.images || []).length,
          publishedAt: new Date().toISOString(),
          account: account.username || account.id
        }
      };

      console.log('로그인 후 네이버 블로그 포스트 발행이 완료되었습니다.');
      return result;
    } catch (error) {
      console.error('로그인/포스트 발행 중 오류 발생:', error);
      this.emit('publish-error', { error: error.message });
      
      // 오류 발생 시에만 브라우저 정리
      console.log('❌ 오류 발생으로 인한 브라우저 정리...');
      await this.cleanup();
      
      return {
        success: false,
        error: error.message
      };
    } finally {
      this.isPublishing = false;
    }
  }

  /**
   * 전체 포스트 발행 프로세스
   * @param {Object} postData - 발행할 포스트 데이터
   * @param {Object} sessionData - 로그인 세션 데이터
   * @param {Object} account - 계정 정보 (accountId 추출용)
   * @returns {Promise<Object>} 발행 결과
   */
  async publish(postData, sessionData, account = null) {
    if (this.isPublishing) {
      throw new Error('이미 발행이 진행 중입니다.');
    }

    try {
      this.isPublishing = true;
      
      console.log('네이버 블로그 포스트 발행을 시작합니다.');
      this.emit('publish-progress', { step: '발행 시작' });

      // 1. 세션 데이터 검증
      if (!sessionData || !sessionData.cookies || sessionData.cookies.length === 0) {
        throw new Error('유효한 세션 데이터가 없습니다. 먼저 로그인을 해주세요.');
      }

      console.log(`✅ 세션 데이터 확인 완료 (쿠키 ${sessionData.cookies.length}개)`);

      // 2. 브라우저 시작 및 세션 복원
      await this.startBrowserWithSession(sessionData);

      // 3. 로그인 상태 확인
      const isLoggedIn = await this.checkLoginStatus();
      if (!isLoggedIn) {
        console.log('🚨 세션이 만료되었습니다. 계정 정보가 있으면 재로그인을 시도합니다.');
        
        if (account && account.id && account.password) {
          console.log('🔄 계정 정보로 재로그인 시도 중...');
          
          // 현재 브라우저 정리
          await this.cleanup();
          
          // LoginManager로 새로 로그인
          const LoginManager = require('./LoginManager');
          const loginManager = new LoginManager(global.paths.sessionsPath);
          
          try {
            // 실제 네이버 ID 사용 (account.id는 시스템 내부 ID일 수 있음)
            const actualNaverId = account.username || account.naverId || account.id;
            console.log(`🔍 재로그인 시도 - 네이버 ID: ${actualNaverId}`);
            const loginResult = await loginManager.loginNaver(actualNaverId, account.password);
            
            if (loginResult.success) {
              console.log('✅ 재로그인 성공! 새 세션으로 블로그 발행을 계속합니다.');
              
              // 새 세션 데이터로 브라우저 재시작
              const SessionManager = require('./SessionManager');
              const sessionManager = new SessionManager(global.paths.sessionsPath);
              const newSessionData = await sessionManager.loadSession(actualNaverId);
              
              if (newSessionData) {
                await this.startBrowserWithSession(newSessionData);
                
                // 재로그인 후 다시 로그인 상태 확인
                const reLoginCheck = await this.checkLoginStatus();
                if (!reLoginCheck) {
                  throw new Error('재로그인 후에도 로그인 상태 확인 실패');
                }
              } else {
                throw new Error('재로그인 후 세션 데이터 로드 실패');
              }
            } else {
              throw new Error(`재로그인 실패: ${loginResult.error || loginResult.message}`);
            }
          } catch (reLoginError) {
            console.error('❌ 재로그인 실패:', reLoginError.message);
            throw new Error(`로그인 상태가 아니고 재로그인도 실패했습니다: ${reLoginError.message}`);
          }
        } else {
          throw new Error('로그인 상태가 아닙니다. 세션이 만료되었고 계정 정보가 없어 재로그인할 수 없습니다.');
        }
      }

      // 4. 포스트 작성 페이지로 이동
      const writePageSuccess = await this.navigateToWritePage();
      
      // 로그인 폼이 감지된 경우 재로그인 처리
      if (!writePageSuccess) {
        console.log('🚨 포스트 작성 페이지에서 로그인 폼 감지 - 재로그인 시도');
        
        if (account && account.id && account.password) {
          console.log('🔄 계정 정보로 재로그인 시도 중...');
          
          // 현재 브라우저 정리
          await this.cleanup();
          
          // LoginManager로 새로 로그인
          const LoginManager = require('./LoginManager');
          const loginManager = new LoginManager(global.paths.sessionsPath);
          
          try {
            // 실제 네이버 ID 사용 (account.id는 시스템 내부 ID일 수 있음)
            const actualNaverId = account.username || account.naverId || account.id;
            console.log(`🔍 재로그인 시도 - 네이버 ID: ${actualNaverId}`);
            const loginResult = await loginManager.loginNaver(actualNaverId, account.password);
            
            if (loginResult.success) {
              console.log('✅ 재로그인 성공! 새 세션으로 블로그 발행을 계속합니다.');
              
              // 새 세션 데이터로 브라우저 재시작
              const SessionManager = require('./SessionManager');
              const sessionManager = new SessionManager(global.paths.sessionsPath);
              const newSessionData = await sessionManager.loadSession(actualNaverId);
              
              if (newSessionData) {
                await this.startBrowserWithSession(newSessionData);
                
                // 재로그인 후 다시 포스트 작성 페이지로 이동
                const retryWritePageSuccess = await this.navigateToWritePage();
                if (!retryWritePageSuccess) {
                  throw new Error('재로그인 후에도 포스트 작성 페이지 이동 실패');
                }
              } else {
                throw new Error('재로그인 후 세션 데이터를 찾을 수 없습니다.');
              }
            } else {
              throw new Error('재로그인 실패: ' + loginResult.error);
            }
          } catch (reLoginError) {
            console.error('❌ 재로그인 실패:', reLoginError.message);
            throw new Error(`포스트 작성 페이지에서 로그인 폼이 감지되어 재로그인을 시도했으나 실패했습니다: ${reLoginError.message}`);
          }
        } else {
          throw new Error('포스트 작성 페이지에서 로그인 폼이 감지되었으나 계정 정보가 없어 재로그인할 수 없습니다.');
        }
      }

      // 5. 제목 입력
      if (postData.title) {
        await this.enterTitle(postData.title);
      }

      // 6. 쿠팡 파트너스 수수료 문구 추가 (어필리에이트 URL이 있고, 일상 사진 포스팅이 아닐 때만 추가)
      if (postData.affiliateUrl && !postData.isPhotoPublish) {
        await this.addPartnershipNotice();
      }

      // 7. 어필리에이트 URL 추가 (파트너스 문구 바로 다음에)
      if (postData.affiliateUrl) {
        try {
          await this.addAffiliateOGLink(postData.affiliateUrl);
        } catch (ogLinkError) {
          console.warn('⚠️ OG링크 추가 실패, 포스팅은 계속 진행:', ogLinkError.message);
        }
      }

      // 8. 본문 내용 및 이미지 입력 (문단별 순차 처리)
      if (postData.content || postData.mainContent) {
        const content = postData.content || postData.mainContent;
        const images = postData.images || [];
        const productName = postData.title || '';
        await this.enterContent(content, images, productName, account);
      }

      // 9-12. 포스트 발행 (공개 설정 및 카테고리, 태그 입력을 발행 레이어가 열린 후 진행하도록 객체 전달)
      const resolvedPostData = {
        categoryId: this.config.CATEGORY_ID,
        openType: this.config.OPEN_TYPE,
        tags: postData.tags
      };
      const publishResult = await this.publishPost(resolvedPostData, account);

      // 13. 발행 완료 후 세션 다시 저장 (SessionManager 사용)
      console.log('💾 포스팅 완료 후 세션 재저장 중...');
      try {
        const SessionManager = require('./SessionManager');
        const sessionManager = new SessionManager(global.paths.sessionsPath);
        
        // 계정 정보에서 accountId와 username 추출
        let accountId = 'unknown';
        let username = 'unknown';
        
        if (account) {
          accountId = account.username || account.naverId || account.id || 'unknown';
          username = account.username || account.naverId || account.id || 'unknown';
        } else {
          // 계정 정보가 없으면 현재 URL에서 추출 시도
          try {
            const currentUrl = this.page.url();
            if (currentUrl.includes('blog.naver.com')) {
              const urlParts = currentUrl.split('/');
              const blogIdIndex = urlParts.findIndex(part => part === 'blog.naver.com');
              if (blogIdIndex >= 0 && urlParts[blogIdIndex + 1]) {
                accountId = urlParts[blogIdIndex + 1];
                username = accountId;
              }
            }
          } catch (urlError) {
            console.warn('⚠️ URL에서 계정 ID 추출 실패:', urlError.message);
          }
        }
        
        console.log(`🔍 세션 저장 정보: accountId="${accountId}", username="${username}"`);
        await sessionManager.saveSession(this.page, accountId, username);
        console.log('✅ 포스팅 완료 후 세션 재저장 성공');
      } catch (sessionSaveError) {
        console.warn('⚠️ 포스팅 완료 후 세션 재저장 실패:', sessionSaveError.message);
        // 세션 저장 실패해도 포스팅은 성공했으므로 계속 진행
      }

      // 14. 세션 저장 완료 후 브라우저 정리
      console.log('🔄 세션 저장 완료, 브라우저 정리 중...');
      await this.cleanup();
      console.log('✅ 브라우저 정리 완료');

      this.emit('publish-progress', { step: '발행 완료' });
      
      const result = {
        ...publishResult,
        title: postData.title,
        uploadedImages: (postData.images || []).length,
        publishedAt: new Date().toISOString()
      };

      console.log('네이버 블로그 포스트 발행이 완료되었습니다.');
      return result;
    } catch (error) {
      console.error('포스트 발행 중 오류 발생:', error);
      this.emit('publish-error', { error: error.message });
      
      // 오류 발생 시에만 브라우저 정리
      console.log('❌ 오류 발생으로 인한 브라우저 정리...');
      await this.cleanup();
      
      throw error;
    } finally {
      this.isPublishing = false;
    }
  }

  /**
   * 스크린샷 저장
   * @param {string} filename - 파일명
   * @returns {Promise<string>} 스크린샷 파일 경로
   */
  async saveScreenshot(filename = 'blog_publish_screenshot.png') {
    try {
      if (!this.page) {
        return null;
      }

      const screenshotPath = path.join(process.cwd(), filename);
      await this.page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });
      
      console.log(`스크린샷 저장: ${screenshotPath}`);
      return screenshotPath;
    } catch (error) {
      console.error('스크린샷 저장 실패:', error);
      return null;
    }
  }

  /**
   * 발행 중지
   */
  async stop() {
    try {
      this.isPublishing = false;
      console.log('포스트 발행이 중지되었습니다.');
    } catch (error) {
      console.error('발행 중지 중 오류:', error);
    }
  }

  /**
   * 설정 업데이트
   * @param {Object} newConfig - 새로운 설정
   */
  updateConfig(newConfig) {
    // CATEGORY_ID 타입 안전성 보장 (String 변환)
    if (newConfig && newConfig.CATEGORY_ID !== undefined && newConfig.CATEGORY_ID !== null) {
      newConfig.CATEGORY_ID = String(newConfig.CATEGORY_ID);
    }
    
    this.config = { ...this.config, ...newConfig };
    
    // 블로그 URL 업데이트
    if (newConfig.BLOG_ID) {
      // 카테고리 ID가 있는 경우 URL에 포함
      if (newConfig.CATEGORY_ID && newConfig.CATEGORY_ID.trim() !== '') {
        this.BLOG_WRITE_URL = `https://blog.naver.com/${newConfig.BLOG_ID}/postwrite?categoryNo=${newConfig.CATEGORY_ID}`;
        console.log(`📂 카테고리 ID ${newConfig.CATEGORY_ID}가 포함된 포스팅 URL 설정됨`);
      } else {
        this.BLOG_WRITE_URL = `https://blog.naver.com/${newConfig.BLOG_ID}/postwrite`;
        console.log('📝 기본 포스팅 URL 설정됨 (카테고리 ID 없음)');
      }
      
      this.BLOG_MAIN_URL = `https://blog.naver.com/${newConfig.BLOG_ID}`;
    }
    
    console.log('블로그 발행기 설정이 업데이트되었습니다.');
    console.log(`🔗 포스팅 URL: ${this.BLOG_WRITE_URL}`);
  }

  /**
   * 리소스 정리
   */
  async cleanup() {
    try {
      if (this.page && !this.page.isClosed()) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      // 인용구 스타일 초기화
      this.selectedQuotationStyle = null;
      
      console.log('블로그 발행기 리소스가 정리되었습니다.');
    } catch (error) {
      console.error('블로그 발행기 정리 중 오류:', error);
    }
  }

  /**
   * 발행 상태 확인
   * @returns {boolean} 발행 진행 여부
   */
  isPublishingInProgress() {
    return this.isPublishing;
  }

  /**
   * 블로그 정보 조회
   * @param {Object} sessionData - 로그인 세션 데이터
   * @returns {Promise<Object>} 블로그 정보
   */
  async getBlogInfo(sessionData) {
    try {
      await this.startBrowserWithSession(sessionData);
      await this.page.goto(this.BLOG_MAIN_URL, { 
        waitUntil: 'networkidle',
        timeout: 120000 
      });

      const blogInfo = await this.page.evaluate(() => {
        const blogTitle = document.querySelector('.blog_title')?.textContent || '';
        const blogDescription = document.querySelector('.blog_desc')?.textContent || '';
        const postCount = document.querySelector('.post_count')?.textContent || '0';
        
        return {
          title: blogTitle.trim(),
          description: blogDescription.trim(),
          postCount: postCount.trim()
        };
      });

      await this.cleanup();
      return blogInfo;
    } catch (error) {
      console.error('블로그 정보 조회 중 오류:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * 파일 확장자로부터 MIME 타입 추정
   * @param {string} filePath 파일 경로
   * @returns {string} MIME 타입
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }



  /**
   * 아고다 포스트 발행 (제휴마케팅 문구 사용)
   * @param {Object} postData - 포스트 데이터
   * @param {Object} sessionData - 세션 데이터
   * @param {Object} account - 계정 정보
   * @returns {Promise<Object>} 발행 결과
   */
  async publishAgodaPost(postData, sessionData, account = null) {
    if (this.isPublishing) {
      throw new Error('이미 발행이 진행 중입니다.');
    }

    try {
      this.isPublishing = true;
      
      console.log('🏨 아고다 포스트 발행을 시작합니다.');
      this.emit('publish-progress', { step: '아고다 포스트 발행 시작' });

      // 1. 세션 데이터 검증
      if (!sessionData || !sessionData.cookies || sessionData.cookies.length === 0) {
        throw new Error('유효한 세션 데이터가 없습니다. 먼저 로그인을 해주세요.');
      }

      console.log(`✅ 세션 데이터 확인 완료 (쿠키 ${sessionData.cookies.length}개)`);

      // 2. 브라우저 시작 및 세션 복원
      await this.startBrowserWithSession(sessionData);

      // 3. 로그인 상태 확인
      const isLoggedIn = await this.checkLoginStatus();
      if (!isLoggedIn) {
        console.log('🚨 세션이 만료되었습니다. 계정 정보가 있으면 재로그인을 시도합니다.');
        
        if (account && account.id && account.password) {
          console.log('🔄 계정 정보로 재로그인 시도 중...');
          
          // 현재 브라우저 정리
          await this.cleanup();
          
          // LoginManager로 새로 로그인
          const LoginManager = require('./LoginManager');
          const loginManager = new LoginManager(global.paths.sessionsPath);
          
          try {
            // 실제 네이버 ID 사용 (account.id는 시스템 내부 ID일 수 있음)
            const actualNaverId = account.username || account.naverId || account.id;
            console.log(`🔍 재로그인 시도 - 네이버 ID: ${actualNaverId}`);
            const loginResult = await loginManager.loginNaver(actualNaverId, account.password);
            
            if (loginResult.success) {
              console.log('✅ 재로그인 성공! 새 세션으로 블로그 발행을 계속합니다.');
              
              // 새 세션 데이터로 브라우저 재시작
              const SessionManager = require('./SessionManager');
              const sessionManager = new SessionManager(global.paths.sessionsPath);
              const newSessionData = await sessionManager.loadSession(actualNaverId);
              
              if (newSessionData) {
                await this.startBrowserWithSession(newSessionData);
              } else {
                throw new Error('재로그인 후 세션 데이터를 찾을 수 없습니다.');
              }
            } else {
              throw new Error('재로그인 실패: ' + loginResult.error);
            }
          } catch (reLoginError) {
            console.error('❌ 재로그인 실패:', reLoginError.message);
            throw new Error(`로그인 상태가 아니고 재로그인도 실패했습니다: ${reLoginError.message}`);
          }
        } else {
          throw new Error('로그인 상태가 아닙니다. 세션이 만료되었고 계정 정보가 없어 재로그인할 수 없습니다.');
        }
      }

      // 4. 포스트 작성 페이지로 이동
      const writePageSuccess = await this.navigateToWritePage();
      
      // 로그인 폼이 감지된 경우 재로그인 처리
      if (!writePageSuccess) {
        console.log('🚨 포스트 작성 페이지에서 로그인 폼 감지 - 재로그인 시도');
        
        if (account && account.id && account.password) {
          console.log('🔄 계정 정보로 재로그인 시도 중...');
          
          // 현재 브라우저 정리
          await this.cleanup();
          
          // LoginManager로 새로 로그인
          const LoginManager = require('./LoginManager');
          const loginManager = new LoginManager(global.paths.sessionsPath);
          
          try {
            // 실제 네이버 ID 사용 (account.id는 시스템 내부 ID일 수 있음)
            const actualNaverId = account.username || account.naverId || account.id;
            console.log(`🔍 재로그인 시도 - 네이버 ID: ${actualNaverId}`);
            const loginResult = await loginManager.loginNaver(actualNaverId, account.password);
            
            if (loginResult.success) {
              console.log('✅ 재로그인 성공! 새 세션으로 블로그 발행을 계속합니다.');
              
              // 새 세션 데이터로 브라우저 재시작
              const SessionManager = require('./SessionManager');
              const sessionManager = new SessionManager(global.paths.sessionsPath);
              const newSessionData = await sessionManager.loadSession(actualNaverId);
              
              if (newSessionData) {
                await this.startBrowserWithSession(newSessionData);
                
                // 재로그인 후 다시 포스트 작성 페이지로 이동
                const retryWritePageSuccess = await this.navigateToWritePage();
                if (!retryWritePageSuccess) {
                  throw new Error('재로그인 후에도 포스트 작성 페이지 이동 실패');
                }
              } else {
                throw new Error('재로그인 후 세션 데이터를 찾을 수 없습니다.');
              }
            } else {
              throw new Error('재로그인 실패: ' + loginResult.error);
            }
          } catch (reLoginError) {
            console.error('❌ 재로그인 실패:', reLoginError.message);
            throw new Error(`포스트 작성 페이지에서 로그인 폼이 감지되어 재로그인을 시도했으나 실패했습니다: ${reLoginError.message}`);
          }
        } else {
          throw new Error('포스트 작성 페이지에서 로그인 폼이 감지되었으나 계정 정보가 없어 재로그인할 수 없습니다.');
        }
      }

      // 5. 제목 입력
      if (postData.title) {
        await this.enterTitle(postData.title);
      }

      // 6. 아고다 제휴마케팅 문구 추가
      await this.addAgodaPartnershipNotice();

      // 7. 아고다 URL 추가 (파트너스 문구 바로 다음에)
      if (postData.affiliateUrl) {
        try {
          await this.addAffiliateOGLink(postData.affiliateUrl);
        } catch (ogLinkError) {
          console.warn('⚠️ OG링크 추가 실패, 포스팅은 계속 진행:', ogLinkError.message);
        }
      }

      // 8. 본문 내용 및 이미지 입력 (문단별 순차 처리)
      if (postData.content || postData.mainContent) {
        const content = postData.content || postData.mainContent;
        const images = postData.images || [];
        const productName = postData.title || '';
        await this.enterContent(content, images, productName, account);
      }

      // 12. 포스트 발행 전 세션 저장 (안전한 시점)
      console.log('💾 포스트 발행 전 세션 저장 중...');
      if (this.sessionManager && this.page && account) {
        try {
          await this.sessionManager.saveSession(this.page, account.id, account.username);
          console.log('✅ 세션 저장 완료');
        } catch (sessionError) {
          console.warn('⚠️ 세션 저장 중 오류 (무시하고 계속):', sessionError.message);
        }
      }

      // 13. 포스트 발행 (공개 설정 및 카테고리, 태그 입력을 발행 레이어가 열린 후 진행하도록 객체 전달)
      const publishResult = await this.publishPost(postData, account);

      return publishResult;

    } catch (error) {
      console.error('❌ 아고다 포스트 발행 중 오류:', error);
      throw error;
    } finally {
      // 브라우저 종료
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        console.log('🔄 브라우저 종료 완료');
      }
      this.isPublishing = false;
    }
  }
}

module.exports = BlogPublisher; 