# Path of Exile OAuth 2.1 User Authentication and Build Uploading Plan (Desktop / Electron)

This document details the implementation of OAuth 2.1 user authentication and build uploading integration with Grinding Gear Games (GGG) developer APIs for the desktop version of **PoE2 Build Planner**.

---

## Architecture Overview

1. **Client Type:** Public Client (Public OAuth flow with PKCE, no embedded client secrets).
2. **Redirect URI:** `http://127.0.0.1:8080/callback` (configured in GGG app registry).
3. **Flow:**
   - User clicks "Connect PoE Account" in the React settings panel.
   - React invokes the Electron main process via `window.electronAPI.poeLogin()`.
   - The main process generates cryptographically random PKCE parameters: a 32-byte `code_verifier` (base64url-encoded) and a `code_challenge` (SHA-256 hash of verifier, base64url-encoded).
   - The main process spins up a temporary, local loopback HTTP server on port 8080.
   - The main process calls `shell.openExternal(authUrl)` to launch the GGG login screen in the user's default browser.
   - When the user approves permissions, the GGG OAuth server redirects them to the local server `http://127.0.0.1:8080/callback?code=CODE&state=STATE`.
   - The main process validates the `state` against a CSRF secret, closes the loopback HTTP server, and renders a successful authentication webpage.
   - The main process makes a POST request to GGG's token exchange endpoint `https://www.pathofexile.com/oauth/token` with the authorization code and verifier, specifying a custom `User-Agent`.
   - The main process fetches the player's profile `https://api.pathofexile.com/profile` to get the PoE account name, saves the session tokens to `config.json` locally, and returns the username to the React frontend.
   - The app maintains session validity across restarts by automatically performing refresh token requests if the access token has expired.

---

## Proposed Technical Changes

### 1. Electron Main Process (`src/main/`)

#### Ephemeral Callback Server & Cryptography
Create a module `src/main/oauth.js` to manage OAuth procedures:
- Uses `crypto` to generate high-entropy strings for PKCE.
- Uses `http` to create a listener:
  ```javascript
  const server = http.createServer((req, res) => { ... });
  ```
- Uses `fetch` to make token exchange requests, attaching the GGG-compliant `User-Agent` header:
  `User-Agent: OAuth Poe2BuildPlannerEditor/1.0.0 (contact: admin@poe2builder.dev)`

#### Session Storage
- Save `access_token`, `refresh_token`, `expires_at`, and the retrieved `account_name` inside `config.json` in the user's application data folder.

---

## Proposed UI Additions

- A "Path of Exile Account" section inside `SettingsModal.jsx` offering:
  - "Connect PoE Account" button with a dark red / gold PoE RPG style.
  - Active display: "Linked Account: Username" with a green status dot.
  - "Disconnect Account" button.
- An "Upload Build" button in `Header.jsx` that is visible and active only when the user is logged in. Clicking this button packages the current build JSON and uploads it to GGG.
