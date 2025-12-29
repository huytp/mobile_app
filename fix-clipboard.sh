#!/bin/bash

echo "🔧 Fixing ExpoClipboard native module issue for physical device..."

# Check if device is connected
DEVICE_ARCH=$(adb shell getprop ro.product.cpu.abi 2>/dev/null | tr -d '\r')
if [ -z "$DEVICE_ARCH" ]; then
    echo "❌ No device connected. Please connect your device via USB."
    exit 1
fi

echo "🔍 Device architecture: $DEVICE_ARCH"

# Stop any running Metro bundler
pkill -f "expo start" || true
pkill -f "metro" || true

# Clear all caches
echo "📦 Clearing caches..."
rm -rf node_modules/.cache
rm -rf .expo
rm -rf android/app/build
rm -rf android/.gradle

# Uninstall old app
echo "🗑️  Uninstalling old app..."
adb uninstall com.devpn.mobile 2>/dev/null || true

# Start Metro with clean cache in background
echo "🚀 Starting Metro bundler with clean cache..."
npx expo start --clear &
METRO_PID=$!

# Wait for Metro to start
sleep 8

# Build for device with specific architecture
echo "🔨 Building for device architecture: $DEVICE_ARCH"
export PATH="$HOME/.nvm/versions/node/v20.14.0/bin:$PATH"
npx expo run:android --device

# Wait for Metro
wait $METRO_PID

