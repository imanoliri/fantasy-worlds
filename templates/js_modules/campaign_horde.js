
class HordeCampaign extends BaseCampaign {
    constructor() {
        super("horde_v1", "The Horde", "Lead a horde to pillage the world. Defeat 10 armies and pillage all capitals.");
        this.armiesDefeated = 0;
        this.pillagedCapitals = new Set(); // Set of burg IDs
        this.partyStartConfig = { resources: { soldiers: 40 } };

        // Objectives
        this.addObjective("obj_horde_armies", "Defeat Armies (0/10)", "battle", () => this.armiesDefeated >= 10);
        this.addObjective("obj_horde_capitals", "Pillage Capitals (0/?)", "domination", () => this.checkCapitalsVictory());

        // Bind methods
        this.onBattleWon = this.onBattleWon.bind(this);
    }

    onStart() {
        super.onStart();
        console.log("Horde Campaign Started");
        this.updateObjectiveText();

        // Listen for battle wins from standard battles
        if (AdventureManager.events) {
            AdventureManager.events.on('battleWon', this.onBattleWon);
        }
    }

    onEnd() {
        super.onEnd();
        if (AdventureManager.events) {
            AdventureManager.events.off('battleWon', this.onBattleWon);
        }
    }

    onBeforeMissionSpawn(data) {
        if (data.type === 'treasure') {
            data.cancelled = true;
            console.log("HordeCampaign blocked treasure mission.");
        }
    }

    onBattleWon() {
        this.armiesDefeated++;
        this.updateObjectiveText();
        this.checkVictory();
    }

    updateObjectiveText() {
        // Update Army Objective
        const armyObj = this.objectives.find(o => o.id === "obj_horde_armies");
        if (armyObj) {
            armyObj.text = `Defeat Armies (${this.armiesDefeated}/10)`;
            if (this.armiesDefeated >= 10) armyObj.completed = true;
        }

        // Update Capital Objective
        const capitalObj = this.objectives.find(o => o.id === "obj_horde_capitals");
        if (capitalObj) {
            const stats = this.getCapitalStats();
            capitalObj.text = `Pillage Capitals (${stats.pillaged}/${stats.total})`;
            if (stats.pillaged >= stats.total && stats.total > 0) capitalObj.completed = true;
        }

        this.renderObjectives();
    }

    getCapitalStats() {
        const capitals = burgsData.filter(b => b.is_capital);
        let total = capitals.length;
        let pillaged = this.pillagedCapitals.size;
        return { total, pillaged };
    }

    checkCapitalsVictory() {
        const stats = this.getCapitalStats();
        return stats.total > 0 && stats.pillaged >= stats.total;
    }

    isHostile(burg) {
        if (!burg) return false;
        const type = burg.type ? burg.type.toLowerCase() : "";

        // Hostile if NOT "Hunter" (or Hunting) AND NOT "Highland" (or Highlands)
        // Using includes to cover variations
        if (type.includes("hunt")) return false;
        if (type.includes("highland")) return false;

        return true; // Default to hostile for all other types
    }

    onBeforeBurgPopup(data) {
        if (this.isHostile(data.burg)) {
            data.preventReplenish = true;
        }
    }

    onBurgPopupOpened(context) {
        const { burg, party, buttons } = context;

        // Only modify if hostile
        if (this.isHostile(burg)) {
            // Clear existing buttons (Standard actions blocked)
            buttons.length = 0;

            // Check if already pillaged
            if (this.pillagedCapitals.has(burg.id)) {
                buttons.push({
                    label: "City Pillaged (Ruins)",
                    action: () => { }, // No action
                    disabled: true,
                    class: "btn-recruit", // Use recruit style but greyed out via inline style
                    style: "background: #555; cursor: default; opacity: 0.7;"
                });
            } else {
                // Add Fight button
                // Strength logic: 10 * soldier_quartiers
                const soldierQ = burg.soldier_quartiers || 0;
                const strength = Math.max(10, 10 * soldierQ); // Min 10 strength

                buttons.push({
                    label: `Pillage City (Strength: ${strength})`,
                    onClick: `CampaignManager.currentCampaignInstance.showBattlePopup(${burg.id}, ${strength})`,
                    class: "btn-attack",
                    style: "background: #c0392b; color: white;"
                });
            }
        }
    }

    showBattlePopup(burgId, enemyStrength) {
        if (!AdventureManager.popupElement) AdventureManager.openPopup('');

        // Ensure overlay
        let overlay = document.getElementById('modalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalOverlay';
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';

        const mySoldiers = AdventureManager.party.soldiers;

        // Win Probability Logic
        const ratio = mySoldiers / enemyStrength;
        const k = 2;
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
                    <h3>City Garrison</h3>
                    <div style="font-size: 24px; color: #e74c3c; font-weight: bold;">${enemyStrength} ⚔️</div>
                 </div>
             </div>
             
             <div style="text-align: center; margin: 15px 0;">
                <div>Win Probability: <strong>${winPercent}%</strong></div>
             </div>
             
             <div class="actions">
                 <button class="btn-recruit" style="background-color: #c0392b;" onclick="CampaignManager.currentCampaignInstance.resolveCityBattle(${burgId}, ${enemyStrength})">ATTACK!</button>
                 <button class="btn-leave" onclick="AdventureManager.closePopup()">Retreat</button>
             </div>
        `;
        AdventureManager.openPopup(content);
    }

    resolveCityBattle(burgId, enemySoldiers) {
        // Find burg again since we passed ID
        const burg = burgsData.find(b => b.id === burgId);
        if (!burg) return;

        const playerSoldiers = AdventureManager.party.soldiers;

        if (playerSoldiers <= 0) {
            AdventureManager.showFeedback("You have no soldiers to fight with!");
            AdventureManager.closePopup();
            return;
        }

        const ratio = playerSoldiers / enemySoldiers;
        const winProbability = (ratio * ratio) / ((ratio * ratio) + 1);

        const isWin = Math.random() < winProbability;

        AdventureManager.closePopup(); // Close battle popup

        if (isWin) {
            // Victory
            // Losses: Low (5-15%)
            const lossPct = 0.05 + (Math.random() * 0.10);
            const losses = Math.floor(playerSoldiers * lossPct);
            AdventureManager.party.soldiers = Math.max(0, playerSoldiers - losses);

            // Rewards (Aligned with BattleMission + Food = Gold)
            const goldReward = Math.floor(enemySoldiers / 10) * 3;
            const soldierReward = Math.floor(enemySoldiers / 10) * 3;
            const foodReward = goldReward;

            AdventureManager.party.gold += goldReward;
            AdventureManager.party.soldiers += soldierReward;
            AdventureManager.party.food += foodReward;

            // Mark as pillaged if capital (or just pillaged city in general)
            this.pillagedCapitals.add(burg.id);

            AdventureManager.showFeedback(`Victory! Pillaged ${burg.name}. Lost ${losses} soldiers. Gained ${goldReward} gold, ${foodReward} food, ${soldierReward} soldiers.`);

            // Floating Text (Win)
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`VICTORY!`, cell.p[0], cell.p[1] - 80, "#2ecc71");
                AdventureManager.showFloatingText(`+${goldReward} 💰`, cell.p[0], cell.p[1] - 60, "#f1c40f");
                AdventureManager.showFloatingText(`+${foodReward} 🍎`, cell.p[0], cell.p[1] - 40, "#e67e22");
                AdventureManager.showFloatingText(`+${soldierReward} ⚔️`, cell.p[0], cell.p[1] - 20, "#9b59b6");
            }

            // Update Objectives
            this.updateObjectiveText();
            this.checkVictory();

            // Highlight Pillaged? Maybe not needed, standard highlight is fine.

        } else {
            // Defeat
            // Losses: High (20-40%)
            const lossPct = 0.20 + (Math.random() * 0.20);
            const losses = Math.floor(playerSoldiers * lossPct);
            AdventureManager.party.soldiers = Math.max(0, playerSoldiers - losses);

            AdventureManager.showFeedback(`Defeat! Failed to pillage ${burg.name}. Retreating with ${losses} casualties.`);

            // Floating Text (Loss)
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`DEFEAT!`, cell.p[0], cell.p[1] - 40, "#e74c3c");
                if (losses > 0) AdventureManager.showFloatingText(`-${losses} ⚔️`, cell.p[0], cell.p[1] - 20, "#e74c3c");
            }
        }

        AdventureManager.updateStats();
    }

    onCalculateMissionRewards(context) {
        if (context.type === 'hunt') {
            // Horde gains soldiers from hunting
            if (context.rewards) {
                context.rewards.soldiers = context.rewards.gold;
            }
        }
    }

}

// Register Campaign
CampaignManager.availableCampaigns.push(HordeCampaign);
