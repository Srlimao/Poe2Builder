let treeData = null;

export async function fetchSkillTreeData() {
  if (treeData) return treeData;
  const res = await fetch("data/poe2_skilltree_data.json");
  if (!res.ok) throw new Error("Could not fetch tree data");
  treeData = await res.json();
  
  // Filter out any nodes that have a null id
  for (const [key, node] of Object.entries(treeData.nodes)) {
    if (node.id === null || node.id === undefined) {
      delete treeData.nodes[key];
    }
  }

  return treeData;
}

export function getPassiveNodeName(id) {
  if (!treeData || !treeData.nodes) return "Passive Node";
  const node = treeData.nodes[id] || Object.values(treeData.nodes).find(n => n.id?.toString() === id?.toString());
  return node && node.name ? node.name : "Passive Node";
}

export function findShortestPath(treeData, allocatedNodeIds, targetNodeId, currentAscendancy) {
  if (!treeData || !treeData.nodes) return null;

  const idToKey = {};
  const keyToNode = treeData.nodes;
  
  let classNumericId = null;
  if (currentAscendancy) {
    const baseClassStr = currentAscendancy.replace(/\d+[a-zA-Z]?$/, '');
    if (treeData.classes) {
      for (const [id, c] of Object.entries(treeData.classes)) {
        if (c.name.toLowerCase() === baseClassStr.toLowerCase()) {
          classNumericId = parseInt(id, 10);
          break;
        }
      }
    }
  }

  const validStartKeys = new Set();
  let ascendancyStartKey = null;

  for (const [key, node] of Object.entries(keyToNode)) {
    const nodeIdStr = (node.id !== undefined && node.id !== null) ? node.id.toString() : key;
    idToKey[nodeIdStr] = key;
    
    if (classNumericId !== null && node.classStartIndex && node.classStartIndex.includes(classNumericId)) {
      validStartKeys.add(key);
    }
    if (currentAscendancy && node.isAscendancyStart && node.ascendancyId === currentAscendancy) {
      ascendancyStartKey = key;
      validStartKeys.add(key);
    }
  }

  const targetKey = idToKey[targetNodeId];
  if (!targetKey) return null;

  const sourceKeys = new Set();
  let useImplicitSources = true;

  if (allocatedNodeIds && allocatedNodeIds.length > 0) {
    useImplicitSources = false;
    for (const id of allocatedNodeIds) {
      const key = idToKey[id];
      if (key) sourceKeys.add(key);
    }
    if (ascendancyStartKey) {
      sourceKeys.add(ascendancyStartKey);
    }
  } else {
    for (const key of validStartKeys) {
      sourceKeys.add(key);
    }
  }

  if (sourceKeys.has(targetKey)) {
    return [targetNodeId];
  }

  const queue = Array.from(sourceKeys);
  const visited = new Set(sourceKeys);
  const cameFrom = {};
  let found = false;

  let head = 0;
  while (head < queue.length) {
    const currentKey = queue[head++];
    
    if (currentKey === targetKey) {
      found = true;
      break;
    }

    const node = keyToNode[currentKey];
    if (!node) continue;

    const neighbors = new Set([...(node.in || []), ...(node.out || [])]);

    for (const neighborKey of neighbors) {
      if (visited.has(neighborKey)) continue;

      const neighborNode = keyToNode[neighborKey];
      if (!neighborNode) continue;

      if (neighborNode.isMastery) continue;

      if (neighborNode.ascendancyId && neighborNode.ascendancyId !== currentAscendancy) {
        continue;
      }

      visited.add(neighborKey);
      cameFrom[neighborKey] = currentKey;
      queue.push(neighborKey);
    }
  }

  if (!found) return null;

  const pathKeys = [];
  let curr = targetKey;
  while (!sourceKeys.has(curr)) {
    pathKeys.unshift(curr);
    curr = cameFrom[curr];
  }
  
  if (curr === ascendancyStartKey && (!allocatedNodeIds || !allocatedNodeIds.includes(keyToNode[ascendancyStartKey]?.id || ascendancyStartKey))) {
     pathKeys.unshift(curr);
  }

  return pathKeys.map(k => {
    const node = keyToNode[k];
    return (node.id !== undefined && node.id !== null) ? node.id.toString() : k;
  });
}

export function pruneDisconnectedNodes(treeData, allocatedNodeObjects, currentAscendancy) {
  if (!treeData || !treeData.nodes || !allocatedNodeObjects || allocatedNodeObjects.length === 0) return allocatedNodeObjects;

  const idToKey = {};
  const keyToNode = treeData.nodes;
  
  let classNumericId = null;
  if (currentAscendancy) {
    const baseClassStr = currentAscendancy.replace(/\d+[a-zA-Z]?$/, '');
    if (treeData.classes) {
      for (const [id, c] of Object.entries(treeData.classes)) {
        if (c.name.toLowerCase() === baseClassStr.toLowerCase()) {
          classNumericId = parseInt(id, 10);
          break;
        }
      }
    }
  }

  const validStartKeys = new Set();
  let ascendancyStartKey = null;

  for (const [key, node] of Object.entries(keyToNode)) {
    const nodeIdStr = (node.id !== undefined && node.id !== null) ? node.id.toString() : key;
    idToKey[nodeIdStr] = key;
    
    if (classNumericId !== null && node.classStartIndex && node.classStartIndex.includes(classNumericId)) {
      validStartKeys.add(key);
    }
    if (currentAscendancy && node.isAscendancyStart && node.ascendancyId === currentAscendancy) {
      ascendancyStartKey = key;
      validStartKeys.add(key);
    }
  }

  const allocatedIdStrs = new Set(allocatedNodeObjects.map(n => n.id.toString()));
  const allocatedKeys = new Set();
  for (const idStr of allocatedIdStrs) {
    const k = idToKey[idStr];
    if (k) allocatedKeys.add(k);
  }

  const roots = [];
  for (const key of validStartKeys) {
    roots.push(key);
  }

  const queue = [...roots];
  const visited = new Set(roots);

  let head = 0;
  while (head < queue.length) {
    const currentKey = queue[head++];
    const node = keyToNode[currentKey];
    if (!node) continue;

    const neighbors = new Set([...(node.in || []), ...(node.out || [])]);
    for (const neighborKey of neighbors) {
      if (visited.has(neighborKey)) continue;

      if (!allocatedKeys.has(neighborKey)) continue;

      const neighborNode = keyToNode[neighborKey];
      if (!neighborNode) continue;

      visited.add(neighborKey);
      queue.push(neighborKey);
    }
  }

  return allocatedNodeObjects.filter(n => {
    const key = idToKey[n.id.toString()];
    if (!key) return false;
    return visited.has(key);
  });
}
