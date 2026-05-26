# WC2026 Mobile App

Expo/React Native shell for the World Cup prediction game.

## Setup

```bash
cd mobile
npm install
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001 npm run ios
```

Use your Railway URL for device testing:

```bash
EXPO_PUBLIC_API_BASE_URL=https://world-cup-game-production-23c7.up.railway.app npm run start
```

Android emulator note: if the backend runs on your Mac, use `http://10.0.2.2:3001` instead of `localhost`.

## Current Scope

- Login against `/api/login`.
- Register against `/api/register`.
- Check session with `/api/session`.
- Sign out with `/api/logout`.
- Basic authenticated home shell with links to the live web app sections.

The next step is replacing those links with native screens for leagues, predictions, fixtures, and leaderboard.
