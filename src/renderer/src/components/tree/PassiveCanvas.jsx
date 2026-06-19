import React, { useEffect, useRef, useState } from 'react';
import { useBuildStore } from '../../store/useBuildStore';
import { fetchSkillTreeData, findShortestPath, pruneDisconnectedNodes } from '../../utils/skillTree';

// Config constants
const RADIUS_NORMAL = 40;
const RADIUS_NOTABLE = 60;
const RADIUS_KEYSTONE = 80;
const RADIUS_MASTERY = 200;
const DETECTION_PADDING = 24; // Extra radius buffer to make small nodes easier to hover/click

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
  });
}

function drawSprite(ctx, img, spriteMap, key, x, y, destWidth, destHeight) {
  if (!img || !spriteMap || !spriteMap.frames) return false;
  const frameInfo = spriteMap.frames[key];
  if (!frameInfo) return false;
  const { x: sx, y: sy, w: sw, h: sh } = frameInfo.frame;
  ctx.drawImage(
    img,
    sx,
    sy,
    sw,
    sh,
    x - destWidth / 2,
    y - destHeight / 2,
    destWidth,
    destHeight
  );
  return true;
}

export default function PassiveCanvas() {
  const canvasRef = useRef(null);

  const passive_trees = useBuildStore((state) => state.buildState.passive_trees);
  const currentTreeIndex = useBuildStore((state) => state.currentTreeIndex);
  const selectedElement = useBuildStore((state) => state.selectedElement);
  const setSelectedElement = useBuildStore((state) => state.setSelectedElement);

  // Custom update helper to keep store mutations clean
  const setBuildState = useBuildStore((state) => state.setBuildState);
  const buildState = useBuildStore((state) => state.buildState);
  const updatePassiveText = useBuildStore((state) => state.updatePassiveText);
  const debugMode = useBuildStore(state => state.debugMode);

  // Canvas Viewport Camera state
  const cameraRef = useRef({ x: 0, y: 0, zoom: 0.2 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const mousePosRef = useRef({ x: 0, y: 0 });

  // Data refs
  const nodesListRef = useRef([]);
  const edgesListRef = useRef([]);
  const nodesMapRef = useRef({});
  const [treeDataLoaded, setTreeDataLoaded] = useState(false);
  const assetsRef = useRef({
    loaded: false,
    images: {},
    spriteMaps: {}
  });

  // Hover Tooltip state
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const activeTree = passive_trees[currentTreeIndex] || passive_trees[0];
  const allocatedNodes = new Set((activeTree?.nodes || []).filter(n => n !== null && n !== undefined).map(n => (n.id || n).toString()));

  // 1. Fetch data on mount
  useEffect(() => {
    async function loadTreeAndAssets() {
      try {
        const treeData = await fetchSkillTreeData();

        // Lazily fetch JSON sprite maps and images
        try {
          const [
            skillsMap,
            skillsDisabledMap,
            frameMap,
            masteryActiveMap,
            masteryDisabledMap
          ] = await Promise.all([
            fetch("data/assets/skills.json").then(res => res.json()),
            fetch("data/assets/skills-disabled.json").then(res => res.json()),
            fetch("data/assets/frame.json").then(res => res.json()),
            fetch("data/assets/mastery-effect-active.json").then(res => res.json()),
            fetch("data/assets/mastery-effect-disabled.json").then(res => res.json())
          ]);

          const [
            skillsImg,
            skillsDisabledImg,
            frameImg,
            masteryActiveImg,
            masteryDisabledImg
          ] = await Promise.all([
            loadImage("data/assets/skills.webp"),
            loadImage("data/assets/skills-disabled.webp"),
            loadImage("data/assets/frame.webp"),
            loadImage("data/assets/mastery-effect-active.webp"),
            loadImage("data/assets/mastery-effect-disabled.webp")
          ]);

          assetsRef.current = {
            loaded: true,
            images: {
              skills: skillsImg,
              skillsDisabled: skillsDisabledImg,
              frame: frameImg,
              masteryActive: masteryActiveImg,
              masteryDisabled: masteryDisabledImg
            },
            spriteMaps: {
              skills: skillsMap,
              skillsDisabled: skillsDisabledMap,
              frame: frameMap,
              masteryActive: masteryActiveMap,
              masteryDisabled: masteryDisabledMap
            }
          };
        } catch (assetErr) {
          console.error("Failed to load skill tree assets, falling back to vector nodes:", assetErr);
          assetsRef.current.loaded = false;
        }

        const nodes = [];
        const edges = [];
        const nodesMap = {};

        if (treeData.nodes) {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

          for (const [id, node] of Object.entries(treeData.nodes)) {
            if (node.x === undefined || node.y === undefined) continue;
            if (node.classStartIndex !== undefined) continue; // Skip start nodes

            const nodeId = (node.id !== undefined && node.id !== null) ? node.id.toString() : id;

            const processed = {
              id: nodeId,
              name: node.name || "Passive Skill",
              stats: node.stats || [],
              x: node.x,
              y: node.y,
              type: node.isKeystone ? "keystone" : (node.isNotable ? "notable" : "normal"),
              radius: node.isMastery ? RADIUS_MASTERY :
                (node.isKeystone ? RADIUS_KEYSTONE :
                  (node.isNotable || node.isJewelSocket ? RADIUS_NOTABLE : RADIUS_NORMAL)),
              icon: node.icon || null,
              isJewelSocket: node.isJewelSocket || false,
              isMastery: node.isMastery || false,
              activeEffectImage: node.activeEffectImage || null,
              group: node.group || null,
              ascendancyId: node.ascendancyId || null
            };

            nodes.push(processed);

            // Index by both dictionary key and node.id string for O(1) lookups
            nodesMap[id] = processed;
            if (node.id !== undefined && node.id !== null) {
              nodesMap[node.id.toString()] = processed;
            }

            if (node.x < minX) minX = node.x;
            if (node.x > maxX) maxX = node.x;
            if (node.y < minY) minY = node.y;
            if (node.y > maxY) maxY = node.y;

            if (node.out && !node.isMastery) {
              node.out.forEach(outId => {
                const toNode = treeData.nodes[outId];
                if (toNode && toNode.x !== undefined && !toNode.isMastery) {
                  const dx = node.x - toNode.x;
                  const dy = node.y - toNode.y;
                  const distSq = dx * dx + dy * dy;
                  if (distSq < 100000000) {
                    edges.push({ from: id, to: outId.toString() });
                  }
                }
              });
            }
          }

          // Find nodes in the same group to determine mastery activation
          nodes.forEach(node => {
            if (node.isMastery) {
              const groupId = node.group;
              const groupIds = [];
              if (groupId !== undefined && groupId !== null) {
                nodes.forEach(otherNode => {
                  if (otherNode.group === groupId && otherNode.id !== node.id && !otherNode.isMastery) {
                    groupIds.push(otherNode.id);
                  }
                });
              }
              node.connectedIds = groupIds;
            }
          });

          nodesListRef.current = nodes;
          edgesListRef.current = edges;
          nodesMapRef.current = nodesMap;
          setTreeDataLoaded(true);

          // Center camera
          const canvas = canvasRef.current;
          if (canvas && minX !== Infinity) {
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            cameraRef.current = {
              x: canvas.width / 2 - centerX * 0.2,
              y: canvas.height / 2 - centerY * 0.2,
              zoom: 0.2
            };
          }
        }
      } catch (err) {
        console.error("Error loading tree data:", err);
      }
    }
    loadTreeAndAssets();
  }, []);

  // 1.5 Auto-prune on ascendancy change
  useEffect(() => {
    if (!treeDataLoaded || !nodesMapRef.current) return;
    let changed = false;
    const currentNodes = [...activeTree.nodes];
    const newNodes = currentNodes.filter(nodeObj => {
      const nodeData = nodesMapRef.current[nodeObj.id];
      if (nodeData && nodeData.ascendancyId && nodeData.ascendancyId !== buildState.ascendancy) {
        changed = true;
        return false;
      }
      return true;
    });

    if (changed) {
      fetchSkillTreeData().then(treeData => {
        const prunedNodes = pruneDisconnectedNodes(treeData, newNodes, buildState.ascendancy);
        const newTrees = [...buildState.passive_trees];
        newTrees[currentTreeIndex] = { ...activeTree, nodes: prunedNodes };
        setBuildState({ ...buildState, passive_trees: newTrees });
      });
    }
  }, [buildState.ascendancy, treeDataLoaded]);

  // 2. Render Loop
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const camera = cameraRef.current;

    // Clear background
    ctx.fillStyle = "#0c0c0c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    const nodesMap = nodesMapRef.current;

    const drawNode = (node) => {
      // Hide nodes belonging to unselected ascendancies
      if (node.ascendancyId && node.ascendancyId !== buildState.ascendancy) return;

      let isAllocated = allocatedNodes.has(node.id);
      if (node.isMastery && node.connectedIds) {
        isAllocated = node.connectedIds.some(connId => allocatedNodes.has(connId));
      }
      let drawn = false;

      if (assetsRef.current.loaded) {
        const { images, spriteMaps } = assetsRef.current;

        if (node.isMastery) {
          if (node.activeEffectImage) {
            const prefix = isAllocated ? 'masteryEffectActive' : 'masteryEffectInactive';
            const img = isAllocated ? images.masteryActive : images.masteryDisabled;
            const map = isAllocated ? spriteMaps.masteryActive : spriteMaps.masteryDisabled;
            const key = `${prefix}:${node.activeEffectImage}`;
            drawn = drawSprite(ctx, img, map, key, node.x, node.y, 2.25 * node.radius, 2.25 * node.radius);
          }
        } else if (node.isJewelSocket) {
          const frameKey = `frame:${isAllocated ? 'JewelFrameAllocated' : 'JewelFrameUnallocated'}`;
          drawn = drawSprite(ctx, images.frame, spriteMaps.frame, frameKey, node.x, node.y, 2 * node.radius, 2 * node.radius);
        } else if (node.type === "keystone" && node.icon) {
          const iconKey = `${isAllocated ? 'keystoneActive' : 'keystoneInactive'}:${node.icon}`;
          const frameKey = `frame:${isAllocated ? 'KeystoneFrameAllocated' : 'KeystoneFrameUnallocated'}`;

          const iconImg = isAllocated ? images.skills : images.skillsDisabled;
          const iconMap = isAllocated ? spriteMaps.skills : spriteMaps.skillsDisabled;
          const wFrame = 2 * node.radius;
          const hFrame = 2.033 * node.radius;
          const wIcon = wFrame * (68 / 109);
          const hIcon = hFrame * (69 / 111);

          const iconDrawn = drawSprite(ctx, iconImg, iconMap, iconKey, node.x, node.y, wIcon, hIcon);
          const frameDrawn = drawSprite(ctx, images.frame, spriteMaps.frame, frameKey, node.x, node.y, wFrame, hFrame);
          drawn = iconDrawn || frameDrawn;
        } else if (node.type === "notable" && node.icon) {
          const iconKey = `${isAllocated ? 'notableActive' : 'notableInactive'}:${node.icon}`;
          const frameKey = `frame:${isAllocated ? 'NotableFrameAllocated' : 'NotableFrameUnallocated'}`;

          const iconImg = isAllocated ? images.skills : images.skillsDisabled;
          const iconMap = isAllocated ? spriteMaps.skills : spriteMaps.skillsDisabled;
          const sizeFrame = 2 * node.radius;
          const wIcon = sizeFrame * (49 / 76);

          const iconDrawn = drawSprite(ctx, iconImg, iconMap, iconKey, node.x, node.y, wIcon, wIcon);
          const frameDrawn = drawSprite(ctx, images.frame, spriteMaps.frame, frameKey, node.x, node.y, sizeFrame, sizeFrame);
          drawn = iconDrawn || frameDrawn;
        } else if (node.icon) {
          // Normal passive node
          const iconKey = `${isAllocated ? 'normalActive' : 'normalInactive'}:${node.icon}`;
          const frameKey = `frame:${isAllocated ? 'PSSkillFrameActive' : 'PSSkillFrame'}`;

          const iconImg = isAllocated ? images.skills : images.skillsDisabled;
          const iconMap = isAllocated ? spriteMaps.skills : spriteMaps.skillsDisabled;
          const sizeFrame = 2 * node.radius;
          const wIcon = sizeFrame * (34 / 51);

          const iconDrawn = drawSprite(ctx, iconImg, iconMap, iconKey, node.x, node.y, wIcon, wIcon);
          const frameDrawn = drawSprite(ctx, images.frame, spriteMaps.frame, frameKey, node.x, node.y, sizeFrame, sizeFrame);
          drawn = iconDrawn || frameDrawn;
        }
      }

      if (!drawn) {
        // Fallback vector drawing (original style)
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        if (isAllocated) {
          ctx.fillStyle = "#cfb56c";
          ctx.strokeStyle = "#ffffff";
        } else {
          ctx.fillStyle = "#1a1a1a";
          ctx.strokeStyle = "#4a4a4a";
        }

        ctx.lineWidth = node.radius * 0.15;
        ctx.fill();
        ctx.stroke();

        if (node.type === "notable" || node.type === "keystone") {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = isAllocated ? "#fff" : "#333";
          ctx.fill();
        }
      }
    };

    // 1. Draw mastery nodes (behind everything)
    nodesListRef.current.forEach(node => {
      if (node.isMastery) drawNode(node);
    });

    // 2. Draw edges
    ctx.lineWidth = 15;
    edgesListRef.current.forEach(edge => {
      const fromNode = nodesMap[edge.from];
      const toNode = nodesMap[edge.to];

      if (fromNode && toNode) {
        // Hide edges connecting to unselected ascendancy nodes
        if (fromNode.ascendancyId && fromNode.ascendancyId !== buildState.ascendancy) return;
        if (toNode.ascendancyId && toNode.ascendancyId !== buildState.ascendancy) return;

        const isAllocated = allocatedNodes.has(fromNode.id) && allocatedNodes.has(toNode.id);
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = isAllocated ? "#cfb56c" : "#2a2a2a";
        ctx.stroke();
      }
    });

    // 3. Draw non-mastery nodes (on top of edges)
    nodesListRef.current.forEach(node => {
      if (!node.isMastery) drawNode(node);
    });

    ctx.restore();
  };

  // Re-draw on data/tree/selection changes
  useEffect(() => {
    if (treeDataLoaded) {
      draw();
    }
  }, [treeDataLoaded, currentTreeIndex, buildState.passive_trees, selectedElement]);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      draw();
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size

    return () => window.removeEventListener('resize', handleResize);
  }, [treeDataLoaded]);

  // Alt key release listener
  useEffect(() => {
    const handleKeyUp = (e) => {
      if (e.key === 'Alt') {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = mousePosRef.current.x - rect.left;
        const mouseY = mousePosRef.current.y - rect.top;

        // Check if mouse is within canvas bounds
        if (mouseX < 0 || mouseX > rect.width || mouseY < 0 || mouseY > rect.height) {
          setHoveredNode(null);
          return;
        }

        const camera = cameraRef.current;
        const worldX = (mouseX - camera.x) / camera.zoom;
        const worldY = (mouseY - camera.y) / camera.zoom;

        let foundHover = false;
        for (const node of nodesListRef.current) {
          if (node.isMastery) continue;
          if (node.ascendancyId && node.ascendancyId !== buildState.ascendancy) continue;
          
          const dx = node.x - worldX;
          const dy = node.y - worldY;
          const distSq = dx * dx + dy * dy;

          const detectRadius = node.radius + DETECTION_PADDING;
          if (distSq <= detectRadius * detectRadius) {
            foundHover = true;
            break;
          }
        }

        if (!foundHover) {
          setHoveredNode(null);
        }
      }
    };
    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, []);

  // 3. Canvas Mouse Events
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    // Close tooltip immediately when dragging/panning starts
    if (!e.altKey) {
      setHoveredNode(null);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      cameraRef.current.x += dx;
      cameraRef.current.y += dy;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      draw();
    } else {
      if (e.altKey && hoveredNode) {
        return;
      }
      
      // Hover detection
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const camera = cameraRef.current;
      const worldX = (mouseX - camera.x) / camera.zoom;
      const worldY = (mouseY - camera.y) / camera.zoom;

      let foundHover = null;
      for (const node of nodesListRef.current) {
        if (node.isMastery) continue;
        if (node.ascendancyId && node.ascendancyId !== buildState.ascendancy) continue;

        const dx = node.x - worldX;
        const dy = node.y - worldY;
        const distSq = dx * dx + dy * dy;

        const detectRadius = node.radius + DETECTION_PADDING;
        if (distSq <= detectRadius * detectRadius) {
          foundHover = node;
          break;
        }
      }

      if (foundHover) {
        if (foundHover.id !== hoveredNode?.id) {
          setHoveredNode(foundHover);
          setTooltipPos({ x: e.clientX, y: e.clientY });
        }
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'default';
        if (hoveredNode && !e.altKey) {
          setHoveredNode(null);
        }
      }
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zoomFactor = 1.1;
    const direction = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const camera = cameraRef.current;
    const worldX = (mouseX - camera.x) / camera.zoom;
    const worldY = (mouseY - camera.y) / camera.zoom;

    camera.zoom *= direction;
    camera.zoom = Math.max(0.05, Math.min(camera.zoom, 2.0));

    camera.x = mouseX - worldX * camera.zoom;
    camera.y = mouseY - worldY * camera.zoom;

    draw();

    // Re-check hover at new zoom
    handleMouseMove(e);
  };

  const handleClick = async (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const camera = cameraRef.current;
    const worldX = (mouseX - camera.x) / camera.zoom;
    const worldY = (mouseY - camera.y) / camera.zoom;

    let clickedNode = false;

    for (const node of nodesListRef.current) {
      if (node.isMastery) continue;
      if (node.ascendancyId && node.ascendancyId !== buildState.ascendancy) continue;

      const dx = node.x - worldX;
      const dy = node.y - worldY;
      const distSq = dx * dx + dy * dy;

      const detectRadius = node.radius + DETECTION_PADDING;
      if (distSq <= detectRadius * detectRadius) {
        clickedNode = true;
        const currentNodes = [...activeTree.nodes];
        const idx = currentNodes.findIndex(n => n.id === node.id);
        const isAllocated = idx > -1;

        if (!isAllocated) {
          if (!buildState.ascendancy) {
            alert("Please select a class Ascendancy from the dropdown first!");
            return;
          }
          const treeData = await fetchSkillTreeData();
          const allocatedIds = currentNodes.map(n => n.id);
          const path = findShortestPath(treeData, allocatedIds, node.id, buildState.ascendancy);

          if (!path) {
            return;
          }

          // Allocate all nodes in the path
          for (const pathId of path) {
            if (!currentNodes.some(n => n.id === pathId)) {
              currentNodes.push({ id: pathId, additional_text: "" });
            }
          }
          
          const newTrees = [...buildState.passive_trees];
          newTrees[currentTreeIndex] = { ...activeTree, nodes: currentNodes };
          setBuildState({ ...buildState, passive_trees: newTrees });

          if (e.ctrlKey) {
            setSelectedElement({ type: 'passive', id: node.id });
          }
        } else {
          if (e.ctrlKey) {
            setSelectedElement({ type: 'passive', id: node.id });
          } else {
            // Standard click on an allocated node toggles it (removes it)
            currentNodes.splice(idx, 1);
            if (selectedElement && selectedElement.type === 'passive' && selectedElement.id === node.id) {
              setSelectedElement(null);
            }
            
            // Prune any nodes that became disconnected due to this removal
            const treeData = await fetchSkillTreeData();
            const prunedNodes = pruneDisconnectedNodes(treeData, currentNodes, buildState.ascendancy);
            
            const newTrees = [...buildState.passive_trees];
            newTrees[currentTreeIndex] = { ...activeTree, nodes: prunedNodes };
            setBuildState({ ...buildState, passive_trees: newTrees });
          }
        }
        break;
      }
    }

    if (!clickedNode) {
      setSelectedElement(null);
    }
  };

  const handleWrapperMouseLeave = (e) => {
    isDraggingRef.current = false;
    if (hoveredNode && !e.altKey) {
      setHoveredNode(null);
    }
  };

  const handleTooltipMouseEnter = () => {
    // Tooltip hover is handled directly now
  };

  const handleTooltipMouseLeave = (e) => {
    if (!e.altKey) {
      setHoveredNode(null);
    }
  };

  const handleAttributeSelect = (e, attribute, colorTag) => {
    e.stopPropagation();
    if (!hoveredNode) return;

    const currentNodes = [...activeTree.nodes];
    const isAllocated = currentNodes.some(n => n.id === hoveredNode.id);
    const textToSave = `${colorTag}{${attribute}}`;

    if (!isAllocated) {
      currentNodes.push({ id: hoveredNode.id, additional_text: textToSave });
      const newTrees = [...buildState.passive_trees];
      newTrees[currentTreeIndex] = { ...activeTree, nodes: currentNodes };
      setBuildState({ ...buildState, passive_trees: newTrees });
      setSelectedElement({ type: 'passive', id: hoveredNode.id });
    } else {
      updatePassiveText(hoveredNode.id, textToSave);
    }
  };

  const allocatedNodeData = hoveredNode ? activeTree.nodes.find(n => n.id === hoveredNode.id) : null;

  return (
    <div
      className="tree-canvas-wrapper"
      style={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}
      onMouseLeave={handleWrapperMouseLeave}
    >
      <canvas
        ref={canvasRef}
        id="tree-canvas"
        style={{ display: 'block', width: '100%', height: '100%' }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onClick={handleClick}
      />
      {hoveredNode && (
        <div
          id="tree-tooltip"
          className="tooltip-box"
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          style={{
            position: 'fixed',
            left: `${tooltipPos.x + 15}px`,
            top: `${tooltipPos.y + 15}px`,
            zIndex: 1000,
            pointerEvents: 'auto'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderBottom: '1px solid #333', paddingBottom: '5px', marginBottom: '5px' }}>
            <div className="tooltip-title" style={{ margin: 0 }}>{hoveredNode.name}</div>
            <button
              className="quick-edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                const currentNodes = [...activeTree.nodes];
                const idx = currentNodes.findIndex(n => n.id === hoveredNode.id);
                const isAllocated = idx > -1;
                if (!isAllocated) {
                  currentNodes.push({ id: hoveredNode.id, additional_text: "" });
                  const newTrees = [...buildState.passive_trees];
                  newTrees[currentTreeIndex] = { ...activeTree, nodes: currentNodes };
                  setBuildState({ ...buildState, passive_trees: newTrees });
                }
                setSelectedElement({ type: 'passive', id: hoveredNode.id });
              }}
              style={{
                background: 'rgba(207, 169, 104, 0.1)',
                border: '1px solid var(--border-gold-dark)',
                borderRadius: '3px',
                color: 'var(--text-gold)',
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: '11px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
                pointerEvents: 'auto'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(207, 169, 104, 0.25)';
                e.target.style.borderColor = 'var(--border-gold)';
                e.target.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(207, 169, 104, 0.1)';
                e.target.style.borderColor = 'var(--border-gold-dark)';
                e.target.style.color = 'var(--text-gold)';
              }}
              title="Edit Node Properties"
            >
              ✏️ Edit
            </button>
          </div>
          <div className="tooltip-content" style={{ marginTop: '5px' }}>
            {allocatedNodeData?.additional_text && (
              <div style={{ marginBottom: '5px', paddingBottom: '5px', borderBottom: '1px solid #333' }}>
                <span style={{ color: '#aaa' }}>Allocated: </span>
                <span dangerouslySetInnerHTML={{
                  __html: allocatedNodeData.additional_text
                    .replace(/<red>{(.*?)}/g, '<span style="color: #ff4444">$1</span>')
                    .replace(/<green>{(.*?)}/g, '<span style="color: #44ff44">$1</span>')
                    .replace(/<blue>{(.*?)}/g, '<span style="color: #4444ff">$1</span>')
                }} />
              </div>
            )}
            {hoveredNode.name === "Attribute" && (
              <div style={{ display: 'flex', gap: '5px', marginBottom: '8px', pointerEvents: 'auto' }}>
                <button onClick={(e) => handleAttributeSelect(e, 'Strength', '<red>')} style={{ padding: '2px 6px', background: '#301818', color: '#ff4444', border: '1px solid #502020', borderRadius: '3px', cursor: 'pointer' }}>Str</button>
                <button onClick={(e) => handleAttributeSelect(e, 'Dexterity', '<green>')} style={{ padding: '2px 6px', background: '#183018', color: '#44ff44', border: '1px solid #205020', borderRadius: '3px', cursor: 'pointer' }}>Dex</button>
                <button onClick={(e) => handleAttributeSelect(e, 'Intelligence', '<blue>')} style={{ padding: '2px 6px', background: '#181830', color: '#4444ff', border: '1px solid #202050', borderRadius: '3px', cursor: 'pointer' }}>Int</button>
              </div>
            )}
            {hoveredNode.stats.length > 0 ? (
              hoveredNode.stats.map((s, idx) => (
                <div key={idx} style={{ color: '#8888FF', marginBottom: '2px' }}>{s}</div>
              ))
            ) : (
              <span style={{ color: '#7a7262', fontStyle: 'italic' }}>No stats</span>
            )}
            <div style={{ borderTop: '1px solid #2d261e', marginTop: '10px', paddingTop: '5px', color: 'var(--text-gold)', fontSize: '0.85em', opacity: 0.8 }}>
              Left-Click: Toggle Allocation<br />Ctrl+Click: Edit Node
            </div>
            {debugMode && (
              <div style={{ borderTop: '1px solid #444', marginTop: '10px', paddingTop: '5px', color: '#ccc', fontSize: '0.8em', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                {JSON.stringify(hoveredNode, null, 2)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
