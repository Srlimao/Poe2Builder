# Future Plan: Interactive 2D Passive Skill Tree Visualizer

This document outlines the architectural and technical steps required to use our local `poe2_skilltree_data.json` to render a fully interactive, visual 2D map of the Path of Exile 2 Passive Skill Tree within the Build Planner Editor.

## 1. Data Analysis

The `poe2_skilltree_data.json` file contains all the mathematical and graphical data needed to perfectly recreate the tree. The key data objects we will utilize are:

* **Bounding Box**: `min_x`, `min_y`, `max_x`, `max_y`
  * *Purpose*: Defines the maximum limits of our panning camera and the overall canvas size.
* **`groups` Object**:
  * *Purpose*: Represents the central "hubs" or wheels of the tree. Each group has an `x` and `y` coordinate for its center, and dictates which nodes orbit around it.
* **`nodes` Object**:
  * *Purpose*: The actual passive nodes. Every node has absolute `x` and `y` coordinates.
  * *Metadata*: Contains `name` (e.g. "Shock Chance"), `stats` (array of text lines), and `icon` (path to the image asset).
* **`edges` Array**:
  * *Purpose*: Defines the pathways. Each edge is an object like `{ "from": "11578", "to": "48833" }`. This tells us exactly where to draw the connecting lines.

## 2. Technical Architecture

### Rendering Engine
Given the scale of the PoE2 tree (thousands of nodes, edges, and background tiles), standard DOM manipulation (like using thousands of `<div>` tags) will cause severe lag. 
**Recommendation**: Use **HTML5 `<canvas>`** API or **WebGL** (via a lightweight library like PixiJS) for raw rendering performance.

### Interaction (Pan & Zoom)
We must implement a 2D camera system. 
**Recommendation**: Use a library like `d3-zoom` or implement standard matrix transformations (Translate and Scale) on the Canvas context to allow users to drag the mouse to pan and use the scroll wheel to zoom.

## 3. Rendering Pipeline

The draw loop should execute in the following distinct layers (from bottom to top):

1. **Background Layer**: 
   * Draw the dark stone/gothic background patterns using the metadata found in the `tree` object.
2. **Pathways (Edges) Layer**:
   * Iterate through the `edges` array. Look up the `x/y` coordinates of the `from` and `to` nodes. 
   * Use `ctx.beginPath()`, `ctx.moveTo(fromX, fromY)`, and `ctx.lineTo(toX, toY)` to draw lines. Give them a dull color by default, and a bright gold color if both connected nodes are "allocated".
3. **Nodes Layer**:
   * Iterate through the `nodes` object.
   * Draw the node icons at their `x/y` coordinates. We will need to scale the size of the node based on whether it is a regular passive, a Notable, or a Keystone.
4. **UI / Tooltip Layer**:
   * Track mouse `x/y` relative to the transformed canvas.
   * On `mousemove`, calculate the distance to the nearest node. If the cursor is hovering over a node, render an HTML absolutely-positioned `<div>` as a tooltip, populating it with the node's `name` and `stats` array.

## 4. Integration with Build Planner State

The visual tree must stay perfectly synchronized with `buildState.passives` in `app.js`.

* **Two-Way Binding**: 
  * If a user imports a PoB2 code or manually adds a string ID to the `.build` file properties, the canvas must re-render, highlighting those nodes in gold.
  * If a user clicks a node on the canvas, the visualizer should emit an event. `app.js` will catch this event, verify if the node is connected to an active path, and if so, push its string ID (e.g., `"lightning14"`) into `buildState.passives` and toggle the `isDirty` flag.

## 5. Potential Challenges & Solutions

> [!WARNING]
> **Asset Management**: The JSON references image paths like `Art/2DArt/SkillIcons/passives/...`. We do not have these raw image files locally. We will either need to write a script to download the thousands of sprites from the export repository's `/assets/` directory, or dynamically fetch them from a CDN at runtime.

> [!TIP]
> **Performance Optimization**: To maintain 60 FPS while panning, implement **Spatial Hashing** or a **QuadTree**. This ensures the canvas only loops through and draws nodes/edges that are currently visible within the user's viewport, rather than rendering the entire tree out-of-bounds every frame.
