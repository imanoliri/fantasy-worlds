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
    }

    onAdventureStart() {
        super.onAdventureStart();

        // Enforce Start Location (Campaign specific logic overrides generic startConfig.cell if needed)
        let startCell = this.startConfig.cell;

        // PRIORITIZE: Start at the location of the Siege
        const siegedBurg = burgsData.find(b => b.id === MissionSiege.data.burgId);
        if (siegedBurg) {
            startCell = siegedBurg.cell_id;
            console.log(`SiegeDefenseCampaign: Starting at sieged burg ${siegedBurg.name} (Cell ${startCell})`);
        }

        AdventureManager.party.cell = startCell;
        setTimeout(() => AdventureManager.render(), 100);

        AdventureManager.updateStats();

        // Initial Capture of Siege if it already exists
        this.onMissionStart({ type: 'siege', ...MissionSiege.data });
    }

    onMissionStart(data) {
        // Enforce Rules (Modifers)
        if (data.type === 'siege') {
            const FORCED_STRENGTH = 60;
            MissionSiege.data.soldiers = FORCED_STRENGTH;
            MissionSiege.updateVisuals();
            console.log(`SiegeDefenseCampaign: Enforced Siege Strength to ${FORCED_STRENGTH}`);
            console.log(`SiegeDefenseCampaign: Tracking Siege on Burg ID ${data.burgId}`);

            // Update Objective Target Info
            if (this.siegedBurgId === -1) {
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
            MissionHunt.data.strength = FORCED_STRENGTH;
            MissionHunt.updateVisuals();
            console.log(`SiegeDefenseCampaign: Enforced Hunt Strength to ${FORCED_STRENGTH}`);
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

// Register Campaign
CampaignManager.availableCampaigns.push(SiegeDefenseCampaign);
