(function() {
    let canvas, ctx;
    let camera = { x: 0, y: 0, zoom: 0.2 };
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let treeData = null;
    let nodesList = [];
    let edgesList = [];
    
    // Config
    const RADIUS_NORMAL = 20;
    const RADIUS_NOTABLE = 40;
    const RADIUS_KEYSTONE = 60;
    
    document.addEventListener("DOMContentLoaded", () => {
        const btnOpen = document.getElementById("btn-tree-visualizer");
        const btnClose = document.getElementById("btn-close-tree");
        const overlay = document.getElementById("tree-visualizer-overlay");
        
        if (btnOpen) btnOpen.addEventListener("click", openTree);
        if (btnClose) btnClose.addEventListener("click", closeTree);
        
        canvas = document.getElementById("tree-canvas");
        if (canvas) {
            ctx = canvas.getContext("2d");
            setupCanvasEvents();
            window.addEventListener("resize", handleResize);
        }
    });

    async function openTree() {
        document.getElementById("tree-visualizer-overlay").classList.remove("hidden");
        handleResize();
        if (!treeData) {
            await loadTreeData();
        }
        render();
    }

    function closeTree() {
        document.getElementById("tree-visualizer-overlay").classList.add("hidden");
    }

    async function loadTreeData() {
        try {
            // Fetch data
            const res = await fetch("../../data/poe2_skilltree_data.json");
            if (!res.ok) throw new Error("Could not fetch tree data");
            treeData = await res.json();
            
            // Process nodes
            nodesList = [];
            edgesList = [];
            
            if (treeData.nodes) {
                // Determine bounding box to center camera
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                
                for (const [id, node] of Object.entries(treeData.nodes)) {
                    // Only process nodes with coordinates
                    if (node.x === undefined || node.y === undefined) continue;
                    if (node.classStartIndex !== undefined) continue; // Skip starting nodes
                    
                    const processedNode = {
                        id: node.id || id,
                        nodeIndex: id,
                        name: node.name || "Passive Skill",
                        stats: node.stats || [],
                        x: node.x,
                        y: node.y,
                        type: node.isKeystone ? "keystone" : (node.isNotable ? "notable" : "normal"),
                        radius: node.isKeystone ? RADIUS_KEYSTONE : (node.isNotable ? RADIUS_NOTABLE : RADIUS_NORMAL)
                    };
                    
                    nodesList.push(processedNode);
                    
                    if (node.x < minX) minX = node.x;
                    if (node.x > maxX) maxX = node.x;
                    if (node.y < minY) minY = node.y;
                    if (node.y > maxY) maxY = node.y;
                    
                    // Create edges
                    if (node.out) {
                        node.out.forEach(outId => {
                            const toNode = treeData.nodes[outId];
                            if (toNode && toNode.x !== undefined) {
                                // Skip edges that span huge distances (like Ascendancy to Class Start)
                                const dx = node.x - toNode.x;
                                const dy = node.y - toNode.y;
                                const distSq = dx*dx + dy*dy;
                                if (distSq < 100000000) { // < 10000 units
                                    edgesList.push({ from: id, to: outId.toString() });
                                }
                            }
                        });
                    }
                }
                
                // Center camera
                if (minX !== Infinity) {
                    const centerX = (minX + maxX) / 2;
                    const centerY = (minY + maxY) / 2;
                    camera.x = canvas.width / 2 - centerX * camera.zoom;
                    camera.y = canvas.height / 2 - centerY * camera.zoom;
                }
            }
        } catch (e) {
            console.error("Error loading tree data:", e);
        }
    }

    function handleResize() {
        if (!canvas) return;
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        render();
    }

    function setupCanvasEvents() {
        canvas.addEventListener("mousedown", (e) => {
            isDragging = true;
            dragStart = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener("mouseup", () => {
            isDragging = false;
        });

        canvas.addEventListener("mousemove", (e) => {
            if (isDragging) {
                const dx = e.clientX - dragStart.x;
                const dy = e.clientY - dragStart.y;
                camera.x += dx;
                camera.y += dy;
                dragStart = { x: e.clientX, y: e.clientY };
                render();
            } else {
                handleHover(e);
            }
        });

        canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            const zoomFactor = 1.1;
            const direction = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;
            
            // Zoom towards mouse
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const worldX = (mouseX - camera.x) / camera.zoom;
            const worldY = (mouseY - camera.y) / camera.zoom;
            
            camera.zoom *= direction;
            
            // Constrain zoom
            camera.zoom = Math.max(0.05, Math.min(camera.zoom, 2.0));
            
            camera.x = mouseX - worldX * camera.zoom;
            camera.y = mouseY - worldY * camera.zoom;
            
            render();
            handleHover(e);
        }, { passive: false });
        
        canvas.addEventListener("click", handleClick);
    }

    function handleHover(e) {
        if (!treeData) return;
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const worldX = (mouseX - camera.x) / camera.zoom;
        const worldY = (mouseY - camera.y) / camera.zoom;
        
        let hoveredNode = null;
        
        // Find nearest node within radius
        for (const node of nodesList) {
            const dx = node.x - worldX;
            const dy = node.y - worldY;
            const distSq = dx*dx + dy*dy;
            
            if (distSq <= node.radius * node.radius) {
                hoveredNode = node;
                break;
            }
        }
        
        const tooltip = document.getElementById("tree-tooltip");
        if (hoveredNode) {
            document.getElementById("tree-tooltip-title").textContent = hoveredNode.name;
            const content = document.getElementById("tree-tooltip-content");
            content.innerHTML = hoveredNode.stats.length > 0 
                ? hoveredNode.stats.join("<br>") 
                : '<span style="color: var(--color-text-muted);">No stats</span>';
                
            tooltip.style.left = (e.clientX + 15) + "px";
            tooltip.style.top = (e.clientY + 15) + "px";
            tooltip.classList.remove("hidden");
            canvas.style.cursor = "pointer";
        } else {
            tooltip.classList.add("hidden");
            canvas.style.cursor = "grab";
        }
    }
    
    function handleClick(e) {
        if (!treeData) return;
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const worldX = (mouseX - camera.x) / camera.zoom;
        const worldY = (mouseY - camera.y) / camera.zoom;
        
        for (const node of nodesList) {
            const dx = node.x - worldX;
            const dy = node.y - worldY;
            const distSq = dx*dx + dy*dy;
            
            if (distSq <= node.radius * node.radius) {
                // Toggle allocation
                if (window.buildState && window.buildState.passives) {
                    const idx = window.buildState.passives.indexOf(node.id);
                    if (idx > -1) {
                        window.buildState.passives.splice(idx, 1);
                    } else {
                        window.buildState.passives.push(node.id);
                    }
                    window.isDirty = true;
                    if (window.updateUI) window.updateUI();
                    render(); // Re-render to show allocation
                }
                break;
            }
        }
    }

    function render() {
        if (!ctx || !canvas) return;
        
        ctx.fillStyle = "#0c0c0c"; // Dark gothic background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(camera.x, camera.y);
        ctx.scale(camera.zoom, camera.zoom);
        
        const allocatedNodes = window.buildState ? new Set(window.buildState.passives) : new Set();
        
        // Draw Edges
        ctx.lineWidth = 15;
        
        edgesList.forEach(edge => {
            const fromNode = treeData.nodes[edge.from];
            const toNode = treeData.nodes[edge.to];
            
            if (fromNode && toNode && fromNode.x !== undefined && toNode.x !== undefined) {
                const fromStrId = fromNode.id || edge.from;
                const toStrId = toNode.id || edge.to;
                const isAllocated = allocatedNodes.has(fromStrId) && allocatedNodes.has(toStrId);
                
                ctx.beginPath();
                ctx.moveTo(fromNode.x, fromNode.y);
                ctx.lineTo(toNode.x, toNode.y);
                
                ctx.strokeStyle = isAllocated ? "#cfb56c" : "#2a2a2a"; // Gold if allocated, dim grey otherwise
                ctx.stroke();
            }
        });
        
        // Draw Nodes
        nodesList.forEach(node => {
            const isAllocated = allocatedNodes.has(node.id);
            
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            
            if (isAllocated) {
                ctx.fillStyle = "#cfb56c"; // Gold
                ctx.strokeStyle = "#ffffff";
            } else {
                ctx.fillStyle = "#1a1a1a";
                ctx.strokeStyle = "#4a4a4a";
            }
            
            ctx.lineWidth = node.radius * 0.15;
            ctx.fill();
            ctx.stroke();
            
            // Inner circle for Notables/Keystones
            if (node.type === "notable" || node.type === "keystone") {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = isAllocated ? "#fff" : "#333";
                ctx.fill();
            }
        });
        
        ctx.restore();
    }
})();
