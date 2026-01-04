class BattleMission extends AdventureMission {
    constructor() {
        super('battle', 'Battle');
        this.countElement = null;
    }

    init() {
        if (this.element) return;

        // Create Enemy Element (Group)
        const enemyGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        enemyGroup.setAttribute("id", "enemyMarker");
        enemyGroup.style.display = "none";
        enemyGroup.style.cursor = "pointer";
        enemyGroup.setAttribute("pointer-events", "all");

        enemyGroup.onclick = (e) => {
            e.stopPropagation();
            AdventureManager.handleMissionClick(this);
        };

        const enemyCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        enemyCircle.setAttribute("r", "14");
        enemyCircle.setAttribute("fill", "#e74c3c"); // Red
        enemyCircle.setAttribute("stroke", "#c0392b");
        enemyCircle.setAttribute("stroke-width", "2");

        const enemyText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        enemyText.textContent = "⚔️";
        enemyText.setAttribute("text-anchor", "middle");
        enemyText.setAttribute("dy", "5");
        enemyText.setAttribute("font-size", "16px");

        const enemyCountBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        enemyCountBg.setAttribute("x", "-12");
        enemyCountBg.setAttribute("y", "16");
        enemyCountBg.setAttribute("width", "24");
        enemyCountBg.setAttribute("height", "14");
        enemyCountBg.setAttribute("rx", "4");
        enemyCountBg.setAttribute("fill", "#fff");
        enemyCountBg.setAttribute("stroke", "#000");
        enemyCountBg.setAttribute("stroke-width", "0.5");

        const enemyCount = document.createElementNS("http://www.w3.org/2000/svg", "text");
        enemyCount.setAttribute("text-anchor", "middle");
        enemyCount.setAttribute("dy", "26");
        enemyCount.setAttribute("font-size", "10px");
        enemyCount.setAttribute("fill", "#000"); // Black text
        enemyCount.setAttribute("stroke", "none");
        enemyCount.style.fontWeight = "bold";

        enemyGroup.appendChild(enemyCircle);
        enemyGroup.appendChild(enemyText);
        enemyGroup.appendChild(enemyCountBg); // Background first
        enemyGroup.appendChild(enemyCount);

        this.element = enemyGroup;
        this.countElement = enemyCount;

        const svg = document.getElementById('mapSvg');
        if (svg) svg.appendChild(enemyGroup);
    }

    onSpawn() {
        // Need to check other missions to avoid overlap
        // getValidSpawnCells doesn't know about other mission data by default, 
        // but we can pass occupied cells if we want strict non-overlap.
        // The original code checked MissionTreasure.data.cell.

        const occupied = [AdventureManager.party.cell];
        if (MissionTreasure.data) occupied.push(MissionTreasure.data.cell);

        const validCells = this.getValidSpawnCells(occupied);

        if (validCells.length > 0) {
            const randomCell = validCells[Math.floor(Math.random() * validCells.length)];
            const amount = Math.floor(Math.random() * (200 - 20 + 1)) + 20; // 20 to 200
            this.data = { cell: randomCell.i, soldiers: amount };
            this.updateVisuals();
        }
    }

    updateVisuals() {
        if (!this.element) return;

        if (this.data && AdventureManager.active) {
            const eData = graphData[this.data.cell];
            if (eData) {
                this.element.setAttribute("transform", `translate(${eData.p[0]}, ${eData.p[1]})`);
                this.element.style.display = "block";
                if (this.countElement) this.countElement.textContent = this.data.soldiers;
            } else {
                this.element.style.display = "none";
            }
        } else {
            this.element.style.display = "none";
        }
    }

    getTargetCell() {
        return this.data ? this.data.cell : null;
    }

    onArrival() {
        this.showPopup();
    }

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

        // Use ratio R = Player / Enemy.
        // P(Win) = R^2 / (R^2 + 1)
        const ratio = mySoldiers / enemySoldiers;
        const k = 2; // Squared for sharper curve
        const winProb = (Math.pow(ratio, k) / (Math.pow(ratio, k) + 1));
        const winPercent = (winProb * 100).toFixed(1);

        const content = `
             <h2>⚔️ Battle Imminent ⚔️</h2>
             <div class="content-wrapper" style="display: flex; gap: 20px; align-items: center; justify-content: center;">
                 <div style="text-align: center;">
                    <h3>Your Army</h3>
                    <div style="font-size: 24px; color: #2ecc71; font-weight: bold;">${mySoldiers} 🛡️</div>
                 </div>
                 <div style="font-size: 20px; font-weight: bold;">VS</div>
                 <div style="text-align: center;">
                    <h3>Enemy Army</h3>
                    <div style="font-size: 24px; color: #e74c3c; font-weight: bold;">${enemySoldiers} ⚔️</div>
                 </div>
             </div>
             
             <div style="text-align: center; margin: 15px 0;">
                <div>Ratio: <strong>1:${(1 / ratio).toFixed(2)}</strong> (Player:Enemy)</div>
                <div>Win Probability: <strong>${winPercent}%</strong></div>
             </div>
             
             <div class="actions">
                 <button class="btn-recruit" style="background-color: #c0392b;" onclick="MissionBattle.resolve()">FIGHT!</button>
                 <button class="btn-leave" onclick="AdventureManager.closePopup()">Retreat (Stay here)</button>
             </div>
        `;
        AdventureManager.openPopup(content);
    }

    resolve() {
        if (!this.data) return;

        const mySoldiers = AdventureManager.party.soldiers;
        const enemySoldiers = this.data.soldiers;
        const ratio = mySoldiers / enemySoldiers;
        const k = 2;
        const winProb = (Math.pow(ratio, k) / (Math.pow(ratio, k) + 1));

        const roll = Math.random();

        if (roll < winProb) {
            // WIN
            const goldReward = Math.floor(enemySoldiers / 10) * 2;
            const soldierReward = Math.floor(enemySoldiers / 10) * 2;

            AdventureManager.party.gold += goldReward;
            AdventureManager.party.soldiers += soldierReward; // replenish or recruit

            AdventureManager.showFeedback(`VICTORY! Gained ${goldReward} Gold & ${soldierReward} Soldiers.`);

            // Floating Text (Win)
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`VICTORY!`, cell.p[0], cell.p[1] - 60, "#2ecc71");
                AdventureManager.showFloatingText(`+${goldReward} 💰`, cell.p[0], cell.p[1] - 40, "#f1c40f");
                AdventureManager.showFloatingText(`+${soldierReward} ⚔️`, cell.p[0], cell.p[1] - 20, "#9b59b6");
            }

            AdventureManager.closePopup();
            this.spawn(); // Respawn
            AdventureManager.updateStats();
        } else {
            // LOSE
            // Retain half of starting army, round down to nearest 5, min 5
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
                AdventureManager.showFeedback(`DEFEAT! But you wiped out the enemy!`);
                this.element.style.display = "none";
                this.data = null;
                this.spawn();
            } else {
                AdventureManager.showFeedback(`DEFEAT! Enemy took ${damage} casualties.`);
            }
        }
    }
}

window.MissionBattle = new BattleMission();
