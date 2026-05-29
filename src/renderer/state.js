// ============================================================
// state.js — Shared application state & constants
// All other modules read/write these globals directly.
// ============================================================

// Primary build state
window.buildState = {
    name: "New Build",
    author: "",
    description: "",
    ascendancy: "",
    skills: [],
    inventory_slots: [],
    passives: [] // Preserve passives from loaded files
};

// Current open file path (null = unsaved)
window.currentFilePath = null;

// Dirty flag — true when there are unsaved changes
window.isDirty = false;

// Gem databases (populated by database.js on load)
window.activeGemsDb = [];  // Active skills + spirit gems
window.supportGemsDb = []; // Support gems

// Equipment slot metadata
window.standardSlots = [
    { id: "Helm1",        label: "Helmet" },
    { id: "Amulet1",      label: "Amulet" },
    { id: "Weapon1",      label: "Weapon 1" },
    { id: "BodyArmour1",  label: "Body Armour" },
    { id: "Weapon2",      label: "Weapon 2 / Shield" },
    { id: "Gloves1",      label: "Gloves" },
    { id: "Ring1",        label: "Left Ring" },
    { id: "Ring2",        label: "Right Ring" },
    { id: "Belt1",        label: "Belt" },
    { id: "Boots1",       label: "Boots" }
];

// Current editor selection
// Shape: { type: 'slot'|'skill'|'support'|'passive', id, skillIndex, supportIndex, variantIndex }
window.selectedElement = null;
