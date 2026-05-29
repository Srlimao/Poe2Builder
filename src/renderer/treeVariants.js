// ============================================================
// treeVariants.js — Passive tree variant control bar
// Depends on: state.js, buildSerializer.js (syncPassivesAlias),
//             modals.js (showConfirm), ui.js (markAsDirty)
// ============================================================

function buildVariantLabel(tree, index) {
    let label = `Variant ${index + 1}`;
    if (tree.level_interval && Array.isArray(tree.level_interval)) {
        const [min, max] = tree.level_interval;
        if (min === 0 && max === 100) label += " (All Levels)";
        else if (max === 100)         label += ` (Lvl ${min}+)`;
        else                          label += ` (Lvl ${min}–${max})`;
    } else {
        label += " (All Levels)";
    }
    return label;
}

function renderTreeVariantBar() {
    const dropdown  = document.getElementById("tree-variant-dropdown");
    const lvlMin    = document.getElementById("tree-lvl-min");
    const lvlMax    = document.getElementById("tree-lvl-max");
    const deleteBtn = document.getElementById("btn-tree-delete");
    if (!dropdown) return;

    const trees = window.buildState.passive_trees;
    const idx   = window.currentTreeIndex;

    // Rebuild dropdown
    dropdown.innerHTML = "";
    trees.forEach((tree, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = buildVariantLabel(tree, i);
        if (i === idx) opt.selected = true;
        dropdown.appendChild(opt);
    });

    // Level inputs
    const cur = trees[idx];
    if (cur.level_interval && Array.isArray(cur.level_interval)) {
        lvlMin.value = cur.level_interval[0] ?? "";
        lvlMax.value = cur.level_interval[1] ?? "";
    } else {
        lvlMin.value = "";
        lvlMax.value = "";
    }

    // Delete only shown when >1 variant
    if (deleteBtn) {
        deleteBtn.classList.toggle("hidden", trees.length <= 1);
    }
}

function switchToTreeVariant(index) {
    const trees = window.buildState.passive_trees;
    if (index < 0 || index >= trees.length) return;
    window.currentTreeIndex = index;
    syncPassivesAlias();
    renderTreeVariantBar();
    if (window.renderTree) window.renderTree();
}

function setupTreeVariantEvents() {
    const dropdown  = document.getElementById("tree-variant-dropdown");
    const lvlMin    = document.getElementById("tree-lvl-min");
    const lvlMax    = document.getElementById("tree-lvl-max");
    const dupBtn    = document.getElementById("btn-tree-duplicate");
    const addBtn    = document.getElementById("btn-tree-add-new");
    const deleteBtn = document.getElementById("btn-tree-delete");
    if (!dropdown) return;

    dropdown.addEventListener("change", e => {
        switchToTreeVariant(parseInt(e.target.value));
    });

    const applyInterval = () => {
        const minVal = parseInt(lvlMin.value);
        const maxVal = parseInt(lvlMax.value);
        const interval = (!isNaN(minVal) || !isNaN(maxVal))
            ? [isNaN(minVal) ? 0 : minVal, isNaN(maxVal) ? 100 : maxVal]
            : null;
        window.buildState.passive_trees[window.currentTreeIndex].level_interval = interval;
        markAsDirty();
        renderTreeVariantBar();
    };
    lvlMin.addEventListener("change", applyInterval);
    lvlMax.addEventListener("change", applyInterval);

    dupBtn.addEventListener("click", () => {
        const cur = window.buildState.passive_trees[window.currentTreeIndex];
        window.buildState.passive_trees.push({
            level_interval: cur.level_interval ? [...cur.level_interval] : null,
            nodes: cur.nodes.map(n => ({ ...n }))
        });
        window.currentTreeIndex = window.buildState.passive_trees.length - 1;
        syncPassivesAlias();
        markAsDirty();
        renderTreeVariantBar();
        if (window.renderTree) window.renderTree();
    });

    addBtn.addEventListener("click", () => {
        window.buildState.passive_trees.push({ level_interval: null, nodes: [] });
        window.currentTreeIndex = window.buildState.passive_trees.length - 1;
        syncPassivesAlias();
        markAsDirty();
        renderTreeVariantBar();
        if (window.renderTree) window.renderTree();
    });

    deleteBtn.addEventListener("click", async () => {
        if (window.buildState.passive_trees.length <= 1) return;
        if (!(await showConfirm("Delete Tree Variant", "Delete this passive tree variant? All allocated nodes for it will be lost."))) return;
        window.buildState.passive_trees.splice(window.currentTreeIndex, 1);
        window.currentTreeIndex = Math.max(0, window.currentTreeIndex - 1);
        syncPassivesAlias();
        markAsDirty();
        renderTreeVariantBar();
        if (window.renderTree) window.renderTree();
    });
}

// Expose globals
window.renderTreeVariantBar = renderTreeVariantBar;
window.setupTreeVariantEvents = setupTreeVariantEvents;
