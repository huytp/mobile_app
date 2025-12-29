#!/bin/bash

echo "🔄 Starting fresh build and Metro..."

# Kill any running Metro
pkill -f "expo start" || true
pkill -f "metro" || true

# Clear all caches
echo "🧹 Clearing caches..."
rm -rf node_modules/.cache
rm -rf .expo
rm -rf android/app/build
rm -rf android/.gradle

# Start Metro with clean cache in background
echo "🚀 Starting Metro bundler with clean cache..."
npx expo start --clear &
METRO_PID=$!

# Wait a bit for Metro to start
sleep 5

# Build and run Android
echo "📱 Building and installing Android app..."
npm run android

# Wait for Metro
wait $METRO_PID

