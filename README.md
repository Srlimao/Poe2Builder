# Path of Exile 2 Build Planner Editor

> [!WARNING]
> **Disclaimer:** This project is officially **50% vibe coded**. Things might break, code might look a little crazy under the hood, but everything is under control.

A desktop-grade Electron application for creating, editing, and managing `.build` files for Path of Exile 2. This editor allows players to theory-craft builds, configure equipment variants, establish skill linkages, and write formatted instructions that mirror the in-game build planner aesthetic.

## Features

- **DarkUI & Styling:** The dark UI is meant to be close to the PoE2 style but it ended up looking like this.
- **Interactive Passive Skill Tree:** A fully interactable Canvas-based skill tree. Utilize `Ctrl+Click` to quickly allocate nodes, and configure node-specific instructions.
- **Equipment Configuration & Variants:** Manage standard inventory slots and define multiple variants using `level_interval` for supporting guides.
- **Skill & Support Linking:** Configure active skill gems, assign level requirements, and visually link up to 5 support gems per active skill.
- **Autocomplete Integration:** Integrated local databases for Skill, Support, and Spirit gems ensure accurate in-game ID targeting.
- **Live Markdown Previews:** Write instructions using custom PoE2 tags (e.g., `<gold>{Text}`, `<red>{Stat}`) and preview them instantly in an in-game styled tooltip simulation.
- **Path of Building 2 (PoB2) Import:** Import PoB2 base64 share codes directly into the planner to automatically populate your passive tree and skill setups.
- **Direct Save Integration:** Features a Quick Save option to write your `.build` files directly to the official `Documents/My Games/Path of Exile 2/BuildPlanner` directory.

## Download (For Non-Developers)

If you just want to use the application without dealing with code or terminals, you can simply download the ready-to-use `.exe` file! 
Head over to the [Releases](../../releases) page and download the latest setup file. 
*(Note: There are no hacks or viruses here, just a standard Electron application.)*

## Prerequisites (For Developers)

- [Node.js](https://nodejs.org/) (v16+ recommended)
- `npm` (included with Node.js)

## Installation (For Developers)

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
To run the UI in a standard web browser without the Electron wrapper (note: file saving will fall back to standard browser downloads):
1. Install a local web server (e.g., `npm install -g http-server`).
2. Run the server from the root directory:
   ```bash
   http-server -c-1
   ```
3. Navigate to `http://localhost:8080/src/renderer/index.html`.

## Automated Data Synchronization

Path of Exile 2 data changes frequently. To ensure the Build Planner is utilizing the latest game mechanics, you can run the built-in update scripts manually from the terminal or directly through the **Settings** menu inside the app.

### Update Passive Skill Tree
Fetches the latest official JSON export and recalculates node mappings.
```bash
npm run update-tree
```
*Source: [poe2-skilltree-export](https://github.com/grindinggear/poe2-skilltree-export)*

### Update Gems
Fetches the latest active, support, and spirit gems to maintain accurate autocomplete databases.
```bash
npm run update-gems
```
*Source: [repoe-fork/poe2](https://github.com/repoe-fork/poe2)*

---

**Built With:** HTML5, CSS3, Vanilla JavaScript, and [Electron](https://www.electronjs.org/).
