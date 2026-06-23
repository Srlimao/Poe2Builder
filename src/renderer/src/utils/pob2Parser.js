export async function parsePob2(code) {
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
      const { done, value } = await reader.read();
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
    // Fetch from the data folder (relative path for React app)
    const res = await fetch("data/passive_mapping.json");
    if (!res.ok) throw new Error("Network response was not ok");
    mapping = await res.json();
    if (!mapping) throw new Error("Mapping data is empty");
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
      let mainNodesCount = stringNodes.filter(n => !n.toLowerCase().includes('ascendancy')).length;
      let minLevel = 1;
      if (trees.length > 0) {
        let prevMax = trees[trees.length - 1].level_interval[1];
        if (prevMax < 100) {
          minLevel = prevMax + 1;
        }
      }
      let maxLevel = mainNodesCount > 0 ? Math.min(100, mainNodesCount) : 100;
      if (minLevel > maxLevel) minLevel = Math.max(1, maxLevel);

      trees.push({
        title: titleMatch ? titleMatch[1] : `Tree ${trees.length + 1}`,
        passives: stringNodes,
        level_interval: [minLevel, maxLevel]
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

        // Detect defensive type before slicing
        let hasArmour = false;
        let hasEvasion = false;
        let hasEnergyShield = false;
        for (let line of lines) {
          if (line.startsWith('Armour:') || line.startsWith('Armor:')) {
            hasArmour = true;
          }
          if (line.startsWith('Evasion:')) {
            hasEvasion = true;
          }
          if (line.startsWith('Energy Shield:')) {
            hasEnergyShield = true;
          }
        }
        let defenseTypes = [];
        if (hasArmour) defenseTypes.push("Armour");
        if (hasEvasion) defenseTypes.push("Evasion");
        if (hasEnergyShield) defenseTypes.push("Energy Shield");
        let defenseTag = defenseTypes.length > 0 ? `<green>{${defenseTypes.join('/')}}` : "";

        let uniqueName = "";
        let itemName = "";
        let rarity = "";
        let rarityIdx = lines.findIndex(l => l.toUpperCase().startsWith('RARITY: '));
        if (rarityIdx !== -1) {
          rarity = lines[rarityIdx].substring(8).trim().toUpperCase();
          if (rarity === 'UNIQUE') {
            if (lines[rarityIdx + 1]) {
              uniqueName = lines[rarityIdx + 1].replace(/\{[^}]+\}/g, '').trim();
            }
          } else if (rarity === 'RARE' || rarity === 'MAGIC') {
            let line1 = lines[rarityIdx + 1] || "";
            let line2 = lines[rarityIdx + 2] || "";

            const isMeta = (str) => {
              const metaPrefixes = ['LevelReq: ', 'Sockets: ', 'Quality: ', 'Suffix: ', 'Prefix: ', 'Crafted: ', 'Energy Shield: ', 'Evasion: ', 'Armour: ', 'Spirit: ', 'Charm Slots: ', 'Rune: ', 'Implicits: '];
              return metaPrefixes.some(p => str.startsWith(p));
            };

            if (rarity === 'RARE') {
              if (line1 === 'New Item' || line1 === 'Crafted') {
                itemName = (!isMeta(line2) && line2) ? line2 : line1;
              } else if (!isMeta(line2) && line2 && line2 !== line1) {
                itemName = line1 + " " + line2;
              } else {
                itemName = line1;
              }
            } else {
              itemName = line1;
            }
            itemName = itemName.replace(/\{[^}]+\}/g, '').trim();
          }
        }

        let implicitsIdx = lines.findIndex(l => l.startsWith('Implicits: '));
        if (implicitsIdx !== -1) {
          lines = lines.slice(implicitsIdx + 1);
        } else {
          let lastMetaIdx = -1;
          const metaPrefixes = ['LevelReq: ', 'Sockets: ', 'Quality: ', 'Suffix: ', 'Prefix: ', 'Crafted: ', 'Energy Shield: ', 'Evasion: ', 'Armour: ', 'Spirit: ', 'Charm Slots: ', 'Rune: '];
          for (let i = 0; i < lines.length; i++) {
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

        let additionalText = lines.join('\n');
        if (defenseTag) {
          additionalText = defenseTag + '\n' + additionalText;
        }
        if (rarity === 'RARE' && itemName) {
          additionalText = `<yellow>{${itemName}}\n` + additionalText;
        } else if (rarity === 'MAGIC' && itemName) {
          additionalText = `<blue>{${itemName}}\n` + additionalText;
        }

        itemsMap[id] = {
          additional_text: additionalText,
          unique_name: uniqueName
        };
      }
    }

    const slotNameMapping = {
      "Helmet": "Helm1",
      "Amulet": "Amulet1",
      "Weapon 1": "Weapon1",
      "Body Armour": "BodyArmour1",
      "Weapon 2": "Offhand1",
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
            const itemData = itemsMap[itemId];
            const slotObj = {
              inventory_id: mappedSlotId,
              additional_text: itemData.additional_text
            };
            if (itemData.unique_name) {
              slotObj.unique_name = itemData.unique_name;
            }
            setSlots.push(slotObj);
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
}
