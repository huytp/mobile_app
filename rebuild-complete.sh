#!/bin/bash

echo "🔄 Complete rebuild for physical device..."

# Check device
DEVICE_ARCH=$(adb shell getprop ro.product.cpu.abi 2>/dev/null | tr -d '\r')
if [ -z "$DEVICE_ARCH" ]; then
    echo "❌ No device connected!"
    exit 1
fi

echo "🔍 Device: $DEVICE_ARCH"

# Stop everything
echo "🛑 Stopping processes..."
pkill -f "expo start" || true
pkill -f "metro" || true

# Complete clean
echo "🧹 Complete clean..."
rm -rf node_modules/.cache
rm -rf .expo
rm -rf android/app/build
rm -rf android/.gradle
rm -rf android/.cxx
rm -rf android/build

# Uninstall app
echo "🗑️  Uninstalling app..."
adb uninstall com.devpn.mobile 2>/dev/null || true

# Rebuild native project
echo "🔨 Rebuilding native project..."
npx expo prebuild --clean --platform android

# Fix settings.gradle with node path
echo "🔧 Fixing settings.gradle..."
cat > android/settings.gradle << 'EOF'
pluginManagement {
  def nodeExecutable = System.getenv("NODE_BINARY") ?: "/Users/baby/.nvm/versions/node/v20.14.0/bin/node"

  def reactNativeGradlePlugin = new File(
    providers.exec {
      workingDir(rootDir)
      commandLine(nodeExecutable, "--print", "require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] })")
    }.standardOutput.asText.get().trim()
  ).getParentFile().absolutePath
  includeBuild(reactNativeGradlePlugin)

  def expoPluginsPath = new File(
    providers.exec {
      workingDir(rootDir)
      commandLine(nodeExecutable, "--print", "require.resolve('expo-modules-autolinking/package.json', { paths: [require.resolve('expo/package.json')] })")
    }.standardOutput.asText.get().trim(),
    "../android/expo-gradle-plugin"
  ).absolutePath
  includeBuild(expoPluginsPath)
}

plugins {
  id("com.facebook.react.settings")
  id("expo-autolinking-settings")
}

extensions.configure(com.facebook.react.ReactSettingsExtension) { ex ->
  if (System.getenv('EXPO_USE_COMMUNITY_AUTOLINKING') == '1') {
    ex.autolinkLibrariesFromCommand()
  } else {
    ex.autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)
  }
}
expoAutolinking.useExpoModules()

rootProject.name = 'DeVPN'

expoAutolinking.useExpoVersionCatalog()

include ':app'
includeBuild(expoAutolinking.reactNativeGradlePlugin)
EOF

# Recreate local.properties
echo "📝 Creating local.properties..."
echo "sdk.dir=/Users/baby/Library/Android/sdk" > android/local.properties

# Start Metro in background
echo "🚀 Starting Metro..."
npx expo start --clear &
METRO_PID=$!
sleep 10

# Build for device
echo "📱 Building for device..."
export PATH="$HOME/.nvm/versions/node/v20.14.0/bin:$PATH"
npx expo run:android --device

echo ""
echo "✅ Rebuild complete!"
echo "💡 Shake device and select 'Reload' if you see errors"

wait $METRO_PID

