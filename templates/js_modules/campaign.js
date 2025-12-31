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
    onUpdateStats(party) { this.checkObjectives(party); }

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
}

// ---------------------------------------------------------
// Specific Campaign: The Siege Defense
// ---------------------------------------------------------
class SiegeDefenseCampaign extends BaseCampaign {
    constructor() {
        super("siege_defense_v1", "The Siege Defense", "A dark army surrounds the capital. You must gather resources, build an army, and break the siege before the city falls.");

        // Define Objectives
        // Note: We use lambda functions for checks to encapsulate the logic
        this.addObjective("obj1", "Gather 30 Tools", "resources", (p) => p.tools >= 30);
        this.addObjective("obj2", "Gather 70 Soldiers", "resources", (p) => p.soldiers >= 70);
        this.addObjective("obj3", "Gather 150 Food", "resources", (p) => p.food >= 150);

        // Custom logic for Siege Objective
        this.siegeDefeated = false;
        this.addObjective("obj4", "Defeat the Siege", "defeat_siege", (p) => this.siegeDefeated);

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
        if (this.startConfig.cell) {
            AdventureManager.party.cell = this.startConfig.cell;
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
        }
    }
}

// ---------------------------------------------------------
// Manager (Singleton)
// ---------------------------------------------------------
const CampaignManager = {
    active: false,
    currentCampaignInstance: null,

    // Registry of Campaign Classes
    availableCampaigns: [
        SiegeDefenseCampaign
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
    },

    selectCampaign(index) {
        if (index === "") return;
        const CampClass = this.availableCampaigns[index];
        this.currentCampaignInstance = new CampClass();

        document.getElementById('campaignStartBtn').classList.remove('hidden');
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
            }

            AdventureManager.start();
            this.currentCampaignInstance.onStart(); // Call *after* Adventure start? Or before? BaseCampaign.onStart sets active=true.
            AdventureManager.showFeedback(`Campaign Started: ${this.currentCampaignInstance.name}`);
        }

        document.getElementById('campaignStartBtn').classList.add('hidden');
        document.getElementById('campaignDropdown').disabled = true;
    },

    showCampaignWinModal() {
        const modal = document.getElementById('campaignVictoryModal');
        if (modal) {
            modal.style.display = 'flex';
            if (window.AdventureManager) AdventureManager.isGameOver = true;
        }
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
