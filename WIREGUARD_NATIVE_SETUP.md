# WireGuard Native VPN Setup Guide

Hướng dẫn cấu hình `react-native-wireguard-vpn-connect` để kết nối VPN trực tiếp từ app.

## ⚠️ Lưu ý quan trọng

- **Không hoạt động với Expo Go**: Thư viện này yêu cầu native modules, nên bạn **PHẢI** build development build hoặc production build.
- **Không thể test trên Expo Go**: Bạn cần build app và cài đặt trên thiết bị thật hoặc simulator/emulator.

## Bước 1: Prebuild Native Code

Chạy lệnh sau để tạo native code từ Expo config:

```bash
cd mobile-app
npx expo prebuild
```

Lệnh này sẽ tạo thư mục `ios/` và `android/` với native code.

## Bước 2: Cấu hình iOS

### 2.1. Cài đặt Pods

```bash
cd ios
pod install
cd ..
```

### 2.2. Cập nhật Info.plist

Mở file `ios/DeVPN/Info.plist` và thêm các quyền sau:

```xml
<key>com.apple.developer.networking.vpn.api</key>
<array>
    <string>allow-vpn</string>
</array>
<key>com.apple.developer.networking.networkextension</key>
<array>
    <string>packet-tunnel-provider</string>
</array>
```

### 2.3. Thêm Capability trong Xcode

1. Mở project trong Xcode:
   ```bash
   open ios/DeVPN.xcworkspace
   ```

2. Chọn target "DeVPN" → "Signing & Capabilities"

3. Click "+ Capability" và thêm:
   - **Network Extensions** → Chọn "Packet Tunnel Provider"

4. Đảm bảo bạn đã có Apple Developer account và đã enable Network Extensions capability.

### 2.4. Cấu hình App Groups (nếu cần)

Một số trường hợp có thể cần App Groups để share data giữa app và extension. Thêm App Group capability nếu cần.

## Bước 3: Cấu hình Android

### 3.1. Cập nhật AndroidManifest.xml

Mở file `android/app/src/main/AndroidManifest.xml` và đảm bảo có các permissions:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.BIND_VPN_SERVICE" />
```

### 3.2. Kiểm tra MainApplication

Đảm bảo package đã được link đúng cách. Với React Native 0.60+, auto-linking sẽ tự động xử lý.

Nếu gặp vấn đề, kiểm tra file `android/app/src/main/java/com/devpn/mobile/MainApplication.java`:

```java
import com.reactnativewireguardvpnconnect.WireGuardVpnConnectPackage;

// Package sẽ được auto-link, không cần thêm thủ công
```

## Bước 4: Build và Test

### iOS

```bash
# Development build
npx expo run:ios

# Hoặc build trực tiếp với Xcode
# Mở ios/DeVPN.xcworkspace trong Xcode và build
```

**Lưu ý iOS:**
- Cần Apple Developer account (free account cũng được)
- Cần enable Network Extensions capability
- Test trên thiết bị thật hoặc simulator (iOS 13+)

### Android

```bash
# Development build
npx expo run:android

# Hoặc build APK
cd android
./gradlew assembleDebug
```

**Lưu ý Android:**
- Cần Android 5.0+ (API 21+)
- Test trên thiết bị thật hoặc emulator

## Bước 5: Permissions

### iOS

App sẽ tự động yêu cầu VPN permission khi gọi `WireGuardVpnConnect.connect()`. User cần:
1. Cho phép VPN configuration
2. Nhập passcode/Face ID nếu được yêu cầu
3. Cho phép "Add VPN Configuration"

### Android

App sẽ tự động yêu cầu VPN permission. User cần:
1. Cho phép VPN connection
2. Có thể cần enable "Always-on VPN" trong settings

## Troubleshooting

### Lỗi: "Module not found" hoặc "Cannot read property 'connect' of undefined"

**Nguyên nhân**: Đang chạy trên Expo Go hoặc native code chưa được build.

**Giải pháp**:
1. Chạy `npx expo prebuild`
2. Build development build: `npx expo run:ios` hoặc `npx expo run:android`
3. Không sử dụng Expo Go

### Lỗi iOS: "Network Extensions not enabled"

**Nguyên nhân**: Chưa enable Network Extensions capability.

**Giải pháp**:
1. Mở Xcode → Target → Signing & Capabilities
2. Thêm "Network Extensions" capability
3. Đảm bảo có Apple Developer account

### Lỗi Android: "VPN permission denied"

**Nguyên nhân**: User chưa cho phép VPN permission.

**Giải pháp**:
1. Kiểm tra Settings → Apps → DeVPN → Permissions
2. Đảm bảo VPN permission được enable
3. Thử lại kết nối

### Lỗi: "Invalid WireGuard config"

**Nguyên nhân**: Config từ backend không đúng format.

**Giải pháp**:
1. Kiểm tra format config từ backend
2. Đảm bảo có đầy đủ [Interface] và [Peer] sections
3. Kiểm tra PrivateKey và PublicKey format

## Testing

### Test trên iOS Simulator

```bash
npx expo run:ios
```

**Lưu ý**: VPN có thể không hoạt động đầy đủ trên simulator. Test trên thiết bị thật để đảm bảo.

### Test trên Android Emulator

```bash
npx expo run:android
```

**Lưu ý**: VPN có thể hoạt động trên emulator, nhưng test trên thiết bị thật để đảm bảo.

## Fallback Mode

Nếu WireGuard native library không khả dụng (ví dụ: đang dùng Expo Go), app sẽ:
1. Vẫn kết nối backend thành công
2. Hiển thị thông báo yêu cầu development build
3. Cho phép user import config thủ công vào WireGuard app

## Tài liệu tham khảo

- [react-native-wireguard-vpn-connect GitHub](https://github.com/...)
- [Expo Development Builds](https://docs.expo.dev/development/introduction/)
- [iOS Network Extensions](https://developer.apple.com/documentation/networkextension)
- [Android VPN Service](https://developer.android.com/reference/android/net/VpnService)

