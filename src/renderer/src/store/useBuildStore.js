import { create } from 'zustand';

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

export const useBuildStore = create((set, get) => ({
  // Core build state
  buildState: {
    name: "New Titan Build",
    author: "",
    description: "",
    ascendancy: "",
    skills: [],
    inventory_slots: defaultStandardSlots.map(s => ({ inventory_id: s.id, additional_text: "" })),
    passive_trees: [{ level_interval: null, nodes: [] }]
  },

  // Editor states
  currentTreeIndex: 0,
  currentFilePath: null,
  isDirty: false,
  selectedElement: null, // { type: 'slot'|'skill'|'support'|'passive', id, skillIndex, supportIndex, variantIndex }
  debugMode: false,

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
  setDebugMode: (val) => set({ debugMode: val }),

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
        inventory_slots: defaultStandardSlots.map(s => ({ inventory_id: s.id, additional_text: "" })),
        passive_trees: [{ level_interval: null, nodes: [] }]
      },
      currentTreeIndex: 0,
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

  // Equipment variants mutations
  addEquipmentVariant: (slotId) => set((state) => {
    const inventory_slots = [...state.buildState.inventory_slots, {
      inventory_id: slotId,
      additional_text: "",
      unique_name: "",
      level_interval: null
    }];
    const matchingVariants = inventory_slots.filter(x => x.inventory_id === slotId);
    return {
      buildState: { ...state.buildState, inventory_slots },
      selectedElement: {
        type: 'slot',
        id: slotId,
        variantIndex: matchingVariants.length - 1
      },
      isDirty: true
    };
  }),

  deleteEquipmentVariant: (slotId, variantIndex) => set((state) => {
    const inventory_slots = [...state.buildState.inventory_slots];
    
    // Find all slots matching slotId
    let matchCount = 0;
    let globalIndexToDelete = -1;
    for (let i = 0; i < inventory_slots.length; i++) {
      if (inventory_slots[i].inventory_id === slotId) {
        if (matchCount === variantIndex) {
          globalIndexToDelete = i;
          break;
        }
        matchCount++;
      }
    }

    if (globalIndexToDelete !== -1) {
      inventory_slots.splice(globalIndexToDelete, 1);
    }

    const remainingVariantsCount = inventory_slots.filter(x => x.inventory_id === slotId).length;
    const newVariantIndex = Math.max(0, Math.min(variantIndex, remainingVariantsCount - 1));

    return {
      buildState: { ...state.buildState, inventory_slots },
      selectedElement: remainingVariantsCount > 0 ? {
        type: 'slot',
        id: slotId,
        variantIndex: newVariantIndex
      } : null,
      isDirty: true
    };
  }),

  updateEquipmentVariant: (slotId, variantIndex, fields) => set((state) => {
    const inventory_slots = [...state.buildState.inventory_slots];
    
    let matchCount = 0;
    let globalIndexToUpdate = -1;
    for (let i = 0; i < inventory_slots.length; i++) {
      if (inventory_slots[i].inventory_id === slotId) {
        if (matchCount === variantIndex) {
          globalIndexToUpdate = i;
          break;
        }
        matchCount++;
      }
    }

    if (globalIndexToUpdate !== -1) {
      inventory_slots[globalIndexToUpdate] = {
        ...inventory_slots[globalIndexToUpdate],
        ...fields
      };
    }

    return {
      buildState: { ...state.buildState, inventory_slots },
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

export const showPob2ImportPrompt = (isElectron) => {
  return new Promise((resolve) => {
    useBuildStore.getState().openModal({
      type: 'pob2-prompt',
      title: 'Import PoB2 Build',
      isElectron,
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
