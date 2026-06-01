let treeData = null;

export async function fetchSkillTreeData() {
  if (treeData) return treeData;
  const res = await fetch("data/poe2_skilltree_data.json");
  if (!res.ok) throw new Error("Could not fetch tree data");
  treeData = await res.json();
  return treeData;
}

export function getPassiveNodeName(id) {
  if (!treeData || !treeData.nodes) return "Passive Node";
  const node = treeData.nodes[id] || Object.values(treeData.nodes).find(n => n.id?.toString() === id?.toString());
  return node && node.name ? node.name : "Passive Node";
}
