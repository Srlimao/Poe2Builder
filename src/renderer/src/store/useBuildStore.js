import { create } from 'zustand';

const defaultStandardSlots = [
  { id: "Helm1",        label: "Helmet" },
  { id: "Amulet1",      label: "Amulet" },
  { id: "Weapon1",      label: "Weapon 1" },
  { id: "BodyArmour1",  label: "Body Armour" },
  { id: "Offhand1",     label: "Off Hand / Shield" },
  { id: "Gloves1",      label: "Gloves" },
  { id: "Ring1",        label: "Left Ring" },
  { id: "Ring2",        label: "Right Ring" },
  { id: "Belt1",        label: "Belt" },
  { id: "Boots1",       label: "Boots" }
];

export const useBuildStore = create((set, get) => ({
  // Core build state
  buildState: {
    name: "New Titan Build",
    author: "",
    description: "",
    ascendancy: "",
    skills: [],
    equipment_sets: [{ level_interval: null, slots: defaultStandardSlots.map(s => ({ inventory_id: s.id, unique_name: "", additional_text: "" })) }],
    passive_trees: [{ level_interval: null, nodes: [] }]
  },

  // Editor states
  currentTreeIndex: 0,
  currentEquipmentSetIndex: 0,
  currentFilePath: null,
  isDirty: false,
  selectedElement: null, // { type: 'slot'|'skill'|'support'|'passive', id, skillIndex, supportIndex }
  debugMode: false,
  theme: localStorage.getItem('poe2_planner_theme') || 'default',

  // PoE integration state
  poeUser: null,
  poeLoading: false,

  // Databases
  activeGemsDb: [],
  supportGemsDb: [],
  uniquesDb: [],
  ascendancies: [],

  // Modal State
  modal: null, // null or { type: 'alert'|'confirm'|'prompt'|'pob2', title, message, resolve, pob2Result }

  // Tooltip State
  tooltip: null, // null or { gemId, rect }

  // Modal Actions
  openModal: (modalConfig) => set({ modal: modalConfig }),
  closeModal: (result) => {
    const { modal } = get();
    if (modal && modal.resolve) {
      modal.resolve(result);
    }
    set({ modal: null });
  },

  // Tooltip Actions
  showTooltip: (gemId, rect) => set({ tooltip: { gemId, rect } }),
  hideTooltip: () => set({ tooltip: null }),

  // Setters for databases
  setDbs: (active, support, uniques) => set({ activeGemsDb: active, supportGemsDb: support, uniquesDb: uniques }),
  setAscendancies: (ascendancies) => set({ ascendancies }),

  // Basic flags setters
  setCurrentFilePath: (path) => set({ currentFilePath: path }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setSelectedElement: (element) => set({ selectedElement: element }),
  setCurrentTreeIndex: (index) => set({ currentTreeIndex: index }),
  setCurrentEquipmentSetIndex: (index) => set({ currentEquipmentSetIndex: index }),
  setDebugMode: (val) => set({ debugMode: val }),
  setTheme: (theme) => {
    localStorage.setItem('poe2_planner_theme', theme);
    set({ theme });
  },

  // Set entire state from external load
  setBuildState: (newBuildState) => set({ buildState: newBuildState, isDirty: false }),

  // Reset helper
  resetToNewBuild: () => {
    set({
      buildState: {
        name: "New Titan Build",
        author: "",
        description: "",
        ascendancy: "",
        skills: [],
        equipment_sets: [{ level_interval: null, slots: defaultStandardSlots.map(s => ({ inventory_id: s.id, unique_name: "", additional_text: "" })) }],
        passive_trees: [{ level_interval: null, nodes: [] }]
      },
      currentTreeIndex: 0,
      currentEquipmentSetIndex: 0,
      currentFilePath: null,
      isDirty: false,
      selectedElement: null
    });
  },

  // Edit build metadata
  updateMeta: (field, value) => set((state) => ({
    buildState: { ...state.buildState, [field]: value },
    isDirty: true
  })),

  // Skills Mutations
  addSkill: () => {
    const newSkill = {
      id: "Metadata/Items/Gems/SkillGemNewSkill",
      level_interval: null,
      additional_text: "",
      support_skills: []
    };
    set((state) => {
      const skills = [...state.buildState.skills, newSkill];
      return {
        buildState: { ...state.buildState, skills },
        selectedElement: {
          type: 'skill',
          skillIndex: skills.length - 1,
          id: newSkill.id
        },
        isDirty: true
      };
    });
  },

  deleteSkill: (skillIndex) => set((state) => {
    const skills = [...state.buildState.skills];
    skills.splice(skillIndex, 1);
    
    // Clear selection if it was the deleted skill or its support
    let selectedElement = state.selectedElement;
    if (selectedElement && selectedElement.skillIndex === skillIndex) {
      selectedElement = null;
    } else if (selectedElement && selectedElement.skillIndex > skillIndex) {
      // Adjust index
      selectedElement = {
        ...selectedElement,
        skillIndex: selectedElement.skillIndex - 1
      };
    }

    return {
      buildState: { ...state.buildState, skills },
      selectedElement,
      isDirty: true
    };
  }),

  updateSkill: (skillIndex, fields) => set((state) => {
    const skills = [...state.buildState.skills];
    skills[skillIndex] = { ...skills[skillIndex], ...fields };
    return {
      buildState: { ...state.buildState, skills },
      isDirty: true
    };
  }),

  addSupportSkill: (skillIndex) => set((state) => {
    const skills = [...state.buildState.skills];
    const newSupport = {
      id: "Metadata/Items/Gems/SupportGemNewSupport",
      level_interval: skills[skillIndex].level_interval ?? null,
      additional_text: ""
    };
    const updatedSkill = {
      ...skills[skillIndex],
      support_skills: [...(skills[skillIndex].support_skills || []), newSupport]
    };
    skills[skillIndex] = updatedSkill;

    return {
      buildState: { ...state.buildState, skills },
      selectedElement: {
        type: 'support',
        skillIndex,
        supportIndex: updatedSkill.support_skills.length - 1,
        id: newSupport.id
      },
      isDirty: true
    };
  }),

  deleteSupportSkill: (skillIndex, supportIndex) => set((state) => {
    const skills = [...state.buildState.skills];
    const skill = { ...skills[skillIndex] };
    const support_skills = [...(skill.support_skills || [])];
    support_skills.splice(supportIndex, 1);
    skill.support_skills = support_skills;
    skills[skillIndex] = skill;

    let selectedElement = state.selectedElement;
    if (selectedElement && selectedElement.skillIndex === skillIndex && selectedElement.supportIndex === supportIndex) {
      selectedElement = null;
    } else if (selectedElement && selectedElement.skillIndex === skillIndex && selectedElement.supportIndex > supportIndex) {
      selectedElement = {
        ...selectedElement,
        supportIndex: selectedElement.supportIndex - 1
      };
    }

    return {
      buildState: { ...state.buildState, skills },
      selectedElement,
      isDirty: true
    };
  }),

  updateSupportSkill: (skillIndex, supportIndex, fields) => set((state) => {
    const skills = [...state.buildState.skills];
    const skill = { ...skills[skillIndex] };
    const support_skills = [...(skill.support_skills || [])];
    support_skills[supportIndex] = { ...support_skills[supportIndex], ...fields };
    skill.support_skills = support_skills;
    skills[skillIndex] = skill;

    return {
      buildState: { ...state.buildState, skills },
      isDirty: true
    };
  }),

  // Passive tree variant mutations
  addTreeVariant: () => set((state) => {
    const passive_trees = [...state.buildState.passive_trees, { level_interval: null, nodes: [] }];
    return {
      buildState: { ...state.buildState, passive_trees },
      currentTreeIndex: passive_trees.length - 1,
      isDirty: true
    };
  }),

  duplicateTreeVariant: (index) => set((state) => {
    const originalTree = state.buildState.passive_trees[index];
    const copiedNodes = originalTree.nodes.map(n => ({ ...n }));
    const newTree = {
      level_interval: originalTree.level_interval ? [...originalTree.level_interval] : null,
      nodes: copiedNodes
    };
    const passive_trees = [...state.buildState.passive_trees, newTree];
    return {
      buildState: { ...state.buildState, passive_trees },
      currentTreeIndex: passive_trees.length - 1,
      isDirty: true
    };
  }),

  deleteTreeVariant: (index) => set((state) => {
    const passive_trees = [...state.buildState.passive_trees];
    passive_trees.splice(index, 1);
    const newIndex = Math.max(0, Math.min(state.currentTreeIndex, passive_trees.length - 1));
    return {
      buildState: { ...state.buildState, passive_trees },
      currentTreeIndex: newIndex,
      isDirty: true,
      selectedElement: null
    };
  }),

  updateTreeVariantInterval: (index, interval) => set((state) => {
    const passive_trees = [...state.buildState.passive_trees];
    passive_trees[index] = { ...passive_trees[index], level_interval: interval };
    return {
      buildState: { ...state.buildState, passive_trees },
      isDirty: true
    };
  }),

  updateTreeVariantNodes: (index, nodes) => set((state) => {
    const passive_trees = [...state.buildState.passive_trees];
    passive_trees[index] = { ...passive_trees[index], nodes };
    return {
      buildState: { ...state.buildState, passive_trees },
      isDirty: true
    };
  }),

  togglePassiveNode: (nodeId, name) => set((state) => {
    const passive_trees = [...state.buildState.passive_trees];
    const currentTree = { ...passive_trees[state.currentTreeIndex] };
    const nodes = [...currentTree.nodes];

    const idx = nodes.findIndex(p => p.id === nodeId);
    let selectedElement = state.selectedElement;

    if (idx > -1) {
      nodes.splice(idx, 1);
      if (selectedElement && selectedElement.type === 'passive' && selectedElement.id === nodeId) {
        selectedElement = null;
      }
    } else {
      nodes.push({ id: nodeId, additional_text: "" });
      selectedElement = { type: 'passive', id: nodeId };
    }

    currentTree.nodes = nodes;
    passive_trees[state.currentTreeIndex] = currentTree;

    return {
      buildState: { ...state.buildState, passive_trees },
      selectedElement,
      isDirty: true
    };
  }),

  updatePassiveText: (nodeId, text) => set((state) => {
    const passive_trees = [...state.buildState.passive_trees];
    const currentTree = { ...passive_trees[state.currentTreeIndex] };
    const nodes = currentTree.nodes.map(n => n.id === nodeId ? { ...n, additional_text: text } : n);
    
    currentTree.nodes = nodes;
    passive_trees[state.currentTreeIndex] = currentTree;

    return {
      buildState: { ...state.buildState, passive_trees },
      isDirty: true
    };
  }),

  // Equipment sets mutations
  addEquipmentSet: () => set((state) => {
    const newSet = {
      level_interval: null,
      slots: defaultStandardSlots.map(s => ({ inventory_id: s.id, unique_name: "", additional_text: "" }))
    };
    const equipment_sets = [...state.buildState.equipment_sets, newSet];
    return {
      buildState: { ...state.buildState, equipment_sets },
      currentEquipmentSetIndex: equipment_sets.length - 1,
      isDirty: true
    };
  }),

  duplicateEquipmentSet: (index) => set((state) => {
    const originalSet = state.buildState.equipment_sets[index] || state.buildState.equipment_sets[0];
    const copiedSlots = originalSet.slots.map(s => ({ ...s }));
    const newSet = {
      level_interval: originalSet.level_interval ? [...originalSet.level_interval] : null,
      slots: copiedSlots
    };
    const equipment_sets = [...state.buildState.equipment_sets, newSet];
    return {
      buildState: { ...state.buildState, equipment_sets },
      currentEquipmentSetIndex: equipment_sets.length - 1,
      isDirty: true
    };
  }),

  deleteEquipmentSet: (index) => set((state) => {
    const equipment_sets = [...state.buildState.equipment_sets];
    equipment_sets.splice(index, 1);
    const newIndex = Math.max(0, Math.min(state.currentEquipmentSetIndex, equipment_sets.length - 1));
    return {
      buildState: { ...state.buildState, equipment_sets },
      currentEquipmentSetIndex: newIndex,
      isDirty: true,
      selectedElement: null
    };
  }),

  updateEquipmentSetInterval: (index, interval) => set((state) => {
    const equipment_sets = [...state.buildState.equipment_sets];
    equipment_sets[index] = { ...equipment_sets[index], level_interval: interval };
    return {
      buildState: { ...state.buildState, equipment_sets },
      isDirty: true
    };
  }),

  updateEquipmentSlot: (slotId, fields) => set((state) => {
    const equipment_sets = [...state.buildState.equipment_sets];
    const currentSet = { ...equipment_sets[state.currentEquipmentSetIndex] };
    const slots = currentSet.slots.map(s => {
      if (s.inventory_id === slotId) {
        return { ...s, ...fields };
      }
      return s;
    });
    currentSet.slots = slots;
    equipment_sets[state.currentEquipmentSetIndex] = currentSet;
    return {
      buildState: { ...state.buildState, equipment_sets },
      isDirty: true
    };
  }),

  checkPoEAuthStatus: async () => {
    try {
      const res = await fetch('/api/poe/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.loggedIn) {
          set({ poeUser: { name: data.name } });
        } else {
          set({ poeUser: null });
        }
      }
    } catch (e) {
      console.error('Failed to check PoE auth status:', e);
    }
  },

  loginWithPoE: () => {
    window.location.href = '/api/auth/login';
  },

  logoutPoE: async () => {
    set({ poeLoading: true });
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        set({ poeUser: null });
      }
    } catch (e) {
      console.error('Failed to log out:', e);
    } finally {
      set({ poeLoading: false });
    }
  },

  uploadBuildToPoE: async () => {
    const buildState = get().buildState;
    if (!buildState) throw new Error('No build data to upload');

    const res = await fetch('/api/poe/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildState)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status} - Upload failed`);
    }

    return await res.json();
  }
}));

// Promise-based UI Modal triggers
export const showAlert = (title, message) => {
  return new Promise((resolve) => {
    useBuildStore.getState().openModal({
      type: 'alert',
      title,
      message,
      resolve
    });
  });
};

export const showConfirm = (title, message) => {
  return new Promise((resolve) => {
    useBuildStore.getState().openModal({
      type: 'confirm',
      title,
      message,
      resolve
    });
  });
};

export const showPrompt = (title, message) => {
  return new Promise((resolve) => {
    useBuildStore.getState().openModal({
      type: 'prompt',
      title,
      message,
      resolve
    });
  });
};

export const showPob2ImportPrompt = () => {
  return new Promise((resolve) => {
    useBuildStore.getState().openModal({
      type: 'pob2-prompt',
      title: 'Import PoB2 Build',
      resolve
    });
  });
};

export const showPob2ImportOptions = (pob2Result) => {
  return new Promise((resolve) => {
    useBuildStore.getState().openModal({
      type: 'pob2',
      title: 'POB2 IMPORT OPTIONS',
      pob2Result,
      resolve
    });
  });
};

export const executePob2Import = async (result) => {
  try {
    const options = await showPob2ImportOptions(result);
    if (!options) return;

    const selectMatchedAscendancy = (className, ascendancyName) => {
      let targetText = className + " (General)";
      if (ascendancyName && ascendancyName !== "None") {
        targetText = className + " (" + ascendancyName + ")";
      }
      
      const ascendancies = useBuildStore.getState().ascendancies;
      const matched = ascendancies.find(asc => asc.name === targetText);
      if (matched) return matched.id;
      
      return ascendancyName && ascendancyName !== "None" ? ascendancyName : className;
    };

    useBuildStore.setState((state) => {
      const nextState = { ...state.buildState };
      let nextTreeIndex = state.currentTreeIndex;
      let nextEquipmentSetIndex = state.currentEquipmentSetIndex;
      let nextSelectedElement = state.selectedElement;

      if (result.buildName) {
        nextState.name = result.buildName;
      }
      if (result.author) {
        nextState.author = result.author;
      }

      if (options.selectedTrees && options.selectedTrees.length > 0) {
        if (options.resetAll) {
          nextState.passive_trees = [];
        }
        options.selectedTrees.forEach(idx => {
          const chosenPassives = result.trees[idx].passives;
          const chosenLevelInterval = result.trees[idx].level_interval || null;
          const mappedPassives = chosenPassives.map(p => typeof p === 'string' ? { id: p, additional_text: "" } : p);
          nextState.passive_trees.push({ level_interval: chosenLevelInterval, nodes: mappedPassives });
        });
        nextTreeIndex = nextState.passive_trees.length - 1;

        if (result.className) {
          nextState.ascendancy = selectMatchedAscendancy(result.className, result.ascendancyName);
        } else {
          nextState.ascendancy = "";
        }
      }

      if (options.selectedSkillSets && options.selectedSkillSets.length > 0) {
        if (options.resetAll) {
          nextState.skills = [];
        }
        options.selectedSkillSets.forEach(idx => {
          const chosenSkills = result.skillSets[idx].skills;
          if (chosenSkills && chosenSkills.length > 0) {
            nextState.skills.push(...chosenSkills);
          }
        });
        if (nextSelectedElement && (nextSelectedElement.type === 'skill' || nextSelectedElement.type === 'support')) {
          nextSelectedElement = null;
        }
      }

      if (options.selectedGearSets && options.selectedGearSets.length > 0) {
        if (options.resetAll) {
          nextState.equipment_sets = [];
        }
        const defaultStandardSlots = [
          { id: "Helm1",        label: "Helmet" },
          { id: "Amulet1",      label: "Amulet" },
          { id: "Weapon1",      label: "Weapon 1" },
          { id: "BodyArmour1",  label: "Body Armour" },
          { id: "Offhand1",     label: "Off Hand / Shield" },
          { id: "Gloves1",      label: "Gloves" },
          { id: "Ring1",        label: "Left Ring" },
          { id: "Ring2",        label: "Right Ring" },
          { id: "Belt1",        label: "Belt" },
          { id: "Boots1",       label: "Boots" }
        ];

        options.selectedGearSets.forEach((idx, i) => {
          const pobSet = result.itemSets[idx];
          
          const slots = defaultStandardSlots.map(s => {
            const match = pobSet.inventory_slots.find(x => x.inventory_id === s.id);
            return {
              inventory_id: s.id,
              unique_name: match?.unique_name || "",
              additional_text: match?.additional_text || ""
            };
          });
          
          pobSet.inventory_slots.forEach(s => {
            if (!defaultStandardSlots.some(x => x.id === s.inventory_id)) {
              slots.push({
                inventory_id: s.inventory_id,
                unique_name: s.unique_name || "",
                additional_text: s.additional_text || ""
              });
            }
          });

          const N = options.selectedGearSets.length;
          const start = Math.floor(i * (100 / N)) + 1;
          const end = (i === N - 1) ? 100 : Math.floor((i + 1) * (100 / N));
          const level_interval = N > 1 ? [start, end] : null;

          nextState.equipment_sets.push({
            level_interval,
            slots
          });
        });

        if (nextState.equipment_sets.length > 0) {
          nextEquipmentSetIndex = nextState.equipment_sets.length - 1;
        }

        if (nextSelectedElement && nextSelectedElement.type === 'slot') {
          nextSelectedElement = null;
        }
      }

      return {
        buildState: nextState,
        currentTreeIndex: nextTreeIndex,
        currentEquipmentSetIndex: nextEquipmentSetIndex,
        selectedElement: nextSelectedElement,
        isDirty: true
      };
    });

    let msgs = [];
    if (options.selectedTrees && options.selectedTrees.length > 0) msgs.push(`${options.selectedTrees.length} passive trees`);
    if (options.selectedSkillSets && options.selectedSkillSets.length > 0) msgs.push(`${options.selectedSkillSets.length} skill sets`);
    if (options.selectedGearSets && options.selectedGearSets.length > 0) msgs.push(`${options.selectedGearSets.length} gear sets`);

    await showAlert("Success", `Successfully imported: ${msgs.join(', ')}.`);
  } catch (err) {
    await showAlert("Error", "Failed to import: " + err.message);
  }
};
