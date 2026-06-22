# Path of Exile 2 Build Planner Editor

> [!WARNING]
> **Disclaimer:** This project is officially **50% AI coded**.

A desktop-grade Electron application built with React and Vite for creating, editing, and managing `.build` files for Path of Exile 2. This editor allows players to theory-craft builds, configure equipment variants, establish skill linkages, and write formatted instructions that mirror the in-game build planner aesthetic.

## Features

- **Dark UI & RPG Styling:** High-quality Gothic UI layout designed to perfectly replicate the PoE2 game aesthetic.
- **Interactive Passive Skill Tree:** A fully interactive canvas-based skill tree. Navigate, zoom, Ctrl+Click to toggle allocation, and configure instructions per node.
- **Equipment Configuration & Tiers:** Manage standard inventory slots and define multiple variants using `level_interval` for level-by-level guides. Integrates autocomplete search for all PoE2 Unique items.
- **Flexible Skill & Support Linking:** Socket active skill gems, assign level requirements, and link unlimited support gems per active skill.
- **Autocomplete Integration:** In-app autocomplete databases for active skills, support skills, and unique items ensure accurate in-game ID targeting.
- **Live Markdown Previews:** Write instructions using PoE planner tags (e.g. `<gold>{Text}`, `<red>{Stat}`, `<b>{Text}`) and preview them instantly in an in-game simulated tooltip.
- **Path of Building 2 (PoB2) Import:** Paste a PoB2 share link or code to import passives, skills, and equipment. Selectively append or overwrite trees, gems, and gear configurations via a detailed options modal.
- **Quick Save Integration:** Save your `.build` files directly to the official `Documents/My Games/Path of Exile 2/BuildPlanner` directory for immediate in-game access.

## Prerequisites (For Developers)

- [Node.js](https://nodejs.org/) (v18+ recommended)
- `npm` (included with Node.js)

## Installation (For Developers)

1. Clone or download this repository.
2. Open a terminal in the root directory.
3. Install dependencies:
   ```bash
   npm install
   ```

## Development and Usage

### Desktop Application
To build the React assets and launch the Electron application:
```bash
npm start
```

### Browser Development Mode
To run the frontend in browser dev mode with hot-reloading (note: file saving falls back to local downloads):
```bash
npm run dev
```
Then navigate to the URL output in your terminal (typically `http://localhost:5173`).

## Automated Data Synchronization

Path of Exile 2 data updates frequently. To ensure the Build Planner is using the latest values, you can run the built-in update scripts manually from the terminal or directly through the **Settings** menu inside the app.

### Update Passive Skill Tree
Fetches the latest official GGG JSON export and recalculates node coordinates and connections.
```bash
npm run update-tree
```

### Update Gems
Downloads the latest active and support gem data to maintain accurate autocomplete databases.
```bash
npm run update-gems
```

### Update Uniques
Downloads the latest database of unique items for equipment autocomplete.
```bash
npm run update-uniques
```

---

**Built With:** React, Zustand, Vite, and [Electron](https://www.electronjs.org/).
