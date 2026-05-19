const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🔍 Starting title element inspection (headless: false)...');
  const browser = await chromium.launch({ headless: false });
  
  // Load session
  const sessionPath = 'D:\\AI\\project\\my_days\\userData\\userData\\sessions\\neojeong003_session.json';
  let context;
  
  if (fs.existsSync(sessionPath)) {
    console.log('Loading session from:', sessionPath);
    const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    
    context = await browser.newContext();
    await context.addCookies(sessionData.cookies || []);
  } else {
    console.log('No session found, starting with empty context');
    context = await browser.newContext();
  }
  
  const page = await context.newPage();
  
  try {
    console.log('Navigating to Naver Blog write page...');
    await page.goto('https://blog.naver.com/neojeong003/postwrite', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log('Waiting for se-container...');
    await page.waitForSelector('.se-container', { timeout: 30000 });
    
    console.log('Waiting for se_iframe...');
    await page.waitForSelector('#se_iframe', { timeout: 30000 });
    
    const frame = page.frame('se_iframe');
    if (!frame) {
      throw new Error('se_iframe not found');
    }
    
    console.log('Waiting 10 seconds for iframe contents to load completely...');
    await page.waitForTimeout(10000);
    
    // Print outerHTML of anything inside the title area
    console.log('Searching for title container in iframe...');
    
    const titleHtml = await frame.evaluate(() => {
      // Find elements with classes related to title
      const titleWrapper = document.querySelector('.se-document-title, [class*="se-title-text"], .se-title-area');
      return titleWrapper ? titleWrapper.outerHTML : 'Title wrapper not found!';
    });
    
    console.log('================ TITLE HTML ================\n');
    console.log(titleHtml);
    console.log('\n===========================================');
    
  } catch (error) {
    console.error('Inspection error:', error);
  } finally {
    await browser.close();
    console.log('Inspection complete.');
  }
})();
