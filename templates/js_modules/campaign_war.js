class WarCampaign extends MilitaryCampaign {
    constructor() {
        super("war_v1", "War of Conquest", "Conquer the capitals of the enemy States to establish your dominion. Defeat their garrisons to claim them.");

        // Internal State
        this.conqueredBurgs = new Set();
        this.enemyStateIds = new Set();
        this.partyStartConfig = { resources: { soldiers: 50, tools: 10, food: 50, gold: 10 } };

        // Base Class Overrides
        this.conqueredStatusLabel = "Conquered";

        // War Tuning: Uses SiegeBattle
        this.BattleClass = SiegeBattle;

        // Diplomatic info for start
        this.homeStateId = 0;
        this.homeStateName = "Unknown";
        this.homeBurgName = "Unknown";
        this.startCell = -1;

        // Objectives
        this.addObjective("obj_war_conquer", "Conquer enemy capitals", "conquest", () => false);
    }

    // --- Specific Mechanics ---


    // --- MilitaryCampaign Hooks ---

    isHostile(burg) {
        if (!burg) return false;
        return this.enemyStateIds.has(burg.state_id);
    }

    isConquered(burg) {
        return this.conqueredBurgs.has(burg.id);
    }

    onBattleWin(burg, rewards) {
        // Mark Conquered
        this.conqueredBurgs.add(burg.id);
        this.checkVictory();
        this.updateObjectiveText();
    }

    // --- Specific Logic ---

    getPartyStartConfig() {
        // Calculate spawn here to ensure it's ready for AdventureManager.start()

        // Reset internal state for fresh run
        this.homeStateId = 0;
        this.homeStateName = "Unknown";
        this.homeBurgName = "Unknown";
        this.startCell = -1;
        this.enemyStateIds.clear();
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
                    this.enemyStateIds.add(targetStateId); // Track enemy state

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
        this.refreshVisuals(); // Draw initial flags/highlights

        const homeString = this.homeBurgName !== "Unknown" ? `${this.homeBurgName} (${this.homeStateName})` : this.homeStateName;
        AdventureManager.showFeedback(`Home: ${homeString}.`, 8000);
    }

    onEnd() {
        super.onEnd();
        this.clearHighlights();
    }

    refreshVisuals() {
        super.refreshVisuals(); // Draws ⚔️ on all enemies and 🚩 on conquered

        // 2. Highlight Enemy Capitals (Objectives) with Rings
        this.enemyStateIds.forEach(stateId => {
            if (typeof statesData !== 'undefined') {
                const targetState = statesData.find(s => s.id === stateId);
                if (targetState && window.burgsData && targetState.capital_id) {
                    // Only if not conquered
                    if (!this.conqueredBurgs.has(targetState.capital_id)) {
                        const enemyCapital = burgsData.find(b => b.id === targetState.capital_id);
                        if (enemyCapital) {
                            this.highlightCell(enemyCapital.cell_id, "#c0392b"); // Red Ring for objective
                        }
                    }
                }
            }
        });
    }

    updateObjectiveText() {
        // Hooks calling checkObjectives handles this
        this.renderObjectives();
    }
}

// Register Campaign
CampaignManager.availableCampaigns.push(WarCampaign);
