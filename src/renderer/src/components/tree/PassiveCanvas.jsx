import React, { useEffect, useRef, useState } from 'react';
import { useBuildStore } from '../../store/useBuildStore';
import { fetchSkillTreeData } from '../../utils/skillTree';

// Config constants
const RADIUS_NORMAL = 20;
const RADIUS_NOTABLE = 40;
const RADIUS_KEYSTONE = 60;

export default function PassiveCanvas() {
  const canvasRef = useRef(null);
  
  const passive_trees = useBuildStore((state) => state.buildState.passive_trees);
  const currentTreeIndex = useBuildStore((state) => state.currentTreeIndex);
  const selectedElement = useBuildStore((state) => state.selectedElement);
  const setSelectedElement = useBuildStore((state) => state.setSelectedElement);
  
  // Custom update helper to keep store mutations clean
  const setBuildState = useBuildStore((state) => state.setBuildState);
  const buildState = useBuildStore((state) => state.buildState);

  // Canvas Viewport Camera state
  const cameraRef = useRef({ x: 0, y: 0, zoom: 0.2 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Data refs
  const nodesListRef = useRef([]);
  const edgesListRef = useRef([]);
  const nodesMapRef = useRef({});
  const [treeDataLoaded, setTreeDataLoaded] = useState(false);

  // Hover Tooltip state
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const activeTree = passive_trees[currentTreeIndex] || passive_trees[0];
  const allocatedNodes = new Set((activeTree?.nodes || []).filter(n => n !== null && n !== undefined).map(n => (n.id || n).toString()));

  // 1. Fetch data on mount
  useEffect(() => {
    async function loadTree() {
      try {
        const treeData = await fetchSkillTreeData();
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
              radius: node.isKeystone ? RADIUS_KEYSTONE : (node.isNotable ? RADIUS_NOTABLE : RADIUS_NORMAL)
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

            if (node.out) {
              node.out.forEach(outId => {
                const toNode = treeData.nodes[outId];
                if (toNode && toNode.x !== undefined) {
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
    loadTree();
  }, []);

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

    // Draw edges
    ctx.lineWidth = 15;
    const nodesMap = nodesMapRef.current;

    edgesListRef.current.forEach(edge => {
      const fromNode = nodesMap[edge.from];
      const toNode = nodesMap[edge.to];

      if (fromNode && toNode) {
        const isAllocated = allocatedNodes.has(fromNode.id) && allocatedNodes.has(toNode.id);
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = isAllocated ? "#cfb56c" : "#2a2a2a";
        ctx.stroke();
      }
    });

    // Draw nodes
    nodesListRef.current.forEach(node => {
      const isAllocated = allocatedNodes.has(node.id);
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

  // 3. Canvas Mouse Events
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e) => {
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
      // Hover detection
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const camera = cameraRef.current;
      const worldX = (mouseX - camera.x) / camera.zoom;
      const worldY = (mouseY - camera.y) / camera.zoom;

      let foundHover = null;
      for (const node of nodesListRef.current) {
        const dx = node.x - worldX;
        const dy = node.y - worldY;
        const distSq = dx * dx + dy * dy;

        if (distSq <= node.radius * node.radius) {
          foundHover = node;
          break;
        }
      }

      if (foundHover) {
        setHoveredNode(foundHover);
        setTooltipPos({ x: e.clientX, y: e.clientY });
        canvas.style.cursor = 'pointer';
      } else {
        setHoveredNode(null);
        canvas.style.cursor = 'default';
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

  const handleClick = (e) => {
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
      const dx = node.x - worldX;
      const dy = node.y - worldY;
      const distSq = dx * dx + dy * dy;

      if (distSq <= node.radius * node.radius) {
        clickedNode = true;
        const currentNodes = [...activeTree.nodes];
        const idx = currentNodes.findIndex(n => n.id === node.id);
        const isAllocated = idx > -1;

        if (e.ctrlKey) {
          if (isAllocated) {
            currentNodes.splice(idx, 1);
            if (selectedElement && selectedElement.type === 'passive' && selectedElement.id === node.id) {
              setSelectedElement(null);
            }
          } else {
            currentNodes.push({ id: node.id, additional_text: "" });
          }
          // Update store tree
          const newTrees = [...buildState.passive_trees];
          newTrees[currentTreeIndex] = { ...activeTree, nodes: currentNodes };
          setBuildState({ ...buildState, passive_trees: newTrees });
        } else {
          // Standard click
          if (!isAllocated) {
            currentNodes.push({ id: node.id, additional_text: "" });
            const newTrees = [...buildState.passive_trees];
            newTrees[currentTreeIndex] = { ...activeTree, nodes: currentNodes };
            setBuildState({ ...buildState, passive_trees: newTrees });
          }
          setSelectedElement({ type: 'passive', id: node.id });
        }
        break;
      }
    }

    if (!clickedNode) {
      setSelectedElement(null);
    }
  };

  return (
    <div 
      className="tree-canvas-wrapper" 
      style={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}
      onMouseLeave={handleMouseUp}
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
          style={{ 
            position: 'fixed', 
            left: `${tooltipPos.x + 15}px`, 
            top: `${tooltipPos.y + 15}px`, 
            zIndex: 1000, 
            pointerEvents: 'none' 
          }}
        >
          <div className="tooltip-title">{hoveredNode.name}</div>
          <div className="tooltip-content" style={{ marginTop: '5px' }}>
            {hoveredNode.stats.length > 0 ? (
              hoveredNode.stats.map((s, idx) => (
                <div key={idx} style={{ color: '#8888FF', marginBottom: '2px' }}>{s}</div>
              ))
            ) : (
              <span style={{ color: '#7a7262', fontStyle: 'italic' }}>No stats</span>
            )}
            <div style={{ borderTop: '1px solid #2d261e', marginTop: '10px', paddingTop: '5px', color: 'var(--text-gold)', fontSize: '0.85em', opacity: 0.8 }}>
              Left-Click: Select/Allocate<br />Ctrl+Click: Toggle Allocation
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
