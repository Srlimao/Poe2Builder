# PoE2 Build Planner: Future Roadmap & Features

This document outlines the design, technical requirements, and architecture for the next phase of **PoE2 Build Planner** features.

---

## Feature Proposal 1: Build Curation & Aggregation

To provide players with direct build recommendations (streamer guides, starter builds) out of the box, we propose two alternative implementation styles:

### Option A: Automated Build Scraper
A background worker cron script running on your GCP VM that programmatically indexes and extracts builds.

* **How it works:**
  - Scrapes the official Path of Exile 2 forums (Classes & Builds sections) or parses API lists from websites like `pobb.in` and `poe.ninja`.
  - Automatically parses PoB2 codes, converts them to the official `.build` JSON format, and inserts them into a public builds list.
* **Pros:** Scalable, fully automated, always up-to-date with current popular builds.
* **Cons:** Fragile to HTML structure changes on forums; requires writing parsers for multiple sites; might import low-quality or incomplete guides.

### Option B: Admin Back-Office Curation (Recommended First Step)
A secure admin panel built directly into the web app, allowing you to curate high-quality builds manually.

* **How it works:**
  - Create a private `/admin` route in the frontend protected by a simple login/pass or your specific PoE account name.
  - An interface to paste PoB2 codes, assign tags (e.g. `"League Starter"`, `"Endgame"`, `"Hardcore"`), select categories, add notes, and pin them to a "Featured Builds" landing page.
* **Pros:** Guarantees extreme build quality (only highly polished guides are shown); easy to highlight specific streamers or popular community creators; less complex to code.
* **Cons:** Requires manual effort to update for new leagues.

---

## Feature Proposal 2: Cloud Build Storage

Allow players who have authenticated via their Path of Exile accounts to save, load, and manage their custom builds directly on your GCP VM server database.

### Architecture & User Flow
1. User logs in with their PoE account on the website.
2. The UI displays a "Save to Cloud" option in the File menu.
3. The client sends the `.build` JSON to your server (`POST /api/builds`).
4. The server validates the JSON format and stores it in a lightweight database on the VM, associating the build with the user's encrypted PoE account username.
5. A new "My Cloud Builds" panel appears in the UI (`GET /api/builds`), allowing players to load, overwrite, or delete their guides from any browser or device.

### Technical Implementation Checklist
* **Database Selection:** A lightweight embedded database on the VM:
  - **SQLite:** Single-file SQL database requiring zero setup or server overhead. Extremely fast, robust, and well-suited for this scale.
  - **MongoDB/Nedb:** Document-oriented databases, good for raw JSON storage, but SQLite is easier to maintain and back up.
* **Server Routes (BFF):**
  - `GET /api/builds`: Retrieves all saved builds for the logged-in user (identified by session cookie).
  - `POST /api/builds`: Saves or updates a build.
  - `DELETE /api/builds/:id`: Deletes a build.
* **Schema Design (SQLite):**
  ```sql
  CREATE TABLE user_builds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_name TEXT NOT NULL,       -- PoE account name (e.g. whell2#5294)
      build_name TEXT NOT NULL,          -- Title of the build
      build_data TEXT NOT NULL,          -- Full .build JSON stringified
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX idx_account_name ON user_builds(account_name);
  ```
