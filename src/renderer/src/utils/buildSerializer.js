const defaultStandardSlots = [
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

export function parsePassiveNodes(arr) {
  const nodes = [];
  arr.forEach(p => {
    if (typeof p === 'string') {
      nodes.push({ id: p, additional_text: "" });
    } else if (typeof p === 'object' && p.id) {
      nodes.push({ id: p.id, additional_text: p.additional_text || "" });
    }
  });
  return nodes;
}

export function loadBuildJson(json) {
  if (!json || typeof json !== 'object') return null;

  const buildState = {
    name: json.name || "Untitled Build",
    author: json.author || "",
    description: json.description || "",
    ascendancy: json.ascendancy || "",
    skills: [],
    inventory_slots: [],
    passive_trees: []
  };

  // ── Passive trees (from flat passives array) ────────────────────────
  if (Array.isArray(json.passives) && json.passives.length > 0) {
    const groups = [];
    const findGroup = (interval) => {
      return groups.find(g => {
        if (!g.level_interval && !interval) return true;
        if (!g.level_interval || !interval) return false;
        if (Array.isArray(g.level_interval) && Array.isArray(interval)) {
          return g.level_interval[0] === interval[0] && g.level_interval[1] === interval[1];
        }
        return g.level_interval === interval;
      });
    };

    json.passives.forEach(p => {
      let id = "";
      let text = "";
      let interval = null;
      if (typeof p === 'string') {
        id = p;
      } else if (typeof p === 'object' && p.id) {
        id = p.id;
        text = p.additional_text || "";
        interval = p.level_interval || null;
      }
      if (id) {
        let group = findGroup(interval);
        if (!group) {
          group = { level_interval: interval, nodes: [] };
          groups.push(group);
        }
        group.nodes.push({ id: id, additional_text: text });
      }
    });

    groups.forEach(g => buildState.passive_trees.push(g));
  } else if (Array.isArray(json.passive_trees) && json.passive_trees.length > 0) {
    json.passive_trees.forEach(tree => {
      const nodes = parsePassiveNodes(tree.nodes || []);
      buildState.passive_trees.push({
        level_interval: tree.level_interval || null,
        nodes
      });
    });
  }

  if (buildState.passive_trees.length === 0) {
    buildState.passive_trees.push({ level_interval: null, nodes: [] });
  }

  // ── Skills ──────────────────────────────────────────────────
  if (Array.isArray(json.skills)) {
    json.skills.forEach(s => {
      let skillObj = { id: "", level_interval: null, additional_text: "", support_skills: [] };
      if (typeof s === 'string') {
        skillObj.id = s;
      } else if (typeof s === 'object') {
        skillObj.id = s.id || "";
        skillObj.level_interval = s.level_interval || null;
        skillObj.additional_text = s.additional_text || "";
        if (Array.isArray(s.support_skills)) {
          s.support_skills.forEach(sup => {
            let supportObj = { id: "", level_interval: null, additional_text: "" };
            if (typeof sup === 'string') {
              supportObj.id = sup;
            } else if (typeof sup === 'object') {
              supportObj.id = sup.id || "";
              supportObj.level_interval = sup.level_interval || null;
              supportObj.additional_text = sup.additional_text || "";
            }
            skillObj.support_skills.push(supportObj);
          });
        }
      }
      buildState.skills.push(skillObj);
    });
  }

  // ── Inventory Slots ─────────────────────────────────────────
  const loadedSlots = Array.isArray(json.inventory_slots) ? json.inventory_slots : [];
  defaultStandardSlots.forEach(s => {
    const matchingSlots = loadedSlots.filter(x => x.inventory_id === s.id);
    if (matchingSlots.length > 0) {
      matchingSlots.forEach(found => {
        buildState.inventory_slots.push({
          inventory_id: s.id,
          level_interval: found.level_interval || null,
          unique_name: found.unique_name || "",
          additional_text: found.additional_text || ""
        });
      });
    } else {
      buildState.inventory_slots.push({ inventory_id: s.id, additional_text: "" });
    }
  });
  loadedSlots.forEach(s => {
    if (!defaultStandardSlots.some(x => x.id === s.inventory_id)) {
      buildState.inventory_slots.push({
        inventory_id: s.inventory_id,
        level_interval: s.level_interval || null,
        unique_name: s.unique_name || "",
        additional_text: s.additional_text || ""
      });
    }
  });

  return buildState;
}

export function exportBuildJson(buildState) {
  const json = {
    name: buildState.name,
    author: buildState.author || undefined,
    description: buildState.description || undefined,
    ascendancy: buildState.ascendancy || undefined
  };

  // Passives (flattened from passive_trees to comply with spec)
  if (buildState.passive_trees && buildState.passive_trees.length > 0) {
    const passivesOut = [];
    buildState.passive_trees.forEach(tree => {
      if (tree.nodes && tree.nodes.length > 0) {
        tree.nodes.forEach(p => {
          const id = typeof p === 'string' ? p : p.id;
          const text = typeof p === 'string' ? undefined : p.additional_text;
          
          if (!tree.level_interval && !text) {
            passivesOut.push(id);
          } else {
            const outNode = { id: id };
            if (tree.level_interval) outNode.level_interval = tree.level_interval;
            if (text) outNode.additional_text = text;
            passivesOut.push(outNode);
          }
        });
      }
    });
    if (passivesOut.length > 0) {
      json.passives = passivesOut;
    }
  }

  // Skills
  json.skills = buildState.skills.map(s => {
    const out = { id: s.id };
    if (s.level_interval) out.level_interval = s.level_interval;
    if (s.additional_text) out.additional_text = s.additional_text;
    if (s.support_skills && s.support_skills.length > 0) {
      out.support_skills = s.support_skills.map(sup => {
        if (!sup.additional_text && !sup.level_interval) return sup.id;
        const supOut = { id: sup.id };
        if (sup.level_interval) supOut.level_interval = sup.level_interval;
        if (sup.additional_text) supOut.additional_text = sup.additional_text;
        return supOut;
      });
    }
    return out;
  });

  // Inventory slots (only populated ones)
  const activeSlots = buildState.inventory_slots.filter(s => s.additional_text || s.unique_name || s.level_interval);
  if (activeSlots.length > 0) {
    json.inventory_slots = activeSlots.map(s => {
      const out = { inventory_id: s.inventory_id };
      if (s.level_interval) out.level_interval = s.level_interval;
      if (s.unique_name) out.unique_name = s.unique_name;
      if (s.additional_text) out.additional_text = s.additional_text;
      return out;
    });
  }

  return json;
}
