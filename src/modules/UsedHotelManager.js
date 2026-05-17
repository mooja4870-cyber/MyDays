const fs = require('fs');
const path = require('path');

/**
 * 사용한 호텔들을 관리하는 클래스
 * - 호텔 ID만 저장하여 최소한의 용량 사용
 * - 최대 7일치만 보관
 * - JSON 파일로 로컬에 저장
 */
class UsedHotelManager {
    constructor() {
        // 사용자 데이터 폴더에 저장
        this.dataPath = global.paths ? global.paths.tempImagePath : __dirname;
        this.filePath = path.join(this.dataPath, 'used_hotels.json');
        this.maxDays = 7; // 최대 보관 일수
        
        this.ensureDataFile();
    }

    /**
     * 데이터 파일이 존재하는지 확인하고 없으면 생성
     */
    ensureDataFile() {
        try {
            if (!fs.existsSync(this.filePath)) {
                const initialData = {
                    version: '2.0', // 계정별 구조로 버전 업
                    hotels: {},
                    lastCleanup: new Date().toISOString()
                };
                fs.writeFileSync(this.filePath, JSON.stringify(initialData, null, 2));
                console.log(`📁 사용한 호텔 데이터 파일 생성 (계정별 구조): ${this.filePath}`);
            }
        } catch (error) {
            console.error('❌ 사용한 호텔 데이터 파일 생성 실패:', error);
        }
    }

    /**
     * 데이터 파일 읽기
     * @returns {Object} 호텔 데이터
     */
    loadData() {
        try {
            const data = fs.readFileSync(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ 사용한 호텔 데이터 읽기 실패:', error);
            return { version: '2.0', hotels: {}, lastCleanup: new Date().toISOString() };
        }
    }

    /**
     * 데이터 파일 저장
     * @param {Object} data 저장할 데이터
     */
    saveData(data) {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('❌ 사용한 호텔 데이터 저장 실패:', error);
        }
    }

    /**
     * 오늘 날짜 키 생성 (YYYY-MM-DD 형식)
     * @returns {string} 날짜 키
     */
    getTodayKey() {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * 날짜별로 오래된 데이터 정리 (7일 이상 된 데이터 삭제)
     */
    cleanupOldData() {
        try {
            const data = this.loadData();
            const today = new Date();
            const cutoffDate = new Date(today.getTime() - (this.maxDays * 24 * 60 * 60 * 1000));
            const cutoffKey = cutoffDate.toISOString().split('T')[0];
            
            let deletedCount = 0;
            let totalCount = 0;
            
            // 각 날짜별로 확인하여 오래된 데이터 삭제
            Object.keys(data.hotels).forEach(dateKey => {
                // 계정별 호텔 수 계산
                if (data.hotels[dateKey] && typeof data.hotels[dateKey] === 'object') {
                    Object.keys(data.hotels[dateKey]).forEach(accountId => {
                        if (Array.isArray(data.hotels[dateKey][accountId])) {
                            totalCount += data.hotels[dateKey][accountId].length;
                        }
                    });
                }
                
                if (dateKey < cutoffKey) {
                    let dayHotelCount = 0;
                    if (data.hotels[dateKey] && typeof data.hotels[dateKey] === 'object') {
                        Object.keys(data.hotels[dateKey]).forEach(accountId => {
                            if (Array.isArray(data.hotels[dateKey][accountId])) {
                                dayHotelCount += data.hotels[dateKey][accountId].length;
                            }
                        });
                    }
                    deletedCount += dayHotelCount;
                    delete data.hotels[dateKey];
                    console.log(`🗑️ ${dateKey} 날짜의 호텔 ${dayHotelCount}개 삭제`);
                }
            });
            
            data.lastCleanup = new Date().toISOString();
            this.saveData(data);
            
            console.log(`✅ 호텔 데이터 정리 완료: ${deletedCount}개 삭제, ${totalCount - deletedCount}개 보관`);
            
            return { deletedCount, remainingCount: totalCount - deletedCount };
        } catch (error) {
            console.error('❌ 호텔 데이터 정리 실패:', error);
            return { deletedCount: 0, remainingCount: 0 };
        }
    }

    /**
     * 특정 계정에서 호텔이 이미 사용되었는지 확인
     * @param {string|number} hotelId 호텔 ID
     * @param {string} accountId 계정 ID
     * @returns {boolean} 사용 여부
     */
    isHotelUsed(hotelId, accountId) {
        try {
            const data = this.loadData();
            const hotelIdStr = String(hotelId);
            
            // 모든 날짜에서 해당 계정의 호텔 ID 검색
            for (const dateKey in data.hotels) {
                if (data.hotels[dateKey] && data.hotels[dateKey][accountId]) {
                    if (data.hotels[dateKey][accountId].includes(hotelIdStr)) {
                        console.log(`🔍 호텔 ${hotelId}는 계정 ${accountId}에서 ${dateKey}에 이미 사용됨`);
                        return true;
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.error('❌ 호텔 사용 여부 확인 실패:', error);
            return false; // 에러 시 사용되지 않은 것으로 간주
        }
    }

    /**
     * 특정 계정에서 사용한 호텔 추가
     * @param {string|number} hotelId 호텔 ID
     * @param {string} accountId 계정 ID
     * @param {string} hotelName 호텔명 (로그용)
     */
    addUsedHotel(hotelId, accountId, hotelName = '') {
        try {
            const data = this.loadData();
            const todayKey = this.getTodayKey();
            const hotelIdStr = String(hotelId);
            
            // 오늘 날짜 키가 없으면 생성
            if (!data.hotels[todayKey]) {
                data.hotels[todayKey] = {};
            }
            
            // 계정별 배열이 없으면 생성
            if (!data.hotels[todayKey][accountId]) {
                data.hotels[todayKey][accountId] = [];
            }
            
            // 이미 오늘 이 계정에서 사용한 호텔인지 확인
            if (!data.hotels[todayKey][accountId].includes(hotelIdStr)) {
                data.hotels[todayKey][accountId].push(hotelIdStr);
                this.saveData(data);
                console.log(`✅ 사용한 호텔 추가: ${hotelId} (${hotelName}) - 계정: ${accountId}, 날짜: ${todayKey}`);
            } else {
                console.log(`⚠️ 호텔 ${hotelId}는 계정 ${accountId}에서 이미 오늘 사용된 호텔입니다`);
            }
            
        } catch (error) {
            console.error('❌ 사용한 호텔 추가 실패:', error);
        }
    }

    /**
     * 사용한 호텔 통계 조회
     * @returns {Object} 통계 정보
     */
    getUsageStatistics() {
        try {
            const data = this.loadData();
            const stats = {
                totalDays: Object.keys(data.hotels).length,
                totalHotels: 0,
                dailyBreakdown: {},
                accountBreakdown: {},
                oldestDate: null,
                newestDate: null
            };
            
            const dates = Object.keys(data.hotels).sort();
            if (dates.length > 0) {
                stats.oldestDate = dates[0];
                stats.newestDate = dates[dates.length - 1];
            }
            
            Object.keys(data.hotels).forEach(dateKey => {
                let dayTotal = 0;
                stats.dailyBreakdown[dateKey] = {};
                
                if (data.hotels[dateKey] && typeof data.hotels[dateKey] === 'object') {
                    Object.keys(data.hotels[dateKey]).forEach(accountId => {
                        if (Array.isArray(data.hotels[dateKey][accountId])) {
                            const accountCount = data.hotels[dateKey][accountId].length;
                            stats.dailyBreakdown[dateKey][accountId] = accountCount;
                            dayTotal += accountCount;
                            
                            // 계정별 누적
                            if (!stats.accountBreakdown[accountId]) {
                                stats.accountBreakdown[accountId] = 0;
                            }
                            stats.accountBreakdown[accountId] += accountCount;
                        }
                    });
                }
                
                stats.dailyBreakdown[dateKey].total = dayTotal;
                stats.totalHotels += dayTotal;
            });
            
            return stats;
        } catch (error) {
            console.error('❌ 호텔 사용 통계 조회 실패:', error);
            return { totalDays: 0, totalHotels: 0, dailyBreakdown: {}, accountBreakdown: {}, oldestDate: null, newestDate: null };
        }
    }

    /**
     * 자동 정리 실행 (하루에 한 번만)
     */
    autoCleanup() {
        try {
            const data = this.loadData();
            const lastCleanup = new Date(data.lastCleanup);
            const today = new Date();
            const daysSinceCleanup = Math.floor((today - lastCleanup) / (24 * 60 * 60 * 1000));
            
            if (daysSinceCleanup >= 1) {
                console.log(`🧹 호텔 데이터 자동 정리 시작 (마지막 정리: ${daysSinceCleanup}일 전)`);
                return this.cleanupOldData();
            } else {
                console.log(`⏭️ 호텔 데이터 정리 스킵 (마지막 정리: ${daysSinceCleanup}일 전)`);
                return { deletedCount: 0, remainingCount: 0 };
            }
        } catch (error) {
            console.error('❌ 호텔 데이터 자동 정리 실패:', error);
            return { deletedCount: 0, remainingCount: 0 };
        }
    }
}

module.exports = UsedHotelManager; 