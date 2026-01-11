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

        this.presetStateId = null; // User selection
    }

    // --- UI Setup ---

    mountSetupUI() {
        if (!window.statesData || !window.diplomacyMatrix) return;

        // Remove existing if any
        this.teardownSetup();

        // Calculate Agression/Difficulty
        const validStates = statesData.filter(s => s.capital_id && s.capital_id > 0);

        const rankedStates = validStates.map(state => {
            let enemyCount = 0;
            const relations = diplomacyMatrix[state.id];
            if (relations) {
                if (Array.isArray(relations)) {
                    enemyCount = relations.filter(r => r === "Enemy" || r === "Rival" || (typeof r === 'string' && r.includes('War'))).length;
                } else {
                    enemyCount = Object.values(relations).filter(r => r === "Enemy" || r === "Rival" || (typeof r === 'string' && r.includes('War'))).length;
                }
            }

            // Calculate Stats from Burgs
            let totalSoldiers = 0;
            let totalCraftsmen = 0;
            if (window.burgsData) {
                const stateBurgs = window.burgsData.filter(b => b.state_id === state.id);
                stateBurgs.forEach(b => {
                    totalSoldiers += (b.soldier_quartiers || 0);
                    totalCraftsmen += (b.craftsman_quartiers || 0);
                });
            }

            return { state, enemyCount, totalSoldiers, totalCraftsmen };
        });

        const warlikeStates = rankedStates.filter(item => item.enemyCount > 0);
        warlikeStates.sort((a, b) => b.enemyCount - a.enemyCount);

        const container = document.getElementById('mapContainer');
        if (!container) return;

        const panel = document.createElement('div');
        panel.id = 'warFactionSelectPanel';
        panel.className = 'campaign-floating-controls'; // Reuse class for basic style

        // Specific styling for Right-Middle placement
        panel.style.position = 'absolute';
        panel.style.top = '50%';
        panel.style.right = '10px';
        panel.style.transform = 'translateY(-50%)';
        panel.style.backgroundColor = 'rgba(0, 0, 0, 0.85)'; // Darker & Opaque
        panel.style.padding = '8px';
        panel.style.borderRadius = '8px';
        panel.style.color = '#fff';
        panel.style.maxHeight = '500px'; // Taller
        panel.style.overflowY = 'auto'; // Scrollable
        panel.style.zIndex = '1000';
        panel.style.border = '1px solid #e74c3c'; // War Red Border
        panel.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        panel.style.width = '240px'; // Wider for single line

        // Prevent Map Zoom/Pan when interacting with this panel
        const stopProp = (e) => e.stopPropagation();
        panel.addEventListener('wheel', stopProp, { passive: false });
        panel.addEventListener('mousedown', stopProp);
        panel.addEventListener('dblclick', stopProp);
        panel.addEventListener('touchstart', stopProp);
        panel.addEventListener('touchmove', stopProp);

        let html = `
            <div class="faction-select-header" style="text-align:center; padding-bottom:5px; border-bottom:1px solid #555; margin-bottom:5px;">
                <h4 style="margin:0; color:#f39c12;">Select Faction</h4>
                <div style="text-align: center; font-size:10px; margin-top:2px; color: #e74c3c; font-weight:bold;">
                    🔥 Most Belligerent
                </div>
            </div>
            <div class="faction-list">
        `;

        if (warlikeStates.length === 0) {
            html += "<p>No suitable states found.</p>";
        } else {
            warlikeStates.forEach((item, index) => {
                const s = item.state;
                const isChecked = index === 0 ? "checked" : "";

                // OnClick Update Diplomacy Map
                const clickHandler = `updateDiplomacyColors(${s.id})`;

                html += `
                    <label class="faction-option" style="display: flex; align-items: center; padding: 4px 6px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s; white-space: nowrap; overflow: hidden;">
                        <input type="radio" name="warFactionSelect" value="${s.id}" ${isChecked} onchange="${clickHandler}" style="margin-right: 6px;">
                        
                        <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; font-weight: bold; color: ${s.color}; font-size:13px; margin-right: 8px;">
                            ${s.name}
                        </div>
                        
                        <div style="font-size: 0.8em; color: #ccc; flex-shrink: 0;">
                            <span title="Soldiers">${item.totalSoldiers}🛡️</span> 
                            <span title="Craftsmen" style="margin-left:4px;">${item.totalCraftsmen}🛠️</span> 
                            <span style="color:#888; margin:0 4px;">vs</span> 
                            <span title="enemies">${item.enemyCount}⚔️</span>
                        </div>
                    </label>
                `;
            });
        }
        html += `</div>
            <div style="text-align: center; font-size:10px; margin-top:5px; color: #2ecc71; font-weight:bold; border-top:1px solid #555; padding-top:5px;">
                Most Peaceful 🕊️
            </div>
        `;
        panel.innerHTML = html;
        container.appendChild(panel);

        // Trigger Highlight for the default selected (First item)
        if (warlikeStates.length > 0) {
            updateDiplomacyColors(warlikeStates[0].state.id);
        }
    }

    teardownSetup() {
        const panel = document.getElementById('warFactionSelectPanel');
        if (panel) panel.remove();

        // Clean map
        updateDiplomacyColors(null);
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
            let selectedState = null;

            // 1. Check for Preset Selection
            if (this.presetStateId) {
                selectedState = statesData.find(s => s.id === this.presetStateId);
                console.log(`WarCampaign: Using user-selected state ${this.presetStateId}`);
            }

            // 2. Fallback to Random if no selection or invalid
            if (!selectedState) {
                // Filter valid states (ensure they have a capital ID)
                let validStates = statesData.filter(s => s.capital_id && s.capital_id > 0);

                // Filter for states that actually have enemies
                if (window.diplomacyMatrix) {
                    const statesWithEnemies = validStates.filter(s => {
                        const relations = diplomacyMatrix[s.id];
                        if (!relations) return false;
                        // Check if any relation is hostile
                        // relations is likely an array or object. The usage in onAdventureStart uses forEach on it?
                        // "relations.forEach((rel, targetStateId) => ...)" implies it might be an array or Map-like if it's from JSON.
                        // Let's assume array of strings based on typical matrix structures.

                        let hasEnemy = false;
                        // Handle if it's array
                        if (Array.isArray(relations)) {
                            hasEnemy = relations.some(rel => {
                                if (!rel) return false;
                                return rel === "Enemy" || rel === "Rival" || (typeof rel === 'string' && rel.includes('War'));
                            });
                        } else {
                            // Handle object
                            hasEnemy = Object.values(relations).some(rel => {
                                if (!rel) return false;
                                return rel === "Enemy" || rel === "Rival" || (typeof rel === 'string' && rel.includes('War'));
                            });
                        }
                        return hasEnemy;
                    });

                    if (statesWithEnemies.length > 0) {
                        validStates = statesWithEnemies;
                        console.log(`WarCampaign: Filtered to ${validStates.length} states with active enemies.`);
                    } else {
                        console.warn("WarCampaign: No states with enemies found! Falling back to any valid state.");
                    }
                }

                if (validStates.length > 0) {
                    // Pick random state
                    selectedState = validStates[Math.floor(Math.random() * validStates.length)];
                }
            }

            // 3. Process Selection
            if (selectedState) {
                // Find capital burg (match ID)
                if (window.burgsData) {
                    spawnBurg = burgsData.find(b => b.id === selectedState.capital_id);
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
