// ============================================================
// database.js — Gem & ascendancy database loading
// Depends on: state.js
// ============================================================

// 1. DATABASE LOADING

async function loadGemsDatabases() {
    try {
        let skillGems = [];
        let supportGems = [];
        let spiritGems = [];

        const isElectron = typeof window.electronAPI !== 'undefined';

        if (isElectron) {
            console.log("Loading databases via Electron IPC...");
            skillGems   = await window.electronAPI.readLocalJson('skill_gems.json')   || [];
            supportGems = await window.electronAPI.readLocalJson('support_gems.json') || [];
            spiritGems  = await window.electronAPI.readLocalJson('spirit_gems.json')  || [];
        } else {
            console.log("Loading databases via HTTP fetch...");
            const fetchJson = async (url) => {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP error ${res.status}`);
                return await res.json();
            };
            skillGems   = await fetchJson('../../data/skill_gems.json').catch(() => []);
            supportGems = await fetchJson('../../data/support_gems.json').catch(() => []);
            spiritGems  = await fetchJson('../../data/spirit_gems.json').catch(() => []);
        }

        // Active gems = skill gems + spirit gems
        window.activeGemsDb = [];

        skillGems.forEach(g => {
            window.activeGemsDb.push({
                ...g,
                name: g.Gem,
                type: 'skill',
                tier: g.Tier,
                id: g.Id || generateGemId(g.Gem, 'skill')
            });
        });

        spiritGems.forEach(g => {
            window.activeGemsDb.push({
                ...g,
                name: g.Gem,
                type: 'spirit',
                tier: g.Tier,
                id: g.Id || generateGemId(g.Gem, 'spirit')
            });
        });

        window.supportGemsDb = [];
        supportGems.forEach(g => {
            // Filter duplicate names if any
            if (!window.supportGemsDb.some(x => x.name === g.Gem)) {
                window.supportGemsDb.push({
                    ...g,
                    name: g.Gem,
                    type: 'support',
                    tier: g.Tier,
                    id: g.Id || generateGemId(g.Gem, 'support')
                });
            }
        });

        console.log(`Loaded databases: Active Gems: ${window.activeGemsDb.length}, Support Gems: ${window.supportGemsDb.length}`);
    } catch (error) {
        console.error("Error loading gem databases:", error);
    }
}

async function loadAscendancies() {
    try {
        let ascendancies = [];
        const isElectron = typeof window.electronAPI !== 'undefined';

        if (isElectron) {
            ascendancies = await window.electronAPI.readLocalJson('ascendancies.json') || [];
        } else {
            const res = await fetch('../../data/ascendancies.json').catch(() => null);
            if (res && res.ok) ascendancies = await res.json();
        }

        const select = document.getElementById('meta-ascendancy');

        // Preserve the Custom option to append later
        const customOpt = select.querySelector('option[value="Custom"]');

        // Clear all options except the first one (None)
        while (select.options.length > 1) {
            select.remove(1);
        }

        if (ascendancies && ascendancies.length > 0) {
            ascendancies.forEach(asc => {
                const opt = document.createElement('option');
                opt.value = asc.id;
                opt.textContent = asc.name;
                select.appendChild(opt);
            });
        }

        // Add Custom option back at the end
        if (customOpt) {
            select.appendChild(customOpt);
        }
    } catch (e) {
        console.error("Error loading ascendancies:", e);
    }
}

// 2. GEM LOOKUP HELPERS

// Generate a default game metadata ID from a gem name and type
function generateGemId(name, type) {
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

function getGemDisplayName(id) {
    if (!id) return "";

    const found = window.activeGemsDb.concat(window.supportGemsDb).find(x => x.id === id);
    if (found) return found.name;

    // Parse name from standard metadata paths
    const match = id.match(/SupportGem(\w+)|SkillGem(\w+)|SpiritGem(\w+)/);
    if (match) {
        const rawName = match[1] || match[2] || match[3];
        return rawName.replace(/([A-Z])/g, ' $1').trim();
    }
    return id;
}

function getGemColor(id) {
    if (!id) return null;

    const found = window.activeGemsDb.concat(window.supportGemsDb).find(x => x.id === id);
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

function getGemTierString(id) {
    const found = window.activeGemsDb.concat(window.supportGemsDb).find(x => x.id === id);
    return found ? found.tier : "";
}

function getGemDataById(id) {
    let gem = window.activeGemsDb.find(g => g.id === id);
    if (!gem) gem = window.supportGemsDb.find(g => g.id === id);
    return gem;
}
