# Mobile App (React Native + Expo)

## Stack
- React Native
- Expo
- Ant Design Mobile
- WalletConnect / Web3
- Redux Toolkit

## Screens

### VPN Screen
- Connect / Disconnect VPN
- Route info (entry/exit nodes)
- Route score
- Connection status

### Reward Screen
- Token balance
- Epoch list
- Pending rewards
- Claim button
- Claimed rewards history

### Wallet Screen
- Connect wallet (MetaMask, WalletConnect)
- Address display
- Network info
- ETH and token balances

## Installation

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (for Mac) or Android Studio

### Setup

1. **Install dependencies**:
```bash
npm install
# hoặc
yarn install
```

2. **Configure environment**:
Create `.env` file:
```
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
EXPO_PUBLIC_REWARD_CONTRACT_ADDRESS=0x...
EXPO_PUBLIC_REPUTATION_CONTRACT_ADDRESS=0x...
EXPO_PUBLIC_TOKEN_ADDRESS=0x...
```

3. **Start development server**:
```bash
npm start
# hoặc
expo start
```

4. **Run on device/simulator**:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

## App Flow

### Connect VPN
1. User connects wallet (if not connected)
2. User taps "Connect VPN"
3. App → backend `/vpn/connect`
4. Backend calls AI Routing Engine
5. Backend returns route (entry/exit nodes)
6. App displays connection status
7. (MVP: Mock connection, no actual VPN)

### Claim Reward
1. App fetches pending rewards from backend
2. User taps "Claim" on a reward
3. App fetches merkle proof from backend
4. App calls smart contract `claimReward()`
5. User signs transaction via wallet
6. Token minted to user's wallet
7. App updates balance

## State Management

Using Redux Toolkit with 3 slices:

### VPN Slice
```javascript
{
  status: 'disconnected' | 'connecting' | 'connected' | 'disconnecting',
  connectionId: string | null,
  entryNode: string | null,
  exitNode: string | null,
  routeScore: number | null,
  error: string | null
}
```

### Wallet Slice
```javascript
{
  address: string | null,
  network: string | null,
  connected: boolean,
  balance: string,
  tokenBalance: string,
  loading: boolean,
  error: string | null
}
```

### Reward Slice
```javascript
{
  epochs: Array,
  pendingRewards: Array,
  claimedRewards: Array,
  loading: boolean,
  error: string | null
}
```

## API Integration

### Backend API
- `POST /vpn/connect` - Connect VPN
- `POST /vpn/disconnect` - Disconnect VPN
- `GET /vpn/status/:id` - Get connection status
- `GET /reward/proof` - Get merkle proof
- `GET /reward/epochs` - Get epochs list
- `GET /reward/verify/:id` - Verify reward

### Blockchain
- `claimReward(epoch, amount, proof)` - Claim reward
- `claimed(epoch, address)` - Check if claimed
- `balanceOf(address)` - Get token balance

## Features

### VPN Connection
- One-tap connect/disconnect
- Real-time status display
- Route information
- Trust score display

### Reward Management
- Automatic detection of pending rewards
- One-tap claim
- Transaction tracking
- Balance updates

### Wallet Integration
- Web3 wallet connection (MetaMask, WalletConnect)
- Multi-chain support
- Balance display
- Network switching

## Security

- Private keys never leave wallet
- All transactions signed by user
- Merkle proof verification on-chain
- No custody of funds

## Development

### Run on iOS
```bash
npm run ios
```

### Run on Android
```bash
npm run android
```

### Run on Web
```bash
npm run web
```

### Build for production
```bash
expo build:ios
expo build:android
```

## MVP Limitations

- VPN connection is mocked (no actual VPN tunnel)
- Single AI model for routing
- No governance features
- No slashing mechanism

## Success Criteria

✅ Node receives tokens to wallet
✅ App shows correct balance
✅ Routes differ by time
✅ Poor nodes automatically excluded
