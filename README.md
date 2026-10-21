# FreeBeat 🎵

> **"Listen. Discover. Enjoy. Completely Free."**

A complete, beautiful, **free and ad-free** music streaming app powered entirely by **public domain music** from [Musopen](https://musopen.org/).

---

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Mobile     | React Native + Expo + Expo Router |
| Styling    | Vanilla StyleSheet (deep purple dark theme) |
| Audio      | expo-av |
| Backend    | Node.js + Express.js |
| Database   | MongoDB + Mongoose |
| Auth       | JWT + bcryptjs |
| Music      | Musopen API (Public Domain) |

---

## Project Structure

```
music/
├── mobile/          # React Native Expo app
│   ├── app/
│   │   ├── (tabs)/  # Home, Search, Library, Profile
│   │   ├── player/  # Full-screen player
│   │   ├── album/   # Album detail
│   │   ├── artist/  # Artist/Composer detail
│   │   ├── playlist/# Playlist detail
│   │   └── auth/    # Login, Register, Edit Profile
│   ├── components/  # Reusable UI components
│   ├── constants/   # Theme, colors, config
│   ├── services/    # API service layer
│   ├── store/       # Auth + Player context
│   └── utils/       # Helper functions
│
└── server/          # Express REST API
    ├── controllers/ # Route handlers
    ├── routes/      # API routes
    ├── models/      # Mongoose schemas
    ├── middleware/  # Auth + error handling
    └── services/    # Music provider abstraction
```

---

## Getting Started

### 1. Backend Setup

```bash
cd server
cp .env.example .env     # Add your MUSOPEN_API_KEY and MONGODB_URI
npm install
npm run dev
```

### 2. Mobile Setup

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone.

---

## Music Sources

FreeBeat uses **[Musopen](https://musopen.org/)** — a non-profit providing:
- Public domain classical music recordings
- Sheet music
- Free to stream, download, and use

Get your free API key at: https://musopen.org/api/

> All music remains the property of its respective copyright owners. FreeBeat does not claim ownership of any music.

---

## Features

- 🎵 Full audio player (play/pause/seek/shuffle/repeat/volume)
- 🎼 Mini player with progress bar
- 🔥 Trending tracks
- ✨ New releases
- 🎹 Composer/Artist pages
- 💿 Album pages
- ❤️ Favorites
- 📋 Custom playlists
- 🕓 Listening history
- 🔍 Search (tracks/artists/albums)
- 👤 User profiles
- 🔒 JWT authentication
- 🌙 Dark premium theme

---

## Legal Notice

This application streams music exclusively from public domain sources.
No copyrighted music is bypassed, scraped, or stored without authorization.
