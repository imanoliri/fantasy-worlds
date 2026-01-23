class DiplomacyView {
    constructor() {
        this.overlay = document.getElementById('diplomacyMatrixOverlay');
        this.svg = document.getElementById('diplomacyGraphSvg');
        this.container = document.getElementById('diplomacyGraphContainer');
        this.closeBtn = document.getElementById('closeDiplomacyBtn');
        this.isOpen = false;

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

        // Close on clicking background
        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this.close();
            });
        }

        // Add keyboard listener for Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });
    }

    open() {
        if (!this.overlay) return;
        this.overlay.classList.remove('hidden');
        this.isOpen = true;
        this.render();
    }

    close() {
        if (!this.overlay) return;
        this.overlay.classList.add('hidden');
        this.isOpen = false;
    }

    getRelationColor(relation) {
        return this.colors[relation] || this.colors["Neutral"];
    }

    getStrokeWidth(relation) {
        return this.strokeWidths[relation] || this.strokeWidths["default"];
    }

    render() {
        // Clear previous
        this.svg.innerHTML = '';

        // Prepare Data
        // Filter out neutral/empty states if necessary, or just use all valid states
        // statesData is array of objects {id, name, color, ...}
        const validStates = statesData.filter(s => s.id > 0);
        const count = validStates.length;
        const angleStep = (2 * Math.PI) / count;

        // Calculate Nodes
        const nodes = validStates.map((state, index) => {
            const angle = index * angleStep - Math.PI / 2; // Start at top
            return {
                id: state.id,
                name: state.name,
                color: state.color,
                x: this.cx + this.radius * Math.cos(angle),
                y: this.cy + this.radius * Math.sin(angle),
                angle: angle
            };
        });

        // Create Links Group (Background)
        const linksGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        linksGroup.id = "diplomacyLinks";
        this.svg.appendChild(linksGroup);

        // Create Nodes Group (Foreground)
        const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        nodesGroup.id = "diplomacyNodes";
        this.svg.appendChild(nodesGroup);

        // Draw Links
        // We iterate through every pair once
        nodes.forEach((nodeA, i) => {
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeB = nodes[j];
                const rel = diplomacyMatrix[nodeA.id] && diplomacyMatrix[nodeA.id][nodeB.id];

                if (rel && rel !== "Neutral") { // Only draw non-neutral lines to reduce clutter? Or draw all?
                    // User request said "connect with lines with the color of their diplomatic relationship"
                    // Usually drawing all Neutral lines is too messy. Let's skip Neutral for visual clarity unless requested otherwise.
                    // Actually, "Greys the unrelated states" implies we might want to see them.
                    // But usually in these graphs, no line = neutral.

                    const path = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    path.setAttribute("x1", nodeA.x);
                    path.setAttribute("y1", nodeA.y);
                    path.setAttribute("x2", nodeB.x);
                    path.setAttribute("y2", nodeB.y);
                    path.setAttribute("stroke", this.getRelationColor(rel));
                    path.setAttribute("stroke-width", this.getStrokeWidth(rel));
                    path.setAttribute("stroke-opacity", 0.6);
                    path.dataset.source = nodeA.id;
                    path.dataset.target = nodeB.id;
                    path.dataset.relation = rel;
                    linksGroup.appendChild(path);
                }
            }
        });

        // Draw Nodes
        nodes.forEach(node => {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.dataset.id = node.id;
            g.style.cursor = "pointer";

            // Interaction Events
            g.addEventListener('mouseenter', () => this.highlightState(node.id));
            g.addEventListener('mouseleave', () => this.resetHighlight());

            // Circle
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", node.x);
            circle.setAttribute("cy", node.y);
            circle.setAttribute("r", this.nodeRadius);
            circle.setAttribute("fill", node.color);
            circle.setAttribute("stroke", "#333");
            circle.setAttribute("stroke-width", 2);
            g.appendChild(circle);

            // Label
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            // Position text outside the circle
            const labelDist = this.nodeRadius + 15;
            const tx = node.x + labelDist * Math.cos(node.angle);
            const ty = node.y + labelDist * Math.sin(node.angle);

            text.setAttribute("x", tx);
            text.setAttribute("y", ty);
            text.setAttribute("dy", "0.35em");

            // Align text based on angle to keep it readable
            if (Math.cos(node.angle) > 0) {
                text.setAttribute("text-anchor", "start");
            } else {
                text.setAttribute("text-anchor", "end");
            }

            text.textContent = node.name;
            text.setAttribute("fill", "#ccc"); // Light text for dark mode
            text.setAttribute("font-size", "14px");
            text.setAttribute("font-family", "Arial, sans-serif");
            text.style.pointerEvents = "none"; // Let mouse pass through to group/circle
            g.appendChild(text);

            nodesGroup.appendChild(g);
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
