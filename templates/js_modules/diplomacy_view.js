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
            checkbox.checked = true; // Default ON
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
        // Select all lines with this relation
        // Note: CSS selector for data attributes needs quotes
        const lines = this.svg.querySelectorAll(`line[data-relation="${relation}"]`);
        lines.forEach(line => {
            if (isVisible) {
                line.style.display = 'block';
                line.setAttribute('display', 'block'); // SVG attribute
            } else {
                line.style.display = 'none';
                line.setAttribute('display', 'none');
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
        } else {
            this.renderCircle();
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

    renderForce() {
        const validStates = statesData.filter(s => s.id > 0);

        // Initialize random positions near center
        const nodes = validStates.map(state => ({
            id: state.id,
            name: state.name,
            color: state.color,
            x: this.cx + (Math.random() - 0.5) * 100,
            y: this.cy + (Math.random() - 0.5) * 100,
            vx: 0,
            vy: 0
        }));

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
            const repulsion = 15000; // Stronger push apart
            const springLength = 200; // Longer connections
            const springStrength = 0.05;
            const centerGravity = 0.005; // Weaker gravity to allow spreading
            const maxVelocity = 10;

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

            // 2. Attraction (Links pull together)
            links.forEach(link => {
                const a = link.source;
                const b = link.target;
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Spring force
                const force = (dist - springLength) * springStrength;
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
            path.dataset.relation = link.relation;
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
        const links = this.svg.querySelectorAll('#diplomacyLinks line');
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
                // Bring to front (visual trick: no z-index in SVG, element order matters)
                // We could re-append, but simple opacity change usually enough.

                // Highlight Neighbor Node
                const neighborNode = this.svg.querySelector(`#diplomacyNodes g[data-id="${neighborId}"]`);
                if (neighborNode) neighborNode.style.opacity = 1.0;
            }
        });
    }

    resetHighlight() {
        const links = this.svg.querySelectorAll('#diplomacyLinks line');
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
