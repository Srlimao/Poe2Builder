# Path of Exile 2 Build Planner Editor

A desktop-grade Electron application for creating, editing, and managing `.build` files for Path of Exile 2. This editor allows players to theory-craft builds, setup equipment, configure skill linkages, and write formatted instructions that mirror the in-game build planner aesthetic. These gems are parsed dynamically to populate the editor interface logic.

> **Note**: For future analysis, the full Passive Skill Tree export has been saved in the project root as `poe2_skilltree_data.json`. This data was sourced from the [poe2-skilltree-export GitHub repository](https://github.com/grindinggear/poe2-skilltree-export).

## Features

- **Gothic PoE2 Visuals**: Custom dark theme with stone borders, gold highlights, and SVG iconography mimicking the official Path of Exile 2 client.
- **Equipment Configuration**: Manage standard inventory slots (Helmet, Amulet, Weapons, Body Armour, Gloves, Rings, Belt, Boots) with unique item targeting and instructional notes.
- **Skill & Support Gem Links**: Add active skill gems, set level intervals, and link up to 5 support gems per active skill visually.
- **Rich Autocompletion**: Integrated local databases for Skill, Support, and Spirit gems ensure you get accurate in-game IDs.
- **Live Markdown Compilation**: Type instructions using custom PoE2 tags (e.g. `<gold>{Text}`, `<red>{Stat}`) and preview them instantly in an in-game styled tooltip simulation.
- **Direct PoE2 Integration**: Features a Quick Save option to write your `.build` directly to the `Documents/My Games/Path of Exile 2/BuildPlanner` directory.
- **Automated Data Sync**: Built-in scripts and a Settings UI to instantly pull the newest Skill Tree changes from the official PoE2 export repository, and the latest Gem data from the repoe-fork.
- **Path of Building 2 (PoB2) Support**: Seamlessly import your PoB2 base64 share codes directly into the planner to instantly populate your passive tree.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- `npm` (comes with Node.js)

## Installation

1. Clone or download this repository.
2. Open a terminal in the root directory.
3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

To launch the desktop application, run:
```bash
npm start
```

### Browser Fallback Mode
If you prefer to run the UI in a web browser without the Electron wrapper (note: file saving will fall back to standard browser downloads):
1. Install a local server (e.g., `npm install -g http-server`).
2. Run the server from the root directory:
   ```bash
   http-server -c-1
   ```
3. Navigate to `http://localhost:8080/src/renderer/index.html`.

## Data Management & Automated Updates

The Path of Exile 2 data changes frequently. To ensure the Build Planner always has the latest mechanics, ascendancies, and gems, you can run the built-in update scripts manually from the terminal or directly through the **Settings** menu inside the app.

### Update Passive Skill Tree
Fetches the latest official JSON export from Grinding Gear Games and recalculates node mappings.
```bash
npm run update-tree
```
*Data Source: [poe2-skilltree-export](https://github.com/grindinggear/poe2-skilltree-export)*

### Update Gems
Fetches the latest active, support, and spirit gems to ensure autocomplete is perfectly synced with the current game version.
```bash
npm run update-gems
```
*Data Source: [repoe-fork/poe2](https://github.com/repoe-fork/poe2)*

## Built With
- HTML5, CSS3, Vanilla JavaScript
- [Electron](https://www.electronjs.org/)
