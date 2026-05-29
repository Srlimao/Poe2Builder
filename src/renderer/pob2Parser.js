// ============================================================
// pob2Parser.js — Native browser PoB2 decompression and parser
// Replicates the main process backend logic in the browser.
// ============================================================

window.parsePob2Browser = async function(code) {
    if (!code) throw new Error("No code provided.");
    
    // 1. base64 decode
    let b64 = code.trim().replace(/-/g, '+').replace(/_/g, '/');
    let binStr;
    try {
        binStr = atob(b64);
    } catch (err) {
        throw new Error("Invalid base64 encoding.");
    }

    let bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
        bytes[i] = binStr.charCodeAt(i);
    }

    // 2. zlib inflate via DecompressionStream
    let decompressed = "";
    try {
        const ds = new DecompressionStream('deflate');
        const writer = ds.writable.getWriter();
        writer.write(bytes);
        writer.close();

        const chunks = [];
        const reader = ds.readable.getReader();
        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            chunks.push(value);
        }

        const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
        const result = new Uint8Array(totalLen);
        let offset = 0;
        for (const c of chunks) {
            result.set(c, offset);
            offset += c.length;
        }

        decompressed = new TextDecoder().decode(result);
    } catch (err) {
        throw new Error("Failed to decompress PoB2 data: " + err.message);
    }

    // 3. Load mapping and extract multiple passive trees (<Spec>)
    let mapping;
    try {
        // Fetch from the data folder instead of fs.readFileSync
        const res = await fetch("../../data/passive_mapping.json");
        if (!res.ok) throw new Error("Network response was not ok");
        mapping = await res.json();
    } catch (err) {
        throw new Error("passive_mapping.json mapping file not found or failed to load: " + err.message);
    }

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
            let skillsArr = [];
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
                    let skillObj = {
                        id: activeGem.id,
                        level_interval: [activeGem.level, activeGem.level],
                        additional_text: "",
                        support_skills: []
                    };
                    for (let i = 1; i < parsedGems.length; i++) {
                        skillObj.support_skills.push({
                            id: parsedGems[i].id,
                            level_interval: [parsedGems[i].level, parsedGems[i].level],
                            additional_text: ""
                        });
                    }
                    skillsArr.push(skillObj);
                }
            }
            return skillsArr;
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

    return { 
        passives: trees[0].passives, 
        className, 
        ascendancyName, 
        skills: skillSets.length > 0 ? skillSets[0].skills : [],
        trees,
        skillSets
    };
};
