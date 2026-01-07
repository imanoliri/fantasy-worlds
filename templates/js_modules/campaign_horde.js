
class HordeCampaign extends MilitaryCampaign {
    constructor() {
        super("horde_v1", "The Horde", "Lead a horde to pillage the world. Defeat 10 armies and pillage all capitals.");
        this.armiesDefeated = 0;
        this.pillagedBurgs = new Set(); // Set of burg IDs
        this.partyStartConfig = { resources: { soldiers: 40 } };

        // Base Class Overrides
        this.conqueredStatusLabel = "Pillaged";

        // Horde Tuning: Uses RaidBattle
        this.BattleClass = RaidBattle;

        // Objectives
        this.addObjective("obj_horde_armies", "Defeat Armies (0/10)", "battle", () => this.armiesDefeated >= 10);
        this.addObjective("obj_horde_capitals", "Pillage Capitals (0/?)", "domination", () => this.checkCapitalsVictory());

        // Bind methods
        this.onBattleWon = this.onBattleWon.bind(this); // For event listeners
    }


    // --- MilitaryCampaign Hooks ---

    isHostile(burg) {
        if (!burg) return false;

        // Capital Override: Capitals are ALWAYS hostile targets to pillage
        if (burg.is_capital) return true;

        const type = burg.type ? burg.type.toLowerCase() : "";

        // Hostile if NOT "Hunter" (or Hunting) AND NOT "Highland" (or Highlands)
        // Using includes to cover variations
        if (type.includes("hunt")) return false;
        if (type.includes("highland")) return false;

        return true; // Default to hostile for all other types
    }

    isConquered(burg) {
        return this.pillagedBurgs.has(burg.id);
    }

    onBattleWin(burg, rewards) {
        // Mark as pillaged (Capital or not)
        this.pillagedBurgs.add(burg.id);

        // Update Objectives
        this.updateObjectiveText();
        this.checkVictory();
    }

    // --- Specific Logic ---

    onStart() {
        super.onStart();
        console.log("Horde Campaign Started");
        this.updateObjectiveText();
        this.refreshVisuals();

        // Listen for battle wins from standard battles
        if (AdventureManager.events) {
            AdventureManager.events.on('battleWon', this.onBattleWonEventListener.bind(this));
        }
    }

    onEnd() {
        super.onEnd();
        if (AdventureManager.events) {
            AdventureManager.events.off('battleWon', this.onBattleWonEventListener.bind(this));
        }
    }

    // Wrapper to distinguish between City Battles (base class calls onBattleWin) and generic army battles
    onBattleWonEventListener() {
        this.armiesDefeated++;
        this.updateObjectiveText();
        this.checkVictory();
    }

    refreshVisuals() {
        this.clearHighlights(); // Clear all existing rings/markers

        // 1. Mark ANY pillaged burg with Red X
        this.pillagedBurgs.forEach(burgId => {
            this.drawTextMarker(burgsData.find(b => b.id === burgId)?.cell_id || 0, "❌");
        });

        // 2. Highlight UNPILLAGED Capitals with Orange Ring
        const capitals = burgsData.filter(b => b.is_capital);
        capitals.forEach(burg => {
            if (!this.pillagedBurgs.has(burg.id)) {
                // Target: Show Orange Ring
                this.highlightCell(burg.cell_id, "#e67e22");
            }
        });
    }

    onBeforeMissionSpawn(data) {
        if (data.type === 'treasure') {
            data.cancelled = true;
            console.log("HordeCampaign blocked treasure mission.");
        }
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
        const total = capitals.length;
        // Count how many capitals are in the pillaged set
        let pillaged = 0;
        capitals.forEach(c => {
            if (this.pillagedBurgs.has(c.id)) pillaged++;
        });
        return { total, pillaged };
    }

    checkCapitalsVictory() {
        const stats = this.getCapitalStats();
        return stats.total > 0 && stats.pillaged >= stats.total;
    }

    onCalculateMissionRewards(context) {
        if (context.type === 'hunt') {
            // Horde gains soldiers from hunting
            if (context.rewards) {
                context.rewards.soldiers = context.rewards.gold;
            }
        }
    }

}

// Register Campaign
CampaignManager.availableCampaigns.push(HordeCampaign);
