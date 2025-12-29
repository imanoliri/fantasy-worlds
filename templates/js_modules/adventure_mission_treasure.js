const MissionTreasure = {
    data: null, // { cell: int, amount: int }
    element: null,
    countElement: null,

    init() {
        if (this.element) return;

        // Create Treasure Element (Group)
        const treasureGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        treasureGroup.setAttribute("id", "treasureMarker");
        treasureGroup.style.display = "none";
        treasureGroup.style.cursor = "pointer";
        treasureGroup.setAttribute("pointer-events", "all");

        // Add click listener
        treasureGroup.onclick = (e) => {
            e.stopPropagation();
            AdventureManager.handleMissionClick(this);
        };

        const treasureCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        treasureCircle.setAttribute("r", "12");
        treasureCircle.setAttribute("fill", "#FFD700"); // Gold
        treasureCircle.setAttribute("stroke", "#DAA520");
        treasureCircle.setAttribute("stroke-width", "2");

        const treasureText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        treasureText.textContent = "💎";
        treasureText.setAttribute("text-anchor", "middle");
        treasureText.setAttribute("dy", "5");
        treasureText.setAttribute("font-size", "16px");

        const treasureCountBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        treasureCountBg.setAttribute("x", "-12");
        treasureCountBg.setAttribute("y", "14");
        treasureCountBg.setAttribute("width", "24");
        treasureCountBg.setAttribute("height", "14");
        treasureCountBg.setAttribute("rx", "4");
        treasureCountBg.setAttribute("fill", "#fff");
        treasureCountBg.setAttribute("stroke", "#000");
        treasureCountBg.setAttribute("stroke-width", "0.5");

        const treasureCount = document.createElementNS("http://www.w3.org/2000/svg", "text");
        treasureCount.setAttribute("text-anchor", "middle");
        treasureCount.setAttribute("dy", "24");
        treasureCount.setAttribute("font-size", "10px");
        treasureCount.setAttribute("fill", "#000"); // Black text
        treasureCount.setAttribute("stroke", "none"); // No stroke on text for clarity
        treasureCount.style.fontWeight = "bold";

        treasureGroup.appendChild(treasureCircle);
        treasureGroup.appendChild(treasureText);
        treasureGroup.appendChild(treasureCountBg); // Background first
        treasureGroup.appendChild(treasureCount);

        this.element = treasureGroup;
        this.countElement = treasureCount;

        const svg = document.getElementById('mapSvg');
        if (svg) svg.appendChild(this.element);
    },

    spawn() {
        let validCells = [];
        if (AdventureManager.accessibleCells && AdventureManager.accessibleCells.length > 0) {
            validCells = AdventureManager.accessibleCells.map(id => graphData[id]).filter(c => c.i !== AdventureManager.party.cell);
        } else {
            validCells = graphData.filter(c => c.b !== marineBiomeId && c.i !== AdventureManager.party.cell);
        }

        if (validCells.length > 0) {
            const randomCell = validCells[Math.floor(Math.random() * validCells.length)];
            const amount = Math.floor(Math.random() * (60 - 20 + 1)) + 20; // 20 to 60
            this.data = { cell: randomCell.i, amount: amount };
            this.updateVisuals();
        }
    },

    updateVisuals() {
        if (!this.element) return;

        if (this.data && AdventureManager.active) {
            const tData = graphData[this.data.cell];
            if (tData) {
                this.element.setAttribute("transform", `translate(${tData.p[0]}, ${tData.p[1]})`);
                this.element.style.display = "block";
                if (this.countElement) this.countElement.textContent = this.data.amount;
            } else {
                this.element.style.display = "none";
            }
        } else {
            this.element.style.display = "none";
        }
    },

    toggle(active) {
        if (!this.element) return;
        this.element.style.display = (active && this.data) ? "block" : "none";
    },

    getTargetCell() {
        return this.data ? this.data.cell : null;
    },

    onArrival() {
        this.showPopup();
    },

    showPopup() {
        if (!AdventureManager.popupElement) AdventureManager.openPopup(''); // Initialize if needed

        // Ensure overlay
        let overlay = document.getElementById('modalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalOverlay';
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';

        const cost = this.data.amount;
        const canMine = AdventureManager.party.tools >= cost;

        const content = `
            <h2>💎 Buried Treasure 💎</h2>
            <div class="content-wrapper">
                <div class="info">
                    You found a buried treasure chest!<br>
                    It seems to contain <strong>${this.data.amount} Gold</strong>.
                </div>
            </div>
            <div class="actions">
                ${canMine ?
                `<button class="btn-recruit" onclick="MissionTreasure.mine()">Mine Treasure (Cost: ${cost} 🛠️)</button>` :
                `<div class="warning" style="color: #e74c3c; margin-bottom: 10px;">You do not have enough tools to mine this treasure (Need ${cost} 🛠️).</div>`
            }
                <button class="btn-leave" onclick="AdventureManager.closePopup()">Leave</button>
            </div>
        `;

        AdventureManager.openPopup(content);
    },

    mine() {
        if (!this.data) return;
        const cost = this.data.amount;

        if (AdventureManager.party.tools >= cost) {
            AdventureManager.party.tools -= cost;
            AdventureManager.party.gold += this.data.amount;
            AdventureManager.showFeedback(`Mined ${this.data.amount} Gold! Used ${cost} Tools.`);

            // Floating Text
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`-${cost} 🛠️`, cell.p[0], cell.p[1] - 20, "#e74c3c");
                AdventureManager.showFloatingText(`+${this.data.amount} 💰`, cell.p[0], cell.p[1] - 40, "#f1c40f");
            }

            AdventureManager.closePopup();
            this.spawn(); // Respawn
            AdventureManager.updateStats();
        } else {
            AdventureManager.showFeedback("Not enough tools!");
        }
    }
};

window.MissionTreasure = MissionTreasure;
