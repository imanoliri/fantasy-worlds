/* Campaign Mode Logic */

const CampaignManager = {
    active: false,
    currentCampaign: null,
    campaigns: [
        {
            id: "siege_defense_v1",
            name: "The Siege Defense",
            description: "A dark army surrounds the capital. You must gather resources, build an army, and break the siege before the city falls.",
            startConfig: {
                resources: { soldiers: 20, tools: 20, food: 15, gold: 0 }
            },
            modifiers: {
                huntStrength: 25,
                siegeStrength: 60
            },
            objectives: [
                { id: "obj2", text: "Gather 30 Tools", type: "resources", conditions: { tools: 30 }, completed: false },
                { id: "obj1", text: "Gather 70 Soldiers", type: "resources", conditions: { soldiers: 70 }, completed: false },
                { id: "obj3", text: "Gather 150 Food", type: "resources", conditions: { food: 150 }, completed: false },
                { id: "obj4", text: "Defeat the Siege", type: "defeat_siege", completed: false }
            ]
        }
    ],

    // Called when Campaign Mode is selected
    init() {
        this.populateSidebar();
    },

    populateSidebar() {
        const dropdown = document.getElementById('campaignDropdown');
        if (!dropdown) return;

        // Clear existing (except default)
        dropdown.innerHTML = '<option value="" disabled selected>Select a Campaign...</option>';

        this.campaigns.forEach((camp, index) => {
            const opt = document.createElement('option');
            opt.value = index; // Use index for easy retrieval
            opt.textContent = camp.name;
            opt.title = camp.description; // Description as tooltip
            dropdown.appendChild(opt);
        });

        // Hide objectives initially
        document.getElementById('campaignObjectives').classList.add('hidden');
        document.getElementById('campaignStartBtn').classList.add('hidden');
    },

    selectCampaign(index) {
        if (index === "") return;
        const campaign = this.campaigns[index];
        this.currentCampaign = JSON.parse(JSON.stringify(campaign)); // Deep clone to reset state

        // Update UI
        // Description is tooltip now
        document.getElementById('campaignStartBtn').classList.remove('hidden');

        // Show objectives preview (optional, or wait for start)
        this.renderObjectives();
        document.getElementById('campaignObjectives').classList.remove('hidden');
    },

    startCampaign() {
        if (!this.currentCampaign) return;

        console.log("Starting Campaign:", this.currentCampaign.name);
        this.active = true;

        if (window.AdventureManager) {
            AdventureManager.init();
            AdventureManager.active = true;

            // Subscribe to Adventure Events
            if (AdventureManager.events) {

                AdventureManager.events.on('start', () => this.onAdventureStart());
                AdventureManager.events.on('start', () => this.onAdventureStart());
                AdventureManager.events.on('updateStats', () => this.checkObjectives());
                AdventureManager.events.on('missionStart', (data) => this.onMissionStart(data));
                AdventureManager.events.on('missionComplete', (data) => this.onMissionComplete(data));
            }

            AdventureManager.start();
            AdventureManager.showFeedback(`Campaign Started: ${this.currentCampaign.name}`);
        }

        document.getElementById('campaignStartBtn').classList.add('hidden');
        document.getElementById('campaignDropdown').disabled = true;
    },

    onAdventureStart() {
        if (!this.active || !this.currentCampaign) return;

        // Initial Capture (if already spawned)
        if (window.MissionSiege && MissionSiege.data) {
            this.onMissionStart({ type: 'siege', ...MissionSiege.data });
        }

        // Enforce Starting Resources & Location
        if (this.currentCampaign.startConfig) {
            if (this.currentCampaign.startConfig.resources) {
                AdventureManager.party = { ...AdventureManager.party, ...this.currentCampaign.startConfig.resources };
            }
            if (this.currentCampaign.startConfig.cell) {
                AdventureManager.party.cell = this.currentCampaign.startConfig.cell;
                // We need to re-render to move the marker
                // But updateStats calls render? No, usually separate.
                setTimeout(() => AdventureManager.render(), 100); // Small delay to ensure graphData is ready/map rendered
            }
            AdventureManager.updateStats(); // Force UI update
        }
    },

    onMissionStart(data) {
        if (!this.active) return;

        // Apply Modifiers (Live correction of random spawns)
        if (this.currentCampaign.modifiers) {
            const mods = this.currentCampaign.modifiers;

            // Siege Strength Override
            if (data.type === 'siege' && mods.siegeStrength && window.MissionSiege) {
                if (MissionSiege.data) {
                    MissionSiege.data.soldiers = mods.siegeStrength;
                    MissionSiege.updateVisuals(); // Refresh UI
                    console.log(`Campaign: Enforced Siege Strength to ${mods.siegeStrength}`);
                }
            }

            // Hunt Strength Override
            if (data.type === 'hunt' && mods.huntStrength && window.MissionHunt) {
                if (MissionHunt.data) {
                    MissionHunt.data.strength = mods.huntStrength;
                    MissionHunt.updateVisuals(); // Refresh UI
                    console.log(`Campaign: Enforced Hunt Strength to ${mods.huntStrength}`);
                }
            }
        }

        if (data.type === 'siege') {
            console.log(`Campaign: Tracking Siege on Burg ID ${data.burgId}`);
        }
    },

    onMissionComplete(data) {
        if (!this.active || !this.currentCampaign) return;

        if (data.type === 'siege') {
            const obj = this.currentCampaign.objectives.find(o => o.type === "defeat_siege");

            if (obj && !obj.completed) {
                obj.completed = true;
                this.renderObjectives();
                AdventureManager.showFeedback(`Objective Complete: Defeat the Siege`);
                this.checkVictory();
            }
        }
    },

    renderObjectives() {
        const list = document.getElementById('objectivesList');
        if (!list || !this.currentCampaign) return;

        list.innerHTML = "";
        this.currentCampaign.objectives.forEach(obj => {
            const li = document.createElement('li');
            li.textContent = obj.text;
            if (obj.completed) li.classList.add('completed');
            list.appendChild(li);
        });
    },

    // Called by hooks in AdventureManager
    checkObjectives() {
        if (!this.active || !this.currentCampaign) return;

        let changed = false;
        const party = window.AdventureManager ? AdventureManager.party : null;

        // Note: Siege logic moved to onMissionComplete

        this.currentCampaign.objectives.forEach(obj => {
            if (obj.completed) return;

            if (obj.type === "resources" && party) {
                let met = true;
                if (obj.conditions.soldiers && party.soldiers < obj.conditions.soldiers) met = false;
                if (obj.conditions.tools && party.tools < obj.conditions.tools) met = false;
                if (obj.conditions.food && party.food < obj.conditions.food) met = false;
                if (obj.conditions.gold && party.gold < obj.conditions.gold) met = false;

                if (met) {
                    obj.completed = true;
                    changed = true;
                    AdventureManager.showFeedback(`Objective Complete: ${obj.text}`);
                }
            }
        });

        if (changed) {
            this.renderObjectives();
            this.checkVictory();
        }
    },

    checkVictory() {
        const allComplete = this.currentCampaign.objectives.every(o => o.completed);
        if (allComplete) {
            this.active = false;
            this.showCampaignWinModal();
        }
    },

    showCampaignWinModal() {
        const modal = document.getElementById('campaignVictoryModal');
        if (modal) {
            modal.style.display = 'flex'; // adventure-modal class needs flex centering
            if (window.AdventureManager) AdventureManager.isGameOver = true; // Pause
        }
    },

    endCampaign() {
        const modal = document.getElementById('campaignVictoryModal');
        if (modal) modal.style.display = 'none';

        // Reset UI Components
        document.getElementById('campaignDropdown').disabled = false;
        document.getElementById('campaignDropdown').value = "";
        document.getElementById('campaignStartBtn').classList.add('hidden');
        document.getElementById('campaignObjectives').classList.add('hidden');

        // Use Global Helper to Switch Mode properly
        // This handles stopping adventure and resetting top-level UI
        if (typeof selectGameMode === 'function') {
            selectGameMode('free');
        } else {
            // Fallback
            if (window.AdventureManager) {
                AdventureManager.isGameOver = false;
                AdventureManager.toggle();
            }
        }

        // Reset valid descriptions
        document.getElementById('campaignDescription').textContent = "";
    },

};

window.CampaignManager = CampaignManager;
