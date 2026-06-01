const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const zlib = require('zlib');
const { exec } = require('child_process');

// Workaround for Windows GPU cache locking bug that causes startup hangs
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0c0c0c',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    // Visual window polish
    title: "PoE2 Build Planner Editor",
    icon: path.join(__dirname, '..', 'renderer', 'icon.png') // Fallback if present
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Remove default menu for a more clean game-like UI
  mainWindow.setMenuBarVisibility(false);

  // Open the DevTools during development if needed
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers for File I/O
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'PoE2 Build Files', extensions: ['build'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return {
      filePath,
      content: JSON.parse(data)
    };
  } catch (error) {
    console.error('Error reading build file:', error);
    throw new Error('Failed to read or parse file: ' + error.message);
  }
});

ipcMain.handle('save-file', async (event, { filePath, content }) => {
  try {
    const jsonString = JSON.stringify(content, null, 4);
    fs.writeFileSync(filePath, jsonString, 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error saving build file:', error);
    throw new Error('Failed to save file: ' + error.message);
  }
});

ipcMain.handle('save-file-as-dialog', async (event, { content, defaultFilename }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Build File As',
    defaultPath: defaultFilename || 'new_build.build',
    filters: [
      { name: 'PoE2 Build Files', extensions: ['build'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  const filePath = result.filePath;
  try {
    const jsonString = JSON.stringify(content, null, 4);
    fs.writeFileSync(filePath, jsonString, 'utf-8');
    return {
      filePath,
      success: true
    };
  } catch (error) {
    console.error('Error saving build file as:', error);
    throw new Error('Failed to save file: ' + error.message);
  }
});

ipcMain.handle('get-default-build-path', () => {
  // C:/Users/Name/Documents/My Games/Path of Exile 2/BuildPlanner
  const homeDir = os.homedir();
  const poe2Path = path.join(homeDir, 'Documents', 'My Games', 'Path of Exile 2', 'BuildPlanner');
  return {
    path: poe2Path,
    exists: fs.existsSync(poe2Path)
  };
});

ipcMain.handle('save-to-default-path', async (event, { content, filename }) => {
  const homeDir = os.homedir();
  const dirPath = path.join(homeDir, 'Documents', 'My Games', 'Path of Exile 2', 'BuildPlanner');
  
  // Ensure the directory exists
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
    } catch (error) {
      console.error('Error creating default build directory:', error);
      throw new Error('Failed to create BuildPlanner directory: ' + error.message);
    }
  }

  const filePath = path.join(dirPath, filename);
  try {
    const jsonString = JSON.stringify(content, null, 4);
    fs.writeFileSync(filePath, jsonString, 'utf-8');
    return {
      filePath,
      success: true
    };
  } catch (error) {
    console.error('Error saving to default path:', error);
    throw new Error('Failed to save to default path: ' + error.message);
  }
});

// Extra: Read local gem database files directly if they exist, so we don't have to fetch them if run locally
ipcMain.handle('read-local-json', async (event, filename) => {
  const filePath = path.join(__dirname, '..', '..', 'data', filename);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
    return null;
  } catch (err) {
    console.error(`Error reading local JSON file ${filename}:`, err);
    return null;
  }
});

// Import PoB2 Build Code and map passive nodes
ipcMain.handle('import-pob2', async (event, base64Code) => {
  try {
    // 1. Base64url to Base64
    let b64 = base64Code.replace(/-/g, '+').replace(/_/g, '/');
    let buffer = Buffer.from(b64, 'base64');
    
    // 2. zlib inflate
    let decompressed = zlib.inflateSync(buffer).toString('utf-8');
    
    // 3. Load mapping and extract multiple passive trees (<Spec>)
    const mappingPath = path.join(__dirname, '..', '..', 'data', 'passive_mapping.json');
    if (!fs.existsSync(mappingPath)) {
        throw new Error("passive_mapping.json mapping file not found.");
    }
    const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));

    let trees = [];
    let specBlocks = decompressed.match(/<Spec[^>]*>/g) || [];
    for (let spec of specBlocks) {
        let titleMatch = spec.match(/title="([^"]*)"/);
        let nodesMatch = spec.match(/nodes="([^"]*)"/);
        if (nodesMatch) {
            let numericNodes = nodesMatch[1].split(',').map(n => n.trim()).filter(n => n);
            let stringNodes = [];
            numericNodes.forEach(num => {
                if (mapping[num]) stringNodes.push(mapping[num]);
            });
            trees.push({
                title: titleMatch ? titleMatch[1] : `Tree ${trees.length + 1}`,
                passives: stringNodes
            });
        }
    }
    
    if (trees.length === 0) {
      throw new Error("Could not find nodes in PoB2 build data.");
    }
    
    // 4. Extract class metadata
    let className = null;
    let ascendancyName = null;
    let classNameMatch = decompressed.match(/<Build[^>]*className="([^"]*)"/);
    let ascendNameMatch = decompressed.match(/<Build[^>]*ascendClassName="([^"]*)"/);
    
    if (classNameMatch) className = classNameMatch[1];
    if (ascendNameMatch) ascendancyName = ascendNameMatch[1];
    
    // 5. Extract multiple skill sets
    let skillSets = [];
    let skillsWrapperMatch = decompressed.match(/<Skills[^>]*>([\s\S]*?)<\/Skills>/);
    if (skillsWrapperMatch) {
        let skillsInner = skillsWrapperMatch[1];
        let setBlocks = skillsInner.match(/<SkillSet[^>]*>([\s\S]*?)<\/SkillSet>/g);
        
        const parseSkillsFromBlock = (blockStr) => {
            let skillsMap = {};
            let skillBlocks = blockStr.match(/<Skill [^>]*>([\s\S]*?)<\/Skill>/g) || [];
            for (let block of skillBlocks) {
                let gemStrs = block.match(/<Gem [^>]*>/g) || [];
                let parsedGems = [];
                for (let gemStr of gemStrs) {
                    let idMatch = gemStr.match(/gemId="([^"]*)"/);
                    let lvlMatch = gemStr.match(/level="([^"]*)"/);
                    if (idMatch) {
                        parsedGems.push({
                            id: idMatch[1],
                            level: lvlMatch ? parseInt(lvlMatch[1], 10) : 1
                        });
                    }
                }
                if (parsedGems.length > 0) {
                    let activeGem = parsedGems[0];
                    let existingSkill = skillsMap[activeGem.id];
                    if (!existingSkill) {
                        existingSkill = {
                            id: activeGem.id,
                            level_interval: [activeGem.level, activeGem.level],
                            additional_text: "",
                            support_skills: []
                        };
                        skillsMap[activeGem.id] = existingSkill;
                    }
                    for (let i = 1; i < parsedGems.length; i++) {
                        let supportId = parsedGems[i].id;
                        let hasSupport = existingSkill.support_skills.some(sup => sup.id === supportId);
                        if (!hasSupport) {
                            existingSkill.support_skills.push({
                                id: supportId,
                                level_interval: [parsedGems[i].level, parsedGems[i].level],
                                additional_text: ""
                            });
                        }
                    }
                }
            }
            return Object.values(skillsMap);
        };

        if (setBlocks && setBlocks.length > 0) {
            for (let setBlock of setBlocks) {
                let titleMatch = setBlock.match(/<SkillSet[^>]*title="([^"]*)"/);
                let parsedSkills = parseSkillsFromBlock(setBlock);
                skillSets.push({
                    title: titleMatch ? titleMatch[1] : `Skill Set ${skillSets.length + 1}`,
                    skills: parsedSkills
                });
            }
        } else {
            // Fallback for older formats without <SkillSet>
            let parsedSkills = parseSkillsFromBlock(skillsInner);
            if (parsedSkills.length > 0) {
                skillSets.push({ title: "Default Skill Set", skills: parsedSkills });
            }
        }
    }

    // 6. Extract Items
    let itemsMap = {}; // itemId -> additional_text string
    let itemSets = [];
    let itemsMatch = decompressed.match(/<Items([^>]*)>([\s\S]*?)<\/Items>/);
    
    if (itemsMatch) {
        let itemsAttrs = itemsMatch[1];
        let itemsInner = itemsMatch[2];
        let activeItemSetId = "1";
        let activeSetMatch = itemsAttrs.match(/activeItemSet="([^"]*)"/);
        if (activeSetMatch) {
            activeItemSetId = activeSetMatch[1];
        }

        // Parse individual items
        let itemBlocks = itemsInner.match(/<Item[^>]*>([\s\S]*?)<\/Item>/g) || [];
        for (let block of itemBlocks) {
            let idMatch = block.match(/id="([^"]*)"/);
            if (idMatch) {
                let id = idMatch[1];
                let textContent = block.replace(/<[^>]+>/g, '').trim();
                textContent = textContent.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                
                let lines = textContent.split('\n').map(l => l.trim()).filter(l => l);
                let implicitsIdx = lines.findIndex(l => l.startsWith('Implicits: '));
                if (implicitsIdx !== -1) {
                    lines = lines.slice(implicitsIdx + 1);
                } else {
                    let lastMetaIdx = -1;
                    const metaPrefixes = ['LevelReq: ', 'Sockets: ', 'Quality: ', 'Suffix: ', 'Prefix: ', 'Crafted: ', 'Energy Shield: ', 'Evasion: ', 'Armour: ', 'Spirit: ', 'Charm Slots: ', 'Rune: '];
                    for(let i=0; i<lines.length; i++) {
                        if (metaPrefixes.some(p => lines[i].startsWith(p))) {
                            lastMetaIdx = i;
                        }
                    }
                    if (lastMetaIdx !== -1) {
                        lines = lines.slice(lastMetaIdx + 1);
                    } else if (lines.length > 3) {
                        lines = lines.slice(3);
                    }
                }
                
                lines = lines.map(l => l.replace(/\{[^}]+\}/g, '').trim()).filter(l => l);
                itemsMap[id] = lines.join('\n');
            }
        }

        const slotNameMapping = {
            "Helmet": "Helm1",
            "Amulet": "Amulet1",
            "Weapon 1": "Weapon1",
            "Body Armour": "BodyArmour1",
            "Weapon 2": "Weapon2",
            "Gloves": "Gloves1",
            "Ring 1": "Ring1",
            "Ring 2": "Ring2",
            "Belt": "Belt1",
            "Boots": "Boots1"
        };

        // Parse ItemSets
        let itemSetBlocks = itemsInner.match(/<ItemSet[^>]*>([\s\S]*?)<\/ItemSet>/g) || [];
        for (let setBlock of itemSetBlocks) {
            let idMatch = setBlock.match(/id="([^"]*)"/);
            let titleMatch = setBlock.match(/title="([^"]*)"/);
            let setId = idMatch ? idMatch[1] : "1";
            let setTitle = titleMatch ? titleMatch[1] : `Item Set ${setId}`;
            
            let setSlots = [];
            let slotStrs = setBlock.match(/<Slot [^>]*\/>/g) || [];
            for (let slotStr of slotStrs) {
                let nameMatch = slotStr.match(/name="([^"]*)"/);
                let itemIdMatch = slotStr.match(/itemId="([^"]*)"/);
                if (nameMatch && itemIdMatch) {
                    let name = nameMatch[1];
                    let itemId = itemIdMatch[1];
                    let mappedSlotId = slotNameMapping[name];
                    
                    if (mappedSlotId && itemId !== "0" && itemsMap[itemId]) {
                        setSlots.push({
                            inventory_id: mappedSlotId,
                            additional_text: itemsMap[itemId]
                        });
                    }
                }
            }
            itemSets.push({ id: setId, title: setTitle, inventory_slots: setSlots });
        }
        
        if (itemSets.length === 0) {
            itemSets.push({ id: "1", title: "Default Item Set", inventory_slots: [] });
        }
    } else {
        itemSets.push({ id: "1", title: "Default Item Set", inventory_slots: [] });
    }
    
    let activeItemSetIdx = itemSets.findIndex(s => s.id === (itemsMatch ? itemsMatch[1].match(/activeItemSet="([^"]*)"/)?.[1] || "1" : "1"));
    if (activeItemSetIdx === -1) activeItemSetIdx = 0;

    return { 
        passives: trees[0].passives, 
        className, 
        ascendancyName, 
        skills: skillSets.length > 0 ? skillSets[0].skills : [],
        inventory_slots: itemSets[activeItemSetIdx].inventory_slots,
        itemSets,
        trees,
        skillSets
    };
  } catch (err) {
    console.error("Error importing PoB2:", err);
    throw new Error("Failed to import PoB2 build: " + err.message);
  }
});

// Settings: Run Update Skilltree Script
ipcMain.handle('update-skilltree', async () => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'update_skilltree.js');
    exec(`node "${scriptPath}"`, { cwd: path.join(__dirname, '..', '..') }, (error, stdout, stderr) => {
      if (error) {
        console.error("Error updating skilltree:", error);
        reject(new Error(stderr || error.message));
      } else {
        console.log("Skilltree updated:", stdout);
        resolve(stdout);
      }
    });
  });
});

// Settings: Run Update Gems Script
ipcMain.handle('update-gems', async () => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'update_gems.js');
    exec(`node "${scriptPath}"`, { cwd: path.join(__dirname, '..', '..') }, (error, stdout, stderr) => {
      if (error) {
        console.error("Error updating gems:", error);
        reject(new Error(stderr || error.message));
      } else {
        console.log("Gems updated:", stdout);
        resolve(stdout);
      }
    });
  });
});

// Settings: Run Update Uniques Script
ipcMain.handle('update-uniques', async () => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'update_uniques.js');
    exec(`node "${scriptPath}"`, { cwd: path.join(__dirname, '..', '..') }, (error, stdout, stderr) => {
      if (error) {
        console.error("Error updating uniques:", error);
        reject(new Error(stderr || error.message));
      } else {
        console.log("Uniques updated:", stdout);
        resolve(stdout);
      }
    });
  });
});

