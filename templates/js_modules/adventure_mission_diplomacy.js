const MissionDiplomacy = {
    targets: [], // Array of cell IDs (capitals)
    solvedCount: 0,
    group: null, // SVG group for rings

    init() {
        if (this.group) return;

        // Diplomatic Group (Rings)
        const diplomacyGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.group = diplomacyGroup;

        const svg = document.getElementById('mapSvg');
        if (svg) svg.appendChild(diplomacyGroup);
    },

    spawn() {
        if (!AdventureManager.active) return;
        this.startTour();
    },

    startTour() {
        const capitals = burgsData.filter(b => b.is_capital);
        // Shuffle using Fisher-Yates
        for (let i = capitals.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [capitals[i], capitals[j]] = [capitals[j], capitals[i]];
        }
        // Take top 3 unique IDs
        this.targets = capitals.slice(0, 3).map(b => b.id);
        this.solvedCount = 0;
        const targetNames = capitals.slice(0, 3).map(b => b.name).join(", ");
        AdventureManager.showFeedback(`Diplomatic Tour Started! Visit 3 Capitals with Blue Rings: ${targetNames}.`);
        this.updateVisuals();
    },

    updateVisuals() {
        if (!this.group) return;

        if (AdventureManager.active) {
            this.group.style.display = 'inline';
            while (this.group.firstChild) {
                this.group.removeChild(this.group.firstChild);
            }
            this.targets.forEach(id => {
                const burg = burgsData.find(b => b.id === id);
                if (burg) {
                    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    ring.setAttribute("cx", burg.x);
                    ring.setAttribute("cy", burg.y);
                    ring.setAttribute("r", parseFloat(burg.r) + 8);
                    ring.setAttribute("fill", "none");
                    ring.setAttribute("stroke", "#4169E1"); // Royal Blue
                    ring.setAttribute("stroke-width", "3");
                    ring.setAttribute("pointer-events", "none");
                    ring.setAttribute("class", "diplomacy-ring"); // Add class for animation
                    this.group.appendChild(ring);
                }
            });
        } else {
            this.group.style.display = 'none';
        }
    },

    toggle(active) {
        if (!this.group) return;
        this.group.style.display = active ? 'inline' : 'none';
    },

    resolve(burgId) {
        if (!this.targets.includes(burgId)) return;

        if (AdventureManager.party.gold >= 5) {
            AdventureManager.party.gold -= 5;
            // Remove from targets
            this.targets = this.targets.filter(id => id !== burgId);
            this.solvedCount++;

            AdventureManager.updateStats();
            this.updateVisuals(); // Update rings
            AdventureManager.closePopup();

            if (this.solvedCount >= 3) {
                AdventureManager.party.gold += 35;
                AdventureManager.showFeedback("Diplomatic Tour Complete! +35 Gold. Starting new tour...");
                AdventureManager.updateStats();
                setTimeout(() => this.startTour(), 2000);
            } else {
                AdventureManager.showFeedback(`Diplomatic Mission Successful! (${this.solvedCount}/3)`);
            }
        } else {
            AdventureManager.showFeedback("Not enough gold (Need 5 💰)!");
        }
    }
};

window.MissionDiplomacy = MissionDiplomacy;
