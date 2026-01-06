
class WarCampaign extends BaseCampaign {
    constructor() {
        super("war_v1", "War of Conquest", "Conquer the capitals of the enemy States to establish your dominion. Defeat their garrisons to claim them.");

        // Internal State
        this.conqueredBurgs = new Set();
        this.partyStartConfig = { resources: { soldiers: 50, tools: 10, food: 50, gold: 10 } };

        // Diplomatic info for start
        this.homeStateId = 0;
        this.homeStateName = "Unknown";
        this.homeBurgName = "Unknown";
        this.startCell = -1;

        // Objectives
        // Objectives: We will add dynamic objectives based on enemies in onAdventureStart
        this.addObjective("obj_war_conquer", "Conquer enemy capitals", "conquest", () => false);
    }

    getPartyStartConfig() {
        // Calculate spawn here to ensure it's ready for AdventureManager.start()

        // Reset internal state for fresh run
        this.homeStateId = 0;
        this.homeStateName = "Unknown";
        this.startCell = -1;
        let spawnBurg = null;

        // Random Capital Spawn Logic
        if (typeof statesData !== 'undefined' && statesData.length > 0) {
            // Filter valid states (ensure they have a capital ID)
            const validStates = statesData.filter(s => s.capital_id && s.capital_id > 0);

            if (validStates.length > 0) {
                // Pick random state
                const randomState = validStates[Math.floor(Math.random() * validStates.length)];

                // Find capital burg (match ID)
                if (window.burgsData) {
                    spawnBurg = burgsData.find(b => b.id === randomState.capital_id);
                    if (spawnBurg) {
                        this.homeStateId = spawnBurg.state_id;
                        this.homeStateName = spawnBurg.state_name;
                        this.homeBurgName = spawnBurg.name;
                        this.startCell = spawnBurg.cell_id;
                    }
                }
            }
        }

        // Fallback Logic
        if (this.startCell === -1) {
            // Let AdventureManager pick a random spot, but try to resolve home state later?
            // Or better: Force a random spot ourselves to capture state info.
            // For now, if we fail to find a capital, just let it be random.
            console.log("WarCampaign: Failed to find random capital, using default random spawn.");
        } else {
            console.log(`WarCampaign: Calculated Spawn at Capital ${spawnBurg ? spawnBurg.name : 'Unknown'} (State: ${this.homeStateName})`);
        }

        const config = {
            resources: this.partyStartConfig.resources,
            cell: this.startCell
        };

        return config;
    }

    onStart() {
        super.onStart();
        console.log("War Campaign Started (Internal Init)");
        this.objectives = [];
        this.conqueredBurgs.clear();
        this.updateObjectiveText();
    }

    onAdventureStart() {
        super.onAdventureStart();

        // Now we are safely started, and AdventureManager has processed our config.
        // We can show feedback and pings.

        // 1. Ping Location
        if (this.startCell !== -1) {
            // Double check where we actually are
            const actualCell = AdventureManager.party.cell;
            const cellData = window.graphData ? graphData[actualCell] : null;
            if (cellData) {
                AdventureManager.showLocationPing(cellData.p[0], cellData.p[1]);
            }
        }

        // 2. Identify Enemies logic (moved from onStart)
        // If we fell back to random spawn, we might need to resolve home state now from current location
        if (this.homeStateId === 0) {
            const cellId = AdventureManager.party.cell;
            if (window.burgsData) {
                const b = burgsData.find(b => b.cell_id === cellId);
                if (b) {
                    this.homeStateId = b.state_id;
                    this.homeStateName = b.state_name;
                }
            }
            // Could add DOM fallback here if really needed
        }

        const enemies = [];
        if (window.diplomacyMatrix && diplomacyMatrix[this.homeStateId]) {
            const relations = diplomacyMatrix[this.homeStateId];
            relations.forEach((rel, targetStateId) => {
                const isHostile = rel === "Enemy" || rel === "Rival" || (typeof rel === 'string' && rel.includes('War'));

                if (isHostile) {
                    let targetName = `State ${targetStateId}`;
                    // Resolve Name & Capital
                    if (typeof statesData !== 'undefined') {
                        const targetState = statesData.find(s => s.id === targetStateId);
                        if (targetState) {
                            targetName = `${targetState.capital_name} (${targetState.name})`;

                            // Highlight Enemy Capital & Add Objective
                            if (window.burgsData && targetState.capital_id) {
                                const enemyCapital = burgsData.find(b => b.id === targetState.capital_id);
                                if (enemyCapital) {
                                    this.highlightCell(enemyCapital.cell_id, "#c0392b"); // Red for enemy

                                    // Add Objective for this specific capital
                                    this.addObjective(
                                        `obj_conquer_${enemyCapital.id}`,
                                        `Conquer ${targetName}`,
                                        "conquest",
                                        () => this.conqueredBurgs.has(enemyCapital.id)
                                    );
                                }
                            }
                        }
                    } else if (window.stateNameIdMap) {
                        for (const [name, id] of Object.entries(stateNameIdMap)) {
                            if (id === targetStateId) {
                                targetName = name;
                                break;
                            }
                        }
                    }
                    enemies.push(targetName);
                }
            });
        }

        // Render the newly added objectives
        this.renderObjectives();

        const homeString = this.homeBurgName !== "Unknown" ? `${this.homeBurgName} (${this.homeStateName})` : this.homeStateName;
        AdventureManager.showFeedback(`Home: ${homeString}.`, 8000);
    }

    onEnd() {
        super.onEnd();
        this.clearHighlights();
    }

    updateObjectiveText() {
        // No longer needed for individual objectives, but keeping method if base calls it or for safety
        // The checkObjectives loop handles "completed" state automatically.
        this.renderObjectives();
    }

    onBurgPopupOpened(context) {
        const { burg, buttons } = context;

        // 1. Check if already conquered
        if (this.conqueredBurgs.has(burg.id)) {
            buttons.unshift({
                label: "City Conquered (Yours)",
                action: () => { },
                disabled: true,
                style: "background: #27ae60; cursor: default; opacity: 1.0; color: white;",
                class: "btn-recruit"
            });
            return;
        }

        // 2. Add Conquer Button for neutral/hostile cities
        // Calculate Strength based on defenses
        const soldierQ = burg.soldier_quartiers || 0;
        // Base strength 20, + 15 per soldier quartier. Slightly harder than simple pillage.
        const strength = 20 + (15 * soldierQ);

        buttons.unshift({
            label: `Conquer City (Strength: ${strength})`,
            onClick: `CampaignManager.currentCampaignInstance.showConquestPopup(${burg.id}, ${strength})`,
            class: "btn-attack",
            style: "background: #c0392b; color: white;"
        });
    }

    showConquestPopup(burgId, enemyStrength) {
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
        const k = 2; // Sharpness of the curve
        const winProb = (Math.pow(ratio, k) / (Math.pow(ratio, k) + 1));
        const winPercent = (winProb * 100).toFixed(1);

        const content = `
             <h2>⚔️ Conquest Battle ⚔️</h2>
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
                <div style="font-size: 0.9em; color: #aaa;">Conquest requires decisive victory.</div>
             </div>
             
             <div class="actions">
                 <button class="btn-recruit" style="background-color: #c0392b;" onclick="CampaignManager.currentCampaignInstance.resolveConquest(${burgId}, ${enemyStrength})">ATTACK!</button>
                 <button class="btn-leave" onclick="AdventureManager.closePopup()">Retreat</button>
             </div>
        `;
        AdventureManager.openPopup(content);
    }

    resolveConquest(burgId, enemySoldiers) {
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

        AdventureManager.closePopup();

        if (isWin) {
            // Victory
            // Casualties: 10-30%
            const lossPct = 0.10 + (Math.random() * 0.20);
            const losses = Math.floor(playerSoldiers * lossPct);
            AdventureManager.party.soldiers = Math.max(0, playerSoldiers - losses);

            // Rewards
            const goldReward = Math.floor(enemySoldiers / 5);
            AdventureManager.party.gold += goldReward;

            // Mark Conquered
            this.conqueredBurgs.add(burg.id);
            this.highlightCell(burg.cell_id, "#27ae60"); // Green for conquered

            AdventureManager.showFeedback(`Victory! ${burg.name} is now under your command! Lost ${losses} soldiers.`);

            // Floating Text
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`CONQUERED!`, cell.p[0], cell.p[1] - 80, "#2ecc71");
                AdventureManager.showFloatingText(`-${losses} ⚔️`, cell.p[0], cell.p[1] - 40, "#e74c3c");
            }

            this.updateObjectiveText();
            this.checkVictory();

        } else {
            // Defeat
            // Casualties: High (30-50%)
            const lossPct = 0.30 + (Math.random() * 0.20);
            const losses = Math.floor(playerSoldiers * lossPct);
            AdventureManager.party.soldiers = Math.max(0, playerSoldiers - losses);

            AdventureManager.showFeedback(`Defeat! The garrison of ${burg.name} held strong. You retreated with ${losses} casualties.`);
            // Floating Text
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`DEFEAT!`, cell.p[0], cell.p[1] - 40, "#e74c3c");
                AdventureManager.showFloatingText(`-${losses} ⚔️`, cell.p[0], cell.p[1] - 20, "#e74c3c");
            }
        }
        AdventureManager.updateStats();
    }
}

// Register Campaign
CampaignManager.availableCampaigns.push(WarCampaign);
