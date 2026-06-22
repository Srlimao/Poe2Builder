# Path of Exile 2 Build Planner Editor (Web Version)

> [!NOTE]
> This branch (`web-only`) is a pure web version of the PoE2 Build Planner Editor. The original desktop version lives on the `master` branch.

A browser-based application built with React and Vite, featuring a **Backend-For-Frontend (BFF) Express server** for Path of Exile OAuth 2.1 integration. This editor allows players to theory-craft builds, configure equipment variants, establish skill linkages, write formatted instructions that mirror the in-game build planner, and upload guides directly to their GGG profiles.

---

## Architecture Overview

- **Frontend:** React, Zustand, and Vite. All file saving and loading operations rely on native browser APIs (Blob downloads, HTML File Input).
- **Backend (BFF Proxy):** A lightweight Node.js Express server running in `/server` that handles OAuth 2.1 token exchanges (using PKCE), manages secure user sessions via encrypted cookies, overrides headers with the GGG-mandated `User-Agent`, and proxies GGG profile and build upload requests.

---

## Features

- **Dark UI & RPG Styling:** High-quality Gothic UI layout designed to perfectly replicate the PoE2 game aesthetic.
- **PoE User Authentication:** Connect your GGG account securely to view your profile and prepare sync settings.
- **PoE Build Uploads:** Package your custom builds and upload them directly to your GGG profile via server API.
- **Interactive Passive Skill Tree:** A fully interactive canvas-based skill tree. Navigate, zoom, Ctrl+Click to toggle allocation, and configure instructions per node.
- **Equipment Configuration & Tiers:** Manage standard inventory slots and define multiple variants using `level_interval` for level-by-level guides. Integrates autocomplete search for all PoE2 Unique items.
- **Flexible Skill & Support Linking:** Socket active skill gems, assign level requirements, and link unlimited support gems per active skill.
- **Path of Building 2 (PoB2) Import:** Paste a PoB2 share link or code to import passives, skills, and equipment. Selectively append or overwrite configurations via a detailed options modal. Remote links are proxied to bypass CORS restrictions.

---

## Prerequisites (For Developers)

- [Node.js](https://nodejs.org/) (v18+ recommended)
- `npm` (included with Node.js)

---

## Installation & Setup

1. **Clone the Repository:**
   Ensure you are on the `web-only` branch.

2. **Install Root (Frontend) Dependencies:**
   ```bash
   npm install
   ```

3. **Install BFF Server Dependencies:**
   ```bash
   cd server
   npm install
   cd ..
   ```

4. **Configure Environment Variables:**
   Copy the backend template in `server/.env.example` to `server/.env`:
   ```bash
   cp server/.env.example server/.env
   ```
   Open `server/.env` and populate:
   - `SESSION_SECRET`: A secure random secret key to encrypt GGG tokens in cookies.
   - `POE_CLIENT_ID`: Your registered client ID.
   - `POE_CLIENT_SECRET`: (Optional) Your client secret. Leave blank if registered as a Public Client.
   - `POE_REDIRECT_URI`: Should match GGG's registry (e.g., `http://localhost:3000/api/auth/callback` in dev).
   - `FRONTEND_URL`: Set to `http://localhost:5173` for development.
   - `POE_CONTACT_EMAIL`: Your contact email for custom User-Agent formatting.

---

## Development and Usage

To run the application locally in development mode:

1. **Start the BFF Backend Server:**
   ```bash
   cd server
   npm start
   ```
   *(This starts the backend on port `3000`)*

2. **Start the Vite Frontend (in a separate terminal):**
   ```bash
   # From the root directory
   npm run dev
   ```
   *(This starts the dev server on port `5173` and proxies `/api/*` traffic to port `3000`)*

Open your browser to `http://localhost:5173`.

---

## Production Deployment

1. **Build the Frontend Assets:**
   ```bash
   npm run build
   ```
   This generates compiled static assets in `/src/renderer/dist`.

2. **Run on your VM/Server:**
   - In production, set `FRONTEND_URL=/` in your `server/.env` so redirects route relatively.
   - Run the server (`node server/app.js`). It will automatically serve the static frontend folder from `/src/renderer/dist`.
   - Setup Nginx to reverse proxy API requests (on `/api/`) to your Express port (default `3000`).

---

## Automated Data Synchronization

To keep the planner updated with GGG data, run these Node scripts:

- **Update Passive Skill Tree:** `npm run update-tree`
- **Update Gems:** `npm run update-gems`
- **Update Uniques:** `npm run update-uniques`

---

**Built With:** React, Zustand, Express, and Vite.

