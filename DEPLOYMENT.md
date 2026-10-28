# 🚀 VibeStream Deployment Guide

This guide covers everything required to deploy the **VibeStream Backend Server** and build/distribute the **Mobile Application (Android & iOS)**.

---

## 📋 Table of Contents
1. [Backend Deployment](#1-backend-deployment)
   - [Option A: Render.com (Recommended - 1-Click / Free Tier)](#option-a-rendercom)
   - [Option B: Railway.app](#option-b-railwayapp)
   - [Option C: Docker / VPS / Ubuntu](#option-c-docker--vps)
2. [Mobile App Deployment](#2-mobile-app-deployment)
   - [Step 1: Point Mobile App to Deployed Server](#step-1-configure-api-url)
   - [Step 2: Build Android APK (Direct install on phones)](#step-2-build-android-apk)
   - [Step 3: Build Android App Bundle (AAB for Google Play Store)](#step-3-build-android-app-bundle-aab)
   - [Step 4: Build iOS App (Apple App Store / TestFlight)](#step-4-build-ios-app)
3. [Local Development & Testing](#3-local-development--testing)
4. [Environment Variables Reference](#4-environment-variables-reference)

---

## 1. Backend Deployment

### Option A: Render.com (Recommended)
Render is ideal for hosting Node.js Express APIs with automatic HTTPS.

1. Create a free account at [render.com](https://render.com).
2. Push your project to GitHub or GitLab.
3. In Render Dashboard, click **New +** → **Blueprint** and select your repository (it will automatically detect [`render.yaml`](file:///c:/Users/sarat/OneDrive/Desktop/music/render.yaml)).
4. Alternatively, create a **Web Service**:
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
5. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: *(A long random secret string)*
   - `JAMENDO_CLIENT_ID`: Register an application at [Jamendo Developers](https://developer.jamendo.com/)
   - `MUSOPEN_API_KEY`: Optional token from Musopen for its classical catalog
   - *(Optional)* `MONGODB_URI`: Your MongoDB Atlas URI. *(Note: If omitted or Atlas IP is not whitelisted, the server seamlessly runs with its persistent local JSON store).*
6. Click **Deploy**. Your backend will be live at `https://<your-app-name>.onrender.com`.

---

### Option B: Railway.app
1. Go to [railway.app](https://railway.app) and click **New Project** → **Deploy from GitHub repo**.
2. Set the root directory to `/server`.
3. Add environment variables (`JWT_SECRET`, `NODE_ENV=production`).
4. Generate a public domain under service settings.

---

### Option C: Docker / VPS
Run on your own VPS (DigitalOcean, AWS EC2, Hetzner, etc.):
```bash
cd server
npm install --omit=dev
NODE_ENV=production PORT=5000 pm2 start server.js --name "vibestream-api"
```

---

## 2. Mobile App Deployment

The mobile application is built using **Expo SDK 57** and can be packaged into native binaries using **EAS (Expo Application Services)**.

### Step 1: Configure API URL
Point the mobile app to your live backend by creating a `.env` file in [`mobile/`](file:///c:/Users/sarat/OneDrive/Desktop/music/mobile):
```bash
EXPO_PUBLIC_API_URL=https://<your-backend-domain>.com/api
```
*(The app will automatically use this URL in production, and automatically fall back to local network IP when testing with Expo Go).*

---

### Step 2: Build Android APK (Direct phone install / Testing)
To generate an `.apk` file that anyone can download and install directly on their Android phone:

1. Install EAS CLI if you haven't already:
   ```bash
   npm install -g eas-cli
   ```
2. Log in with your Expo account:
   ```bash
   eas login
   ```
3. Navigate to the mobile folder and build the APK:
   ```bash
   cd mobile
   eas build --platform android --profile preview
   ```
4. EAS will build the APK in the cloud and provide a direct download link and QR code to install it on any Android device!

---

### Step 3: Build Android App Bundle (AAB) for Google Play Store
To submit to Google Play Store:
```bash
cd mobile
eas build --platform android --profile production
```
This produces an optimized `.aab` file ready to be uploaded to Google Play Console.

---

### Step 4: Build iOS App (TestFlight / App Store)
```bash
cd mobile
eas build --platform ios --profile production
```
*(Requires an Apple Developer Account).*

---

## 3. Local Development & Testing

### Starting the Backend
```bash
cd server
npm start
# Server runs on http://localhost:5000
```

### Starting the Mobile App with Expo
```bash
cd mobile
npx expo start -c
```
- Press `a` to open Android Emulator
- Press `w` to open in Web Browser
- Scan the QR code with **Expo Go** on your physical phone (both phone and computer must be on the same Wi-Fi network).

---

## 4. Environment Variables Reference

### Backend (`server/.env`)
| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | Port for Express server | `5000` |
| `NODE_ENV` | Environment mode | `production` |
| `JWT_SECRET` | Secret key for JWT auth | Any 64+ character string |
| `JWT_EXPIRES_IN` | Token duration | `7d` |
| `MONGODB_URI` | MongoDB Atlas Connection String | *(Optional)* |
| `JAMENDO_CLIENT_ID`| Jamendo application client ID | Register at developer.jamendo.com |
| `MUSOPEN_API_KEY` | Optional Musopen API token | Obtain from Musopen |

### Mobile (`mobile/.env`)
| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Full URL to the backend `/api` endpoint (e.g., `https://vibestream-api.onrender.com/api`) |

---

## Music catalog configuration

The app can search Jamendo and Musopen alongside its existing catalog
integrations. Set `JAMENDO_CLIENT_ID` and, if available, `MUSOPEN_API_KEY` on
the backend to enable those catalogs. Provider availability and track licenses
vary; review the license or rights information supplied by each provider before
redistribution or offline use. A failed provider request returns no tracks from
that provider rather than substituting unrelated demo audio.

The app's own playlists are stored per user and can contain tracks returned by
any configured catalog provider.
