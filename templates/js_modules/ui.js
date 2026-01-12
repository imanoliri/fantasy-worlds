/* Dropdown Logic */
function toggleDropdown(id) {
    document.getElementById(id).classList.toggle("show");
}


function toggleLayer(layerClass) {
    const body = document.body;
    if (body.classList.contains(layerClass)) {
        body.classList.remove(layerClass);
    } else {
        body.classList.add(layerClass);
    }
}

function toggleTable() {
    const btn = document.getElementById('toggleTable');
    const container = document.getElementById('burgTableContainer');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
    window.dispatchEvent(new Event('resize'));
}

function toggleStateTable() {
    const btn = document.getElementById('toggleStateTable');
    const container = document.getElementById('stateTableContainer');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
    window.dispatchEvent(new Event('resize'));
}

function toggleFoodTradeTable() {
    const btn = document.getElementById('toggleFoodTradeTable');
    const container = document.getElementById('foodTradeTableContainer');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
    window.dispatchEvent(new Event('resize'));
}

function toggleGoldTradeTable() {
    const btn = document.getElementById('toggleGoldTradeTable');
    const container = document.getElementById('goldTradeTableContainer');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
    window.dispatchEvent(new Event('resize'));
}

function toggleMap() {
    const btn = document.getElementById('toggleMap');
    const mapGroup = document.getElementById('mapBackground');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        mapGroup.style.display = 'block';
    } else {
        mapGroup.style.display = 'none';
    }
}

function toggleHeaderControls() {
    const controls = document.querySelector('.controls');
    const btn = document.getElementById('headerToggleBtn');
    controls.classList.toggle('hidden');

    if (controls.classList.contains('hidden')) {
        btn.innerHTML = '▲';
    } else {
        btn.innerHTML = '▼';
    }
}

function toggleAdventureMode() {
    if (window.AdventureManager) {
        AdventureManager.toggle();
    }
}

function selectGameMode(mode) {
    const btn = document.getElementById('gameModeBtn');
    const dropdown = document.getElementById('gameModeDropdown');

    if (mode === 'adventure') {
        btn.innerHTML = "Adventure ▼";

        // If coming from Campaign Mode, we must RESET to ensure fresh Adventure
        // Cleanup if active OR if we are just in setup (instance exists)
        if (window.CampaignManager && (window.CampaignManager.active || window.CampaignManager.currentCampaignInstance)) {
            CampaignManager.cancelCampaign();
            // cancelCampaign calls reset(), so AdventureManager.active becomes false
        }

        // Cleanup Campaign UI if present (Do this AFTER cancelCampaign, which might reset UI)
        document.getElementById('campaignSelectContainer').classList.add('hidden');
        document.querySelector('.sidebar-controls').classList.remove('hidden');

        // Only toggle if not already active (or forced fresh start implies we must start it)
        if (!window.AdventureManager || !window.AdventureManager.active) {
            toggleAdventureMode();
        }
    } else if (mode === 'campaign') {
        btn.innerHTML = "Campaign ▼";

        // Use cancelCampaign to cleanly stop any existing campaign or adventure state if needed?
        // Actually, if we are in Adventure mode, we might want to just pause or stop it?
        // If AdventureManager is active (Free Roam), we should probably stop it (toggle off) 
        // before starting Campaign setup.

        if (window.AdventureManager && window.AdventureManager.active) {
            toggleAdventureMode();
            // We don't reset here, because Campaign Manager init will handle its own start config
        }
        console.log("Campaign Mode selected");

        // 1. Show Sidebar
        const sidebar = document.getElementById('adventureSidebar');
        if (sidebar) sidebar.classList.remove('hidden');

        // 2. Initialize Campaign Manager
        if (window.CampaignManager) {
            CampaignManager.init();
            // Hide standard controls
            document.querySelector('.sidebar-controls').classList.add('hidden');
            document.getElementById('campaignSelectContainer').classList.remove('hidden');
        }

        document.getElementById('gameModeBtn').classList.add('active');
    } else {
        btn.innerHTML = "Free Mode ▼";

        // Cleanup Campaign UI
        document.getElementById('campaignSelectContainer').classList.add('hidden');
        document.querySelector('.sidebar-controls').classList.remove('hidden');

        // Explicitly hide sidebar (fixes bug where it stays open if Adventure wasn't active)
        const sidebar = document.getElementById('adventureSidebar');
        if (sidebar) sidebar.classList.add('hidden');

        // Stop Campaign if active or in setup
        if (window.CampaignManager && (window.CampaignManager.active || window.CampaignManager.currentCampaignInstance)) {
            CampaignManager.cancelCampaign();
        }

        // Stop Adventure if active
        if (window.AdventureManager && window.AdventureManager.active) {
            toggleAdventureMode();
        }
    }

    // Close dropdown
    if (dropdown) dropdown.classList.remove('show');
}

class FactionSelector {
    constructor(containerId = 'warFactionSelectPanel', listId = 'warFactionList') {
        this.containerId = containerId;
        this.listId = listId;
    }

    show(customOptions = []) {
        if (!window.statesData || !window.diplomacyMatrix) return;

        const panel = document.getElementById(this.containerId);
        const listContainer = document.getElementById(this.listId);
        if (!panel || !listContainer) return;

        // Auto-fetch options from Campaign if not provided (Handling Cycle Mode)
        if (!customOptions || customOptions.length === 0) {
            if (window.CampaignManager && window.CampaignManager.currentCampaignInstance && !window.CampaignManager.active) {
                if (typeof window.CampaignManager.currentCampaignInstance.getFactionSelectorOptions === 'function') {
                    customOptions = window.CampaignManager.currentCampaignInstance.getFactionSelectorOptions();
                }
            }
        }

        // Calculate Agression/Difficulty
        // Filter valid states (ensure they have a capital ID)
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

        // Filter: Show only states with enemies? NO, for Political Map we want ALL states (or at least valid ones).
        // The original logic filtered `warlikeStates`.
        // For general Political Map, simple sorting by power or name might be better.
        // But to reuse the "Faction Selector" UI which has specific columns (enemies), keeping consistent logic is good.
        // Let's sort by enemy count then total soldiers.

        rankedStates.sort((a, b) => {
            if (b.enemyCount !== a.enemyCount) return b.enemyCount - a.enemyCount;
            return b.totalSoldiers - a.totalSoldiers;
        });

        let html = "";

        // Render Custom Options (e.g. Random from War Campaign)
        if (customOptions && customOptions.length > 0) {
            customOptions.forEach(opt => {
                const checkedStr = opt.checked ? "checked" : "";
                const changeHandler = opt.onChange ? opt.onChange : `FactionSelectorInstance.onSelect(${opt.value})`; // Default handler if not provided

                html += `
                    <label class="faction-option" style="display: flex; align-items: center; padding: 4px 6px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s; white-space: nowrap; overflow: hidden;">
                        <input type="radio" name="warFactionSelect" value="${opt.value}" ${checkedStr} onchange="${changeHandler}" style="margin-right: 6px;">
                        <div style="flex: 1; font-weight: bold; color: #fff; font-size:13px;">
                            ${opt.label}
                        </div>
                    </label>
                `;
            });
        } else {
            // Default Option for standard Political Map: "No State"
            html += `
                <label class="faction-option" style="display: flex; align-items: center; padding: 4px 6px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s; white-space: nowrap; overflow: hidden;">
                    <input type="radio" name="warFactionSelect" value="-2" onchange="FactionSelectorInstance.onSelect(-2)" style="margin-right: 6px;">
                    <div style="flex: 1; font-weight: bold; color: #bbb; font-size:13px; font-style: italic;">
                        No State (Clear)
                    </div>
                </label>
            `;
        }

        if (rankedStates.length === 0) {
            html += "<p>No suitable states found.</p>";
        } else {
            rankedStates.forEach((item, index) => {
                const s = item.state;
                // If custom options provided (like Random), they might be default.
                // If NO custom options, we don't start with any checked usually.
                const isChecked = "";

                const clickHandler = `FactionSelectorInstance.onSelect(${s.id})`;

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

        listContainer.innerHTML = html;
        panel.classList.remove('hidden');
    }

    hide() {
        const panel = document.getElementById(this.containerId);
        if (panel) {
            panel.classList.add('hidden');
        }
        // Also clear map selection?
        if (window.updateDiplomacyColors) {
            updateDiplomacyColors(null);
        }
    }

    onSelect(stateId) {
        // Propagate to Campaign Manager if active setup
        if (window.CampaignManager && window.CampaignManager.currentCampaignInstance) {
            window.CampaignManager.currentCampaignInstance.presetStateId = stateId;
        }

        if (window.updateDiplomacyColors) {
            // Handle Random (-1) or No State (-2) by clearing logic
            if (stateId === -1 || stateId === -2) {
                updateDiplomacyColors(null);
            } else {
                updateDiplomacyColors(stateId);
            }
        }
    }
}

// Global Instance
const FactionSelectorInstance = new FactionSelector();

