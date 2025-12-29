# Fix lỗi "Cannot find native module 'ExpoClipboard'"

## Nguyên nhân
Lỗi này thường xảy ra khi:
1. Metro bundler cache cũ
2. App trên device chưa được reload sau khi rebuild
3. Native module chưa được link đúng cách

## Giải pháp (thực hiện theo thứ tự)

### Bước 1: Dừng tất cả processes đang chạy
```bash
# Dừng Metro bundler (nếu đang chạy)
pkill -f "expo start" || true
pkill -f "metro" || true
```

### Bước 2: Xóa cache hoàn toàn
```bash
cd mobile-app
rm -rf node_modules/.cache
rm -rf .expo
rm -rf android/app/build
rm -rf android/.gradle
```

### Bước 3: Uninstall app trên device
```bash
adb uninstall com.devpn.mobile
```

### Bước 4: Start Metro bundler với cache sạch (terminal 1)
```bash
cd mobile-app
npx expo start --clear
```

**Đợi Metro bundler khởi động hoàn toàn** (sẽ hiển thị "Metro waiting on...")

### Bước 5: Build và install app (terminal 2 - terminal mới)
```bash
cd mobile-app
npm run android
```

### Bước 6: Reload app trên device
Sau khi app được cài đặt và mở:
1. **Shake device** (hoặc nhấn `Ctrl+M` trên emulator)
2. Chọn **"Reload"** hoặc **"Reload App"**

Hoặc trong Metro bundler terminal, nhấn `r` để reload.

## Nếu vẫn lỗi

### Thử rebuild native project:
```bash
cd mobile-app
npx expo prebuild --clean --platform android
# Sau đó rebuild lại settings.gradle với node path fix
npm run android
```

### Kiểm tra expo-clipboard đã được install:
```bash
cd mobile-app
npm list expo-clipboard
```

Nếu không có, cài lại:
```bash
npm install expo-clipboard@~7.0.0
```

## Lưu ý
- Luôn start Metro bundler **trước** khi build app
- Đảm bảo device/emulator đã kết nối: `adb devices`
- Nếu dùng nvm, đảm bảo `settings.gradle` có node path đúng

