$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$androidDir = Join-Path $root 'android'
$wwwDir = Join-Path $androidDir 'app\src\main\assets\www'

if (-not $env:ANDROID_HOME) {
    $localSdk = 'D:\AI\project\CCT\android-sdk'
    if (Test-Path -LiteralPath $localSdk) {
        $env:ANDROID_HOME = $localSdk
        $env:ANDROID_SDK_ROOT = $localSdk
    }
}

if (-not $env:ANDROID_HOME) {
    throw 'ANDROID_HOME is not set. Install Android SDK or set ANDROID_HOME first.'
}

New-Item -ItemType Directory -Force -Path $wwwDir | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'src\renderer\index.html') -Destination (Join-Path $wwwDir 'index.html') -Force
Copy-Item -LiteralPath (Join-Path $root 'src\renderer\styles.css') -Destination (Join-Path $wwwDir 'styles.css') -Force
Copy-Item -LiteralPath (Join-Path $root 'src\renderer\app.js') -Destination (Join-Path $wwwDir 'app.js') -Force

$icon = Join-Path $root 'src\renderer\icon.png'
if (Test-Path -LiteralPath $icon) {
    Copy-Item -LiteralPath $icon -Destination (Join-Path $wwwDir 'icon.png') -Force
}

Push-Location $androidDir
try {
    .\gradlew.bat --no-daemon assembleDebug
}
finally {
    Pop-Location
}

$apkSource = Join-Path $androidDir 'app\build\outputs\apk\debug\app-debug.apk'
$apkTarget = Join-Path $root 'src\renderer\MyDays.apk'

if (-not (Test-Path -LiteralPath $apkSource)) {
    throw "APK was not created: $apkSource"
}

Copy-Item -LiteralPath $apkSource -Destination $apkTarget -Force
Write-Host "MyDays APK ready: $apkTarget"
