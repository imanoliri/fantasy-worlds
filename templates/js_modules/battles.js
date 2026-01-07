
class Battle {
    constructor(campaign, burgId, enemyStrength) {
        this.campaign = campaign;
        this.burg = burgsData.find(b => b.id === burgId);
        this.burgId = burgId;
        this.enemyStrength = enemyStrength;
        this.playerSoldiers = AdventureManager.party.soldiers;

        // Base Defaults
        this.winCurveK = 2.0;
    }

    // --- Core Flow ---

    resolve() {
        if (this.playerSoldiers <= 0) {
            AdventureManager.showFeedback("You have no soldiers to fight with!");
            return false;
        }

        const winProb = this.calculateWinProbability();
        const isWin = Math.random() < winProb;

        if (isWin) {
            this.onVictory();
            return true;
        } else {
            this.onDefeat();
            return false;
        }
    }

    // --- Calculations (Overridable) ---

    calculateWinProbability() {
        if (this.enemyStrength <= 0) return 1.0;
        const ratio = this.playerSoldiers / this.enemyStrength;
        // Logistic-like curve: R^k / (R^k + 1)
        return Math.pow(ratio, this.winCurveK) / (Math.pow(ratio, this.winCurveK) + 1);
    }

    calculateCasualties(isVictory) {
        // Default Logic: 5-25% on win, 25-50% on lose
        let min = 0;
        let max = 0;
        if (isVictory) {
            min = 0.05;
            max = 0.25;
        } else {
            min = 0.25;
            max = 0.50;
        }
        const lossPct = min + (Math.random() * (max - min));
        return Math.floor(this.playerSoldiers * lossPct);
    }

    calculateRewards() {
        // Default Logic
        const gold = Math.floor(this.enemyStrength * 0.1);
        const soldiers = Math.floor(this.enemyStrength * 0.1);
        let food = 0;
        if (this.burg.net_food > 0) {
            food = Math.floor(this.burg.net_food * 0.4);
        }
        return { gold, soldiers, food };
    }

    // --- Outcomes ---

    onVictory() {
        const rewards = this.calculateRewards();
        const losses = this.calculateCasualties(true);

        // Apply changes
        AdventureManager.party.gold += rewards.gold;
        AdventureManager.party.soldiers += rewards.soldiers;
        AdventureManager.party.food += rewards.food;
        AdventureManager.party.soldiers = Math.max(0, AdventureManager.party.soldiers - losses);

        // Campaign Hook
        this.campaign.onBattleWin(this.burg, rewards);
        this.campaign.refreshVisuals();

        // UI Feedback
        AdventureManager.showFeedback(`Victory! ${this.burg.name} secured!`);
        this.showFloatingStats(true, rewards, losses);

        AdventureManager.updateStats();
    }

    onDefeat() {
        const losses = this.calculateCasualties(false);
        AdventureManager.party.soldiers = Math.max(0, this.playerSoldiers - losses);

        // Campaign Hook
        this.campaign.onBattleLoss(this.burg);

        // UI Feedback
        AdventureManager.showFeedback(`Defeat! ${this.burg.name} held strong.`);
        this.showFloatingStats(false, null, losses);

        AdventureManager.updateStats();
    }

    showFloatingStats(isWin, rewards, losses) {
        const cell = graphData[AdventureManager.party.cell];
        if (!cell) return;
        const cx = cell.p[0];
        const cy = cell.p[1];

        if (isWin) {
            AdventureManager.showFloatingText(`VICTORY!`, cx, cy - 80, "#2ecc71");
            AdventureManager.showFloatingText(`+${rewards.gold} 💰`, cx, cy - 60, "#f1c40f");
            if (rewards.food > 0) AdventureManager.showFloatingText(`+${rewards.food} 🍎`, cx, cy - 40, "#e67e22");
            if (rewards.soldiers > 0) AdventureManager.showFloatingText(`+${rewards.soldiers} ⚔️`, cx, cy - 20, "#9b59b6");
            AdventureManager.showFloatingText(`-${losses} 🩸`, cx, cy, "#e74c3c");
        } else {
            AdventureManager.showFloatingText(`DEFEAT!`, cx, cy - 40, "#e74c3c");
            AdventureManager.showFloatingText(`-${losses} 🩸`, cx, cy - 20, "#e74c3c");
        }
    }
}

class SiegeBattle extends Battle {
    constructor(campaign, burgId, enemyStrength) {
        super(campaign, burgId, enemyStrength);
        this.winCurveK = 1.8; // Chaos of War
    }

    calculateCasualties(isVictory) {
        // Sieges are bloody. 
        // Win: 15-25% (Standardized)
        // Lose: 25-50% (Rout)
        let min = 0;
        let max = 0;
        if (isVictoryVictory) {
            min = 0.15;
            max = 0.25;
        } else {
            min = 0.25;
            max = 0.50;
        }
        const lossPct = min + (Math.random() * (max - min));
        return Math.floor(this.playerSoldiers * lossPct);
    }
}

class RaidBattle extends Battle {
    constructor(campaign, burgId, enemyStrength) {
        super(campaign, burgId, enemyStrength);
        this.winCurveK = 2.2; // Steamroll mechanics
    }

    calculateCasualties(isVictory) {
        if (isVictory) {
            // Snowball: If we massively outnumber them, casualties are negligible
            const ratio = this.playerSoldiers / this.enemyStrength;
            if (ratio > 3) return Math.floor(this.playerSoldiers * 0.02); // 2% losses
            if (ratio > 2) return Math.floor(this.playerSoldiers * 0.05); // 5% losses

            // Standard risk
            return Math.floor(this.playerSoldiers * 0.15);
        } else {
            // Failed raid is disastrous
            return Math.floor(this.playerSoldiers * 0.30);
        }
    }

    calculateRewards() {
        // Pillage: High Yields
        const gold = Math.floor(this.enemyStrength / 4); // More gold
        const soldiers = Math.floor(this.enemyStrength / 4); // Forced conscription
        let food = 0;
        if (this.burg && this.burg.net_food > 0) {
            food = Math.floor(this.burg.net_food * 0.5); // Take half the stores
        }
        return { gold, soldiers, food };
    }

    onVictory() {
        super.onVictory();
    }
}
