/* Campaign Mode Logic */

// Base Class for all Campaigns
class BaseCampaign {
    constructor(id, name, description) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.active = false;
        this.objectives = [];
        this.startConfig = null;
    }

    // Lifecycle Hooks
    onStart() {
        this.active = true;
        console.log(`Campaign '${this.name}' Started.`);
    }

    onEnd() {
        this.active = false;
        this.clearHighlights();
        console.log(`Campaign '${this.name}' Ended.`);
    }

    // Configuration Hooks
    getPartyStartConfig() {
        return this.partyStartConfig || {};
    }

    // Event Handlers
    onAdventureStart() {
        if (this.partyStartConfig) {
            AdventureManager.updateStats();
        }
    }
    onMissionStart(data) { }
    onMissionComplete(data) { }
    onBeforeMissionSpawn(data) { }
    onCalculateMissionRewards(context) { }
    onBeforeBurgPopup(data) { }
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
        if (!graphData[cellId]) return;

        let x, y;

        // Try to find exact Burg coordinates first for better centering
        const burg = burgsData.find(b => b.cell_id === cellId);
        if (burg) {
            x = burg.x;
            y = burg.y;
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
            svg.appendChild(container);
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
// Campaign Manager
// ---------------------------------------------------------

const CampaignManager = {
    active: false,
    currentCampaignInstance: null,

    // Registry of Campaign Classes
    availableCampaigns: [],

    init() {
        this.populateSidebar();
    },

    populateSidebar() {
        const dropdown = document.getElementById('campaignDropdown');
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
        this.active = true;
        AdventureManager.init();
        AdventureManager.active = true;

        AdventureManager.events.on('start', () => this.currentCampaignInstance.onAdventureStart());
        AdventureManager.events.on('updateStats', () => this.currentCampaignInstance.onUpdateStats(AdventureManager.party));
        AdventureManager.events.on('missionStart', (d) => this.currentCampaignInstance.onMissionStart(d));
        AdventureManager.events.on('missionComplete', (d) => this.currentCampaignInstance.onMissionComplete(d));
        AdventureManager.events.on('burgPopupOpened', (d) => this.currentCampaignInstance.onBurgPopupOpened(d));
        AdventureManager.events.on('beforeBurgPopup', (d) => this.currentCampaignInstance.onBeforeBurgPopup(d));
        AdventureManager.events.on('beforeMissionSpawn', (d) => this.currentCampaignInstance.onBeforeMissionSpawn(d));
        AdventureManager.events.on('calculateMissionRewards', (d) => this.currentCampaignInstance.onCalculateMissionRewards(d));

        this.currentCampaignInstance.onStart(); // Call *before* Adventure start to register listeners

        // AdventureManager starts with current campaign's config
        AdventureManager.start(this.currentCampaignInstance.getPartyStartConfig());
        AdventureManager.showFeedback(`Campaign Started: ${this.currentCampaignInstance.name}`);

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
            AdventureManager.isGameOver = true;
        }
    },

    cancelCampaign() {
        // 1. Cleanup current campaign
        if (this.currentCampaignInstance) {
            this.currentCampaignInstance.onEnd();
            this.currentCampaignInstance = null;
        }
        this.active = false;

        // 2. Reset Adventure Manager (Ensures fresh start next time)
        AdventureManager.reset();

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

        AdventureManager.closePopup();

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

        selectGameMode('free');
        AdventureManager.isGameOver = false;
        AdventureManager.reset();

        document.getElementById('campaignDescription').textContent = "";
    }
};

window.CampaignManager = CampaignManager;
