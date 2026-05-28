# Developer Guide: PoE2 Build Planner Editor

Welcome to the developer guide for the Path of Exile 2 Build Planner Editor. This guide outlines the architecture and core concepts to help you modify and extend the application.

## Architecture Overview

The application is built using **Electron**, which separates execution into two main processes:
1. **Main Process (`main.js`)**: Handles OS-level operations, file system access (I/O), and window management.
2. **Renderer Process (`renderer/app.js`)**: Handles the user interface, state management, and DOM manipulation.

The two processes communicate via an **Inter-Process Communication (IPC)** bridge defined in `preload.js`.

### File Structure
- `main.js`: Electron main process entry point.
- `preload.js`: Context bridge exposing safe IPC methods to the window.
- `package.json`: Project metadata and run scripts.
- `renderer/`
  - `index.html`: The core UI layout.
  - `style.css`: All styling, including the custom PoE2 gothic aesthetic and tooltips.
  - `app.js`: Application logic, state management, event listeners, and markdown compilation.
  - `*_gems.json`: Local JSON databases used for autocomplete and gem metadata parsing.

## Core Systems in `app.js`

### 1. State Management (`buildState`)
The application relies on a single source of truth object, `buildState`.
- Editing an input mutates `buildState` directly.
- The `isDirty` flag is toggled to track unsaved changes.
- The state object maps 1:1 with the final `.build` JSON structure.

### 2. UI Syncing (`updateUI`)
Rather than relying on complex reactive frameworks, the app uses a straightforward sync function. Calling `updateUI()` recalculates the active CSS classes on the grid, repaints the skill socket chains, and triggers `syncEditorForm()` to populate the properties panel based on the `selectedElement`.

### 3. Selection System (`selectedElement`)
Clicking any interactive item (equipment slot, skill gem, support gem) calls `selectElement(selection)`.
A selection object looks like:
- **Slot**: `{ type: 'slot', id: 'Weapon1' }`
- **Skill**: `{ type: 'skill', skillIndex: 0, id: '...' }`
- **Support**: `{ type: 'support', skillIndex: 0, supportIndex: 1, id: '...' }`

### 4. Markup Parser (`compilePoEMarkup`)
The PoE2 in-game build planner uses custom markup for colors and fonts (e.g. `<silver>{Text}`). The `compilePoEMarkup` function uses regular expressions to recursively parse these tags and convert them into HTML `<span>` elements with inline styles for the live preview.

## Inter-Process Communication (IPC)
The `window.electronAPI` object provides the following functions:
- `openFileDialog()`: Prompts user to select a `.build` file.
- `saveFile(content)`: Saves content to the currently open file path.
- `saveFileAs(content)`: Prompts user for a new save location.
- `quickSavePoE(content)`: Automatically routes the save to the default PoE2 Documents folder.
- `checkPoeDir()`: Checks if the PoE2 documents directory exists.

*Note: If `window.electronAPI` is undefined (e.g., when running in a web browser), `app.js` falls back to browser-native `Blob` downloads and file inputs.*

## Extending the Application

**Adding New Equipment Slots:**
To add a new slot (e.g., a second ring slot or trinket):
1. Add the HTML markup in `renderer/index.html` inside the `.equipment-grid`, ensuring it has a `data-slot="YourSlotID"` and `.eq-slot` class.
2. Add the slot definition to the `standardSlots` array in `renderer/app.js`.

**Updating Gem Databases:**
The autocomplete databases are loaded asynchronously from `renderer/skill_gems.json`, `renderer/support_gems.json`, and `renderer/spirit_gems.json`. You can update these JSON files manually or by writing a scraping script, and the app will dynamically adapt to the new data on the next reload.
