const https = require('https');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const zlib = require('zlib');

/**
 * 쿠팡 Open API 관리 클래스
 * - API 키 관리 (로컬 저장/불러오기)
 * - 골드박스 상품 API 호출
 * - 쿠팡 PL 상품 API 호출
 * - API 인증 및 요청 관리
 */
class CoupangApiManager {
    constructor(dataPath) {
        this.dataPath = dataPath;
        this.apiKeysFile = path.join(dataPath, 'coupang_api_keys.json');
        this.baseUrl = 'https://api-gateway.coupang.com';
        this.apiPath = '/v2/providers/affiliate_open_api/apis/openapi/v1';
        
        // API 키 정보
        this.accessKey = '';
        this.secretKey = '';
        this.isConnected = false;
        
        console.log('🔑 CoupangApiManager 초기화 완료');
        console.log('🌐 Base URL:', this.baseUrl);
        console.log('📍 API Path:', this.apiPath);
        this.loadApiKeys();
    }

    /**
     * API 키를 로컬 파일에 저장
     * @param {string} accessKey 액세스 키
     * @param {string} secretKey 시크릿 키
     * @returns {Promise<boolean>} 저장 성공 여부
     */
    async saveApiKeys(accessKey, secretKey) {
        try {
            if (!accessKey || !secretKey) {
                throw new Error('API 키가 올바르지 않습니다.');
            }

            const apiKeys = {
                accessKey: accessKey,
                secretKey: secretKey,
                savedAt: new Date().toISOString()
            };

            await fs.writeJSON(this.apiKeysFile, apiKeys, { spaces: 2 });
            
            this.accessKey = accessKey;
            this.secretKey = secretKey;
            
            console.log('✅ 쿠팡 API 키 저장 완료');
            return true;
        } catch (error) {
            console.error('❌ 쿠팡 API 키 저장 실패:', error);
            return false;
        }
    }

    /**
     * 로컬 파일에서 API 키 불러오기
     * @returns {Promise<boolean>} 불러오기 성공 여부
     */
    async loadApiKeys() {
        try {
            if (!await fs.pathExists(this.apiKeysFile)) {
                // console.log('📝 저장된 쿠팡 API 키가 없습니다.');
                return false;
            }

            const apiKeys = await fs.readJSON(this.apiKeysFile);
            
            if (apiKeys.accessKey && apiKeys.secretKey) {
                this.accessKey = apiKeys.accessKey;
                this.secretKey = apiKeys.secretKey;
                console.log('✅ 쿠팡 API 키 불러오기 완료');
                return true;
            } else {
                console.log('❌ 저장된 API 키가 유효하지 않습니다.');
                return false;
            }
        } catch (error) {
            console.error('❌ 쿠팡 API 키 불러오기 실패:', error);
            return false;
        }
    }

    /**
     * 저장된 API 키 정보 반환
     * @returns {Object} API 키 정보
     */
    getApiKeys() {
        return {
            accessKey: this.accessKey,
            secretKey: this.secretKey,
            isConnected: this.isConnected
        };
    }

    /**
     * 현재 UTC 시간을 쿠팡 API 형식으로 포맷
     * @returns {string} YYMMDDTHHMMSSZ 형식의 시간
     */
    getCurrentDatetime() {
        const now = new Date();
        const year = now.getUTCFullYear().toString().slice(-2);
        const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = now.getUTCDate().toString().padStart(2, '0');
        const hour = now.getUTCHours().toString().padStart(2, '0');
        const minute = now.getUTCMinutes().toString().padStart(2, '0');
        const second = now.getUTCSeconds().toString().padStart(2, '0');
        
        return `${year}${month}${day}T${hour}${minute}${second}Z`;
    }

    /**
     * 쿠팡 파트너스 API HMAC 서명 생성 (공식 문서 방식)
     * @param {string} method HTTP 메서드
     * @param {string} url 전체 URL
     * @param {string} secretKey 시크릿 키
     * @param {string} accessKey 액세스 키
     * @returns {Object} 서명 정보 객체
     */
    generateHmac(method, url, secretKey, accessKey) {
        try {
            // URL을 path와 query로 분리
            const parts = url.split(/\?/);
            const [path, query = ''] = parts;
            
            // UTC 시간 생성 (YYMMDDTHHMMSSZ 형식)
            const datetime = this.getCurrentDatetime();
            
            // 메시지 구성: datetime + method + path + query
            const message = datetime + method + path + query;
            
            console.log('🔐 HMAC 서명 생성 중...');
            console.log('📅 DateTime:', datetime);
            console.log('🔤 Method:', method);
            console.log('📍 Path:', path);
            console.log('❓ Query:', query);
            console.log('📝 Message:', message);
            
            // HMAC-SHA256 서명 생성
            const signature = crypto.createHmac('sha256', secretKey)
                .update(message)
                .digest('hex');
            
            // Authorization 헤더 생성 (공식 형식)
            const authorization = `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
            
            console.log('✅ HMAC 서명 생성 완료');
            console.log('🔑 Signature:', signature.substring(0, 16) + '...');
            console.log('🔐 Authorization:', authorization.substring(0, 80) + '...');
            
            return {
                datetime,
                signature,
                authorization,
                message
            };
        } catch (error) {
            console.error('❌ HMAC 서명 생성 실패:', error);
            throw new Error('HMAC 서명 생성 실패: ' + error.message);
        }
    }

    /**
     * 쿠팡 API 요청 실행 (공식 문서 방식)
     * @param {string} endpoint API 엔드포인트
     * @param {Object} params 요청 파라미터
     * @returns {Promise<Object>} API 응답
     */
    async makeApiRequest(endpoint, params = {}) {
        return new Promise((resolve, reject) => {
            try {
                if (!this.accessKey || !this.secretKey) {
                    throw new Error('API 키가 설정되지 않았습니다.');
                }

                // URL 파라미터 생성
                const urlParams = new URLSearchParams();
                Object.keys(params).forEach(key => {
                    if (params[key] !== undefined && params[key] !== '') {
                        urlParams.append(key, params[key]);
                    }
                });

                const queryString = urlParams.toString();
                const endpointPath = this.apiPath + endpoint + (queryString ? '?' + queryString : '');
                const fullUrl = this.baseUrl + endpointPath;

                console.log('🔗 쿠팡 API 요청:', fullUrl);
                console.log('📍 API 경로:', endpointPath);

                // HMAC 서명 생성 (공식 문서 방식)
                const hmacData = this.generateHmac('GET', endpointPath, this.secretKey, this.accessKey);
                
                // 헤더 구성 (공식 문서 방식)
                const headers = {
                    'Authorization': hmacData.authorization,
                    'Content-Type': 'application/json;charset=UTF-8',
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate'
                };

                console.log('🔐 API 인증 정보:', {
                    accessKey: this.accessKey ? this.accessKey.substring(0, 10) + '...' : 'undefined',
                    datetime: hmacData.datetime,
                    signature: hmacData.signature ? hmacData.signature.substring(0, 16) + '...' : 'undefined',
                    path: endpointPath,
                    method: 'GET'
                });

                const options = {
                    hostname: 'api-gateway.coupang.com',
                    port: 443,
                    path: endpointPath,
                    method: 'GET',
                    headers: headers
                };

                console.log('🔧 HTTP 요청 옵션:', {
                    hostname: options.hostname,
                    path: options.path,
                    method: options.method,
                    headers: Object.keys(options.headers)
                });

                const req = https.request(options, (res) => {
                    let responseData = Buffer.alloc(0);
                    
                    res.on('data', (chunk) => {
                        responseData = Buffer.concat([responseData, chunk]);
                    });
                    
                    res.on('end', () => {
                        // gzip 압축 해제 처리
                        const processResponse = (data) => {
                            console.log('📥 API 응답 수신:', {
                                statusCode: res.statusCode,
                                statusMessage: res.statusMessage,
                                headers: res.headers,
                                contentType: res.headers['content-type'],
                                contentEncoding: res.headers['content-encoding'],
                                dataLength: data.length,
                                dataPreview: data.substring(0, 200)
                            });

                            // 응답 상태 코드 먼저 확인
                            if (res.statusCode !== 200) {
                                console.error('❌ 쿠팡 API HTTP 오류:', res.statusCode, res.statusMessage);
                                console.error('❌ 응답 내용:', data);
                                reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage} - ${data}`));
                                return;
                            }

                            // 빈 응답 확인
                            if (!data || data.trim().length === 0) {
                                console.error('❌ 빈 응답 수신');
                                reject(new Error('API에서 빈 응답을 반환했습니다.'));
                                return;
                            }

                            // Content-Type 확인
                            const contentType = res.headers['content-type'] || '';
                            if (!contentType.includes('application/json')) {
                                console.error('❌ JSON이 아닌 응답:', contentType);
                                console.error('❌ 응답 내용:', data);
                                reject(new Error(`예상하지 못한 응답 형식: ${contentType}`));
                                return;
                            }

                            try {
                                const jsonData = JSON.parse(data);
                                console.log('✅ 쿠팡 API 응답 파싱 성공');
                                console.log('📊 응답 코드:', jsonData.rCode);
                                console.log('📋 응답 메시지:', jsonData.rMessage);
                                
                                // rCode가 "0"이 아니면 오류
                                if (jsonData.rCode && jsonData.rCode !== "0") {
                                    console.error('❌ API 응답 오류:', jsonData.rMessage);
                                    reject(new Error(`API 오류: ${jsonData.rMessage}`));
                                    return;
                                }
                                
                                resolve(jsonData);
                            } catch (parseError) {
                                console.error('❌ JSON 파싱 실패:', parseError.message);
                                console.error('❌ 원본 응답 데이터:', data);
                                reject(new Error(`JSON 파싱 실패: ${parseError.message}`));
                            }
                        };

                        // gzip 압축 여부 확인 및 해제
                        if (res.headers['content-encoding'] === 'gzip') {
                            zlib.gunzip(responseData, (err, decompressed) => {
                                if (err) {
                                    console.error('❌ gzip 압축 해제 실패:', err);
                                    reject(new Error('응답 압축 해제 실패: ' + err.message));
                                    return;
                                }
                                const data = decompressed.toString('utf8');
                                processResponse(data);
                            });
                        } else {
                            const data = responseData.toString('utf8');
                            processResponse(data);
                        }
                    });
                });

                req.on('error', (error) => {
                    console.error('❌ 쿠팡 API 요청 오류:', error);
                    reject(new Error('API 요청 오류: ' + error.message));
                });

                req.setTimeout(30000, () => {
                    req.destroy();
                    reject(new Error('API 요청 타임아웃'));
                });

                req.end();
            } catch (error) {
                console.error('❌ API 요청 준비 실패:', error);
                reject(error);
            }
        });
    }

    /**
     * 다른 인증 방식으로 재시도
     * @param {string} endpoint API 엔드포인트
     * @param {Object} params 요청 파라미터
     * @param {Array} authHeaders 인증 헤더 배열
     * @param {string} timestamp 타임스탬프
     * @param {string} signature 서명
     * @returns {Promise<Object>} API 응답
     */
    async retryWithDifferentAuth(endpoint, params, authHeaders, timestamp, signature) {
        return new Promise((resolve, reject) => {
            console.log('🔄 다른 인증 방식으로 재시도 시작...');
            
            // 방식 2: Bearer 형식 시도
            const alternativeHeaders = {
                'Authorization': authHeaders[1], // Bearer 형식
                'Content-Type': 'application/json;charset=UTF-8',
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate'
            };
            
            console.log('🔄 대안 인증 헤더:', alternativeHeaders.Authorization.substring(0, 50) + '...');
            
            const queryString = new URLSearchParams(params).toString();
            const endpointPath = this.apiPath + endpoint + (queryString ? '?' + queryString : '');
            
            const options = {
                hostname: 'api-gateway.coupang.com',
                port: 443,
                path: endpointPath,
                method: 'GET',
                headers: alternativeHeaders
            };
            
            const req = https.request(options, (res) => {
                let responseData = Buffer.alloc(0);
                
                res.on('data', (chunk) => {
                    responseData = Buffer.concat([responseData, chunk]);
                });
                
                res.on('end', () => {
                    if (res.statusCode === 401) {
                        console.log('⚠️ 대안 방식도 401 오류, 최종 시도 중...');
                        this.finalRetryAttempt(endpoint, params, timestamp, signature)
                            .then(resolve)
                            .catch(reject);
                        return;
                    }
                    
                    // 성공적인 응답 처리
                    const processResponse = (data) => {
                        console.log('✅ 대안 방식으로 성공!');
                        try {
                            const jsonData = JSON.parse(data);
                            resolve(jsonData);
                        } catch (parseError) {
                            reject(new Error(`JSON 파싱 실패: ${parseError.message}`));
                        }
                    };
                    
                    if (res.headers['content-encoding'] === 'gzip') {
                        zlib.gunzip(responseData, (err, decompressed) => {
                            if (err) {
                                reject(new Error('응답 압축 해제 실패: ' + err.message));
                                return;
                            }
                            processResponse(decompressed.toString('utf8'));
                        });
                    } else {
                        processResponse(responseData.toString('utf8'));
                    }
                });
            });
            
            req.on('error', (error) => {
                console.error('❌ 대안 방식 요청 오류:', error);
                reject(error);
            });
            
            req.setTimeout(30000, () => {
                req.destroy();
                reject(new Error('대안 방식 요청 타임아웃'));
            });
            
            req.end();
        });
    }

    /**
     * 최종 재시도 (단순 API Key 방식)
     * @param {string} endpoint API 엔드포인트
     * @param {Object} params 요청 파라미터
     * @param {string} timestamp 타임스탬프
     * @param {string} signature 서명
     * @returns {Promise<Object>} API 응답
     */
    async finalRetryAttempt(endpoint, params, timestamp, signature) {
        return new Promise((resolve, reject) => {
            console.log('🔄 최종 시도: 단순 API Key 방식');
            
            // 단순 API Key 방식
            const simpleHeaders = {
                'X-API-KEY': this.accessKey,
                'X-SECRET-KEY': this.secretKey,
                'Content-Type': 'application/json;charset=UTF-8',
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate'
            };
            
            const queryString = new URLSearchParams(params).toString();
            const endpointPath = this.apiPath + endpoint + (queryString ? '?' + queryString : '');
            
            const options = {
                hostname: 'api-gateway.coupang.com',
                port: 443,
                path: endpointPath,
                method: 'GET',
                headers: simpleHeaders
            };
            
            console.log('🔄 최종 시도 헤더:', Object.keys(simpleHeaders));
            
            const req = https.request(options, (res) => {
                let responseData = Buffer.alloc(0);
                
                res.on('data', (chunk) => {
                    responseData = Buffer.concat([responseData, chunk]);
                });
                
                res.on('end', () => {
                    const data = responseData.toString('utf8');
                    console.log('📥 최종 시도 응답:', {
                        statusCode: res.statusCode,
                        statusMessage: res.statusMessage,
                        dataPreview: data.substring(0, 200)
                    });
                    
                    if (res.statusCode !== 200) {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage} - ${data}`));
                        return;
                    }
                    
                    try {
                        const jsonData = JSON.parse(data);
                        console.log('✅ 최종 시도 성공!');
                        resolve(jsonData);
                    } catch (parseError) {
                        reject(new Error(`JSON 파싱 실패: ${parseError.message}`));
                    }
                });
            });
            
            req.on('error', (error) => {
                console.error('❌ 최종 시도 요청 오류:', error);
                reject(error);
            });
            
            req.setTimeout(30000, () => {
                req.destroy();
                reject(new Error('최종 시도 요청 타임아웃'));
            });
            
            req.end();
        });
    }

    /**
     * API 연결 테스트
     * @returns {Promise<boolean>} 연결 성공 여부
     */
    async testConnection() {
        try {
            console.log('🧪 쿠팡 API 연결 테스트 시작');
            
            // 1. 먼저 골드박스 API 시도 (subId 포함)
            try {
                console.log('📦 골드박스 API 테스트 중...');
                const goldboxResult = await this.getGoldboxProducts({ 
                    subId: 'test-channel-001',  // 테스트용 채널 ID
                    imageSize: '300x300' 
                });
                this.isConnected = true;
                console.log('✅ 골드박스 API 연결 테스트 성공');
                return true;
            } catch (goldboxError) {
                console.warn('⚠️ 골드박스 API 테스트 실패:', goldboxError.message);
            }
            
            // 2. 골드박스 실패시 쿠팡 PL API 시도
            try {
                console.log('📦 쿠팡 PL API 테스트 중...');
                const plResult = await this.getCoupangPLProducts({ 
                    limit: 5,
                    subId: 'test-channel-001',  // 테스트용 채널 ID
                    imageSize: '300x300'
                });
                this.isConnected = true;
                console.log('✅ 쿠팡 PL API 연결 테스트 성공');
                return true;
            } catch (plError) {
                console.warn('⚠️ 쿠팡 PL API 테스트 실패:', plError.message);
            }
            
            // 3. 두 API 모두 실패시 간단한 베이스 요청 시도
            try {
                console.log('🔍 기본 API 엔드포인트 테스트 중...');
                const baseResult = await this.makeApiRequest('/', {});
                this.isConnected = true;
                console.log('✅ 기본 API 연결 테스트 성공');
                return true;
            } catch (baseError) {
                console.warn('⚠️ 기본 API 테스트 실패:', baseError.message);
                throw baseError;
            }
            
        } catch (error) {
            this.isConnected = false;
            console.error('❌ 모든 쿠팡 API 연결 테스트 실패:', error);
            return false;
        }
    }

    /**
     * 골드박스 상품 정보 가져오기
     * @param {Object} options 요청 옵션
     * @param {string} options.subId 채널 ID (선택사항)
     * @param {string} options.imageSize 이미지 크기 (선택사항)
     * @returns {Promise<Object>} 골드박스 상품 데이터
     */
    async getGoldboxProducts(options = {}) {
        try {
            console.log('📦 골드박스 상품 조회 시작');
            
            const params = {};
            if (options.subId) params.subId = options.subId;
            if (options.imageSize) params.imageSize = options.imageSize;

            const result = await this.makeApiRequest('/products/goldbox', params);
            
            if (result.rCode === '0' && result.data) {
                console.log(`✅ 골드박스 상품 ${result.data.length}개 조회 완료`);
                return result;
            } else {
                throw new Error(`골드박스 API 오류: ${result.rMessage || '알 수 없는 오류'}`);
            }
        } catch (error) {
            console.error('❌ 골드박스 상품 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 쿠팡 PL 상품 정보 가져오기
     * @param {Object} options 요청 옵션
     * @param {number} options.limit 상품 수량 (기본값: 20, 최대: 100)
     * @param {string} options.subId 채널 ID (선택사항)
     * @param {string} options.imageSize 이미지 크기 (선택사항)
     * @returns {Promise<Object>} 쿠팡 PL 상품 데이터
     */
    async getCoupangPLProducts(options = {}) {
        try {
            console.log('📦 쿠팡 PL 상품 조회 시작');
            
            const params = {};
            if (options.limit) params.limit = Math.min(options.limit, 100);
            if (options.subId) params.subId = options.subId;
            if (options.imageSize) params.imageSize = options.imageSize;

            const result = await this.makeApiRequest('/products/coupangPL', params);
            
            if (result.rCode === '0' && result.data) {
                console.log(`✅ 쿠팡 PL 상품 ${result.data.length}개 조회 완료`);
                return result;
            } else {
                throw new Error(`쿠팡 PL API 오류: ${result.rMessage || '알 수 없는 오류'}`);
            }
        } catch (error) {
            console.error('❌ 쿠팡 PL 상품 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 모든 API에서 상품 정보 가져오기
     * @param {Object} options 요청 옵션
     * @param {boolean} options.useGoldbox 골드박스 API 사용 여부
     * @param {boolean} options.useCoupangPL 쿠팡 PL API 사용 여부
     * @param {number} options.coupangPLLimit 쿠팡 PL 상품 수량
     * @param {string} options.subId 채널 ID
     * @param {string} options.imageSize 이미지 크기
     * @returns {Promise<Array>} 모든 상품 URL 배열
     */
    async getAllProducts(options = {}) {
        try {
            console.log('📦 모든 상품 조회 시작');
            
            const allProducts = [];
            const promises = [];

            // 골드박스 API 호출
            if (options.useGoldbox) {
                promises.push(
                    this.getGoldboxProducts({
                        subId: options.subId,
                        imageSize: options.imageSize
                    }).then(result => {
                        if (result.data) {
                            allProducts.push(...result.data);
                        }
                    }).catch(error => {
                        console.error('골드박스 API 호출 실패:', error);
                    })
                );
            }

            // 쿠팡 PL API 호출
            if (options.useCoupangPL) {
                promises.push(
                    this.getCoupangPLProducts({
                        limit: options.coupangPLLimit || 20,
                        subId: options.subId,
                        imageSize: options.imageSize
                    }).then(result => {
                        if (result.data) {
                            allProducts.push(...result.data);
                        }
                    }).catch(error => {
                        console.error('쿠팡 PL API 호출 실패:', error);
                    })
                );
            }

            await Promise.all(promises);

            // 상품 URL 추출
            const productUrls = allProducts
                .filter(product => product.productUrl)
                .map(product => product.productUrl);

            console.log(`✅ 총 ${productUrls.length}개 상품 URL 조회 완료`);
            return productUrls;
        } catch (error) {
            console.error('❌ 모든 상품 조회 실패:', error);
            throw error;
        }
    }

    /**
     * API 키 삭제
     * @returns {Promise<boolean>} 삭제 성공 여부
     */
    async clearApiKeys() {
        try {
            if (await fs.pathExists(this.apiKeysFile)) {
                await fs.remove(this.apiKeysFile);
            }
            
            this.accessKey = '';
            this.secretKey = '';
            this.isConnected = false;
            
            console.log('✅ 쿠팡 API 키 삭제 완료');
            return true;
        } catch (error) {
            console.error('❌ 쿠팡 API 키 삭제 실패:', error);
            return false;
        }
    }

    /**
     * 랜덤 상품 선택 (골드박스 또는 쿠팡PL에서)
     * @param {Object} options - 옵션 (subId, imageSize, useGoldbox, useCoupangPL 등)
     * @returns {Promise<Object>} 선택된 상품 정보
     */
    async getRandomProduct(options = {}) {
        try {
            console.log('🎲 랜덤 상품 선택 시작...');
            
            // API 타입 랜덤 선택 (옵션이 없으면 50:50 확률)
            const useGoldbox = options.useGoldbox !== undefined ? options.useGoldbox : Math.random() < 0.5;
            const apiType = useGoldbox ? 'goldbox' : 'coupangPL';
            
            console.log(`🎯 선택된 API: ${apiType.toUpperCase()}`);
            
            let apiResult;
            if (useGoldbox) {
                // 골드박스 상품 목록 가져오기
                apiResult = await this.getGoldboxProducts({
                    subId: options.subId,
                    imageSize: options.imageSize || '512x512'
                });
            } else {
                // 쿠팡 PL 상품 목록 가져오기
                apiResult = await this.getCoupangPLProducts({
                    limit: options.coupangPLLimit || 50,
                    subId: options.subId,
                    imageSize: options.imageSize || '512x512'
                });
            }
            
            if (!apiResult.data || apiResult.data.length === 0) {
                throw new Error(`${apiType} 상품을 찾을 수 없습니다.`);
            }
            
            // 랜덤 인덱스 선택
            const randomIndex = Math.floor(Math.random() * apiResult.data.length);
            const selectedProduct = apiResult.data[randomIndex];
            
            console.log('🎯 랜덤 상품 선택 완료:', {
                apiType: apiType,
                totalProducts: apiResult.data.length,
                selectedIndex: randomIndex + 1,
                productName: selectedProduct.productName,
                productPrice: selectedProduct.productPrice,
                productUrl: selectedProduct.productUrl
            });
            
            return {
                success: true,
                product: selectedProduct,
                apiType: apiType,
                totalProducts: apiResult.data.length,
                selectedIndex: randomIndex + 1
            };
            
        } catch (error) {
            console.error('❌ 랜덤 상품 선택 실패:', error);
            throw new Error('랜덤 상품 선택 실패: ' + error.message);
        }
    }

    /**
     * 완전 자동화용 랜덤 상품 URL 가져오기
     * @param {Object} options - 옵션 (subId 등)
     * @returns {Promise<string>} 선택된 상품 URL
     */
    async getRandomProductUrl(options = {}) {
        try {
            console.log('🔗 완전 자동화용 랜덤 상품 URL 가져오기...');
            
            const randomResult = await this.getRandomProduct(options);
            
            if (!randomResult.success || !randomResult.product) {
                throw new Error('랜덤 상품을 가져올 수 없습니다.');
            }
            
            const partnerUrl = randomResult.product.productUrl;
            
            console.log('🔗 파트너스 리다이렉트 URL:', partnerUrl);
            console.log('✅ 상품 선택 완료:', {
                productName: randomResult.product.productName,
                productUrl: partnerUrl,
                totalProducts: randomResult.totalProducts,
                selectedIndex: randomResult.selectedIndex
            });
            
            // 리다이렉트 URL을 실제 쿠팡 상품 페이지 URL로 변환
            const realUrl = await this.resolveRedirectUrl(partnerUrl);
            
            console.log('✅ 완전 자동화용 상품 URL 준비 완료:', realUrl);
            return realUrl;
            
        } catch (error) {
            console.error('❌ 완전 자동화용 상품 URL 가져오기 실패:', error);
            throw new Error('완전 자동화용 상품 URL 가져오기 실패: ' + error.message);
        }
    }

    /**
     * 리다이렉트 URL을 실제 쿠팡 상품 페이지 URL로 변환
     * @param {string} redirectUrl - 파트너스 리다이렉트 URL
     * @returns {Promise<string>} 실제 쿠팡 상품 페이지 URL
     */
    async resolveRedirectUrl(redirectUrl) {
        try {
            console.log('🔄 리다이렉트 URL 추적 시작:', redirectUrl);
            
            const https = require('https');
            const { URL } = require('url');
            
            return new Promise((resolve, reject) => {
                let currentUrl = redirectUrl;
                let redirectCount = 0;
                const maxRedirects = 10; // 최대 리다이렉트 횟수
                const maxRetries = 3; // 최대 재시도 횟수
                let retryCount = 0;
                
                const followRedirect = (url, isRetry = false) => {
                    if (redirectCount >= maxRedirects) {
                        console.warn('⚠️ 최대 리다이렉트 횟수 초과, 현재 URL 반환');
                        resolve(currentUrl);
                        return;
                    }
                    
                    if (isRetry) {
                        retryCount++;
                        if (retryCount > maxRetries) {
                            console.warn('⚠️ 최대 재시도 횟수 초과, 현재 URL 반환');
                            resolve(currentUrl);
                            return;
                        }
                        console.log(`🔄 재시도 중... (${retryCount}/${maxRetries})`);
                    }
                    
                    try {
                        const urlObj = new URL(url);
                        
                        // 실제 쿠팡 상품 페이지 도메인인지 확인 (link.coupang.com은 리다이렉트용이므로 제외)
                        if (urlObj.hostname === 'www.coupang.com' && urlObj.pathname.startsWith('/vp/products/')) {
                            console.log('✅ 쿠팡 상품 페이지 확인 - 리다이렉트 추적 완료:', url);
                            resolve(url);
                            return;
                        }
                        
                        // link.coupang.com은 리다이렉트 URL이므로 추적 계속
                        if (urlObj.hostname === 'link.coupang.com') {
                            console.log('🔄 쿠팡 파트너스 리다이렉트 URL 감지, 추적 계속...');
                        }
                        
                        const options = {
                            hostname: urlObj.hostname,
                            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                            path: urlObj.pathname + urlObj.search,
                            method: 'GET', // GET 요청으로 변경 (더 안전함)
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                                'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                                'Accept-Encoding': 'gzip, deflate',
                                'Connection': 'close', // keep-alive 대신 close 사용
                                'Cache-Control': 'no-cache'
                            },
                            timeout: 15000 // 15초 타임아웃
                        };
                        
                        console.log(`🔄 리다이렉트 추적 중... (${redirectCount + 1}/${maxRedirects}): ${url}`);
                        
                        const req = https.request(options, (res) => {
                            console.log(`📍 응답 상태: ${res.statusCode} - ${res.statusMessage}`);
                            
                            // 리다이렉트 상태 코드 확인
                            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                                redirectCount++;
                                const nextUrl = res.headers.location;
                                
                                // 상대 경로일 경우 절대 경로로 변환
                                let absoluteUrl;
                                if (nextUrl.startsWith('/')) {
                                    absoluteUrl = `${urlObj.protocol}//${urlObj.host}${nextUrl}`;
                                } else if (nextUrl.startsWith('http')) {
                                    absoluteUrl = nextUrl;
                                } else {
                                    absoluteUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}/${nextUrl}`;
                                }
                                
                                console.log(`➡️ 리다이렉트 대상: ${absoluteUrl}`);
                                currentUrl = absoluteUrl;
                                
                                // 실제 쿠팡 상품 페이지인지 확인
                                try {
                                    const nextUrlObj = new URL(absoluteUrl);
                                    if (nextUrlObj.hostname === 'www.coupang.com' && nextUrlObj.pathname.startsWith('/vp/products/')) {
                                        console.log('✅ 쿠팡 상품 페이지로 리다이렉트 완료:', absoluteUrl);
                                        resolve(absoluteUrl);
                                        return;
                                    }
                                } catch (e) {
                                    // URL 파싱 실패 시 계속 진행
                                }
                                
                                // 짧은 지연 후 다음 URL로 리다이렉트 추적
                                setTimeout(() => {
                                    followRedirect(absoluteUrl);
                                }, 500); // 0.5초 대기
                                
                            } else if (res.statusCode === 200) {
                                // 성공 응답 - 최종 URL 도달
                                console.log('✅ 리다이렉트 추적 완료 - 최종 URL:', currentUrl);
                                resolve(currentUrl);
                            } else {
                                // 기타 상태 코드
                                console.warn(`⚠️ 예상하지 못한 상태 코드 ${res.statusCode}, 현재 URL 반환`);
                                resolve(currentUrl);
                            }
                            
                            // 응답 데이터 소비 (메모리 누수 방지)
                            res.on('data', () => {});
                            res.on('end', () => {});
                        });
                        
                        req.on('error', (error) => {
                            console.error('❌ 리다이렉트 추적 중 오류:', error.message);
                            
                            // 특정 오류에 대한 재시도
                            if ((error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || 
                                error.message.includes('socket hang up')) && retryCount < maxRetries) {
                                console.log('🔄 네트워크 오류로 인한 재시도...');
                                setTimeout(() => {
                                    followRedirect(url, true);
                                }, 2000); // 2초 후 재시도
                            } else {
                                // 오류 발생 시 현재 URL 반환 (쿠팡 도메인이면 유효할 가능성 높음)
                                console.warn('⚠️ 리다이렉트 추적 실패, 현재 URL 반환:', currentUrl);
                                resolve(currentUrl);
                            }
                        });
                        
                        req.on('timeout', () => {
                            console.warn('⚠️ 리다이렉트 추적 타임아웃');
                            req.destroy();
                            
                            // 실제 쿠팡 상품 페이지이면 현재 URL 반환
                            try {
                                const currentUrlObj = new URL(currentUrl);
                                if (currentUrlObj.hostname === 'www.coupang.com' && currentUrlObj.pathname.startsWith('/vp/products/')) {
                                    console.log('✅ 타임아웃이지만 쿠팡 상품 페이지 확인됨, URL 반환:', currentUrl);
                                    resolve(currentUrl);
                                    return;
                                }
                            } catch (e) {
                                // URL 파싱 실패 시 계속 진행
                            }
                            
                            // 타임아웃 시 재시도
                            if (retryCount < maxRetries) {
                                console.log('🔄 타임아웃으로 인한 재시도...');
                                setTimeout(() => {
                                    followRedirect(url, true);
                                }, 3000); // 3초 후 재시도
                            } else {
                                console.warn('⚠️ 최대 재시도 횟수 초과, 현재 URL 반환');
                                resolve(currentUrl);
                            }
                        });
                        
                        req.setTimeout(15000); // 15초 타임아웃 설정
                        req.end();
                        
                    } catch (urlError) {
                        console.error('❌ URL 처리 오류:', urlError.message);
                        resolve(redirectUrl);
                    }
                };
                
                // 리다이렉트 추적 시작
                followRedirect(currentUrl);
            });
            
        } catch (error) {
            console.error('❌ 리다이렉트 URL 추적 실패:', error);
            // 실패 시 원래 URL 반환
            return redirectUrl;
        }
    }
}

module.exports = CoupangApiManager; 