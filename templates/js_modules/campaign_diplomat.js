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

        const initCampaignData = () => {
            console.log("DiplomatCampaign: burgsData length:", burgsData.length);
            const capitals = burgsData.filter(b => b.is_capital);
            console.log("DiplomatCampaign: Found capitals:", capitals.length);
            this.totalCapitals = capitals.length;
            this.updateObjectiveText();

            // Highlight all unvisited capitals
            capitals.forEach(c => this.highlightCell(c.cell_id, "#FFD700")); // Gold highlight
        };

        initCampaignData();
    }

    onEnd() {
        super.onEnd();
    }

    onBeforeMissionSpawn(data) {
        if (data.type === 'diplomacy') {
            data.cancelled = true;
            console.log("DiplomatCampaign blocked diplomacy mission.");
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

// Register Campaign
CampaignManager.availableCampaigns.push(DiplomatCampaign);
