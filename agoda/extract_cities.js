const fs = require('fs');
const { parse } = require('csv-parse/sync');

// CSV 파일 경로와 출력 파일 매핑
const filesToProcess = [
    { csvFile: '대한민국.csv', outputFile: '대한민국.txt' },
    { csvFile: '중국.csv', outputFile: '중국.txt' }
];

// CSV 파일을 읽고 파싱하는 함수
function processFile(csvPath, outputPath) {
    try {
        console.log(`\n[시작] "${csvPath}" 파일 처리 중...`);
        
        // 파일을 동기적으로 읽기
        const content = fs.readFileSync(csvPath, 'utf8');

        // csv-parse를 사용하여 파싱
        const records = parse(content, {
            columns: true,          // 첫 줄을 헤더로 사용
            skip_empty_lines: true, // 빈 줄은 건너뛰기
            trim: true,             // 값의 앞뒤 공백 제거
            relax_column_count: true// 컬럼 수가 일정하지 않아도 유연하게 처리
        });

        if (records.length === 0) {
            console.log(`  - 내용이 없는 파일입니다.`);
            return;
        }

        // 'city'와 'city_id'를 추출하여 중복 제거
        const uniqueEntries = new Set();
        records.forEach(record => {
            const city = record['city'];
            const cityId = record['city_id'];

            if (city && cityId) {
                uniqueEntries.add(`${city}:${cityId}`);
            }
        });

        // 결과를 배열로 변환 후 정렬
        const sortedEntries = Array.from(uniqueEntries).sort();
        
        // 파일에 저장
        fs.writeFileSync(outputPath, sortedEntries.join('\n'), 'utf8');

        console.log(`  - [성공] "${outputPath}" 파일에 ${sortedEntries.length}개의 고유 항목을 저장했습니다.`);
        console.log(`  - 첫 5개 항목 미리보기:`);
        console.log(sortedEntries.slice(0, 5).map(item => `    ${item}`).join('\n'));

    } catch (error) {
        console.error(`  - [오류] "${csvPath}" 처리 중 오류 발생:`, error.message);
    }
}

// 메인 실행 함수
function main() {
    console.log("CSV 데이터 추출 및 변환 작업을 시작합니다.");

    for (const fileInfo of filesToProcess) {
        if (fs.existsSync(fileInfo.csvFile)) {
            processFile(fileInfo.csvFile, fileInfo.outputFile);
        } else {
            console.log(`\n[경고] 파일을 찾을 수 없습니다: ${fileInfo.csvFile}`);
        }
    }

    console.log("\n모든 작업이 완료되었습니다.");
}

// 스크립트 실행
main(); 