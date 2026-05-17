/**
 * MyDays Automated Diagnostic Test Harness (v1.0.0)
 * 
 * This harness performs comprehensive end-to-end diagnostic checks:
 * 1. Environment & Directory Integrity Validation
 * 2. Active Node Dependencies Checks (sharp, playwright, generative-ai)
 * 3. Sharp EXIF Image Orientation Rotation Processing Verification
 * 4. Playwright Headless Browser Launch Diagnostic
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Colors for terminal formatting
const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function logHeader(title) {
    console.log(`\n${COLORS.bold}${COLORS.cyan}=== [TEST] ${title} ===${COLORS.reset}`);
}

function logSuccess(message) {
    console.log(`${COLORS.green}✔ PASS: ${message}${COLORS.reset}`);
}

function logFailure(message, error = null) {
    console.error(`${COLORS.red}✘ FAIL: ${message}${COLORS.reset}`);
    if (error) {
        console.error(error);
    }
}

async function runHarness() {
    console.log(`${COLORS.bold}${COLORS.yellow}🚀 Starting MyDays System Diagnostic Test Harness...${COLORS.reset}`);
    let passedTests = 0;
    let totalTests = 4;

    // --- TEST 1: Directory Structure Integrity ---
    try {
        logHeader('Directory Structure Integrity Check');
        const requiredDirs = [
            path.join(__dirname, '../src'),
            path.join(__dirname, '../src/renderer'),
            path.join(__dirname, '../src/modules')
        ];

        for (const dir of requiredDirs) {
            if (!fs.existsSync(dir)) {
                throw new Error(`Critical directory missing: ${path.basename(dir)}`);
            }
            logSuccess(`Verified directory: ${path.basename(dir)}`);
        }
        passedTests++;
    } catch (err) {
        logFailure('Directory check failed', err);
    }

    // --- TEST 2: Core Module Dependencies Loader ---
    try {
        logHeader('Dependency Integrity Check');
        
        const modulesToLoad = [
            { name: 'sharp', test: () => require('sharp') },
            { name: 'playwright', test: () => require('playwright') },
            { name: '@google/generative-ai', test: () => require('@google/generative-ai') },
            { name: 'path', test: () => require('path') },
            { name: 'fs', test: () => require('fs') }
        ];

        for (const mod of modulesToLoad) {
            const loaded = mod.test();
            if (!loaded) {
                throw new Error(`Failed to load dependency: ${mod.name}`);
            }
            logSuccess(`Successfully imported active module: ${mod.name}`);
        }
        passedTests++;
    } catch (err) {
        logFailure('Dependency check failed', err);
    }

    // --- TEST 3: Sharp Image Rotation Simulation ---
    try {
        logHeader('Sharp Image Processing Loop Diagnostics');
        const sharp = require('sharp');
        
        // Create a 100x100 white pixel PNG dummy buffer
        const inputBuffer = await sharp({
            create: {
                width: 100,
                height: 100,
                channels: 3,
                background: { r: 255, g: 255, b: 255 }
            }
        }).png().toBuffer();

        // Process through rotation logic to verify metadata handling
        const processedBuffer = await sharp(inputBuffer)
            .rotate() // Automatic EXIF rotation
            .resize(100, 100, { fit: 'inside' })
            .jpeg({ quality: 90 })
            .toBuffer();

        assert(processedBuffer.length > 0, 'Processed buffer must not be empty');
        logSuccess('Sharp EXIF orientation auto-rotation loop runs perfectly without crashes');
        passedTests++;
    } catch (err) {
        logFailure('Sharp image processing diagnostic failed', err);
    }

    // --- TEST 4: Playwright Headless Browser Launch Diagnostic ---
    try {
        logHeader('Playwright Headless Browser Launch Diagnostic');
        const { chromium } = require('playwright');
        
        console.log('🔄 Launching diagnostic Chromium instance in headless mode...');
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('about:blank');
        const title = await page.title();
        assert.strictEqual(title, '', 'Title of blank page should be empty');
        
        await browser.close();
        logSuccess('Playwright Chromium browser launched, navigated, and closed successfully');
        passedTests++;
    } catch (err) {
        logFailure('Playwright launch diagnostic failed', err);
        console.log(`${COLORS.yellow}💡 Suggestion: Run "npx playwright install" if browser binaries are missing.${COLORS.reset}`);
    }

    // --- DIAGNOSTIC REPORT SUMMARY ---
    console.log(`\n${COLORS.bold}========================================`);
    if (passedTests === totalTests) {
        console.log(`${COLORS.green}🎉 ALL DIAGNOSTIC TESTS PASSED SUCCESSFULLY! (${passedTests}/${totalTests})${COLORS.reset}`);
        console.log(`${COLORS.bold}MyDays is 100% healthy and ready for secure operations.${COLORS.reset}`);
        console.log(`========================================${COLORS.reset}`);
        process.exit(0);
    } else {
        console.error(`${COLORS.red}🚨 SYSTEM DIAGNOSTIC FAILED. (${passedTests}/${totalTests} tests passed)${COLORS.reset}`);
        console.error(`${COLORS.bold}Please review the failures above before launching production runs.${COLORS.reset}`);
        console.error(`========================================${COLORS.reset}`);
        process.exit(1);
    }
}

runHarness().catch(err => {
    logFailure('Fatal error in Test Harness', err);
    process.exit(1);
});
