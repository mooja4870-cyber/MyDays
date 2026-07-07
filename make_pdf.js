const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('🚀 Playwright를 활용한 PDF 빌드 작업을 시작합니다...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const htmlPath = 'file://' + path.resolve('/Users/l/.gemini/antigravity-ide/brain/d79f5186-a42c-437d-b88a-e4723be59306/document_template.html');
  console.log(`📂 HTML 템플릿 경로: ${htmlPath}`);
  
  await page.goto(htmlPath, { waitUntil: 'networkidle' });
  
  const pdfPath = path.resolve('/Users/l/project/my_days/정책의견서_비아파트_양도세_차별시정.pdf');
  
  console.log('🖨️ PDF 변환 중...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true
  });
  
  console.log(`✅ PDF 생성이 완료되었습니다! 저장 위치: ${pdfPath}`);
  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error('❌ PDF 생성 중 오류 발생:', err);
  process.exit(1);
});
