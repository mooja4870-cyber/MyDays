# 📦 Version History

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
