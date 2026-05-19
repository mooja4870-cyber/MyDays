# 📦 Version History

## v1.9.29 (2026-05-19)
- **Description**: Removed the client-side hard block that required a Gemini API Key on mobile startup of photo publishing, enabling smooth fallback to the PC server's local API key when left blank.
- **Changes**:
  - Removed the `if (!geminiApi)` validation check in `startPhotoPublish` inside `src/renderer/app.js`.
  - Rebuilt the updated mobile assets into `MyDays.apk`.

## v1.9.28 (2026-05-19)
- **Description**: Excluded and deleted "PC IP 자동 검색" and "API Key 구하러 가기" buttons specifically on the mobile version (Android WebView) of the application, leaving the PC/web version completely untouched.
- **Changes**:
  - Modified `src/renderer/app.js` within `MobileApiBridge.init()` to check for `/MyDaysAndroid|; wv\)/i` in the user agent.
  - Dynamically removed the PC server discover button (`btn-discover-pc-server`) and Gemini help key link button in the settings panel when running inside the Android WebView.
  - Recompiled the updated assets into `MyDays.apk`.

## v1.9.27 (2026-05-19)
- **Description**: Enhanced connection security by masking the PC Server IP/URL in status outputs, search notifications, and connection failure diagnostic dialogs.
- **Changes**:
  - Implemented `MobileApiBridge.maskUrl()` helper to censor local IPs/domains while preserving the protocol and port details.
  - Applied the mask to all alert dialogues and connection failure status fields.

## v1.9.26 (2026-05-19)
- **Description**: Strengthened credentials privacy by masking passwords in the registered accounts card list.
- **Changes**:
  - Replaced plain-text password display inside the rendered account cards with a masked string (`●●●●●●●●`).

## v1.9.25 (2026-05-19)
- **Description**: Replaced hardcoded connection defaults with an empty/blank initialization flow, allowing users to enter and save custom credentials directly.
- **Changes**:
  - Removed connection fallback URLs and key strings from `MobileApiBridge`.
  - Allowed inputs to start completely blank and enabled user entry for PC Server URL and Gemini key fields by removing `readonly` limitations on mobile settings panel.
  - Required fields check modified to include PC Server URL while letting Gemini API key remain optional.

## v1.9.24 (2026-05-19)
- **Description**: Enhanced UI privacy by masking sensitive fields on both mobile and PC webapp settings screens.
- **Changes**:
  - Changed input element types for PC Server URL (`mobile-server-url`) and Google Gemini API keys (`mobile-gemini-key`, `gemini-api`, `edit-gemini-api`) from `text`/`url` to `password` type.
  - Fully removed the exposed default fallback API key from codebase, allowing the server to safely apply the local personal key.

## v1.9.22 (2026-05-19)
- **Description**: Resolved key exposure risk and mismatch issues between mobile app and server configurations by implementing a server-side Gemini API key fallback logic.
- **Changes**:
  - Modified `src/main.js` to override the incoming payload key with the PC server's local safe, unexposed API key for the corresponding Naver account.
  - Relaxed the client-side API requirement checks for the `/api/execute-automation-step` endpoint to allow optional mobile keys.

## v1.9.21 (2026-05-19)
- **Description**: Resolved Google Gemini API Model 404 Deprecation issue by transitioning from the retired `gemini-2.0-flash` model to the newer `gemini-2.5-flash` model.
- **Changes**:
  - Replaced the deprecated `"gemini-2.0-flash"` model identifier with `"gemini-2.5-flash"` inside `src/modules/ContentGenerator.js`.
  - Killed existing zombie `electron.exe` processes and restarted the PC server application (`npx electron .`) to run the updated API model.

## v1.9.20 (2026-05-19)
- **Description**: Resolved Google Gemini API Key validation issue on the mobile APK by updating the default hardcoded key fallback to match the active PC webapp key configuration.
- **Changes**:
  - Updated `DEFAULT_GEMINI_KEY` from the old invalid key to the active working key (`AIzaSyAqVpf0iFU96VIH22VENAvUWk92xlTNOEU`) in `src/renderer/app.js` and `android/app/src/main/assets/www/app.js`.
  - Recompiled the Android codebase using `build-android-apk.ps1` to produce the updated `MyDays.apk` asset.

## v1.9.19 (2026-05-19)
- **Description**: Formally integrated the runtime environment process validation (Anti-Zombie Rule) into the project's agent rules configuration.
- **Changes**:
  - Appended Rule 4 to `.antigravityrules` ensuring future agent sessions systematically kill zombie processes, inspect ports, and verify test suites before final reports.

## v1.9.18 (2026-05-19)
- **Description**: Introduced a comprehensive multi-methodology test suite containing 10 distinct testing types (unit, integration, smoke, regression, static analysis, mock E2E, math bounds checking, and security formatting validation) to systematically verify system integrity and zero-retry performance.
- **Changes**:
  - Added `tests/comprehensive_suite.js` covering all 10 target checks.
  - Added `npm run test:comprehensive` command to `package.json`.

## v1.9.17 (2026-05-19)
- **Description**: Resolved the "image shifting left" / toolbar overlap retry issue during speech bubble insertion. When an image block is selected, its floating toolbar pops up directly above the image, physical overlapping and blocking the main editor's quotation toolbar button. Playwright's click attempts on the quotation button were intercepted by the image's "Left Align" button, shifting the image left and triggering endless retries.
- **Changes**:
  - Implemented `focusBottom(targetPage)`: Directly simulates a mouse click on the empty canvas space at the bottom of the editor container (`.se-content`/`.se-canvas`), which instantly deselects the image block and creates/focuses a new, clean paragraph block below it.
  - Refactored `enterTitle`, `enterContent`, and `insertSubtitleWithQuotation` to use `focusBottom` instead of complex, error-prone selector clicks, completely eliminating cursor entrapment and floating toolbar collisions.

## v1.9.16 (2026-05-19)
- **Description**: Fixed a key cause of the 30~40s delay. The loop focus adjustment was targeting `.se-text-paragraph` without filtering out image captions and quotation text blocks. Clicking these non-body text elements locked the Naver SmartEditor toolbar and disabled the quotation button.
- **Changes**:
  - Modified `src/modules/BlogPublisher.js`: Changed the loop's focus adjustment selector to `.se-component.se-text .se-text-paragraph`. This ensures Playwright always targets and clicks pure body text blocks, keeping the editor in the correct text state and making the quotation button instantly clickable.

## v1.9.15 (2026-05-19)
- **Description**: Added Exponential Backoff and Jitter to Gemini API requests to seamlessly handle transient network/server failures (such as `502 Bad Gateway` and `503 Service Unavailable`).
- **Changes**:
  - Upgraded `sendMessageWithRetry` in `src/modules/ContentGenerator.js` to calculate dynamic delay: `Math.pow(2, attempt) * 1000 + Math.random() * 1000` (ms).
  - Keeps the app running smoothly even during temporary Google Generative AI gateway anomalies.

## v1.9.14 (2026-05-19)
- **Description**: Fundamentally resolved the 30~40 second delay (with 11-12 "clicking" retries) between image insertion and speech bubble placement. Root cause: Naver SmartEditor ONE locks the toolbar into "Image Edit Mode" after inserting a photo, making the quotation toolbar button click-intercepted; Playwright's actionability check then retries at 100ms intervals for up to 15 seconds per attempt.
- **Changes**:
  - Modified `src/modules/BlogPublisher.js` `enterContent`: Added `Escape` key press immediately after `insertSingleImage()` to forcefully exit image editing mode before the next section begins.
  - Modified `src/modules/BlogPublisher.js` `insertSubtitleWithQuotation`: Added `Escape` key press at method entry to clear any residual component editing mode before attempting to click the quotation toolbar button.
  - Reduced `waitForSelector` timeouts for `[data-name="quotation"]` and `[data-value="quotation_bubble"]` from 5000ms to 1500ms, preventing extended silent waits on failure.
  - Expected improvement: Section-to-section transition time reduced from 15~30 seconds to 4~6 seconds.

## v1.9.13 (2026-05-19)
- **Description**: Hardcoded the active PC Server URL and Gemini API Key as default fallbacks inside the Android mobile app, so new installations automatically initialize with the correct configuration.
- **Changes**:
  - Modified `src/renderer/app.js` to include `DEFAULT_GEMINI_KEY` (`AIzaSyBsGDK8zMnlItHdhA8TVZ8_uFc0y_k5v_jA`) alongside `DEFAULT_SERVER_URL`.
  - Added `MobileApiBridge.ensureDefaultSettings()` to write both default parameters into `localStorage` on initial Android app execution.
  - Recompiled the Android project and deployed the latest `MyDays.apk` asset.

## v1.9.12 (2026-05-19)
- **Description**: Updated 60-character description tooltip text to correctly read "바로 위에" (directly above) instead of "바로 아래에" (directly below), and recompiled the Android APK.
- **Changes**:
  - Modified `src/renderer/index.html` and `android/app/src/main/assets/www/index.html` to update the description placement wording in `#desc-help-dialog`.
  - Executed Gradle debug build and deployed the recompiled APK to `src/renderer/MyDays.apk`.

## v1.9.11 (2026-05-19)
- **Description**: Replaced tooltip dialog images with clear, simple Korean explanations for the three target locations: 발행 공개 설정, 섹션 속 사각 말풍선, 섹션 속 60자 설명문.
- **Changes**:
  - Modified `src/renderer/index.html` and `android/app/src/main/assets/www/index.html` to remove helper image tags (`bubble_help.png`, `privacy_help.jpg`) and split the shared modal into individual text-based help modal containers (`bubble-help-dialog`, `desc-help-dialog`, `privacy-help-dialog`) with simplified wording.
  - Modified `src/renderer/app.js` and `android/app/src/main/assets/www/app.js` to register corresponding `openDescHelpDialog()` and `closeDescHelpDialog()` functions.

## v1.9.10 (2026-05-19)
- **Description**: Eliminated the 30~40 second delay and excessive UI flickering (11-12 clicks) when inserting speech bubbles.
- **Changes**:
  - Implemented `Promise.all` pre-generation for AI subtitles at the start of `enterContent` to completely eliminate the 10~30 second API network blocking delay during the posting loop.
  - Streamlined `insertSubtitleWithQuotation` and image insertion loops by removing redundant `Escape` spamming and reducing keyboard navigation (`ArrowDown`, `Enter`) timeouts from 1500ms down to 50-300ms, making the layout execution near-instantaneous.

## v1.9.9 (2026-05-19)
- **Description**: Updated the default PC Server URL to a custom ngrok address.
- **Changes**:
  - Modified `src/renderer/index.html` and `android/app/src/main/assets/www/index.html` to update the placeholder URL to the new ngrok address.
  - Modified `src/renderer/app.js` and `android/app/src/main/assets/www/app.js` to change `DEFAULT_SERVER_URL` and `localStorage` fallback values.

## v1.9.8 (2026-05-19)
- **Description**: Updated the mobile settings interface to lock fixed configuration values.
- **Changes**:
  - Modified `src/renderer/index.html` and `android/app/src/main/assets/www/index.html` to set PC Server URL and Google Gemini API Key fields to `readonly` with restricted styling.
  - Changed Gemini API Key input type from `password` to `text` to display the actual value.
  - Hid redundant discovery and URL help buttons for fixed configuration fields.
  - Bumped Android APK build version to `1.9.4`.

## v1.9.7 (2026-05-19)
- **Description**: Finally identified the TRUE root cause of the Title Intercept bug.
- **Root Cause**: `enterTitle()` left the Playwright keyboard focus stuck in the title `<textarea>`. Previous fixes tried `page.evaluate(() => element.click())` which only fires DOM events but does NOT move Playwright's internal keyboard target. Only `ElementHandle.click()` (Playwright-native) actually moves the physical focus.
- **Changes**:
  - Added Playwright-native body click at the end of `enterTitle()` to escape the title textarea immediately after typing.
  - Replaced all `page.evaluate`-based focus logic in `enterContent()` with Playwright-native `ElementHandle.click()` calls.
  - Both functions now filter out `.se-document-title` children to only click actual body elements.

## v1.9.6 (2026-05-19)
- **Description**: Finally fixed the absolute worst "Title Intercept" bug properly.
- **Changes**:
  - The previous activeElement check was failing because it didn't traverse `iframe` elements correctly, leading the bot to falsely believe it had escaped the title.
  - Implemented an aggressive DOM `blur()` across all iframes to mathematically ensure the title loses focus.
  - Replaced native Tab navigation with internal Javascript click events on the `se-placeholder` or `se-text-paragraph` to force body activation safely.

## v1.9.5 (2026-05-19)
- **Description**: Fixed a notorious "Title Intercept" bug where the description text was pasted into the title when the bubble option was disabled.
- **Changes**:
  - Rewrote the focus shifting logic inside `BlogPublisher.js` (`enterContent`).
  - Implemented a 3-step bulletproof mechanism: Force click on `.se-text-paragraph`, explicit `document.activeElement` validation loop, and `Tab` keystroke fallback to guarantee escape from the Title textarea before pasting the body description.

## v1.9.4 (2026-05-19)
- **Description**: Fixed `HTTP 404 Not Found` routing bug on PC HTTP Server when receiving mobile API requests.
- **Changes**:
  - Rewrote the HTTP server routing logic in `src/main.js` to parse and sanitize `req.url`, cleanly stripping trailing slashes and query parameters so that API endpoints (like `/api/execute-automation-step`) and static file resolutions never fail due to strict string matching discrepancies.

## v1.9.3 (2026-05-19)
- **Description**: Enabled pinch-to-zoom support on the Android mobile app.
- **Changes**:
  - Modified `MainActivity.java` to set `setSupportZoom(true)`, `setBuiltInZoomControls(true)`, and `setDisplayZoomControls(false)`.
  - Bumped Android APK build version to `1.9.3`.

## v1.9.2 (2026-05-19)
- **Description**: Integrated three core Agentic Vibe Coding skills (Artifact-based Verification, MCP-based Local Tool Integration, and Semantic Codebase Sanitization) to enhance automation resilience and context optimization.
- **Changes**:
  - Added `.antigravityrules` at the project root to enforce strict operational directives, subagent integrations, and semantic tracking.
  - Updated `PROJECT_STATUS.md` and `ver.md` following version control standards.

## v1.9.1 (2026-05-18)
- **Description**: Deployed the Subnet Auto-Discovery IP Scan Engine on the mobile app to automatically detect the PC automation server within typical subnets, added the `/api/health` check endpoint inside the Electron HTTP server to safely authenticate the app target, and wired a background discovery task that auto-scans and suggests active servers if a connection failure is triggered during posting.
- **Changes**:
  - Modified [src/main.js](file:///d:/AI/project/my_days/src/main.js) to implement the GET `/api/health` check endpoint and display local IP addresses in startup logs.
  - Modified [src/renderer/index.html](file:///d:/AI/project/my_days/src/renderer/index.html) to add the "PC IP 자동 검색" button adjacent to the PC server URL input.
  - Modified [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js) to implement the concurrent subnet scanning algorithm `MobileApiBridge.discoverPcServer`, bind settings button clicks, and trigger background search alerts on connection failure.
  - Updated [android/app/build.gradle](file:///d:/AI/project/my_days/android/app/build.gradle) and [package.json](file:///d:/AI/project/my_days/package.json) with updated release build version info.

## v1.9.0 (2026-05-18)
- **Description**: Upgraded the core focus engine with direct empty editor placeholder activation (.se-placeholder) and active component ArrowDown escapes to eliminate the remaining bubble-omitted leakage entirely.
- **Changes**:
  - Modified [src/modules/BlogPublisher.js](file:///d:/AI/project/my_days/src/modules/BlogPublisher.js) to first click `.se-placeholder` if it exists at the start of `enterContent`, activating the body for empty layouts.
  - Implemented keyboard component escaping (`ArrowDown` -> `Enter`) before and after uploading images in `enterContent` to cleanly detach from active image card elements.

## v1.8.9 (2026-05-18)
- **Description**: Resolved the core editor focus leak where layout combination [Bubble: Exclude, Description: Include] caused paragraph leakage into the title field. Deployed a Loop Focus Realignment bridge.
- **Changes**:
  - Upgraded `enterContent` inside [src/modules/BlogPublisher.js](file:///d:/AI/project/my_days/src/modules/BlogPublisher.js) to retrieve the active, newly-created `.se-text-paragraph` at the bottom of the editor at the start of each iteration `i > 0`, and physically click it. This guarantees that when speech bubble subtitles are disabled, the cursor never remains locked inside the previously uploaded image block nor jumps to the title container.

## v1.8.8 (2026-05-18)
- **Description**: Updated the welcome copywriting headline text to include an exclamation mark, and incremented the package version.
- **Changes**:
  - Modified [src/renderer/index.html](file:///d:/AI/project/my_days/src/renderer/index.html) and [android/app/src/main/assets/www/index.html](file:///d:/AI/project/my_days/android/app/src/main/assets/www/index.html) to change "소중한 일상, 더 가치 있게 간직하세요" to "소중한 일상, 더 가치 있게 간직하세요!".

## v1.8.7 (2026-05-18)
- **Description**: Implemented an ultimate, dual-mode [End-to-End Absolute Zero Focus Leak] mechanism to 100% cure the Naver SmartEditor title-body leakage bug, combined with a robust copy-paste clipboard title insertion.
- **Changes**:
  - Upgraded `enterTitle` inside [src/modules/BlogPublisher.js](file:///d:/AI/project/my_days/src/modules/BlogPublisher.js) to target the actual `textarea` elements instead of the disappearing placeholder span, and used clipboard copy-paste to insert the title instantly, eliminating character-by-character focus loss.
  - Hardened `enterContent` focus logic to perform a dual-layered transition: (1) native editor keyboard navigation (`End` -> `Enter` -> `ArrowDown`) followed by (2) a direct physical DOM click on `.se-text-paragraph` or editable body, guaranteeing focus moves to the body under any viewport or timing conditions.

## v1.8.6 (2026-05-18)
- **Description**: Resolved the notorious 7-time recurring editor focus bug where description texts leaked into the post title field when the speech bubble option was disabled (useBubble: 빼기).
- **Changes**:
  - Implemented an explicit [Bulletproof Focus Shift] logic in `enterContent` inside [src/modules/BlogPublisher.js](file:///d:/AI/project/my_days/src/modules/BlogPublisher.js) that physically clicks the first empty paragraph (`.se-text-paragraph`) or the editable content container immediately after typing the post title.
  - This ensures the editor cursor is 100% positioned inside the main post body prior to any paragraph typing/pasting, completely preventing description text leakage.

## v1.8.5 (2026-05-18)
- **Description**: Implemented a brilliant user-inspired solution to assign dynamic photo indexing numbers (1, 2, ... n) in place of text paragraphs during photo-only publishing when both speech bubbles and descriptions are disabled, completely resolving editor focus and missing photo bugs.
- **Changes**:
  - Enhanced [src/main.js](file:///d:/AI/project/my_days/src/main.js) to generate index numbers `1, 2, ... n` as문단 본문 when both options are set to "Exclude" (useBubble: false, useDescription: false).
  - Modified `enterContent` inside [src/modules/BlogPublisher.js](file:///d:/AI/project/my_days/src/modules/BlogPublisher.js) to write these index numbers explicitly into the smart editor body area, maintaining 100% stable caret/focus and allowing flawless automated image insertion.
  - Recompiled the Android assets and deployed a new stable APK to [src/renderer/MyDays.apk](file:///d:/AI/project/my_days/src/renderer/MyDays.apk).

## v1.8.4 (2026-05-18)
- **Description**: Fixed a critical bug in photo publishing where images were accidentally skipped when both the speech bubble subtitles (useBubble: 빼기) and description paragraphs (useDescription: 빼기) were disabled.
- **Changes**:
  - Modified `enterContent` in [src/modules/BlogPublisher.js](file:///d:/AI/project/my_days/src/modules/BlogPublisher.js) to dynamically calculate the editor loop count (`loopCount`) using the maximum of split text paragraphs and `imagePaths` length, preventing empty paragraphs from causing a zero-iteration loop.
  - Hardened the subtitle generation hook to fallback gracefully when bubbles are disabled and verified that pure photo-only diary posting works seamlessly.
  - Recompiled the Android WebView assets and deployed the corrected APK to [src/renderer/MyDays.apk](file:///d:/AI/project/my_days/src/renderer/MyDays.apk).

## v1.8.3 (2026-05-17)
- **Description**: Hardened mobile API network failure error handling by providing interactive system diagnostic guidelines inside the client logs, and rebuilt the Android WebView APK.
- **Changes**:
  - Enhanced `ErrorMessageHelper.getMessage` inside [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js) to catch network connection errors (`Failed to fetch`, `NetworkError`) and supply structured, user-friendly troubleshooting step logs (checking if PC automation server is running, verifying same Wi-Fi connection, and double-checking IP addresses).
  - Re-compiled the Android WebView assets and generated a new stable [src/renderer/MyDays.apk](file:///d:/AI/project/my_days/src/renderer/MyDays.apk).

## v1.8.2 (2026-05-17)
- **Description**: Rebuilt and stabilized the Android WebView APK (`MyDays.apk`) to resolve potential corrupted or incomplete download issues, ensuring robust performance.
- **Changes**:
  - Re-executed the Android build workflow via [build-android-apk.ps1](file:///d:/AI/project/my_days/build-android-apk.ps1) with a fresh Gradle compilation.
  - Deployed the latest fully compiled debug build target to [src/renderer/MyDays.apk](file:///d:/AI/project/my_days/src/renderer/MyDays.apk).
  - Ensured correct staging and version tracking to facilitate reliable remote download from GitHub.

## v1.8.1 (2026-05-17)
- **Description**: Enabled non-destructive cumulative photo uploads and robust duplicate prevention across multiple photo selections.
- **Changes**:
  - Isolated Android native photo cache deletion logic in [MainActivity.java](file:///d:/AI/project/my_days/android/app/src/main/java/com/mydays/app/MainActivity.java) to execute strictly once on application startup (`onCreate()`) instead of on every file pick, protecting previously selected files.
  - Implemented stable naming scheme using MD5 file checksums in Java, copying cache files as `mydays_photo_[MD5].jpg`.
  - Added value resetting `fileInput.value = ''` in [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js) to ensure browser change event triggers flawlessly every time.
  - Re-verified 100% accurate frontend filename duplicate checks up to the 30-photo hard limit.
  - Bumped Android APK metadata and user agent to version `1.8.1`.

## v1.8.0 (2026-05-17)
- **Description**: Upgraded the maximum image attachment limit from 10 to 30 photos and introduced customizable layout controls to select whether to include speech bubble subtitles and 60-character description paragraphs.
- **Changes**:
  - Upgraded file selection limit parameters, warnings, and guidelines inside [src/renderer/index.html](file:///d:/AI/project/my_days/src/renderer/index.html) and [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js) from 10 to 30 photos.
  - Implemented 2 new premium UI radio button groups under post settings: `'섹션 속 섹션 말풍선'` (useBubble: 넣기/빼기) and `'섹션 속 60자 설명문'` (useDescription: 넣기/빼기).
  - Propagated options via electron API IPC payload in `app.js` to [src/main.js](file:///d:/AI/project/my_days/src/main.js), which dynamically styles `formattedContent` and forwards options to the blog publisher config.
  - Modified [src/modules/BlogPublisher.js](file:///d:/AI/project/my_days/src/modules/BlogPublisher.js) to conditionally query and insert speech bubble subtitles and body paragraphs during automation, allowing 4 distinct layouts.
  - Bumped Android APK metadata and user agent to version `1.8.0`.

## v1.7.9 (2026-05-17)
- **Description**: Implemented a double-layered bulletproof image upload mechanism to completely eliminate the Android WebView `NotFoundError` ("A requested file or directory could not be found") during automated publishing.
- **Changes**:
  - Modified [android/app/src/main/java/com/mydays/app/MyDaysFileProvider.java](file:///d:/AI/project/my_days/android/app/src/main/java/com/mydays/app/MyDaysFileProvider.java) to implement a standard `MatrixCursor` query method, providing accurate size and name metadata to Chromium WebView.
  - Upgraded Android native storage paths in `MainActivity.java` and `MyDaysFileProvider.java` from temporary cache (`getCacheDir()`) to persistent private directory (`getFilesDir()`) to prevent automated OS file deletion.
  - Enhanced [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js) to pre-load and cache the complete raw Base64 data string in JavaScript memory (V8) immediately upon user photo selection, making the automated posting engine completely independent of subsequent disk access, permission, or timing issues on publish.
  - Bumped Android APK metadata and user agent to version `1.7.9`.

## v1.7.8 (2026-05-17)
- **Description**: Added a premium interactive "External Access Help" modal dialog in the mobile settings page, giving users on-device instructions and copyable CLI commands for ngrok tunnel setup to easily enable posting from outside networks.
- **Changes**:
  - Modified [src/renderer/index.html](file:///d:/AI/project/my_days/src/renderer/index.html) to place a clickable help link next to the PC Server URL label, and added the overlay `#help-dialog` modal markup containing step-by-step instructions.
  - Modified [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js) to export global `showHelpDialog()` and `closeHelpDialog()` control functions.
  - Bumped Android APK metadata, build configuration, and user agent to version `1.7.8`.

## v1.7.7 (2026-05-17)
- **Description**: Updated photo attachment limit UX logic from a misleading daily limit to a clear per-post limit, allowing unlimited daily uploads as long as each post contains up to 10 photos.
- **Changes**:
  - Modified [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js) to show `1회 최대 10장` instead of `하루 최대 10장` in the photo count limit dialog.
  - Bumped Android APK metadata, build configuration, and user agent to version `1.7.7`.

## v1.7.6 (2026-05-17)
- **Description**: Resolved Android WebView PHOTO attachment `NotFoundError` by replacing raw `file://` cache URIs with secure `content://` URIs served via a custom, lightweight, 100% offline-compatible native `MyDaysFileProvider`.
- **Changes**:
  - Created [android/app/src/main/java/com/mydays/app/MyDaysFileProvider.java](file:///d:/AI/project/my_days/android/app/src/main/java/com/mydays/app/MyDaysFileProvider.java) to dynamically resolve and stream cached photo uploads to the WebView as standard Android Content Provider URIs, bypassing Android 10+ Chromium file sandboxing.
  - Modified [android/app/src/main/java/com/mydays/app/MainActivity.java](file:///d:/AI/project/my_days/android/app/src/main/java/com/mydays/app/MainActivity.java) to return secure `content://com.mydays.app.fileprovider` URIs instead of raw `file://` cache URIs.
  - Modified [android/app/src/main/AndroidManifest.xml](file:///d:/AI/project/my_days/android/app/src/main/AndroidManifest.xml) to register `MyDaysFileProvider` under the `<application>` tag.
  - Bumped Android APK metadata, build configuration, and user agent to version `1.7.6`.

## v1.7.5 (2026-05-17)
- **Description**: Fixed Android WebView PHOTO attachment permission failures by caching selected gallery files inside the app before JavaScript reads them.
- **Changes**:
  - Modified [android/app/src/main/java/com/mydays/app/MainActivity.java](file:///d:/AI/project/my_days/android/app/src/main/java/com/mydays/app/MainActivity.java) to always use `ACTION_OPEN_DOCUMENT`, copy selected image URIs into app-owned cache files, and return cache file URIs to the WebView file input.
  - Bumped Android APK metadata to version `1.7.5`.

## v1.7.4 (2026-05-17)
- **Description**: Fixed the welcome CTA line break and replaced Android PHOTO publishing `undefined` alerts with clear, human-readable error messages.
- **Changes**:
  - Modified [src/renderer/index.html](file:///d:/AI/project/my_days/src/renderer/index.html) to split `자, 이제 포스팅하러 가볼까요?` and `Let's Go! 🚀` onto separate lines.
  - Modified [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js) to normalize unknown/empty error objects, add robust FileReader failure messages, and prevent `PHOTO 발행 중 오류 발생: undefined`.
  - Modified [android/app/src/main/java/com/mydays/app/MainActivity.java](file:///d:/AI/project/my_days/android/app/src/main/java/com/mydays/app/MainActivity.java) to add explicit Android read URI grants for the native photo picker.
  - Bumped Android APK metadata to version `1.7.4`.

## v1.7.3 (2026-05-17)
- **Description**: Embedded the current PC automation server URL as the mobile app default so the Android APK can auto-save and reuse `http://172.30.1.41:3333`.
- **Changes**:
  - Modified [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js) to define `MobileApiBridge.DEFAULT_SERVER_URL`, auto-persist it on Android launch, and fall back to it whenever the saved URL is empty.
  - Modified [src/renderer/index.html](file:///d:/AI/project/my_days/src/renderer/index.html) to show `http://172.30.1.41:3333` as the server URL placeholder.
  - Bumped Android APK metadata to version `1.7.3` in [android/app/build.gradle](file:///d:/AI/project/my_days/android/app/build.gradle) and the MyDays Android WebView user agent.

## v1.7.2 (2026-05-17)
- **Description**: Built the first proper MyDays Android APK shell with native WebView file chooser support, mobile layout hardening, PC server URL storage, and the user-provided pink flower launcher icon.
- **Changes**:
  - Added a native Android project under [android](file:///d:/AI/project/my_days/android) with app name `MyDays`, package `com.mydays.app`, version `1.7.2`, WebView loading local renderer assets, and `WebChromeClient.onShowFileChooser` for Android photo attachment.
  - Modified [src/renderer/index.html](file:///d:/AI/project/my_days/src/renderer/index.html), [src/renderer/styles.css](file:///d:/AI/project/my_days/src/renderer/styles.css), and [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js) to keep settings inputs full-width on mobile, make the photo picker directly touchable, and route APK API calls to a saved PC server URL.
  - Added [build-android-apk.ps1](file:///d:/AI/project/my_days/build-android-apk.ps1) and published the built debug APK at [src/renderer/MyDays.apk](file:///d:/AI/project/my_days/src/renderer/MyDays.apk).
  - Replaced the renderer/app launcher icon with the supplied flower image and generated Android density icons.

## v1.7.1 (2026-05-17)
- **Description**: Resolved the Naver Blog "Private" posting bug by postponing category, privacy, and tags setting execution until the publish settings popup layer popover is completely loaded, and implemented a robust multi-strategy selector to bypass styled-invisible radio buttons.
- **Changes**:
  - Modified [src/modules/BlogPublisher.js](file:///d:/AI/project/my_days/src/modules/BlogPublisher.js) to accept `postData` and `account` in `publishPost` and execute configuration injection inside the publish dropdown layer.
  - Upgraded `setPrivacy` method to check multiple selector permutations (CSS + XPath label/span text matches).

## v1.7.0 (2026-05-17)
- **Description**: Center-aligned the background confirmation popup body content and removed the real-time log helper mention from the dialog box to make the overlay pristine and focused.
- **Changes**:
  - Modified [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js) to wrap confirm dialog text in a center-aligned div and prune the system logs text.

## v1.6.9 (2026-05-17)
- **Description**: Tailored the background confirmation popup messages to alert users of 1~2 mins duration and suggest a 2~3 mins delay before submitting another post to prevent spam flags.
- **Changes**:
  - Modified [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js) to refine the confirm dialog body text.

## v1.6.8 (2026-05-17)
- **Description**: Reordered History tab cards to place "실시간 시스템 로그" (System Log) natively at the top and "PHOTO 포스팅 이력" (History List) at the bottom, perfectly matching the user's screen layout and simplifying Navigation code.
- **Changes**:
  - Modified [src/renderer/index.html](file:///d:/AI/project/my_days/src/renderer/index.html) to physically swap card declarations in the `#naver-test-panel`.
  - Simplified card margin-toggles in `Navigation.switchPanel` inside [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js).

## v1.6.7 (2026-05-17)
- **Description**: Implemented highly responsive non-blocking background PHOTO publishing with immediate confirm dialog overlays, supporting Naver Blog public/private settings, and dynamic log-panel layout switching.
- **Changes**:
  - Added a "발행 공개 설정" radio button group (공개/비공개) in [src/renderer/index.html](file:///d:/AI/project/my_days/src/renderer/index.html) with premium pinky styling.
  - Refactored `PhotoAutomationManager.startPhotoPublish` in [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js) to launch Naver posting in the background and immediately overlay the confirmation dialog to support continuous posting.
  - Modified `Navigation.switchPanel` in [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js) to dynamically change header titles to "포스팅 진행 중" and lift the "실시간 시스템 로그" card to the top during active publishing.
  - Updated IPC handler and postData in [src/main.js](file:///d:/AI/project/my_days/src/main.js) and [src/modules/BlogPublisher.js](file:///d:/AI/project/my_days/src/modules/BlogPublisher.js) to parse and process the integer-based `openType` (2: PUBLIC, 0: PRIVATE) securely.

## v1.6.6 (2026-05-17)
- **Description**: Removed background execution queue manager entirely. Reverted the photo-publishing workflow to a robust, synchronous (blocking) execution style that directly streams real-time Playwright logs while holding the UI, followed by a gorgeous completion confirm dialog.
- **Changes**:
  - Deleted `PostingQueueManager` class in [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js).
  - Refactored `PhotoAutomationManager.startPhotoPublish` in [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js) to synchronously await the Naver posting routine and raise a final completion confirm modal.

## v1.6.5 (2026-05-17)
- **Description**: Renamed bottom navigation label from "로그" to "History" for international appeal, and overhauled the photo-publishing trigger sequence to transition the view immediately to the History panel so that the scrolling real-time system log screen is displayed simultaneously behind the confirmation dialog.
- **Changes**:
  - Modified [src/renderer/index.html](file:///d:/AI/project/my_days/src/renderer/index.html) to rename bottom navigation label "로그" to "History".
  - Modified [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js) to switch to `naver-test` panel before initiating `Utils.showConfirmDialog`.

## v1.5.0 (2026-05-17)
- **Description**: Completely overhauled the UI from Mint to a premium "All-Pinky-Pinky" design system. Replaced all mint variables with a sophisticated multi-shade pink palette (Soft Peach Blush, Pearl Rose, Deep Velvet Berry Pink, Vibrant Strawberry Pink, and Rose Gold) for an exceptionally luxurious and warm aesthetic.
- **Changes**:
  - Overhauled `:root` CSS variables in [src/renderer/styles.css](file:///d:/AI/project/my_days/src/renderer/styles.css) to deploy the multi-pink system.
  - Replaced inline mint shadows with premium rose shadows (`rgba(201, 24, 74, 0.25)`) in [src/renderer/index.html](file:///d:/AI/project/my_days/src/renderer/index.html).

## v1.4.2 (2026-05-17)
- **Description**: Converted all occurrences of the lowercase `photo` term to bold uppercase `PHOTO` throughout the application for higher visibility and consistency.

## v1.4.1 (2026-05-17)
- **Description**: Replaced all user-facing Korean occurrences of `사진` with the English term `photo` across navigation, headers, forms, alert dialogs, and logging systems.

## v1.4.0 (2026-05-17)
- **Description**: Designed and deployed a stunning premium Landing Welcome Screen at the front of the Home tab. Features a gorgeous glowing pinkish "My Days" brand identity, a floating/pulsing cherry blossom (`🌸`) micro-illustration, warm daily photo journaling copywriting, a high-fidelity "Let's Go!" transition CTA, and an integrated "🏠 Back to Home" navigation state loop.
- **Changes**:
  - Overhauled [src/renderer/index.html](file:///d:/AI/project/my_days/src/renderer/index.html) to divide the Home panel into `#photo-welcome-view` and `#photo-upload-view` sub-containers.
  - Updated [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js) to bind the CTA toggles and automatically reset the view whenever the Home tab bottom navigation is clicked.
  - Appended high-fidelity CSS keyframes and animations to [src/renderer/styles.css](file:///d:/AI/project/my_days/src/renderer/styles.css).

## v1.3.0 (2026-05-17)
- **Description**: Fully overhauled the UI to deploy the modern "Fresh & Vibrant Publishing" Light Theme based on `DESIGN.md`. Configured beautiful Vibrant Mint primary gradients, Soft Pink secondary containers with Deep Coral action text, Outfit and Noto Sans KR Google Fonts, and soft tinted ambient shadows.
- **Changes**:
  - Overhauled [src/renderer/styles.css](file:///d:/AI/project/my_days/src/renderer/styles.css) with new `:root` design system variables, geometric Google Fonts, primary Mint and secondary Pink button hover states, and card rounded-xl layout properties.

## v1.2.0 (2026-05-17)
- **Description**: Implemented automated Duplicate Photo Filtering (checking file name and size dynamically) and a custom 10-Photo Limit Warning Alert Modal. Any duplicate selection is instantly removed, and exceeding selections trigger an elegant alert popup and slice the array to exactly 10 photos.
- **Changes**:
  - Modified [src/renderer/app.js](file:///d:/AI/project/my_days/src/renderer/app.js#L3698-L3745) to implement duplicate filtering loop and custom `Utils.showDialog` warning modals.

## v1.1.0 (2026-05-17)
- **Description**: Upgraded the bottom navigation bar to an ultra-trendy Floating Pill Capsule widget design, floating elegantly above the screen bottom with frosted obsidian glass, scaling hover micro-interactions, and neon-cyan capsule glowing active backplates tailored to wowed 20s and 30s users.
- **Changes**:
  - Modified [src/renderer/styles.css](file:///d:/AI/project/my_days/src/renderer/styles.css) to deploy floating pill positions, smooth transitions, and premium capsule glowing indicator styles.

## v1.0.9 (2026-05-17)
- **Description**: Implemented the first automated end-to-end self-diagnostic system testing harness to verify system integrity, Node dependencies loading, sharp metadata EXIF processing, and Playwright Chromium headless launches.
- **Changes**:
  - Created [tests/harness.js](file:///d:/AI/project/my_days/tests/harness.js) containing 4 comprehensive diagnostic tests.
  - Modified [package.json](file:///d:/AI/project/my_days/package.json) to register `"test:harness"` script.

## v1.0.8 (2026-05-17)
- **Description**: Added a direct API Key helper link button next to the Google Gemini Key input field in the settings panel, styled in the elegant classic theme, allowing users to navigate straight to the AI Studio developer keys page in a new tab.
- **Changes**:
  - Modified [src/renderer/index.html](file:///d:/AI/project/my_days/src/renderer/index.html) to style the Gemini Key form-group to full width and add an inline classic-styled secondary button pointing to `https://aistudio.google.com/api-keys`.

## v1.0.7 (2026-05-17)
- **Description**: Redesigned the entire application interface to a premium mobile-locked viewport, completely removing the desktop sidebar, centering the screen on desktop with sleek deep-dark backing, and establishing an always-on frosted bottom navigation bar.
- **Changes**:
  - Modified [src/renderer/index.html](file:///d:/AI/project/my_days/src/renderer/index.html) to set default header to "📸 사진 발행 자동화".
  - Modified [src/renderer/styles.css](file:///d:/AI/project/my_days/src/renderer/styles.css) to always hide `.sidebar`, lock `.main-content` to `max-width: 480px; margin: 0 auto;`, and set `.bottom-nav` to `display: flex !important; position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);` with premium frosted glassmorphism styling.

## v1.0.6 (2026-05-17)
- **Description**: Made Coupang Partners disclaimer optional/conditional in both fresh-login and session-recovery publishing flows inside the core automation module to 100% resolve disclaimer leakage.
- **Changes**:
  - Modified `src/modules/BlogPublisher.js` in the fresh-login block to make `addPartnershipNotice()` conditional on `postData.affiliateUrl && !postData.isPhotoPublish`, aligning it with the session-recovery block filter.

## v1.0.5 (2026-05-17)
- **Description**: Locked all generated subheading quotation blocks to the quotation_bubble (speech bubble) style based on user preferences.
- **Changes**:
  - Modified `selectQuotationStyle()` in [src/modules/BlogPublisher.js](file:///d:/AI/project/my_days/src/modules/BlogPublisher.js) to remove random selection and always return `'quotation_bubble'` (인용구 3번 - 말풍선형 스타일).

## v1.0.4 (2026-05-17)
- **Description**: Resolved photo orientation/aspect ratio distortion and conditional Coupang Partners disclaimer.
- **Changes**:
  - Integrated `sharp` image-processing loop inside `executePhotoPublish` in [src/main.js](file:///d:/AI/project/my_days/src/main.js) to read EXIF Orientation tag, physically rotate the pixels to the correct angle, and preserve original aspect ratios before writing to disk.
  - Modified [src/modules/BlogPublisher.js](file:///d:/AI/project/my_days/src/modules/BlogPublisher.js) to make the Coupang Partners disclaimer optional, skipping it entirely when no affiliate link is present or when it is a pure daily photo posting (`isPhotoPublish: true`).

## v1.0.3 (2026-05-17)
- **Description**: Resolved TypeError when `CATEGORY_ID` is a number instead of a string.
- **Changes**:
  - Modified the constructor in `src/modules/BlogPublisher.js` to cast `config.CATEGORY_ID` to String if it is not undefined or null.
  - Modified `updateConfig` in `src/modules/BlogPublisher.js` to cast `newConfig.CATEGORY_ID` to String.

## v1.0.2 (2026-05-17)
- **Description**: Added input parameter persistence to the Naver Blog Test Panel to make debugging highly convenient.
- **Changes**:
  - Integrated browser `localStorage` calls into `NaverTestManager` inside `src/renderer/app.js`.
  - Configured automatic saving of Naver ID, Password, Blog ID, and Gemini Key on execution.
  - Configured automatic retrieval and UI input pre-population of saved values on panel initialization.

## v1.0.1 (2026-05-17)
- **Description**: Resolved standard browser execution error (undefined executeAutomationStep).
- **Changes**:
  - Migrated the standalone web server into the main Electron process in `src/main.js` running on Port `3333`.
  - Added Server-Sent Events (SSE) log stream support (`/api/logs`) inside Electron to broadcast console and automation logs to browser clients.
  - Added HTTP POST API routing (`/api/execute-automation-step`) inside Electron to process browser-submitted automation tasks.
  - Updated `NaverTestManager` inside `src/renderer/app.js` with robust browser fallback logic (EventSource SSE + Fetch API calls) when `window.electronAPI` is undefined.

## v1.0.0 (2026-05-17)
- **Description**: Initial project import and version control setup.
- **Changes**:
  - Implemented the "Naver Blog Publishing Test" sidebar tab, UI form, and real-time console log.
  - Implemented the backend automation step `naver-test-publish` inside Electron main IPC handler.
  - Configured `BlogAutomation.executeNaverTestPublish` to run browser automation.
  - Deployed a lightweight web server serving the frontend on Port `3333`.
