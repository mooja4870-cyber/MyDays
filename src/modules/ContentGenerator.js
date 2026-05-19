const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

/**
 * AI 콘텐츠 생성 관리 모듈
 * Gemini AI를 사용하여 블로그 콘텐츠를 생성합니다.
 */
class ContentGenerator {
    constructor() {
        this.apiKey = null;
        this.genAI = null;
        this.model = null;
        this.isRunning = false;
        this.shouldStop = false;
        
        // 생성 설정 (responseMimeType 제거)
        this.generationConfig = {
            temperature: 1,
            topP: 0.95,
            topK: 64,
            maxOutputTokens: 8192
        };
        
        // 재시도 설정
        this.maxRetries = 5;
        this.retryDelay = 3000; // 3초
        
        // 파일 경로 - 빌드 환경에 맞게 사용자 데이터 폴더 사용
        const { app } = require('electron');
        const userDataPath = app ? app.getPath('userData') : require('os').homedir();
        
        this.reviewFile = path.join(userDataPath, 'review.txt');
        this.contentFile = path.join(userDataPath, 'generated_content.json');
    }

    /**
     * API 키 설정 및 모델 초기화
     * @param {string} apiKey Gemini API 키
     */
    setApiKey(apiKey) {
        try {
            if (!apiKey || typeof apiKey !== 'string') {
                throw new Error('유효하지 않은 API 키입니다.');
            }
            
            this.apiKey = apiKey;
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            
            console.log('✅ Gemini AI 모델 초기화 완료');
        } catch (error) {
            console.error('❌ Gemini AI 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * API 연결 테스트
     * @returns {Promise<Object>}
     */
    async testConnection() {
        try {
            if (!this.model) {
                throw new Error('API 키가 설정되지 않았습니다.');
            }
            
            console.log('🧪 Gemini API 연결 테스트 중...');
            
            const testPrompt = "안녕하세요. 연결 테스트입니다. '테스트 성공'이라고 답변해주세요.";
            const chatSession = this.model.startChat({
                generationConfig: this.generationConfig,
                history: [],
            });
            
            const result = await this.sendMessageWithRetry(chatSession, testPrompt, 3, 5000);
            
            if (result && result.includes('테스트')) {
                console.log('✅ Gemini API 연결 테스트 성공');
                return {
                    success: true,
                    message: 'API 연결 성공',
                    response: result.trim()
                };
            } else {
                throw new Error('예상하지 못한 응답을 받았습니다.');
            }
            
        } catch (error) {
            console.error('❌ Gemini API 연결 테스트 실패:', error);
            return {
                success: false,
                error: error.message,
                message: 'API 연결 실패'
            };
        }
    }

    /**
     * 재시도 기능이 있는 메시지 전송
     * @param {Object} chatSession 채팅 세션
     * @param {string} message 메시지
     * @param {number} maxRetries 최대 재시도 횟수
     * @param {number} retryDelay 재시도 대기 시간
     * @returns {Promise<string>}
     */
    async sendMessageWithRetry(chatSession, message, maxRetries = this.maxRetries, retryDelay = this.retryDelay) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            // 중지 요청 확인
            if (this.shouldStop) {
                throw new Error('콘텐츠 생성이 중지되었습니다.');
            }
            
            try {
                console.log(`🤖 Gemini AI 호출 (시도 ${attempt}/${maxRetries})`);
                const result = await chatSession.sendMessage(message);
                
                // 중지 요청 확인
                if (this.shouldStop) {
                    throw new Error('콘텐츠 생성이 중지되었습니다.');
                }
                
                const response = result.response.text();
                
                if (response && response.trim()) {
                    console.log('✅ Gemini AI 응답 수신 성공');
                    return response;
                } else {
                    throw new Error('빈 응답을 받았습니다.');
                }
                
            } catch (error) {
                console.error(`❌ 시도 ${attempt}/${maxRetries} 실패:`, error.message);
                
                if (this.shouldStop) {
                    throw new Error('콘텐츠 생성이 중지되었습니다.');
                }
                
                if (attempt === maxRetries) {
                    throw new Error(`최대 재시도 횟수 초과: ${error.message}`);
                }
                
                // 지수 백오프(Exponential Backoff) 적용: 2^(attempt) * 1000ms + random jitter (0~1000ms)
                const backoffDelay = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 1000);
                console.log(`⏳ 일시적인 구글 API 오류(502/503 등) 감지. ${backoffDelay/1000}초 후 지수 백오프 재시도 진행...`);
                await this.delay(backoffDelay);
            }
        }
    }

    /**
     * 지연 함수
     * @param {number} ms 대기 시간 (밀리초)
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 특수 문자 제거 함수
     * @param {string} text 처리할 텍스트
     * @returns {string} 정리된 텍스트
     */
    removeSpecialCharacters(text) {
        if (!text) return '';
        
        // 이모지 제거
        text = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
        
        // 하나 이상의 연속된 '*', '#' 제거
        text = text.replace(/[*#]+/g, '');
        
        // 여러 줄바꿈을 하나로 정리
        text = text.replace(/\n{3,}/g, '\n\n');
        
        // 앞뒤 공백 제거
        text = text.trim();
        
        return text;
    }

    /**
     * 소제목 생성 (문단 기반)
     * @param {string} productName 상품명
     * @param {string} paragraph 문단 내용
     * @returns {Promise<string>}
     */
    async generateSubtitle(productName, paragraph) {
        try {
            if (!this.model) {
                throw new Error('API 키가 설정되지 않았습니다.');
            }

            console.log(`🖋️ 소제목 생성 시작 (문단 기반)...`);

            const prompt = `다음은 상품 "${productName}"에 대한 블로그 문단입니다.

${paragraph}

위 문단의 핵심 내용을 요약하여, 블로그 소제목으로 사용할 만한 문장을 15자 이내로 짧고 간결하게 만들어주세요.

요구사항:
- 문단의 핵심 내용을 담을 것
- 15자 이내로 매우 짧게 만들 것
- 광고 문구 같지 않고 자연스러울 것
- 이모지나 특수문자 사용 금지
- "소개", "특징" 같은 단어 대신 내용 자체를 요약할 것

예시:
- (문단 내용) ... 이 제품은 최신 기술을 사용하여 배터리 효율을 극대화했습니다...
- (생성된 소제목) 오래가는 배터리 성능

반드시 하나의 소제목만 생성해주세요.`;

            const chatSession = this.model.startChat({
                generationConfig: this.generationConfig,
                history: [],
            });

            let result = await this.sendMessageWithRetry(chatSession, prompt);
            result = this.removeSpecialCharacters(result.trim()).slice(0, 70); // 70자 제한

            console.log(`✅ 소제목 생성 완료: ${result}`);
            return result;

        } catch (error) {
            console.error('❌ 소제목 생성 실패:', error);
            // 실패 시 간단한 대체 소제목 생성
            const fallback = `${productName}의 주요 특징`;
            console.log(`⚠️ 소제목 생성 실패, 대체 소제목 사용: ${fallback}`);
            return fallback;
        }
    }

    /**
     * 콘텐츠 기반 제목 생성
     * @param {string} productName 상품명
     * @param {string} content 생성된 본문 내용
     * @returns {Promise<string>}
     */
    async generateTitle(productName, content) {
        try {
            if (!this.model) {
                throw new Error('API 키가 설정되지 않았습니다.');
            }
            
            console.log(`📝 제목 생성 시작 (본문 기반): ${productName}`);
            
            const prompt = `다음은 상품 "${productName}"에 대해 작성된 블로그 본문입니다:

${content}

위 본문 내용을 바탕으로 클릭을 유도하는 매력적인 블로그 제목을 하나만 만들어주세요.

요구사항:
- 본문의 핵심 내용과 매치되는 제목
- 클릭을 유도하는 재미있고 독특한 내용
- 상품명의 핵심 키워드 포함
- 한국어로 작성
- 감탄사나 이모지, 특수문자는 사용 금지
- 70자 이내로 작성
- 반드시 하나의 제목만 제공

중요: 본문의 톤과 내용에 어울리는 제목을 작성해주세요.`;

            const chatSession = this.model.startChat({
                generationConfig: this.generationConfig,
                history: [],
            });

            let result = await this.sendMessageWithRetry(chatSession, prompt);
            result = this.removeSpecialCharacters(result.trim());

            // 여러 문단이 반환된 경우 첫 번째 문단만 사용
            if (result.includes('\n\n')) {
                result = result.split('\n\n')[0];
            }

            // 줄바꿈을 공백으로 대체
            result = result.replace(/\n/g, ' ');

            // 연속된 공백을 하나의 공백으로 대체
            result = result.replace(/\s+/g, ' ');

            // 문장 부호는 유지하되 다른 특수 문자 제거 (% 기호 포함)
            result = result.replace(/[^\w\s가-힣.,!?%]/g, '');

            // 길이 제한 (70자)
            result = result.slice(0, 70);

            // 맨 앞의 숫자와 점(있다면) 제거
            result = result.replace(/^\d+\.\s*/, '');

            console.log(`✅ 제목 생성 완료: ${result}`);
            return result;
            
        } catch (error) {
            console.error('❌ 제목 생성 실패:', error);
            throw new Error(`제목 생성 실패: ${error.message}`);
        }
    }

    /**
     * 본문 콘텐츠 생성
     * @param {Object} productData JSON 상품 데이터
     * @returns {Promise<string>}
     */
    async generateMainContent(productData) {
        try {
            this.isRunning = true;
            
            if (!this.model) {
                throw new Error('API 키가 설정되지 않았습니다.');
            }
            
            // 중지 요청 확인
            if (this.shouldStop) {
                throw new Error('콘텐츠 생성이 중지되었습니다.');
            }
            
            console.log(`📖 본문 콘텐츠 생성 시작: ${productData.title || '상품명 없음'}`);
            
            const prompt = `다음 JSON 데이터의 "title" 필드를 중심으로 상품리뷰 Content를 작성해주세요:

${JSON.stringify(productData, null, 2)}

JSON 데이터의 "title" 필드에 있는 상품명을 중심으로 하여, 아래 가이드라인에 따라 5문단으로 구성된 상품리뷰를 작성해주세요:

1. 전문적이지만 친근한 어조로, 구체적인 예시를 들어 독자의 이해를 돕는 글을 작성해주세요.

2. 광고나 판매 목적이 아닌 유용한 정보를 중심으로 밝고 긍정적인 느낌을 유지해주세요.

3. 핵심 개념을 쉽게 풀어내면서도 사실과 근거를 제시해 신뢰감을 높여주세요.

4. 독자가 스스로 문제를 해결할 수 있도록 실제 사례나 팁을 포함해주세요.

5. 상업적 표현은 최대한 배제하고 정보 전달에 집중해주세요.

6. 독자의 관심을 끌 수 있도록 호기심을 자극하는 도입부를 구성해주세요.

7. 전문성은 살리되 과하지 않도록 균형 있게 표현해주세요.

8. 결론에서는 핵심 요점을 정리해 독자에게 명확한 메시지를 남겨주세요.

9. 전체적으로 밝고 희망적인 톤을 유지하면서 진부하지 않은 스토리텔링을 시도해주세요.

중요사항:
- 정확히 5개의 문단으로 구성해주세요
- 각 문단은 300글자 이내로 작성해주세요
- 전체 글자수는 1500자 미만으로 작성해주세요
- 문단 사이는 빈 줄(두 번의 줄바꿈)로 구분해주세요
- 각 문단 사이에는 이미지가 들어갈 예정입니다
- 이모지는 절대 사용하지 마세요
- [문단1], [문단2] 같은 표시는 절대 사용하지 마세요`;

            const chatSession = this.model.startChat({
                generationConfig: this.generationConfig,
                history: [],
            });

            let generatedText = await this.sendMessageWithRetry(chatSession, prompt);
            
            // 중지 요청 확인
            if (this.shouldStop) {
                throw new Error('콘텐츠 생성이 중지되었습니다.');
            }
            
            generatedText = this.removeSpecialCharacters(generatedText);

            console.log('✅ 본문 콘텐츠 생성 완료');
            console.log(`📊 생성된 본문 길이: ${generatedText.length}자`);

            // 본문 내용을 파일에 저장
            await fs.promises.writeFile(this.reviewFile, generatedText, 'utf8');
            console.log(`💾 본문 내용 파일 저장: ${this.reviewFile}`);

            return generatedText;
            
        } catch (error) {
            console.error('❌ 본문 콘텐츠 생성 실패:', error);
            throw new Error(`본문 콘텐츠 생성 실패: ${error.message}`);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * 전체 콘텐츠 생성 (통합 함수)
     * @param {Object} productData JSON 상품 데이터
     * @returns {Promise<Object>}
     */
    async generateAllContent(productData) {
        try {
            this.isRunning = true;
            
            if (!this.model) {
                throw new Error('API 키가 설정되지 않았습니다.');
            }
            
            // 중지 요청 확인
            if (this.shouldStop) {
                throw new Error('콘텐츠 생성이 중지되었습니다.');
            }
            
            const productName = productData.title || productData.productName || productData.name || '상품명 없음';
            console.log(`🎯 전체 콘텐츠 생성 시작: ${productName}`);
            
            const contentData = {
                productName: productName,
                timestamp: new Date().toISOString(),
                title: null,
                content: null,
                originalData: productData
            };
            
            // 1. 본문 생성 (JSON 데이터 기반)
            console.log('\n📖 1단계: 본문 콘텐츠 생성');
            contentData.content = await this.generateMainContent(productData);
            
            // 중지 요청 확인
            if (this.shouldStop) {
                throw new Error('콘텐츠 생성이 중지되었습니다.');
            }
            
            // 2. 제목 생성 (생성된 본문에 맞춰)
            console.log('\n📝 2단계: 제목 생성');
            contentData.title = await this.generateTitle(productName, contentData.content);
            
            // 3. 결과 저장
            console.log('\n💾 3단계: 결과 저장');
            await fs.promises.writeFile(
                this.contentFile, 
                JSON.stringify(contentData, null, 2), 
                'utf8'
            );
            console.log(`✅ 전체 콘텐츠 저장 완료: ${this.contentFile}`);
            
            console.log('\n🎉 전체 콘텐츠 생성 완료!');
            console.log(`📊 제목: ${contentData.title}`);
            console.log(`📊 본문 길이: ${contentData.content.length}자`);
            console.log(`📊 구성: 5문단 + 이미지 배치`);
            
            return {
                success: true,
                data: contentData,
                message: '전체 콘텐츠 생성 완료'
            };
            
        } catch (error) {
            console.error('❌ 전체 콘텐츠 생성 실패:', error);
            return {
                success: false,
                error: error.message,
                message: '전체 콘텐츠 생성 실패'
            };
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * 저장된 콘텐츠 로드
     * @returns {Promise<Object|null>}
     */
    async loadSavedContent() {
        try {
            if (!fs.existsSync(this.contentFile)) {
                console.log('⚠️ 저장된 콘텐츠 파일이 없습니다.');
                return null;
            }
            
            const rawData = fs.readFileSync(this.contentFile, 'utf8');
            const contentData = JSON.parse(rawData);
            
            console.log('✅ 저장된 콘텐츠 로드 성공');
            return contentData;
            
        } catch (error) {
            console.error('❌ 저장된 콘텐츠 로드 실패:', error);
            return null;
        }
    }

    /**
     * 콘텐츠 검증
     * @param {Object} contentData 콘텐츠 데이터
     * @returns {Object}
     */
    validateContent(contentData) {
        try {
            const validation = {
                isValid: true,
                errors: [],
                warnings: []
            };
            
            // 필수 필드 확인
            const requiredFields = ['title', 'content'];
            requiredFields.forEach(field => {
                if (!contentData[field]) {
                    validation.isValid = false;
                    validation.errors.push(`${field} 필드가 없습니다.`);
                }
            });
            
            // 콘텐츠 길이 확인
            if (contentData.title && contentData.title.length > 70) {
                validation.warnings.push('제목이 70자를 초과했습니다.');
            }
            
            if (contentData.title && contentData.title.length < 5) {
                validation.warnings.push('제목이 너무 짧습니다.');
            }
            
            if (contentData.content && contentData.content.length > 1500) {
                validation.warnings.push('본문이 1500자를 초과했습니다.');
            }
            
            if (contentData.content && contentData.content.length < 800) {
                validation.warnings.push('본문이 너무 짧습니다.');
            }
            
            // 문단 구성 확인 (빈 줄로 구분된 문단)
            if (contentData.content) {
                const paragraphs = contentData.content.split('\n\n').filter(p => p.trim());
                if (paragraphs.length !== 5) {
                    validation.warnings.push(`5문단 구성이 아닙니다. 현재: ${paragraphs.length}문단`);
                }
                
                // 각 문단 글자수 확인
                paragraphs.forEach((paragraph, index) => {
                    if (paragraph.length > 300) {
                        validation.warnings.push(`${index + 1}번째 문단이 300자를 초과했습니다. (${paragraph.length}자)`);
                    }
                });
            }
            
            console.log(`🔍 콘텐츠 검증 완료: ${validation.isValid ? '통과' : '실패'}`);
            if (validation.errors.length > 0) {
                console.log(`❌ 오류: ${validation.errors.join(', ')}`);
            }
            if (validation.warnings.length > 0) {
                console.log(`⚠️ 경고: ${validation.warnings.join(', ')}`);
            }
            
            return validation;
            
        } catch (error) {
            console.error('❌ 콘텐츠 검증 중 오류:', error);
            return {
                isValid: false,
                errors: [error.message],
                warnings: []
            };
        }
    }

    /**
     * 임시 파일 정리
     */
    async cleanupTempFiles() {
        try {
            const tempFiles = [this.reviewFile, this.contentFile];
            
            tempFiles.forEach(file => {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                    console.log(`🗑️ 임시 파일 삭제: ${file}`);
                }
            });
            
            console.log('✅ 임시 파일 정리 완료');
            
        } catch (error) {
            console.error('❌ 임시 파일 정리 실패:', error);
        }
    }

    /**
     * 콘텐츠 생성 중지
     */
    async stop() {
        try {
            console.log('⏹️ ContentGenerator 중지 요청...');
            this.shouldStop = true;
            
            // 실행 중인 경우 잠시 대기
            let waitCount = 0;
            while (this.isRunning && waitCount < 50) { // 최대 5초 대기
                await this.delay(100);
                waitCount++;
            }
            
            console.log('✅ ContentGenerator 중지 완료');
        } catch (error) {
            console.error('❌ ContentGenerator 중지 실패:', error);
        }
    }

    /**
     * 중지 상태 초기화
     */
    resetStopFlag() {
        this.shouldStop = false;
        console.log('🔄 ContentGenerator 중지 플래그 초기화');
    }

    /**
     * 아고다 콘텐츠 생성 (쿠팡파트너스와 동일한 구조)
     * @param {Object} hotelInfo - 호텔 정보
     * @param {string} apiKey - Gemini API 키
     * @returns {Object} 생성된 콘텐츠
     */
    async generateAgodaContent(hotelInfo, apiKey) {
        try {
            console.log('🏨 아고다 콘텐츠 생성 시작:', hotelInfo.이름);
            
            // 중지 플래그 초기화
            this.shouldStop = false;
            this.isRunning = true;
            
            // 초기 중지 조건 확인
            if (this.shouldStop) {
                console.log('⏹️ 아고다 콘텐츠 생성 중지 요청 감지 - 초기 단계');
                throw new Error('콘텐츠 생성이 중지되었습니다.');
            }
            
            // API 키 설정
            this.setApiKey(apiKey);
            
            // 개발/프로덕션 환경에 따른 아고다 경로 설정
            // global.paths.tempImagePath 사용 (빌드된 앱에서는 사용자 데이터 폴더)
            const agodaBasePath = global.paths ? global.paths.tempImagePath : process.cwd();
            
            console.log(`📁 아고다 기본 경로: ${agodaBasePath}`);
            console.log(`📁 global.paths 사용 가능: ${global.paths ? 'YES' : 'NO'}`);
            
            // hotel.json 파일 읽기 (tempImagePath/upload 폴더에서)
            const hotelJsonPath = path.join(agodaBasePath, 'upload', 'hotel.json');
            let hotelData = {};
            
            console.log(`📄 hotel.json 파일 경로: ${hotelJsonPath}`);
            
            if (fs.existsSync(hotelJsonPath)) {
                try {
                    const hotelJsonContent = fs.readFileSync(hotelJsonPath, 'utf-8');
                    hotelData = JSON.parse(hotelJsonContent);
                    console.log('✅ hotel.json 파일 읽기 완료');
                } catch (error) {
                    console.error('❌ hotel.json 파싱 실패:', error);
                }
            } else {
                console.log('⚠️ hotel.json 파일이 없습니다. 기본 정보를 사용합니다.');
            }
            
            // 호텔 정보 병합 (hotel.json 우선)
            const mergedHotelInfo = { ...hotelInfo, ...hotelData };
            
            // 중지 조건 확인 (호텔 정보 병합 후)
            if (this.shouldStop) {
                console.log('⏹️ 아고다 콘텐츠 생성 중지 요청 감지 - 호텔 정보 병합 후');
                throw new Error('콘텐츠 생성이 중지되었습니다.');
            }
            
            // hotel_imgs 폴더의 이미지 파일들 확인 (tempImagePath/upload에서)
            const hotelImgsPath = path.join(agodaBasePath, 'upload', 'hotel_imgs');
            let imageFiles = [];
            
            console.log(`📷 이미지 폴더 경로: ${hotelImgsPath}`);
            
            if (fs.existsSync(hotelImgsPath)) {
                imageFiles = fs.readdirSync(hotelImgsPath)
                    .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
                    .map(file => path.join(hotelImgsPath, file)); // 전체 경로로 변환
                console.log(`📷 이미지 파일 ${imageFiles.length}개 발견`);
            } else {
                console.log('⚠️ hotel_imgs 폴더가 없습니다.');
            }
            
            // 중지 조건 확인 (이미지 파일 확인 후)
            if (this.shouldStop) {
                console.log('⏹️ 아고다 콘텐츠 생성 중지 요청 감지 - 이미지 파일 확인 후');
                throw new Error('콘텐츠 생성이 중지되었습니다.');
            }
            
            // 쿠팡파트너스와 동일한 프롬프트 생성
            
            const prompt = `
            너는 파워 블로거야 다음 호텔 정보와 조건을 만족하는 자연스러운 호텔 리뷰를 작성해줘:

            호텔명: ${mergedHotelInfo.이름 || mergedHotelInfo.name || '호텔'}
            위치: ${mergedHotelInfo.위치 || mergedHotelInfo.location || ''}
            평점: ${mergedHotelInfo.평점 || mergedHotelInfo.rating || ''}
            설명: ${mergedHotelInfo.설명 || mergedHotelInfo.description || ''}
            시설: ${mergedHotelInfo.시설 || mergedHotelInfo.facilities || ''}

            ## 글쓰기 스타일

            1. 자연스럽고 친근한 어조: 실제 여행객의 경험담처럼 편안하고 솔직한 톤으로 작성
            2. 구체적인 체험 중심: 직접 경험한 것처럼 생생한 디테일과 개인적인 소감 포함
            3. 유용한 정보 제공: 다른 여행객들에게 도움이 될 실용적인 팁과 노하우 공유
            4. 균형 잡힌 관점: 장점을 중심으로 하되 솔직한 후기 형태로 신뢰감 조성
            5. 스토리텔링 접근: 여행 경험을 자연스럽게 풀어내는 이야기 형식

            ## 포함 요소

            - 호텔의 위치와 접근성에 대한 실제 경험
            - 객실과 시설에 대한 구체적인 묘사
            - 서비스 품질과 직원 응대에 대한 솔직한 평가
            - 주변 관광지나 편의시설 정보
            - 다른 여행객들을 위한 실용적인 조언

            ## 제외 사항

            - 구체적인 가격 정보 언급 금지
            - 상업적이거나 광고성 표현 배제
            - 과도한 찬사나 판매 목적의 문구 제거

            ## 형식 요구사항

            - 정확히 5개 문단으로 구성
            - 각 문단 300자 이내
            - 전체 글자수 1500자 미만
            - 문단 사이는 빈 줄(두 번의 줄바꿈)로 구분
            - 이모지 사용 금지
            - [문단1], [문단2] 같은 표시 금지

            반드시 5개 문단으로 구성된 본문 내용만 생성해주세요.
            `;

            const chatSession = this.model.startChat({
                generationConfig: this.generationConfig,
                history: [],
            });

            const generatedContent = await this.sendMessageWithRetry(chatSession, prompt);
            
            // 중지 조건 확인 (본문 생성 후)
            if (this.shouldStop) {
                console.log('⏹️ 아고다 콘텐츠 생성 중지 요청 감지 - 본문 생성 후');
                throw new Error('콘텐츠 생성이 중지되었습니다.');
            }
            
            // 특수 문자 제거
            const cleanContent = this.removeSpecialCharacters(generatedContent);
            
            // 제목 생성 (별도 프롬프트)
            const titlePrompt = `다음은 "${mergedHotelInfo.이름 || mergedHotelInfo.name || '호텔'}" 호텔에 대한 블로그 본문입니다:

            ${cleanContent}

            위 본문 내용을 바탕으로 클릭을 유도하는 매력적인 블로그 제목을 하나만 만들어주세요.

            요구사항:
            - 호텔명 포함
            - 50자 이내로 작성
            - 클릭을 유도하는 재미있고 독특한 내용
            - 한국어로 작성
            - 감탄사나 이모지, 특수문자는 사용 금지
            - 반드시 하나의 제목만 제공`;

            const titleResult = await this.sendMessageWithRetry(chatSession, titlePrompt);
            
            // 중지 조건 확인 (제목 생성 후)
            if (this.shouldStop) {
                console.log('⏹️ 아고다 콘텐츠 생성 중지 요청 감지 - 제목 생성 후');
                throw new Error('콘텐츠 생성이 중지되었습니다.');
            }
            
            const cleanTitle = this.removeSpecialCharacters(titleResult.trim()).slice(0, 70);
            
            console.log('✅ 아고다 콘텐츠 생성 완료');
            console.log(`📊 제목: ${cleanTitle}`);
            console.log(`📊 본문 길이: ${cleanContent.length}자`);
            console.log(`📊 이미지 개수: ${imageFiles.length}개`);
            
            return {
                title: cleanTitle,
                content: cleanContent,
                images: imageFiles,
                affiliateUrl: mergedHotelInfo.agoda_url || '',
                hotelInfo: mergedHotelInfo,
                generatedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ 아고다 콘텐츠 생성 실패:', error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * 리소스 정리
     */
    async cleanup() {
        try {
            console.log('🧹 ContentGenerator 리소스 정리...');
            
            // 중지 처리
            await this.stop();
            
            // 모델 및 API 연결 해제
            this.model = null;
            this.genAI = null;
            this.apiKey = null;
            
            console.log('✅ ContentGenerator 리소스 정리 완료');
            
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
            apiKeySet: !!this.apiKey,
            modelReady: !!this.model,
            reviewFileExists: fs.existsSync(this.reviewFile),
            contentFileExists: fs.existsSync(this.contentFile),
            isRunning: this.isRunning,
            shouldStop: this.shouldStop
        };
    }
}

module.exports = ContentGenerator; 