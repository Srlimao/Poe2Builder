const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const zlib = require('zlib');
const { exec } = require('child_process');

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
    icon: path.join(__dirname, 'renderer', 'icon.png') // Fallback if present
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

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
  const filePath = path.join(__dirname, filename);
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
    
    // 3. Extract nodes="..." from <Spec ... nodes="...">
    let nodesMatch = decompressed.match(/<Spec[^>]*nodes="([^"]*)"/);
    if (!nodesMatch || nodesMatch.length < 2) {
      throw new Error("Could not find nodes in PoB2 build data.");
    }
    
    let numericNodes = nodesMatch[1].split(',').map(n => n.trim()).filter(n => n);
    
    // 4. Load mapping and translate
    const mappingPath = path.join(__dirname, 'passive_mapping.json');
    if (!fs.existsSync(mappingPath)) {
        throw new Error("passive_mapping.json mapping file not found.");
    }
    const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
    
    let stringNodes = [];
    numericNodes.forEach(num => {
      if (mapping[num]) {
        stringNodes.push(mapping[num]);
      }
    });
    
    return stringNodes;
  } catch (err) {
    console.error("Error importing PoB2:", err);
    throw new Error("Failed to import PoB2 build: " + err.message);
  }
});

// Settings: Run Update Skilltree Script
ipcMain.handle('update-skilltree', async () => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'scripts', 'update_skilltree.js');
    exec(`node "${scriptPath}"`, { cwd: __dirname }, (error, stdout, stderr) => {
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
    const scriptPath = path.join(__dirname, 'scripts', 'update_gems.js');
    exec(`node "${scriptPath}"`, { cwd: __dirname }, (error, stdout, stderr) => {
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
