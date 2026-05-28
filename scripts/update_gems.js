const fs = require('fs');
const path = require('path');

const GEMS_URL = 'https://raw.githubusercontent.com/repoe-fork/poe2/master/data/skill_gems.json';
const SKILLS_URL = 'https://raw.githubusercontent.com/repoe-fork/poe2/master/data/skills.json';

const SKILL_GEMS_FILE = path.join(__dirname, '..', 'data', 'skill_gems.json');
const SUPPORT_GEMS_FILE = path.join(__dirname, '..', 'data', 'support_gems.json');
const SPIRIT_GEMS_FILE = path.join(__dirname, '..', 'data', 'spirit_gems.json');

async function updateGems() {
    console.log('Downloading latest poe2 gems data from repoe-fork...');
    try {
        const [gemsResponse, skillsResponse] = await Promise.all([
            fetch(GEMS_URL, { headers: { 'User-Agent': 'poe2-build-planner' } }),
            fetch(SKILLS_URL, { headers: { 'User-Agent': 'poe2-build-planner' } })
        ]);

        if (!gemsResponse.ok) throw new Error(`Failed to download gems: HTTP ${gemsResponse.status}`);
        if (!skillsResponse.ok) throw new Error(`Failed to download skills: HTTP ${skillsResponse.status}`);

        console.log('Download complete. Parsing JSON...');
        const rawGems = await gemsResponse.json();
        const rawSkills = await skillsResponse.json();

        const skillGems = [];
        const supportGems = [];
        const spiritGems = [];

        Object.values(rawGems).forEach(gem => {
            if (!gem.base_item || !gem.base_item.display_name) return;
            
            // Exclude unused or DNT (Do Not Translate) gems
            if (gem.base_item.display_name.includes('[DNT') || gem.base_item.display_name.includes('UNUSED')) {
                return;
            }

            // Find matching skill data
            let skillData = null;
            if (gem.grants_skills && gem.grants_skills.length > 0) {
                skillData = rawSkills[gem.grants_skills[0]];
            }

            let description = null;
            let statText = [];
            let maxLevelStatText = [];
            let baseCastTime = null;
            let maxLevelCost = null;
            
            if (skillData) {
                if (skillData.active_skill && skillData.active_skill.description) {
                    description = skillData.active_skill.description;
                }
                
                baseCastTime = skillData.cast_time || null;

                if (skillData.per_level) {
                    const levels = Object.keys(skillData.per_level);
                    if (levels.length > 0) {
                        const maxLevel = levels[levels.length - 1];
                        if (skillData.per_level[maxLevel].costs) {
                            maxLevelCost = skillData.per_level[maxLevel].costs;
                        }
                    }
                }

                if (skillData.stat_sets && skillData.stat_sets.length > 0) {
                    const statSet = skillData.stat_sets[0];
                    if (statSet.static && statSet.static.stat_text) {
                        statText = Object.values(statSet.static.stat_text).filter(t => t);
                    }

                    if (statSet.per_level) {
                        const ssLevels = Object.keys(statSet.per_level);
                        if (ssLevels.length > 0) {
                            const ssMaxLevel = ssLevels[ssLevels.length - 1];
                            if (statSet.per_level[ssMaxLevel].stat_text) {
                                maxLevelStatText = Object.values(statSet.per_level[ssMaxLevel].stat_text).filter(t => t);
                            }
                        }
                    }
                }
            }

            const combinedStatText = [...maxLevelStatText, ...statText];
            
            const entry = {
                Gem: gem.base_item.display_name,
                Id: gem.base_item.id,
                Tier: 1, // Default tier
                Color: gem.color,
                Tags: gem.tags,
                Icon: gem.icon_dds_file,
                RecommendedSupports: gem.recommended_supports,
                RequirementWeights: gem.requirement_weights,
                CraftingTypes: gem.crafting_types,
                CraftingLevel: gem.crafting_level,
                Description: description,
                BaseCastTime: baseCastTime,
                Cost: maxLevelCost,
                StatText: combinedStatText.length > 0 ? combinedStatText : null
            };
            
            if (gem.gem_type === 'active') {
                skillGems.push(entry);
            } else if (gem.gem_type === 'support') {
                supportGems.push(entry);
            }
        });
        
        // Sort alphabetically for consistency
        skillGems.sort((a, b) => a.Gem.localeCompare(b.Gem));
        supportGems.sort((a, b) => a.Gem.localeCompare(b.Gem));

        fs.writeFileSync(SKILL_GEMS_FILE, JSON.stringify(skillGems, null, 4));
        console.log(`Saved ${skillGems.length} skill gems to ${SKILL_GEMS_FILE}`);
        
        fs.writeFileSync(SUPPORT_GEMS_FILE, JSON.stringify(supportGems, null, 4));
        console.log(`Saved ${supportGems.length} support gems to ${SUPPORT_GEMS_FILE}`);
        
        // Empty out spirit gems for now as they are included in active gems, or write empty array
        fs.writeFileSync(SPIRIT_GEMS_FILE, JSON.stringify(spiritGems, null, 4));
        console.log(`Cleared spirit gems (now bundled with skill gems) in ${SPIRIT_GEMS_FILE}`);

    } catch (e) {
        console.error('Error:', e.message);
    }
}

updateGems();
