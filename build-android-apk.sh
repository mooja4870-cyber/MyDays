#!/bin/bash
set -e

# 프로젝트 루트 폴더 경로 획득
ROOT="$(cd "$(dirname "$0")" && pwd)"
ANDROID_DIR="$ROOT/android"
WWW_DIR="$ANDROID_DIR/app/src/main/assets/www"

# ANDROID_HOME 설정 검증
if [ -z "$ANDROID_HOME" ]; then
    DEFAULT_MAC_SDK="$HOME/Library/Android/sdk"
    if [ -d "$DEFAULT_MAC_SDK" ]; then
        export ANDROID_HOME="$DEFAULT_MAC_SDK"
        export ANDROID_SDK_ROOT="$DEFAULT_MAC_SDK"
    else
        echo "❌ 에러: ANDROID_HOME 환경 변수가 설정되어 있지 않습니다."
        echo "안드로이드 SDK를 설치하거나 환경변수를 설정해 주세요."
        exit 1
    fi
fi

echo "📂 에셋 동기화 중..."
mkdir -p "$WWW_DIR"
cp "$ROOT/src/renderer/index.html" "$WWW_DIR/index.html"
cp "$ROOT/src/renderer/styles.css" "$WWW_DIR/styles.css"
cp "$ROOT/src/renderer/app.js" "$WWW_DIR/app.js"

if [ -f "$ROOT/src/renderer/icon.png" ]; then
    cp "$ROOT/src/renderer/icon.png" "$WWW_DIR/icon.png"
fi

echo "🏗️ 안드로이드 앱 빌드 시작 (assembleDebug)..."
cd "$ANDROID_DIR"
chmod +x gradlew
./gradlew assembleDebug

APK_SOURCE="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
APK_TARGET="$ROOT/MyDays.apk"

if [ ! -f "$APK_SOURCE" ]; then
    echo "❌ 에러: APK 파일이 생성되지 않았습니다: $APK_SOURCE"
    exit 1
fi

cp "$APK_SOURCE" "$APK_TARGET"
echo "✅ MyDays APK 빌드 완료: $APK_TARGET"
