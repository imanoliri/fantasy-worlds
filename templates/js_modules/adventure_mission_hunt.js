const MissionHunt = {
    data: null, // { cell: int, strength: int }
    element: null,
    countElement: null,

    init() {
        if (this.element) return;

        // Create Beast Element (Group)
        const beastGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        beastGroup.style.display = 'none';
        beastGroup.style.cursor = 'pointer';

        // Add click listener
        beastGroup.onclick = (e) => {
            e.stopPropagation();
            AdventureManager.handleMissionClick(this);
        };

        const beastCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        beastCircle.setAttribute("r", "12");
        beastCircle.setAttribute("fill", "#8e44ad"); // Purple
        beastCircle.setAttribute("stroke", "#ffffff");
        beastCircle.setAttribute("stroke-width", "2");

        const beastText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        beastText.textContent = "🐺"; // Boar emoji
        beastText.setAttribute("text-anchor", "middle");
        beastText.setAttribute("dy", "5");
        beastText.setAttribute("font-size", "16px");

        const beastCount = document.createElementNS("http://www.w3.org/2000/svg", "text");
        beastCount.setAttribute("text-anchor", "middle");
        beastCount.setAttribute("dy", "24"); // Offset
        beastCount.setAttribute("font-size", "10px");

        beastGroup.appendChild(beastCircle);
        beastGroup.appendChild(beastText);
        beastGroup.appendChild(beastCount);

        this.element = beastGroup;
        this.countElement = beastCount;

        const svg = document.getElementById('mapSvg');
        if (svg) svg.appendChild(this.element);
    },

    spawn() {
        const occupied = [AdventureManager.party.cell];
        if (MissionTreasure.data) occupied.push(MissionTreasure.data.cell);
        if (MissionBattle.data) occupied.push(MissionBattle.data.cell);

        let validCells = [];
        if (AdventureManager.accessibleCells && AdventureManager.accessibleCells.length > 0) {
            validCells = AdventureManager.accessibleCells.map(id => graphData[id]).filter(c => !occupied.includes(c.i));
        } else {
            validCells = graphData.filter(c => c.b !== marineBiomeId && !occupied.includes(c.i));
        }

        if (validCells.length > 0) {
            const randomCell = validCells[Math.floor(Math.random() * validCells.length)];
            let strength = Math.floor(Math.random() * (30 - 5 + 1)) + 5; // 5 to 30

            // Campaign Hook for Strength
            if (window.MissionHunt.baseStrength) {
                strength = window.MissionHunt.baseStrength;
            }
            this.data = { cell: randomCell.i, strength: strength };
            this.updateVisuals();
        }
    },

    updateVisuals() {
        if (!this.element) return;

        if (this.data && AdventureManager.active) {
            const bData = graphData[this.data.cell];
            if (bData) {
                this.element.setAttribute("transform", `translate(${bData.p[0]}, ${bData.p[1]})`);
                this.element.style.display = "block";
                if (this.countElement) this.countElement.textContent = this.data.strength;
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
        if (!AdventureManager.popupElement) AdventureManager.openPopup('');

        let overlay = document.getElementById('modalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalOverlay';
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';

        const mySoldiers = AdventureManager.party.soldiers;
        const beastStrength = this.data.strength;
        const willWin = mySoldiers > beastStrength;

        const content = `
             <h2>🐺 Beast Encounter 🐺</h2>
             <div class="content-wrapper" style="display: flex; gap: 20px; align-items: center; justify-content: center;">
                 <div style="text-align: center;">
                    <h3>Your Party</h3>
                    <div style="font-size: 24px; color: #2ecc71; font-weight: bold;">${mySoldiers} 🛡️</div>
                 </div>
                 <div style="font-size: 20px; font-weight: bold;">VS</div>
                 <div style="text-align: center;">
                    <h3>The Beast</h3>
                    <div style="font-size: 24px; color: #8e44ad; font-weight: bold;">${beastStrength} 🐺</div>
                 </div>
             </div>
             
             <div style="text-align: center; margin: 15px 0;">
                ${willWin ?
                `<div style="color: #2ecc71;"><strong>Outcome: VICTORY gauranteed!</strong></div>` :
                `<div style="color: #e74c3c;"><strong>Outcome: DEFEAT likely...</strong></div>`
            }
             </div>
             
             <div class="actions">
                 <button class="btn-recruit" style="background-color: #8e44ad;" onclick="MissionHunt.resolve()">FIGHT!</button>
                 <button class="btn-leave" onclick="AdventureManager.closePopup()">Retreat</button>
             </div>
        `;
        AdventureManager.openPopup(content);
    },

    resolve() {
        if (!this.data) return;

        const mySoldiers = AdventureManager.party.soldiers;
        const beastStrength = this.data.strength;

        if (mySoldiers > beastStrength) {
            // WIN
            // Gain 1 gold for each 5 strength of the beast, rounding up.
            const goldReward = Math.ceil(beastStrength / 5);
            // Food reward equal to beast strength
            const foodReward = beastStrength;

            AdventureManager.party.gold += goldReward;
            AdventureManager.party.food += foodReward;

            AdventureManager.showFeedback(`SLAIN! Gained ${goldReward} Gold & ${foodReward} Food.`);

            // Floating Text (Win)
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`VICTORY!`, cell.p[0], cell.p[1] - 60, "#2ecc71");
                AdventureManager.showFloatingText(`+${goldReward} 💰`, cell.p[0], cell.p[1] - 40, "#f1c40f");
                AdventureManager.showFloatingText(`+${foodReward} 🍎`, cell.p[0], cell.p[1] - 20, "#2ecc71");
            }

            AdventureManager.closePopup();
            this.spawn(); // Respawn
            AdventureManager.updateStats();
        } else {
            // LOSE
            AdventureManager.showFeedback("DEFEAT! The beast was too strong.");

            // Lose 5 soldiers (or max available)
            const loss = Math.min(AdventureManager.party.soldiers, 5);

            // Damage beast by half of nr of soldiers
            const damage = Math.floor(mySoldiers / 2);
            this.data.strength = Math.max(0, this.data.strength - damage);

            // Lose soldiers
            AdventureManager.party.soldiers -= loss;

            AdventureManager.updateStats();
            AdventureManager.closePopup();

            // Floating Text (Loss)
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`DEFEAT!`, cell.p[0], cell.p[1] - 40, "#e74c3c");
                if (loss > 0) AdventureManager.showFloatingText(`-${loss} ⚔️`, cell.p[0], cell.p[1] - 20, "#e74c3c");
            }

            // Check if beast died from damage
            if (this.data.strength <= 0) {
                AdventureManager.showFeedback("The beast succumbed to its wounds!");
                this.element.style.display = "none";
                this.data = null;
                this.spawn();
            }
        }
    }
};

window.MissionHunt = MissionHunt;
