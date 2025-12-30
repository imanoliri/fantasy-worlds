const MissionSiege = {
    data: null, // { burgId: int, armyCell: int, soldiers: int }
    element: null, // Group for Bomb icon
    countElement: null,
    ringGroup: null, // Group for siege ring

    init() {
        if (this.element) return;

        // Create Siege Ring Group
        const siegeRingGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.ringGroup = siegeRingGroup;

        // Create Siege Element (Group)
        const siegeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        siegeGroup.setAttribute("id", "siegeMarker");
        siegeGroup.style.display = "none";
        siegeGroup.style.cursor = "pointer";
        siegeGroup.setAttribute("pointer-events", "all");

        siegeGroup.onclick = (e) => {
            e.stopPropagation();
            AdventureManager.handleMissionClick(this);
        };

        const siegeCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        siegeCircle.setAttribute("r", "14");
        siegeCircle.setAttribute("fill", "#2c3e50"); // Dark Blue/Black
        siegeCircle.setAttribute("stroke", "#000");
        siegeCircle.setAttribute("stroke-width", "2");

        const siegeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        siegeText.textContent = "💣";
        siegeText.setAttribute("text-anchor", "middle");
        siegeText.setAttribute("dy", "5");
        siegeText.setAttribute("font-size", "16px");

        const siegeCountBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        siegeCountBg.setAttribute("x", "-12");
        siegeCountBg.setAttribute("y", "16");
        siegeCountBg.setAttribute("width", "24");
        siegeCountBg.setAttribute("height", "14");
        siegeCountBg.setAttribute("rx", "4");
        siegeCountBg.setAttribute("fill", "#fff");
        siegeCountBg.setAttribute("stroke", "#000");
        siegeCountBg.setAttribute("stroke-width", "0.5");

        const siegeCount = document.createElementNS("http://www.w3.org/2000/svg", "text");
        siegeCount.setAttribute("text-anchor", "middle");
        siegeCount.setAttribute("dy", "26");
        siegeCount.setAttribute("font-size", "10px");
        siegeCount.setAttribute("fill", "#000");
        siegeCount.setAttribute("stroke", "none");
        siegeCount.style.fontWeight = "bold";

        siegeGroup.appendChild(siegeCircle);
        siegeGroup.appendChild(siegeText);
        siegeGroup.appendChild(siegeCountBg);
        siegeGroup.appendChild(siegeCount);

        this.element = siegeGroup;
        this.countElement = siegeCount;

        const svg = document.getElementById('mapSvg');
        if (svg) {
            svg.appendChild(siegeRingGroup);
            svg.appendChild(siegeGroup);
        }
    },

    spawn() {
        if (!AdventureManager.active) return;
        const capitals = burgsData.filter(b => b.is_capital);
        if (capitals.length === 0) return;

        // Pick random capital
        const capital = capitals[Math.floor(Math.random() * capitals.length)];
        const capitalCell = capital.cell_id;

        // Find neighbor land cell for army
        const neighbors = graphData[capitalCell].c;
        const validNeighbors = neighbors.filter(n => graphData[n].b !== marineBiomeId);

        if (validNeighbors.length > 0) {
            const armyCell = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];

            let totalQuartiers = (capital.soldier_quartiers || 0) + (capital.craftsman_quartiers || 0) + (capital.noble_quartiers || 0) + (capital.religious_quartiers || 0);
            if (totalQuartiers === 0) totalQuartiers = Math.ceil(capital.population / 1000); // Fallback

            const strength = Math.ceil(totalQuartiers / 2) * 20;

            this.data = { burgId: capital.id, armyCell: armyCell, soldiers: strength };
            this.updateVisuals();
            AdventureManager.showFeedback(`Siege started at ${capital.name}!`);
        }
    },

    updateVisuals() {
        if (!this.element) return;

        if (this.data && AdventureManager.active) {
            // Icon
            const sData = graphData[this.data.armyCell];
            if (sData) {
                this.element.setAttribute("transform", `translate(${sData.p[0]}, ${sData.p[1]})`);
                this.element.style.display = "block";
                if (this.countElement) this.countElement.textContent = this.data.soldiers;
            } else {
                this.element.style.display = "none";
            }

            // Ring
            if (this.ringGroup) {
                while (this.ringGroup.firstChild) {
                    this.ringGroup.removeChild(this.ringGroup.firstChild);
                }
                const burg = burgsData.find(b => b.id === this.data.burgId);
                if (burg) {
                    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    ring.setAttribute("cx", burg.x);
                    ring.setAttribute("cy", burg.y);
                    ring.setAttribute("r", parseFloat(burg.r) + 12); // Bigger radius
                    ring.setAttribute("fill", "none");
                    ring.setAttribute("stroke", "#000"); // Black
                    ring.setAttribute("stroke-width", "4"); // Thicker
                    ring.setAttribute("pointer-events", "none");
                    this.ringGroup.appendChild(ring);
                    this.ringGroup.style.display = 'inline';
                }
            }
        } else {
            this.element.style.display = "none";
            if (this.ringGroup) this.ringGroup.style.display = 'none';
        }
    },

    toggle(active) {
        if (!this.element) return;
        this.element.style.display = (active && this.data) ? "block" : "none";
        if (this.ringGroup) this.ringGroup.style.display = (active && this.data) ? "inline" : "none";
    },

    getTargetCell() {
        return this.data ? this.data.armyCell : null;
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
        const enemySoldiers = this.data.soldiers;

        const ratio = mySoldiers / enemySoldiers;
        const k = 2;
        const winProb = (Math.pow(ratio, k) / (Math.pow(ratio, k) + 1));
        const winPercent = (winProb * 100).toFixed(1);

        const content = `
             <h2>⚔️ Break the Siege ⚔️</h2>
             <div class="content-wrapper" style="display: flex; gap: 20px; align-items: center; justify-content: center;">
                 <div style="text-align: center;">
                    <h3>Your Army</h3>
                    <div style="font-size: 24px; color: #2ecc71; font-weight: bold;">${mySoldiers} 🛡️</div>
                 </div>
                 <div style="font-size: 20px; font-weight: bold;">VS</div>
                 <div style="text-align: center;">
                    <h3>Siege Army</h3>
                    <div style="font-size: 24px; color: #000; font-weight: bold;">${enemySoldiers} 💣</div>
                 </div>
             </div>
             
             <div style="text-align: center; margin: 15px 0;">
                <div>Win Success Chance: <strong>${winPercent}%</strong></div>
             </div>
             
             <div class="actions">
                 <button class="btn-recruit" style="background-color: #c0392b;" onclick="MissionSiege.resolve()">ATTACK!</button>
                 <button class="btn-leave" onclick="AdventureManager.closePopup()">Retreat</button>
             </div>
        `;
        AdventureManager.openPopup(content);
    },

    resolve() {
        if (!this.data) return;

        const mySoldiers = AdventureManager.party.soldiers;
        const enemySoldiers = this.data.soldiers;
        const ratio = mySoldiers / enemySoldiers;
        const k = 2;
        const winProb = (Math.pow(ratio, k) / (Math.pow(ratio, k) + 1));

        if (Math.random() < winProb) {
            // WIN
            const goldReward = 35; // High reward
            const soldierReward = 10; // Freed prisoners?

            AdventureManager.party.gold += goldReward;
            AdventureManager.party.soldiers += soldierReward;

            AdventureManager.showFeedback(`SIEGE BROKEN! Hero of the city! +${goldReward} Gold.`);

            // Floating Text (Win)
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`SIEGE BROKEN!`, cell.p[0], cell.p[1] - 60, "#2ecc71");
                AdventureManager.showFloatingText(`+${goldReward} 💰`, cell.p[0], cell.p[1] - 40, "#f1c40f");
                AdventureManager.showFloatingText(`+${soldierReward} ⚔️`, cell.p[0], cell.p[1] - 20, "#9b59b6");
            }

            AdventureManager.closePopup();
            this.data = null;
            this.updateVisuals();

            // Spawn new siege elsewhere
            setTimeout(() => this.spawn(), 3000);
            AdventureManager.updateStats();
        } else {
            // LOSE
            const retained = Math.max(5, Math.floor((mySoldiers / 2) / 5) * 5);
            const lost = mySoldiers - retained;
            AdventureManager.party.soldiers = retained;

            AdventureManager.updateStats();
            AdventureManager.closePopup();

            // Floating Text (Loss)
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`DEFEAT!`, cell.p[0], cell.p[1] - 40, "#e74c3c");
                if (lost > 0) AdventureManager.showFloatingText(`-${lost} ⚔️`, cell.p[0], cell.p[1] - 20, "#e74c3c");
            }

            // Damage enemy
            const damage = mySoldiers;
            this.data.soldiers = Math.max(0, this.data.soldiers - damage);

            if (this.data.soldiers === 0) {
                AdventureManager.showFeedback(`DEFEAT! But siege is broken at high cost!`);
                this.data = null;
                this.updateVisuals();
                setTimeout(() => this.spawn(), 3000);
            } else {
                AdventureManager.showFeedback(`DEFEAT! Siege continues...`);
                // Update text to show weakened enemy
                if (this.countElement) this.countElement.textContent = this.data.soldiers;
            }
        }
    }
};

window.MissionSiege = MissionSiege;
