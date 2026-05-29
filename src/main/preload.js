const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openBuildFile: () => ipcRenderer.invoke('open-file-dialog'),
  saveBuildFile: (payload) => ipcRenderer.invoke('save-file', payload),
  saveBuildFileAs: (payload) => ipcRenderer.invoke('save-file-as-dialog', payload),
  getDefaultBuildPath: () => ipcRenderer.invoke('get-default-build-path'),
  saveToDefaultPath: (payload) => ipcRenderer.invoke('save-to-default-path', payload),
  readLocalJson: (filename) => ipcRenderer.invoke('read-local-json', filename),
  importPob2: (code) => ipcRenderer.invoke('import-pob2', code),
  updateSkilltree: () => ipcRenderer.invoke('update-skilltree'),
  updateGems: () => ipcRenderer.invoke('update-gems'),
  updateUniques: () => ipcRenderer.invoke('update-uniques')
});
