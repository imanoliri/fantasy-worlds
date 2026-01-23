class DiplomacyView {
    constructor() {
        this.overlay = document.getElementById('diplomacyMatrixOverlay');
        this.svg = document.getElementById('diplomacyGraphSvg');
        this.container = document.getElementById('diplomacyGraphContainer');
        this.closeBtn = document.getElementById('closeDiplomacyBtn');
        this.isOpen = false;
        this.layout = 'circle'; // Default
        this.simulationId = null;

        // Configuration
        this.radius = 300; // Radius of the circle
        this.cx = 400;     // Center X
        this.cy = 350;     // Center Y
        this.nodeRadius = 15;

        // Colors
        this.colors = {
            "Enemy": "#FF0000",
            "War": "#8B0000",
            "Rival": "#FF4500",
            "Suspicion": "#FFD700",
            "Friendly": "#32CD32",
            "Ally": "#006400",
            "Neutral": "#D3D3D3",
            "Subject": "#800080",
            "Suzerain": "#4B0082"
        };

        this.strokeWidths = {
            "War": 3,
            "Ally": 3,
            "Enemy": 2,
            "Rival": 2,
            "Subject": 2,
            "Suzerain": 2,
            "default": 1
        };

        this.init();
    }

    init() {
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }
        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this.close();
            });
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });
    }

    open() {
        if (!this.overlay) return;
        this.overlay.classList.remove('hidden');
        this.isOpen = true;
        this.render();
        this.renderControls();
    }

    setLayout(mode) {
        this.layout = mode;
        if (this.isOpen) this.render();
    }

    renderControls() {
        const container = document.getElementById('diplomacyCheckboxes');
        if (!container) return;
        container.innerHTML = '';

        // Layout Toolbar removed (Moved to HTML)
        // Get all unique relations actually present in the matrix?
        // Or just use the predefined colors list? Predefined is safer and more consistent.
        Object.keys(this.colors).forEach(relation => {
            const color = this.colors[relation];

            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.cursor = 'pointer';
            label.style.fontSize = '0.9rem';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            // Default ON, except for Neutral and Suspicion
            if (relation === "Neutral" || relation === "Suspicion") {
                checkbox.checked = false;
            } else {
                checkbox.checked = true;
            }
            // Trigger visibility update immediately for the default state
            // Note: toggleRelationVisibility runs on change, but we need initial state.
            // However, render() calls this logic at the end based on checked state.
            // So setting checked = false here is sufficient.
            checkbox.value = relation;
            checkbox.style.marginRight = '10px';
            checkbox.style.accentColor = color;

            checkbox.onchange = (e) => this.toggleRelationVisibility(relation, e.target.checked);

            const colorBox = document.createElement('span');
            colorBox.style.display = 'inline-block';
            colorBox.style.width = '12px';
            colorBox.style.height = '12px';
            colorBox.style.borderRadius = '2px';
            colorBox.style.backgroundColor = color;
            colorBox.style.marginRight = '8px';

            label.appendChild(checkbox);
            label.appendChild(colorBox);
            label.appendChild(document.createTextNode(relation));

            container.appendChild(label);
        });
    }

    toggleRelationVisibility(relation, isVisible) {
        // Select all lines, paths (arcs), AND rects (matrix cells) with this relation
        const elements = this.svg.querySelectorAll(`line[data-relation="${relation}"], path[data-relation="${relation}"], rect[data-relation="${relation}"]`);
        elements.forEach(el => {
            if (isVisible) {
                el.style.display = 'block';
                el.setAttribute('display', 'block');
            } else {
                el.style.display = 'none';
                el.setAttribute('display', 'none');
            }
        });
    }

    close() {
        if (!this.overlay) return;
        this.overlay.classList.add('hidden');
        this.isOpen = false;
        if (this.simulationId) cancelAnimationFrame(this.simulationId);
    }

    getRelationColor(relation) {
        return this.colors[relation] || this.colors["Neutral"];
    }

    getStrokeWidth(relation) {
        return this.strokeWidths[relation] || this.strokeWidths["default"];
    }

    render() {
        if (this.simulationId) cancelAnimationFrame(this.simulationId);
        this.svg.innerHTML = ''; // Clear

        if (this.layout === 'force') {
            this.renderForce();
        } else if (this.layout === 'matrix') {
            this.renderMatrix();
        } else if (this.layout === 'arc') {
            this.renderArc();
        } else if (this.layout === 'geo') {
            this.renderGeographic();
        } else {
            this.renderCircle();
        }
    }

    renderMatrix() {
        const validStates = statesData.filter(s => s.id > 0);
        const count = validStates.length;

        // Config
        const margin = { top: 120, left: 120 };
        const size = Math.min(this.svg.clientWidth || 800, this.svg.clientHeight || 700) - Math.max(margin.top, margin.left) - 20;
        const step = size / count;

        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("transform", `translate(${margin.left}, ${margin.top})`);
        this.svg.appendChild(group);

        // Columns (Target)
        validStates.forEach((state, i) => {
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.textContent = state.name;
            text.setAttribute("x", i * step + step / 2);
            text.setAttribute("y", -10);
            text.setAttribute("transform", `rotate(-90, ${i * step + step / 2}, -10)`);
            text.setAttribute("text-anchor", "start"); // After rotation, start is bottom
            text.setAttribute("fill", "#ccc");
            text.setAttribute("font-size", "12px");
            text.setAttribute("font-family", "Arial, sans-serif");
            group.appendChild(text);
        });

        // Rows (Source)
        validStates.forEach((state, i) => {
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.textContent = state.name;
            text.setAttribute("x", -10);
            text.setAttribute("y", i * step + step / 2);
            text.setAttribute("dy", "0.35em");
            text.setAttribute("text-anchor", "end");
            text.setAttribute("fill", "#ccc");
            text.setAttribute("font-size", "12px");
            text.setAttribute("font-family", "Arial, sans-serif");
            group.appendChild(text);
        });

        // Cells
        validStates.forEach((rowState, i) => {
            validStates.forEach((colState, j) => {
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", j * step);
                rect.setAttribute("y", i * step);
                rect.setAttribute("width", step - 1);
                rect.setAttribute("height", step - 1);

                let color = "#222"; // Default empty/neutral
                let opacity = 0.3;

                if (rowState.id === colState.id) {
                    color = "#444"; // Self
                    opacity = 0.5;
                    rect.setAttribute("data-relation", "Self");
                } else {
                    const rel = diplomacyMatrix[rowState.id] && diplomacyMatrix[rowState.id][colState.id];
                    let relationName = rel || "Neutral";

                    // If the relation is not in our known list, treat it as Neutral for consistency
                    if (!this.colors[relationName]) {
                        relationName = "Neutral";
                    }

                    // Always use the defined color, even for Neutral so it matches the toggle
                    color = this.getRelationColor(relationName);
                    // Neutrals slightly more transparent but visible
                    opacity = relationName === "Neutral" ? 0.4 : 0.8;

                    rect.setAttribute("data-relation", relationName);
                }

                rect.setAttribute("fill", color);
                rect.setAttribute("fill-opacity", opacity);

                // Interaction
                rect.addEventListener('mouseenter', () => {
                    rect.setAttribute("stroke", "#fff");
                    rect.setAttribute("stroke-width", 2);
                    // Tooltip logic could go here
                });
                rect.addEventListener('mouseleave', () => {
                    rect.setAttribute("stroke", "none");
                });

                // Add simple title for hover
                const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
                const relName = (diplomacyMatrix[rowState.id] && diplomacyMatrix[rowState.id][colState.id]) || "Neutral";
                title.textContent = `${rowState.name} ➔ ${colState.name}: ${relName}`;
                rect.appendChild(title);

                group.appendChild(rect);
            });
        });

        // Apply current filter visibility
        // (Re-run toggle logic based on existing checkboxes)
        const checkContainer = document.getElementById('diplomacyCheckboxes');
        if (checkContainer) {
            checkContainer.querySelectorAll('input').forEach(input => {
                this.toggleRelationVisibility(input.value, input.checked);
            });
        }
    }

    renderCircle() {
        // Prepare Data
        const validStates = statesData.filter(s => s.id > 0);
        const count = validStates.length;
        const angleStep = (2 * Math.PI) / count;

        const nodes = validStates.map((state, index) => {
            const angle = index * angleStep - Math.PI / 2;
            return {
                id: state.id,
                name: state.name,
                color: state.color,
                x: this.cx + this.radius * Math.cos(angle),
                y: this.cy + this.radius * Math.sin(angle),
                angle: angle
            };
        });

        this.drawGraph(nodes);
    }

    getGeographicPositions() {
        // 1. Get Map Bounds
        const mapSvg = document.getElementById("mapSvg"); // The main map
        let minX = 0, minY = 0, mapWidth = 1000, mapHeight = 1000;

        if (mapSvg) {
            const viewBox = mapSvg.getAttribute("viewBox").split(" ").map(Number);
            if (viewBox.length === 4) {
                minX = viewBox[0];
                minY = viewBox[1];
                mapWidth = viewBox[2];
                mapHeight = viewBox[3];
            }
        }

        // 2. Helper to get state center from DOM
        const getStateCenter = (stateId) => {
            // Find all paths for this state
            const paths = document.querySelectorAll(`#mapSvg path[data-state-id="${stateId}"]`);
            if (!paths || paths.length === 0) return null;

            let minBx = Infinity, minBy = Infinity, maxBx = -Infinity, maxBy = -Infinity;
            let count = 0;

            paths.forEach(p => {
                if (p.getBBox) {
                    const box = p.getBBox();
                    minBx = Math.min(minBx, box.x);
                    minBy = Math.min(minBy, box.y);
                    maxBx = Math.max(maxBx, box.x + box.width);
                    maxBy = Math.max(maxBy, box.y + box.height);
                    count++;
                }
            });

            if (count === 0) return null;

            return {
                x: minBx + (maxBx - minBx) / 2,
                y: minBy + (maxBy - minBy) / 2
            };
        };

        const validStates = statesData.filter(s => s.id > 0);
        return validStates.map(state => {
            let startX = this.cx + (Math.random() - 0.5) * 100;
            let startY = this.cy + (Math.random() - 0.5) * 100;

            const center = getStateCenter(state.id);
            if (center) {
                // Map from World Space to Graph Space (with some padding)
                const padding = 50;
                const graphW = (this.svg.clientWidth || 800) - 2 * padding;
                const graphH = (this.svg.clientHeight || 700) - 2 * padding;

                const normX = (center.x - minX) / mapWidth;
                const normY = (center.y - minY) / mapHeight;

                startX = padding + normX * graphW;
                startY = padding + normY * graphH;
            }

            return {
                id: state.id,
                name: state.name,
                color: state.color,
                x: startX,
                y: startY,
                vx: 0,
                vy: 0
            };
        });
    }

    renderGeographic() {
        const nodes = this.getGeographicPositions();

        // Links
        const links = [];
        nodes.forEach((nodeA, i) => {
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeB = nodes[j];
                const rel = diplomacyMatrix[nodeA.id] && diplomacyMatrix[nodeA.id][nodeB.id];
                if (rel && rel !== "Neutral") {
                    links.push({ source: nodeA, target: nodeB, relation: rel });
                }
            }
        });

        this.drawGraph(nodes, links);
    }

    renderForce() {
        // Initialize positions based on map coordinates
        const nodes = this.getGeographicPositions();

        // Links Data needed for physics
        const links = [];
        nodes.forEach((nodeA, i) => {
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeB = nodes[j];
                const rel = diplomacyMatrix[nodeA.id] && diplomacyMatrix[nodeA.id][nodeB.id];
                if (rel && rel !== "Neutral") {
                    links.push({ source: nodeA, target: nodeB, relation: rel });
                }
            }
        });

        // Initial Draw
        this.drawGraph(nodes, links);

        // Physics Loop
        const runSimulation = () => {
            if (!this.isOpen || this.layout !== 'force') return;

            // Physics Constants
            // Physics Constants
            const repulsion = 10000;
            const centerGravity = 0.005;
            const maxVelocity = 10;

            // Physics Configuration per Relation
            // distance: Ideal length of the spring (pixels)
            // strength: How hard it pulls/pushes to that length (0-1)
            const physicsConfig = {
                "War": { length: 600, strength: 0.2 }, // Push enemies far away
                "Enemy": { length: 500, strength: 0.15 },
                "Rival": { length: 400, strength: 0.1 },
                "Suspicion": { length: 300, strength: 0.05 },
                "Neutral": { length: 250, strength: 0.02 },
                "Friendly": { length: 150, strength: 0.05 },
                "Ally": { length: 70, strength: 0.2 }, // Pull allies close
                "Subject": { length: 50, strength: 0.2 },
                "Suzerain": { length: 50, strength: 0.2 }
            };

            // 1. Repulsion (Nodes push apart)
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i];
                    const b = nodes[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    let distSq = dx * dx + dy * dy;
                    if (distSq === 0) {
                        distSq = 0.1; // Avoid division by zero
                        a.x += Math.random();
                    }

                    const dist = Math.sqrt(distSq);
                    const force = repulsion / distSq;

                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;

                    a.vx += fx;
                    a.vy += fy;
                    b.vx -= fx;
                    b.vy -= fy;
                }
            }

            // 2. Attraction (Links pull together or push apart based on relation)
            links.forEach(link => {
                const a = link.source;
                const b = link.target;
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Get config for this relation
                let rel = link.relation;
                if (!this.colors[rel]) rel = "Neutral";
                const config = physicsConfig[rel] || physicsConfig["Neutral"];

                // Spring force
                const force = (dist - config.length) * config.strength;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;

                a.vx += fx;
                a.vy += fy;
                b.vx -= fx;
                b.vy -= fy;
            });

            // 3. Center Gravity (Keep them on screen)
            nodes.forEach(node => {
                const dx = this.cx - node.x;
                const dy = this.cy - node.y;
                node.vx += dx * centerGravity;
                node.vy += dy * centerGravity;

                // 4. Update Position & Damping
                node.vx *= 0.9; // Friction
                node.vy *= 0.9;

                // Limit speed
                const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
                if (speed > maxVelocity) {
                    node.vx = (node.vx / speed) * maxVelocity;
                    node.vy = (node.vy / speed) * maxVelocity;
                }

                node.x += node.vx;
                node.y += node.vy;
            });

            // Update DOM
            this.updateGraphPositions(nodes);

            this.simulationId = requestAnimationFrame(runSimulation);
        };

        this.simulationId = requestAnimationFrame(runSimulation);
    }

    drawGraph(nodes, precalcLinks = null) {
        // Create Groups
        const linksGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        linksGroup.id = "diplomacyLinks";
        this.svg.appendChild(linksGroup);

        const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        nodesGroup.id = "diplomacyNodes";
        this.svg.appendChild(nodesGroup);

        // Draw Links
        // Logic similar to before, but we need to store references if animating
        const links = precalcLinks || [];
        if (!precalcLinks) {
            nodes.forEach((nodeA, i) => {
                for (let j = i + 1; j < nodes.length; j++) {
                    const nodeB = nodes[j];
                    const rel = diplomacyMatrix[nodeA.id] && diplomacyMatrix[nodeA.id][nodeB.id];
                    if (rel && rel !== "Neutral") {
                        links.push({ source: nodeA, target: nodeB, relation: rel });
                    }
                }
            });
        }

        links.forEach(link => {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "line");
            // If circle, simple check. If force, objects.
            const x1 = link.source.x || link.source.x;
            path.setAttribute("x1", link.source.x);
            path.setAttribute("y1", link.source.y);
            path.setAttribute("x2", link.target.x);
            path.setAttribute("y2", link.target.y);
            path.setAttribute("stroke", this.getRelationColor(link.relation));
            path.setAttribute("stroke-width", this.getStrokeWidth(link.relation));
            path.setAttribute("stroke-opacity", 0.6);
            path.dataset.source = link.source.id;
            path.dataset.target = link.target.id;

            // Normalize relation name for filtering
            let relationName = link.relation;
            if (!this.colors[relationName]) {
                relationName = "Neutral";
            }
            path.dataset.relation = relationName;
            linksGroup.appendChild(path);

            // Store DOM ref for updates
            link.domElement = path;
        });

        // Draw Nodes
        nodes.forEach(node => {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.dataset.id = node.id;
            g.style.cursor = "pointer";

            // Interaction
            g.addEventListener('mouseenter', () => this.highlightState(node.id));
            g.addEventListener('mouseleave', () => this.resetHighlight());

            // Circle
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", 0); // Use translation for group
            circle.setAttribute("cy", 0);
            circle.setAttribute("r", this.nodeRadius);
            circle.setAttribute("fill", node.color);
            circle.setAttribute("stroke", "#333");
            circle.setAttribute("stroke-width", 2);
            g.appendChild(circle);

            // Label
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.textContent = node.name;
            text.setAttribute("fill", "#ccc");
            text.setAttribute("font-size", "14px");
            text.setAttribute("font-family", "Arial, sans-serif");
            text.style.pointerEvents = "none";

            // For circle layout, we had angled labels. For Force, centered or top is fine.
            // Let's standardise: Text below node
            text.setAttribute("x", 0);
            text.setAttribute("y", this.nodeRadius + 15);
            text.setAttribute("text-anchor", "middle");
            g.appendChild(text);

            g.setAttribute("transform", `translate(${node.x}, ${node.y})`);
            nodesGroup.appendChild(g);

            node.domElement = g;
        });

        // Store references for animation
        this.activeNodes = nodes;
        this.activeLinks = links;

        // Apply current filter visibility
        // (Re-run toggle logic based on existing checkboxes)
        const checkContainer = document.getElementById('diplomacyCheckboxes');
        if (checkContainer) {
            checkContainer.querySelectorAll('input').forEach(input => {
                this.toggleRelationVisibility(input.value, input.checked);
            });
        }
    }

    renderArc() {
        const validStates = statesData.filter(s => s.id > 0);
        // Sort by name or ID for consistent ordering along the line
        validStates.sort((a, b) => a.name.localeCompare(b.name));

        const count = validStates.length;
        // Draw along a horizontal line in the middle
        const y = this.cy;
        // Use about 80% of width
        const width = (this.svg.clientWidth || 800) * 0.8;
        const startX = (this.svg.clientWidth || 800) * 0.1;
        const step = width / (count - 1);

        const nodes = validStates.map((state, index) => {
            return {
                id: state.id,
                name: state.name,
                color: state.color,
                x: startX + index * step,
                y: y,
                index: index // scaling helper
            };
        });

        // Generate Links
        const links = [];
        nodes.forEach((nodeA, i) => {
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeB = nodes[j];
                const rel = diplomacyMatrix[nodeA.id] && diplomacyMatrix[nodeA.id][nodeB.id];
                if (rel && rel !== "Neutral") {
                    links.push({ source: nodeA, target: nodeB, relation: rel });
                } else {
                    // Include Neutral/Unknown for consistency if needed, but Arc usually cleaner without
                    // However, our filter logic relies on DOM existence.
                    // Let's add them but they will be hidden by default filter
                    let finalRel = rel || "Neutral";
                    if (!this.colors[finalRel]) finalRel = "Neutral";
                    links.push({ source: nodeA, target: nodeB, relation: finalRel });
                }
            }
        });

        // Draw Nodes
        const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        nodesGroup.id = "diplomacyNodes";

        nodes.forEach(node => {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.dataset.id = node.id;
            g.setAttribute("transform", `translate(${node.x}, ${node.y})`);
            g.style.cursor = "pointer";

            // Interaction
            g.addEventListener('mouseenter', () => this.highlightState(node.id));
            g.addEventListener('mouseleave', () => this.resetHighlight());

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("r", this.nodeRadius);
            circle.setAttribute("fill", node.color);
            circle.setAttribute("stroke", "#333");
            circle.setAttribute("stroke-width", 2);
            g.appendChild(circle);

            // Label below
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.textContent = node.name;
            text.setAttribute("fill", "#ccc");
            text.setAttribute("font-size", "12px");
            text.setAttribute("y", this.nodeRadius + 15);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("transform", "rotate(45, 0, " + (this.nodeRadius + 15) + ")"); // Angled labels for space
            g.appendChild(text);

            nodesGroup.appendChild(g);
        });

        // Draw Arcs
        const linksGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        linksGroup.id = "diplomacyLinks";

        links.forEach(link => {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

            const x1 = link.source.x;
            const x2 = link.target.x;
            const dist = Math.abs(x2 - x1);

            // Height proportional to distance
            const height = dist * 0.5;

            // Semantic Direction:
            // Positive (Up): Ally, Friendly, Subject, Suzerain
            // Negative (Down): War, Enemy, Rival, Suspicion
            // Neutral (Up/Small): Neutral
            const negativeRelations = ["War", "Enemy", "Rival", "Suspicion"];
            const isNegative = negativeRelations.includes(link.relation);

            // Quadratic Bezier: M x1,y Q cx,cy x2,y
            const cx = (x1 + x2) / 2;
            const cy = isNegative ? y + height : y - height;

            const d = `M ${x1},${y} Q ${cx},${cy} ${x2},${y}`;

            path.setAttribute("d", d);
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", this.getRelationColor(link.relation));
            path.setAttribute("stroke-width", this.getStrokeWidth(link.relation));
            path.setAttribute("stroke-opacity", 0.6);

            path.dataset.source = link.source.id;
            path.dataset.target = link.target.id;

            // Normalize for filtering: if color not found, it's Neutral
            let relationName = link.relation;
            if (!this.colors[relationName]) {
                relationName = "Neutral";
            }
            path.dataset.relation = relationName;

            linksGroup.appendChild(path);
        });

        this.svg.appendChild(linksGroup);
        this.svg.appendChild(nodesGroup);

        // Apply filters
        const checkContainer = document.getElementById('diplomacyCheckboxes');
        if (checkContainer) {
            checkContainer.querySelectorAll('input').forEach(input => {
                this.toggleRelationVisibility(input.value, input.checked);
            });
        }
    }

    updateGraphPositions(nodes) {
        if (!this.activeNodes || !this.activeLinks) return;

        this.activeNodes.forEach(node => {
            if (node.domElement) {
                node.domElement.setAttribute("transform", `translate(${node.x}, ${node.y})`);
            }
        });

        this.activeLinks.forEach(link => {
            if (link.domElement) {
                link.domElement.setAttribute("x1", link.source.x);
                link.domElement.setAttribute("y1", link.source.y);
                link.domElement.setAttribute("x2", link.target.x);
                link.domElement.setAttribute("y2", link.target.y);
            }
        });
    }

    highlightState(stateId) {
        stateId = parseInt(stateId);
        // Select both lines (Force/Circle) and paths (Arc)
        const links = this.svg.querySelectorAll('#diplomacyLinks line, #diplomacyLinks path');
        const nodes = this.svg.querySelectorAll('#diplomacyNodes g');

        // Dim all first
        links.forEach(link => {
            link.setAttribute("stroke-opacity", 0.1);
            link.style.opacity = 0.1;
        });
        nodes.forEach(node => {
            node.style.opacity = 0.2;
        });

        // Highlight selected node
        const hostNode = this.svg.querySelector(`#diplomacyNodes g[data-id="${stateId}"]`);
        if (hostNode) hostNode.style.opacity = 1.0;

        // Highlight connected links and neighbors
        links.forEach(link => {
            const s = parseInt(link.dataset.source);
            const t = parseInt(link.dataset.target);

            if (s === stateId || t === stateId) {
                // Determine neighbor ID
                const neighborId = (s === stateId) ? t : s;

                // Highlight Link
                link.setAttribute("stroke-opacity", 1.0);
                link.style.opacity = 1.0;

                // Highlight Neighbor Node
                const neighborNode = this.svg.querySelector(`#diplomacyNodes g[data-id="${neighborId}"]`);
                if (neighborNode) neighborNode.style.opacity = 1.0;
            }
        });
    }

    resetHighlight() {
        // Select both lines and paths
        const links = this.svg.querySelectorAll('#diplomacyLinks line, #diplomacyLinks path');
        const nodes = this.svg.querySelectorAll('#diplomacyNodes g');

        links.forEach(link => {
            link.setAttribute("stroke-opacity", 0.6);
            link.style.opacity = 1.0;
        });
        nodes.forEach(node => {
            node.style.opacity = 1.0;
        });
    }
}

// Global Instance
window.DiplomacyViewInstance = null;

// Helper to open
window.openDiplomacyMatrix = function () {
    if (!window.DiplomacyViewInstance) {
        window.DiplomacyViewInstance = new DiplomacyView();
    }
    window.DiplomacyViewInstance.open();
};
