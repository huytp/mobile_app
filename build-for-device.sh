#!/bin/bash

echo "📱 Building Android app for physical device..."

# Get device architecture
DEVICE_ARCH=$(adb shell getprop ro.product.cpu.abi 2>/dev/null | tr -d '\r')
echo "🔍 Device architecture: $DEVICE_ARCH"

if [ -z "$DEVICE_ARCH" ]; then
    echo "❌ No device connected. Please connect your device via USB and enable USB debugging."
    exit 1
fi

# Clean build
echo "🧹 Cleaning previous builds..."
rm -rf android/app/build
rm -rf android/.gradle
rm -rf node_modules/.cache
rm -rf .expo

# Uninstall old app
echo "🗑️  Uninstalling old app..."
adb uninstall com.devpn.mobile 2>/dev/null || true

# Build with specific architecture
echo "🔨 Building for architecture: $DEVICE_ARCH"
cd android

# Build with the device's architecture
./gradlew clean
./gradlew assembleDebug -PreactNativeArchitectures=$DEVICE_ARCH

# Install APK
echo "📦 Installing APK..."
adb install -r app/build/outputs/apk/debug/app-debug.apk

echo "✅ Build complete! Starting app..."
adb shell am start -n com.devpn.mobile/.MainActivity

echo ""
echo "🚀 App installed and started!"
echo "💡 If you see 'ExpoClipboard' error, shake device and select 'Reload'"

