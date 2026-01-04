
class HordeCampaign extends BaseCampaign {
    constructor() {
        super("horde_v1", "The Horde", "Lead a horde to pillage the world. Defeat 10 armies and pillage all capitals.");
        this.armiesDefeated = 0;
        this.pillagedCapitals = new Set(); // Set of burg IDs
        this.partyStartConfig = { resources: { soldiers: 40 } };

        // Objectives
        this.addObjective("obj_horde_armies", "Defeat Armies (0/10)", "battle", () => this.armiesDefeated >= 10);
        this.addObjective("obj_horde_capitals", "Pillage Capitals (0/?)", "domination", () => this.checkCapitalsVictory());

        // Bind methods
        this.onBattleWon = this.onBattleWon.bind(this);
    }

    onStart() {
        super.onStart();
        console.log("Horde Campaign Started");
        this.updateObjectiveText();

        // Listen for battle wins from standard battles
        if (AdventureManager.events) {
            AdventureManager.events.on('battleWon', this.onBattleWon);
        }
    }

    onEnd() {
        super.onEnd();
        if (AdventureManager.events) {
            AdventureManager.events.off('battleWon', this.onBattleWon);
        }
    }

    onBattleWon() {
        this.armiesDefeated++;
        this.updateObjectiveText();
        this.checkVictory();
    }

    updateObjectiveText() {
        // Update Army Objective
        const armyObj = this.objectives.find(o => o.id === "obj_horde_armies");
        if (armyObj) {
            armyObj.text = `Defeat Armies (${this.armiesDefeated}/10)`;
            if (this.armiesDefeated >= 10) armyObj.completed = true;
        }

        // Update Capital Objective
        const capitalObj = this.objectives.find(o => o.id === "obj_horde_capitals");
        if (capitalObj) {
            const stats = this.getCapitalStats();
            capitalObj.text = `Pillage Capitals (${stats.pillaged}/${stats.total})`;
            if (stats.pillaged >= stats.total && stats.total > 0) capitalObj.completed = true;
        }

        this.renderObjectives();
    }

    getCapitalStats() {
        const capitals = burgsData.filter(b => b.is_capital);
        let total = capitals.length;
        let pillaged = this.pillagedCapitals.size;
        return { total, pillaged };
    }

    checkCapitalsVictory() {
        const stats = this.getCapitalStats();
        return stats.total > 0 && stats.pillaged >= stats.total;
    }

    isHostile(burg) {
        if (!burg) return false;
        const type = burg.type ? burg.type.toLowerCase() : "";

        // Hostile if NOT "Hunter" (or Hunting) AND NOT "Highland" (or Highlands)
        // Using includes to cover variations
        if (type.includes("hunt")) return false;
        if (type.includes("highland")) return false;

        return true; // Default to hostile for all other types
    }

    onBeforeBurgPopup(data) {
        if (this.isHostile(data.burg)) {
            data.preventReplenish = true;
        }
    }

    onBurgPopupOpened(context) {
        const { burg, party, buttons } = context;

        // Only modify if hostile
        if (this.isHostile(burg)) {
            // Clear existing buttons (Standard actions blocked)
            buttons.length = 0;

            // Check if already pillaged
            if (this.pillagedCapitals.has(burg.id)) {
                buttons.push({
                    label: "City Pillaged (Ruins)",
                    action: () => { }, // No action
                    disabled: true,
                    class: "btn-recruit", // Use recruit style but greyed out via inline style
                    style: "background: #555; cursor: default; opacity: 0.7;"
                });
            } else {
                // Add Fight button
                // Strength logic: 10 * soldier_quartiers
                const soldierQ = burg.soldier_quartiers || 0;
                const strength = Math.max(10, 10 * soldierQ); // Min 10 strength

                buttons.push({
                    label: `Pillage City (Strength: ${strength})`,
                    action: () => this.startCityBattle(burg, strength),
                    class: "btn-attack",
                    style: "background: #c0392b; color: white;"
                });
            }
        }
    }

    startCityBattle(burg, strength) {
        AdventureManager.closeBurgPopup();

        // Simple Battle Resolution reused from BattleMission logic
        const playerSoldiers = AdventureManager.party.soldiers;

        // Visual confirmation or direct battle? 
        // Let's use a confirm since it's a major action, but standard battles are often modal.
        // We'll emulate the Battle Mission popup flow but simplify it here or just resolve immediate?
        // Let's resolve immediate for now with a result alert to keep it simple as per plan.

        this.resolveCityBattle(burg, playerSoldiers, strength);
    }

    resolveCityBattle(burg, playerSoldiers, enemySoldiers) {
        // Battle Math: Ratio^2 / (Ratio^2 + 1)
        // Ratio = Player / Enemy
        if (playerSoldiers <= 0) {
            AdventureManager.showFeedback("You have no soldiers to fight with!");
            return;
        }

        const ratio = playerSoldiers / enemySoldiers;
        const winProbability = (ratio * ratio) / ((ratio * ratio) + 1);

        const isWin = Math.random() < winProbability;

        if (isWin) {
            // Victory
            // Losses: Low (5-15%)
            const lossPct = 0.05 + (Math.random() * 0.10);
            const losses = Math.floor(playerSoldiers * lossPct);
            AdventureManager.party.soldiers = Math.max(0, playerSoldiers - losses);

            // Rewards
            const goldReward = Math.floor(enemySoldiers * (0.5 + Math.random())); // Gold based on army size
            const foodReward = Math.floor(enemySoldiers * 0.2);

            AdventureManager.party.gold += goldReward;
            AdventureManager.party.food += foodReward;

            // Mark as pillaged if capital (or just pillaged city in general)
            // Objective only cares about capitals, but we track all to block re-pillaging
            this.pillagedCapitals.add(burg.id);

            AdventureManager.showFeedback(`Victory! Pillaged ${burg.name}. Lost ${losses} soldiers. Gained ${goldReward} gold, ${foodReward} food.`);

            // Update Objectives
            this.updateObjectiveText();
            this.checkVictory();

            // Highlight Pillaged? Maybe not needed, standard highlight is fine.

        } else {
            // Defeat
            // Losses: High (20-40%)
            const lossPct = 0.20 + (Math.random() * 0.20);
            const losses = Math.floor(playerSoldiers * lossPct);
            AdventureManager.party.soldiers = Math.max(0, playerSoldiers - losses);

            AdventureManager.showFeedback(`Defeat! Failed to pillage ${burg.name}. Retreating with ${losses} casualties.`);

            // Check Game Over
            if (AdventureManager.party.soldiers <= 0) {
                AdventureManager.handleGameOver();
            }
        }

        AdventureManager.updateStats();
    }

}

// Register Campaign
CampaignManager.availableCampaigns.push(HordeCampaign);
