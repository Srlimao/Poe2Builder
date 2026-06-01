let cachedActiveGemsDb = [];
let cachedSupportGemsDb = [];
let cachedUniquesDb = [];

export function setLocalDbs(active, support, uniques) {
  cachedActiveGemsDb = active;
  cachedSupportGemsDb = support;
  cachedUniquesDb = uniques;
}

export function generateGemId(name, type) {
  if (!name) return "";

  const camel = name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');

  if (type === 'support') return `Metadata/Items/Gems/SupportGem${camel}`;
  if (type === 'spirit')  return `Metadata/Items/Gems/SpiritGem${camel}`;
  return `Metadata/Items/Gems/SkillGem${camel}`;
}

export async function fetchGemsDatabases() {
  let skillGems = [];
  let supportGems = [];
  let spiritGems = [];
  let uniquesDb = [];

  const isElectron = typeof window.electronAPI !== 'undefined';

  if (isElectron) {
    skillGems   = await window.electronAPI.readLocalJson('skill_gems.json')   || [];
    supportGems = await window.electronAPI.readLocalJson('support_gems.json') || [];
    spiritGems  = await window.electronAPI.readLocalJson('spirit_gems.json')  || [];
    uniquesDb   = await window.electronAPI.readLocalJson('uniques.json')      || [];
  } else {
    const fetchJson = async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    };
    skillGems   = await fetchJson('data/skill_gems.json').catch(() => []);
    supportGems = await fetchJson('data/support_gems.json').catch(() => []);
    spiritGems  = await fetchJson('data/spirit_gems.json').catch(() => []);
    uniquesDb   = await fetchJson('data/uniques.json').catch(() => []);
  }

  // Active gems = skill gems + spirit gems
  const activeGemsDb = [];

  skillGems.forEach(g => {
    const isSpirit = g.GemType === 'spirit';
    activeGemsDb.push({
      ...g,
      name: g.Gem,
      type: isSpirit ? 'spirit' : 'skill',
      tier: g.Tier,
      id: g.Id || generateGemId(g.Gem, isSpirit ? 'spirit' : 'skill')
    });
  });

  spiritGems.forEach(g => {
    activeGemsDb.push({
      ...g,
      name: g.Gem,
      type: 'spirit',
      tier: g.Tier,
      id: g.Id || generateGemId(g.Gem, 'spirit')
    });
  });

  const supportGemsDb = [];
  supportGems.forEach(g => {
    if (!supportGemsDb.some(x => x.name === g.Gem)) {
      supportGemsDb.push({
        ...g,
        name: g.Gem,
        type: 'support',
        tier: g.Tier,
        id: g.Id || generateGemId(g.Gem, 'support')
      });
    }
  });

  setLocalDbs(activeGemsDb, supportGemsDb, uniquesDb);

  return { activeGemsDb, supportGemsDb, uniquesDb };
}

export async function fetchAscendancies() {
  const isElectron = typeof window.electronAPI !== 'undefined';
  if (isElectron) {
    return await window.electronAPI.readLocalJson('ascendancies.json') || [];
  } else {
    const res = await fetch('data/ascendancies.json').catch(() => null);
    if (res && res.ok) return await res.json();
    return [];
  }
}

export function getGemDisplayName(id) {
  if (!id) return "";

  const found = cachedActiveGemsDb.concat(cachedSupportGemsDb).find(x => x.id === id);
  if (found) return found.name;

  // Parse name from standard metadata paths
  const match = id.match(/SupportGem(\w+)|SkillGem(\w+)|SpiritGem(\w+)/);
  if (match) {
    const rawName = match[1] || match[2] || match[3];
    return rawName.replace(/([A-Z])/g, ' $1').trim();
  }
  return id;
}

export function getGemColor(id) {
  if (!id) return null;

  const found = cachedActiveGemsDb.concat(cachedSupportGemsDb).find(x => x.id === id);
  if (found) {
    if (found.Color) {
      if (found.Color === 'r') return 'red';
      if (found.Color === 'g') return 'green';
      if (found.Color === 'b') return 'blue';
      if (found.Color === 'w') return 'white';
    }
    if (found.type === 'spirit') return 'spirit';

    const name = found.name.toLowerCase();
    if (['fire','ignite','earth','slam','strike','boneshatter','shield','fortify','seismic','rage','warcry','cry','bleed','brutality'].some(x => name.includes(x))) return 'red';
    if (['arrow','bow','shot','poison','venom','lightning','chain','speed','projectile','rapid','pierce','ricochet'].some(x => name.includes(x))) return 'green';
    if (['cold','ice','frost','snow','blizzard','magic','spell','intel','arc','shock','spark','chaos','minion','zombie','curse','essence'].some(x => name.includes(x))) return 'blue';

    if (found.type === 'support') return 'green';
    return 'red';
  }

  const idLower = id.toLowerCase();
  if (idLower.includes('spirit')) return 'spirit';
  if (['earth','bone','slam','shield','rage','fire','cry','brutality','bleed','melee'].some(x => idLower.includes(x))) return 'red';
  if (['arrow','pierce','speed','projectile','poison','lightning','chain'].some(x => idLower.includes(x))) return 'green';
  if (['cold','ice','frost','spell','curse','spark','minion','zombie','echo','mana'].some(x => idLower.includes(x))) return 'blue';

  return 'red';
}

export function getGemTierString(id) {
  const found = cachedActiveGemsDb.concat(cachedSupportGemsDb).find(x => x.id === id);
  return found ? found.tier : "";
}

export function getGemDataById(id) {
  let gem = cachedActiveGemsDb.find(g => g.id === id);
  if (!gem) gem = cachedSupportGemsDb.find(g => g.id === id);
  return gem;
}
