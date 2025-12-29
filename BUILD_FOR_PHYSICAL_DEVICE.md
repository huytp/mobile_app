# Build Android App cho Thiết Bị Thật - Fix ExpoClipboard Error

## Vấn đề
Lỗi "Cannot find native module 'ExpoClipboard'" chỉ xảy ra khi build trên **thiết bị thật**, không phải emulator.

## Nguyên nhân
- Native modules chưa được build đúng cho architecture của thiết bị thật
- Metro bundler cache cũ
- App chưa được reload đúng cách sau khi rebuild

## Giải pháp

### Cách 1: Sử dụng script tự động (Khuyến nghị)

```bash
cd mobile-app
chmod +x fix-clipboard.sh
./fix-clipboard.sh
```

Script này sẽ:
1. Kiểm tra thiết bị đã kết nối
2. Xóa tất cả cache
3. Uninstall app cũ
4. Start Metro với cache sạch
5. Build với architecture của thiết bị thật
6. Install và chạy app

### Cách 2: Build thủ công

#### Bước 1: Kiểm tra thiết bị
```bash
adb devices
# Phải thấy device ID, không phải "unauthorized"
```

#### Bước 2: Lấy architecture của thiết bị
```bash
adb shell getprop ro.product.cpu.abi
# Thường là: arm64-v8a hoặc armeabi-v7a
```

#### Bước 3: Dọn dẹp và rebuild
```bash
cd mobile-app

# Dừng Metro (nếu đang chạy)
pkill -f "expo start" || true

# Xóa cache
rm -rf node_modules/.cache
rm -rf .expo
rm -rf android/app/build
rm -rf android/.gradle

# Uninstall app cũ
adb uninstall com.devpn.mobile
```

#### Bước 4: Start Metro với cache sạch (Terminal 1)
```bash
cd mobile-app
npx expo start --clear
```

**Đợi Metro khởi động hoàn toàn** (sẽ hiển thị QR code và "Metro waiting on...")

#### Bước 5: Build cho thiết bị thật (Terminal 2)
```bash
cd mobile-app

# Build với architecture cụ thể
export PATH="$HOME/.nvm/versions/node/v20.14.0/bin:$PATH"
npx expo run:android --device
```

Hoặc build với architecture cụ thể:
```bash
cd android
./gradlew clean
./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

#### Bước 6: Reload app trên thiết bị
Sau khi app được cài đặt:
1. **Shake device** (lắc thiết bị) hoặc nhấn `Ctrl+M` trên emulator
2. Chọn **"Reload"** hoặc **"Reload App"**

Hoặc trong Metro terminal, nhấn `r` để reload.

### Cách 3: Sử dụng build script riêng

```bash
cd mobile-app
chmod +x build-for-device.sh
./build-for-device.sh
```

## Kiểm tra Native Modules

Để kiểm tra xem native modules đã được build đúng chưa:

```bash
# Kiểm tra APK có chứa native libs không
unzip -l android/app/build/outputs/apk/debug/app-debug.apk | grep "lib/arm64-v8a"

# Phải thấy các file .so cho expo-clipboard và các modules khác
```

## Troubleshooting

### Nếu vẫn lỗi sau khi rebuild:

1. **Kiểm tra device architecture:**
   ```bash
   adb shell getprop ro.product.cpu.abi
   ```

2. **Rebuild với architecture cụ thể:**
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a
   ```

3. **Kiểm tra expo-clipboard đã được include:**
   ```bash
   # Trong build output, phải thấy:
   # > Task :expo-clipboard:compileDebugKotlin
   # > Task :expo-clipboard:compileDebugJavaWithJavac
   ```

4. **Đảm bảo Metro bundler đang chạy:**
   ```bash
   # Metro phải chạy trước khi build
   npx expo start --clear
   ```

5. **Reload app nhiều lần:**
   - Shake device → Reload
   - Hoặc nhấn `r` trong Metro terminal

## Lưu ý quan trọng

- ✅ **Luôn start Metro bundler trước** khi build app
- ✅ **Uninstall app cũ** trước khi install app mới
- ✅ **Reload app** sau khi install (shake device → Reload)
- ✅ **Build với `--device` flag** để đảm bảo build đúng cho thiết bị thật
- ✅ **Kiểm tra architecture** của thiết bị và build đúng architecture đó

## Nếu vẫn không được

Thử rebuild toàn bộ native project:
```bash
cd mobile-app
npx expo prebuild --clean --platform android
# Sau đó rebuild lại settings.gradle với node path fix
npm run android
```

