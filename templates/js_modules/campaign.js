/* Campaign Mode Logic */

// Base Class for all Campaigns
class BaseCampaign {
    constructor(id, name, description) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.active = false;
        this.objectives = [];
    }

    // Lifecycle Hooks
    onStart() {
        this.active = true;
        console.log(`Campaign '${this.name}' Started.`);
    }

    onEnd() {
        this.active = false;
        console.log(`Campaign '${this.name}' Ended.`);
    }

    // Event Handlers
    onAdventureStart() { }
    onMissionStart(data) { }
    onMissionComplete(data) { }
    onBurgPopupOpened(context) { }
    onUpdateStats(party) {
        if (!this.active) return;
        this.checkObjectives(party);
    }

    // Internal Logic
    addObjective(id, text, type, checkFn) {
        this.objectives.push({ id, text, type, checkFn, completed: false });
    }

    renderObjectives() {
        const list = document.getElementById('objectivesList');
        if (!list) return;
        list.innerHTML = "";
        this.objectives.forEach(obj => {
            const li = document.createElement('li');
            li.textContent = obj.text;
            if (obj.completed) li.classList.add('completed');
            list.appendChild(li);
        });
    }

    checkObjectives(party) {
        let changed = false;
        this.objectives.forEach(obj => {
            if (obj.completed) return;
            if (obj.checkFn(party)) {
                obj.completed = true;
                changed = true;
                AdventureManager.showFeedback(`Objective Complete: ${obj.text}`);
            }
        });

        if (changed) {
            this.renderObjectives();
            this.checkVictory();
        }
    }

    checkVictory() {
        if (this.objectives.length > 0 && this.objectives.every(o => o.completed)) {
            this.onVictory();
        }
    }

    onVictory() {
        CampaignManager.showCampaignWinModal();
    }

    // Visual Helpers
    highlightCell(cellId, color = "#00ffff") {
        if (!window.graphData || !graphData[cellId]) return;

        let x, y;

        // Try to find exact Burg coordinates first for better centering
        if (window.burgsData) {
            const burg = burgsData.find(b => b.cell_id === cellId);
            if (burg) {
                x = burg.x;
                y = burg.y;
            }
        }

        // Fallback to cell center
        if (x === undefined || y === undefined) {
            const cell = graphData[cellId];
            x = cell.p[0];
            y = cell.p[1];
        }

        // Ensure container exists
        let container = document.getElementById('campaignHighlights');
        if (!container) {
            container = document.createElementNS("http://www.w3.org/2000/svg", "g");
            container.setAttribute("id", "campaignHighlights");
            const svg = document.getElementById('mapSvg');
            if (svg) svg.appendChild(container);
        }

        const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        ring.setAttribute("cx", x);
        ring.setAttribute("cy", y);
        ring.setAttribute("r", "15");
        ring.setAttribute("fill", "none");
        ring.setAttribute("stroke", color);
        ring.setAttribute("stroke-width", "3");
        ring.setAttribute("stroke-dasharray", "4,4");

        // Animation
        const anim = document.createElementNS("http://www.w3.org/2000/svg", "animate");
        anim.setAttribute("attributeName", "r");
        anim.setAttribute("values", "15;35;15");
        anim.setAttribute("dur", "3s");
        anim.setAttribute("repeatCount", "indefinite");
        ring.appendChild(anim);

        container.appendChild(ring);
    }

    clearHighlights() {
        const container = document.getElementById('campaignHighlights');
        if (container) container.innerHTML = "";
    }
}

// ---------------------------------------------------------
// Specific Campaign: The Siege Defense
// ---------------------------------------------------------
class SiegeDefenseCampaign extends BaseCampaign {
    constructor() {
        super("siege_defense_v1", "The Siege Defense", "A dark army surrounds the capital. You must gather resources, build an army, and break the siege before the city falls.");

        // Internal State
        this.siegeDefeated = false;
        this.siegedBurgId = -1;
        this.siegedBurgCell = -1;
        this.siegedBurgName = "the Capital";

        // Define Objectives
        // Order: Gather Basics -> Soldiers -> Defeat Siege -> Deliver Food
        this.addObjective("obj1", "Gather 30 Food", "resources", (p) => p.food >= 30);
        this.addObjective("obj2", "Gather 30 Tools", "resources", (p) => p.tools >= 30);
        this.addObjective("obj3", "Gather 70 Soldiers", "resources", (p) => p.soldiers >= 70);
        this.addObjective("obj5", "Defeat the Siege", "defeat_siege", (p) => this.siegeDefeated);
        this.addObjective("obj4", "Bring 150 Food to the Capital", "delivery", (p) => {
            // Check if we are AT the sieged city AND have the food
            return p.food >= 150 && this.siegedBurgCell !== -1 && p.cell === this.siegedBurgCell;
        });

        this.startConfig = {
            resources: { soldiers: 20, tools: 20, food: 15, gold: 0 }
        };
    }

    onStart() {
        super.onStart();
        // Apply Start Config
        if (this.startConfig.resources) {
            AdventureManager.party = { ...AdventureManager.party, ...this.startConfig.resources };
            AdventureManager.updateStats(); // Ensure UI reflects changes immediately
        }
    }

    onAdventureStart() {
        // Enforce Start Location
        let startCell = this.startConfig.cell;

        // PRIORITIZE: Start at the location of the Siege
        if (window.MissionSiege && MissionSiege.data && window.burgsData) {
            const siegedBurg = burgsData.find(b => b.id === MissionSiege.data.burgId);
            if (siegedBurg) {
                startCell = siegedBurg.cell_id;
                console.log(`SiegeDefenseCampaign: Starting at sieged burg ${siegedBurg.name} (Cell ${startCell})`);
            }
        }

        if (startCell) {
            AdventureManager.party.cell = startCell;
            setTimeout(() => AdventureManager.render(), 100);
        }
        AdventureManager.updateStats();

        // Initial Capture of Siege if it already exists
        if (window.MissionSiege && MissionSiege.data) {
            this.onMissionStart({ type: 'siege', ...MissionSiege.data });
        }
    }

    onMissionStart(data) {
        // Enforce Rules (Modifers)
        if (data.type === 'siege') {
            const FORCED_STRENGTH = 60;
            if (window.MissionSiege && MissionSiege.data && MissionSiege.data.soldiers !== FORCED_STRENGTH) {
                MissionSiege.data.soldiers = FORCED_STRENGTH;
                MissionSiege.updateVisuals();
                console.log(`SiegeDefenseCampaign: Enforced Siege Strength to ${FORCED_STRENGTH}`);
            }
            console.log(`SiegeDefenseCampaign: Tracking Siege on Burg ID ${data.burgId}`);

            // Update Objective Target Info
            if (window.burgsData && this.siegedBurgId === -1) {
                const burg = burgsData.find(b => b.id === data.burgId);
                if (burg) {
                    this.siegedBurgId = burg.id;
                    this.siegedBurgCell = burg.cell_id;
                    this.siegedBurgName = burg.name;

                    // Update Objective Text
                    const deliveryObj = this.objectives.find(o => o.id === "obj4");
                    if (deliveryObj) {
                        deliveryObj.text = `Bring 150 Food to ${this.siegedBurgName}`;
                        this.renderObjectives();
                    }
                }
            }
        }

        if (data.type === 'hunt') {
            const FORCED_STRENGTH = 25;
            if (window.MissionHunt && MissionHunt.data && MissionHunt.data.strength !== FORCED_STRENGTH) {
                MissionHunt.data.strength = FORCED_STRENGTH;
                MissionHunt.updateVisuals();
                console.log(`SiegeDefenseCampaign: Enforced Hunt Strength to ${FORCED_STRENGTH}`);
            }
        }
    }

    onMissionComplete(data) {
        if (data.type === 'siege') {
            // In this specific campaign, completing ANY siege counts as victory
            this.siegeDefeated = true;
            this.checkObjectives(AdventureManager.party);

            // Highlight the city to bring the food to
            if (this.siegedBurgCell !== -1) {
                this.highlightCell(this.siegedBurgCell, "#00FF00");
                AdventureManager.showFeedback(`Siege Lifted! Bring Food to ${this.siegedBurgName}!`);
            }
        }
    }

    onEnd() {
        super.onEnd();
        this.clearHighlights();
    }
}

// ---------------------------------------------------------
// Specific Campaign: The Grand Explorer
// ---------------------------------------------------------
class ExplorerCampaign extends BaseCampaign {
    constructor() {
        super("explorer_v1", "The Grand Explorer", "Travel the world, hunt beasts, find treasures, and reach the designated city.");

        // Internal State
        this.progress = {
            explore: 0,
            hunt: 0,
            treasure: 0
        };
        this.targetCityName = null;
        this.targetCityId = null;

        // Define Objectives
        this.addObjective("obj1", "Find 15 Locations (0/15)", "explore", (p) => this.progress.explore >= 15);
        this.addObjective("obj2", "Hunt 5 Beasts (0/5)", "hunt", (p) => this.progress.hunt >= 5);
        this.addObjective("obj3", "Pick 2 Treasures (0/2)", "treasure", (p) => this.progress.treasure >= 2);
        this.addObjective("obj4", "Reach [Target City]", "travel", (p) => this.checkCityArrival(p));
    }

    onStart() {
        super.onStart();
        // Pick a random city that IS NOT the starting one
        if (window.burgsData && burgsData.length > 0) {
            let valid = false;
            let attempts = 0;
            while (!valid && attempts < 100) {
                const randomBurg = burgsData[Math.floor(Math.random() * burgsData.length)];
                // Ensure it's reachable and not current location
                // Just picking non-current for simplicity
                if (graphData[randomBurg.cell_id].i !== AdventureManager.party.cell) {
                    this.targetCityName = randomBurg.name;
                    this.targetCityId = randomBurg.cell_id;
                    valid = true;
                }
                attempts++;
            }
        }

        // Update Objective Text
        const obj = this.objectives.find(o => o.type === "travel");
        if (obj && this.targetCityName) {
            obj.text = `Reach ${this.targetCityName}`;
            this.renderObjectives();
            this.highlightCell(this.targetCityId, "#00ffff"); // Cyan highlight
        }
    }

    onEnd() {
        super.onEnd();
        this.clearHighlights();
    }

    onMissionComplete(data) {
        let updateUI = false;

        if (data.type === 'explore') {
            this.progress.explore++;
            const obj = this.objectives.find(o => o.type === "explore");
            if (obj && !obj.completed) {
                obj.text = `Find 15 Locations (${this.progress.explore}/15)`;
                updateUI = true;
            }
            this.checkObjectives(AdventureManager.party);
        }
        if (data.type === 'hunt') {
            this.progress.hunt++;
            const obj = this.objectives.find(o => o.type === "hunt");
            if (obj && !obj.completed) {
                obj.text = `Hunt 5 Beasts (${this.progress.hunt}/5)`;
                updateUI = true;
            }
            this.checkObjectives(AdventureManager.party);
        }
        if (data.type === 'treasure') {
            this.progress.treasure++;
            const obj = this.objectives.find(o => o.type === "treasure");
            if (obj && !obj.completed) {
                obj.text = `Pick 2 Treasures (${this.progress.treasure}/2)`;
                updateUI = true;
            }
            this.checkObjectives(AdventureManager.party);
        }

        if (updateUI) {
            this.renderObjectives();
        }
    }

    checkCityArrival(party) {
        if (this.targetCityId !== null && party.cell === this.targetCityId) {
            return true;
        }
        return false;
    }

    // Override verify loop to check for city arrival every move
    onUpdateStats(party) {
        super.onUpdateStats(party);
        // Explicitly check city arrival since it's not a mission event
        const obj = this.objectives.find(o => o.type === "travel");
        if (obj && !obj.completed && this.checkCityArrival(party)) {
            obj.completed = true;
            AdventureManager.showFeedback(`Uncovered ${this.targetCityName}!`);
            this.renderObjectives();
            this.checkVictory();
        }
    }
}

// ---------------------------------------------------------
// Specific Campaign: The Diplomat
// ---------------------------------------------------------
class DiplomatCampaign extends BaseCampaign {
    constructor() {
        super("diplomat_v1", "The Diplomat", "Travel to every capital and complete a diplomatic mission.");

        this.visitedCapitals = new Set();
        this.totalCapitals = 0;

        // Navigation Tracking for Constraints
        this.currentBurgId = null;
        this.previousBurgId = null;

        this.addObjective("obj_diplomat", "Complete Diplomat Missions (0/?)", "diplomacy", () => false);
    }

    onStart() {
        super.onStart();
        if (window.burgsData) {
            const capitals = burgsData.filter(b => b.is_capital);
            this.totalCapitals = capitals.length;
            this.updateObjectiveText();

            // Highlight all unvisited capitals
            capitals.forEach(c => this.highlightCell(c.cell_id, "#FFD700")); // Gold highlight
        }
    }

    updateObjectiveText() {
        const obj = this.objectives.find(o => o.id === "obj_diplomat");
        if (obj) {
            obj.text = `Complete Diplomat Missions (${this.visitedCapitals.size}/${this.totalCapitals})`;
            this.renderObjectives();
        }
    }

    onBurgPopupOpened(context) {
        // 1. Navigation Tracking
        // Only update if it's a NEW burg visited
        if (this.currentBurgId !== context.burg.id) {
            this.previousBurgId = this.currentBurgId;
            this.currentBurgId = context.burg.id;
        }

        // 2. Logic for Capital
        if (!context.burg.is_capital) return;

        // If already visited, maybe show a "Completed" indicator?
        if (this.visitedCapitals.has(context.burg.id)) {
            context.buttons.push({
                id: 'diplomacy_completed',
                label: 'Mission Completed ✅',
                title: 'You have already completed the mission here.',
                onClick: '',
                class: 'btn-recruit', // Keep styling
                disabled: true
            });
            return;
        }

        // 3. Constraints Check
        let isDisabled = false;
        let tooltip = "Complete diplomatic mission (Costs 5 💰)";
        let label = "Diplomatic Mission (5 💰)";

        // Constraint A: Resources
        if (context.party.food < 50 || context.party.gold < 50) {
            isDisabled = true;
            tooltip = "Requires 50 Food and 50 Gold reserve.";
            label += " 🔒";
        }

        // Constraint B: Enemy State
        if (!isDisabled && this.previousBurgId !== null) {
            const prevBurg = burgsData.find(b => b.id === this.previousBurgId);
            if (prevBurg) {
                const prevState = prevBurg.state;
                const currState = context.burg.state;

                // Check Diplomacy
                // data is in 'diplomacyMatrix' (global from map.js)
                if (window.diplomacyMatrix && diplomacyMatrix[prevState]) {
                    const relation = diplomacyMatrix[prevState][currState] || "Unknown";
                    if (relation === "Enemy" || relation === "War") {
                        isDisabled = true;
                        tooltip = `Cannot negotiate! You arrived from ${prevBurg.name} (${pack.states[prevState].name}), an Enemy state.`;
                        label += " ⚔️";
                    }
                }
            }
        }

        // Add Button
        context.buttons.push({
            id: 'diplomacy_mission',
            label: label,
            title: tooltip,
            onClick: `CampaignManager.currentCampaignInstance.completeMission(${context.burg.id})`,
            style: 'background-color: #8e44ad;',
            class: 'btn-recruit',
            disabled: isDisabled
        });
    }

    completeMission(burgId) {
        if (AdventureManager.party.gold < 5) {
            AdventureManager.showFeedback("Not enough Gold (5)!");
            return;
        }

        AdventureManager.party.gold -= 5;
        this.visitedCapitals.add(burgId);

        AdventureManager.showFeedback("Diplomatic Mission Successful!");

        // Floating text
        const burg = burgsData.find(b => b.id === burgId);
        if (burg) {
            // Remove highlight
            // Need to redraw highlights for all EXCEPT visited? Or just clear invalid ones?
            // Since 'highlightCell' adds a generic circle, I can't easily remove just one without ID.
            // Simplest: Clear all and redraw unvisited.
            this.clearHighlights();
            const capitals = burgsData.filter(b => b.is_capital);
            capitals.forEach(c => {
                if (!this.visitedCapitals.has(c.id)) {
                    this.highlightCell(c.cell_id, "#FFD700");
                }
            });

            // Show text
            AdventureManager.showFloatingText("-5 💰", burg.x, burg.y, "#f1c40f");
            AdventureManager.showFloatingText("✅", burg.x, burg.y - 20, "#2ecc71");
        }

        this.updateObjectiveText();
        AdventureManager.updateStats(); // To show gold change
        AdventureManager.closePopup(); // Close to refresh state (or force refresh?)

        // Check Victory
        if (this.visitedCapitals.size >= this.totalCapitals) {
            this.objectives[0].completed = true;
            this.renderObjectives();
            setTimeout(() => this.checkVictory(), 500);
        }
    }
}


const CampaignManager = {
    active: false,
    currentCampaignInstance: null,

    // Registry of Campaign Classes
    availableCampaigns: [
        SiegeDefenseCampaign,
        ExplorerCampaign,
        DiplomatCampaign
    ],

    init() {
        this.populateSidebar();
    },



    populateSidebar() {
        const dropdown = document.getElementById('campaignDropdown');
        if (!dropdown) return;

        dropdown.innerHTML = '<option value="" disabled selected>Select a Campaign...</option>';

        this.availableCampaigns.forEach((CampClass, index) => {
            // Instantiate temporarily just to get metadata (or make static)
            // For now, simple instantiation is fine as they are lightweight
            const temp = new CampClass();
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = temp.name;
            opt.title = temp.description;
            dropdown.appendChild(opt);
        });

        // UI Reset
        document.getElementById('campaignObjectives').classList.add('hidden');
        document.getElementById('campaignStartBtn').classList.add('hidden');
        document.getElementById('campaignCancelBtn').classList.add('hidden');
    },

    selectCampaign(index) {
        if (index === "") return;
        const CampClass = this.availableCampaigns[index];
        this.currentCampaignInstance = new CampClass();

        document.getElementById('campaignStartBtn').classList.remove('hidden');
        document.getElementById('campaignCancelBtn').classList.add('hidden'); // Ensure cancel is hidden
        this.currentCampaignInstance.renderObjectives();
        document.getElementById('campaignObjectives').classList.remove('hidden');
    },

    startCampaign() {
        if (!this.currentCampaignInstance) return;

        this.active = true;
        if (window.AdventureManager) {
            AdventureManager.init();
            AdventureManager.active = true;

            // Wire up Events to the Instance
            if (AdventureManager.events) {
                AdventureManager.events.on('start', () => this.currentCampaignInstance.onAdventureStart());
                AdventureManager.events.on('updateStats', () => this.currentCampaignInstance.onUpdateStats(AdventureManager.party));
                AdventureManager.events.on('missionStart', (d) => this.currentCampaignInstance.onMissionStart(d));
                AdventureManager.events.on('missionComplete', (d) => this.currentCampaignInstance.onMissionComplete(d));
                AdventureManager.events.on('burgPopupOpened', (d) => this.currentCampaignInstance.onBurgPopupOpened(d));
            }

            AdventureManager.start();
            this.currentCampaignInstance.onStart(); // Call *after* Adventure start? Or before? BaseCampaign.onStart sets active=true.
            AdventureManager.showFeedback(`Campaign Started: ${this.currentCampaignInstance.name}`);
        }

        document.getElementById('campaignStartBtn').classList.add('hidden');
        document.getElementById('campaignCancelBtn').classList.remove('hidden'); // Show Cancel
        document.getElementById('campaignDropdown').disabled = true;

        // Show Stats Banner & Options Btn
        const banner = document.getElementById('adventureStatsBanner');
        if (banner) banner.classList.remove('hidden');
        const optionsBtn = document.getElementById('adventureOptionsBtn');
        if (optionsBtn) optionsBtn.classList.remove('hidden');
    },

    showCampaignWinModal() {
        const modal = document.getElementById('campaignVictoryModal');
        if (modal) {
            modal.style.display = 'flex';
            if (window.AdventureManager) AdventureManager.isGameOver = true;
        }
    },

    cancelCampaign() {
        // 1. Cleanup current campaign
        if (this.currentCampaignInstance) {
            this.currentCampaignInstance.onEnd();
            this.currentCampaignInstance = null;
        }
        this.active = false;

        // 2. Stop Adventure Manager (cleans up game state, stops loop)
        if (window.AdventureManager && AdventureManager.active) {
            AdventureManager.toggle();
        }

        // 3. Force Sidebar back open (restore Campaign Menu state)
        const sidebar = document.getElementById('adventureSidebar');
        if (sidebar) sidebar.classList.remove('hidden');

        // Hide Stats Banner & Options Btn
        const banner = document.getElementById('adventureStatsBanner');
        if (banner) banner.classList.add('hidden');
        const optionsBtn = document.getElementById('adventureOptionsBtn');
        if (optionsBtn) optionsBtn.classList.add('hidden');

        // 4. Reset UI Elements to Selection State
        document.querySelector('.sidebar-controls').classList.add('hidden');
        document.getElementById('campaignSelectContainer').classList.remove('hidden');

        // Reset Dropdown & Buttons
        this.populateSidebar();
        document.getElementById('campaignDropdown').disabled = false;

        AdventureManager.showFeedback("Campaign Cancelled.");
    },

    endCampaign() {
        const modal = document.getElementById('campaignVictoryModal');
        if (modal) modal.style.display = 'none';

        if (window.AdventureManager && typeof AdventureManager.closePopup === 'function') {
            AdventureManager.closePopup();
        }

        // Cleanup Instance
        if (this.currentCampaignInstance) {
            this.currentCampaignInstance.onEnd();
            this.currentCampaignInstance = null;
        }
        this.active = false;

        // Reset UI
        document.getElementById('campaignDropdown').disabled = false;
        document.getElementById('campaignDropdown').value = "";
        document.getElementById('campaignStartBtn').classList.add('hidden');
        document.getElementById('campaignCancelBtn').classList.add('hidden');
        document.getElementById('campaignObjectives').classList.add('hidden');

        if (typeof selectGameMode === 'function') {
            selectGameMode('free');
        } else {
            if (window.AdventureManager) {
                AdventureManager.isGameOver = false;
                AdventureManager.toggle();
            }
        }
        document.getElementById('campaignDescription').textContent = "";
    }
};

window.CampaignManager = CampaignManager;
