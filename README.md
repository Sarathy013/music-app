# VibeStream

VibeStream is a cross-platform music discovery and playback app built with Expo
and a Node.js API. It brings together multiple music providers; tracks remain
hosted and licensed by their respective providers.

## Features

- Search, browse, and stream music from supported providers
- Discover trending tracks, charts, new releases, artists, albums, and genres
- Create playlists, save favorites, and view listening history
- Queue, shuffle, repeat, sleep timer, and playback-state restoration
- Lyrics, track downloads, and background audio where supported
- JWT-based accounts with MongoDB or a local JSON development store

Provider coverage and playback availability vary by track, region, and provider.
Spotify integration supports search/link resolution; it does not provide
Spotify-hosted audio playback. VibeStream does not claim ownership of catalog
content. Check each provider's terms and track-level license before redistribution
or offline use.

## Technology

| Layer | Technology |
|---|---|
| Mobile | React Native, Expo SDK 57, Expo Router |
| Audio | `expo-audio` |
| API | Node.js, Express |
| Persistence | MongoDB/Mongoose, with a local JSON fallback |
| Authentication | JWT and bcrypt |

## Run locally

Requirements: Node.js and npm. Use separate terminals for the API and app.

### Backend

```bash
cd server
npm ci
```

Copy `server/.env.example` to `server/.env`, then set a unique `JWT_SECRET`.
`MONGODB_URI` is optional for local development; without a working MongoDB
connection, the API uses `server/data/db.json`. Configure MongoDB for durable
production data because a host's local filesystem may be temporary.

Start the API:

```bash
npm run dev
```

The API listens on port `5000` by default. Check `http://localhost:5000/api/health`.

### Mobile app

```bash
cd mobile
npm ci
```

Copy `mobile/.env.example` to `mobile/.env`. Set `EXPO_PUBLIC_API_URL` to your
API base URL, including `/api` (for example `http://192.168.1.10:5000/api` when
using a phone on the same local network). Then start Expo:

```bash
npm start
```

Use the Expo CLI prompts to open the app on a device, emulator, or web.
Background audio and other native features may require a development or
production build rather than Expo Go.

## Music providers

The API integrates JioSaavn, YouTube, Spotify search/link resolution, Jamendo,
and Musopen. Search lets users select Jamendo or Musopen directly, and both
catalogs are included in global search, trending, and new releases. Configure
Jamendo with `JAMENDO_CLIENT_ID` and Musopen with `MUSOPEN_API_KEY` using
`server/.env.example`; do not commit real credentials. Catalog availability,
stream URLs, metadata, and rights are determined by the upstream providers and
may change. Check provider rights before redistribution or offline use.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for backend hosting and EAS build
instructions. In production, set a strong `JWT_SECRET`, configure a durable
MongoDB database, and point `EXPO_PUBLIC_API_URL` at the deployed HTTPS API.
