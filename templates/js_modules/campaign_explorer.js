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

// Register Campaign
if (window.CampaignManager) {
    CampaignManager.availableCampaigns.push(ExplorerCampaign);
}
