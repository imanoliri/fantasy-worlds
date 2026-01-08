class MilitaryCampaign extends BaseCampaign {
    constructor(id, name, description) {
        super(id, name, description);
        // Configuration
        this.battleMarker = "⚔️";
        this.conqueredStatusLabel = "Conquered";
        this.BattleClass = Battle; // Default Strategy

        // Bind Handlers
        this.handleBattleWin = this.handleBattleWin.bind(this);
        this.handleBattleLoss = this.handleBattleLoss.bind(this);
    }

    onStart() {
        super.onStart();
        // Register Event Listeners
        if (AdventureManager.events) {
            AdventureManager.events.on('battleWon', this.handleBattleWin);
            AdventureManager.events.on('battleLost', this.handleBattleLoss);
        }
    }

    onEnd() {
        super.onEnd();
        // Cleanup Listeners
        if (AdventureManager.events) {
            AdventureManager.events.off('battleWon', this.handleBattleWin);
            AdventureManager.events.off('battleLost', this.handleBattleLoss);
        }
    }

    // --- Helper Methods ---

    getWinProbability(playerSoldiers, enemySoldiers) {
        if (enemySoldiers <= 0) return 1.0;
        const ratio = playerSoldiers / enemySoldiers;
        const k = 2; // Sharpness of win probability curve (higher = skills matter more) - moved from config
        // Logistic-like curve: R^k / (R^k + 1)
        return Math.pow(ratio, k) / (Math.pow(ratio, k) + 1);
    }

    // --- Abstract / Overridable Methods ---

    // Factory Method for Battle Instance using configured Class
    createBattle(burgId, enemyStrength) {
        return new this.BattleClass(this, burgId, enemyStrength);
    }


    // --- Abstract / Overridable Methods ---

    isHostile(burg) {
        return false; // Override in child
    }

    isConquered(burg) {
        return false; // Override in child
    }

    onBattleWin(burg, rewards) {
        // Override in child to update state (add to Set) and objectives
    }

    onBattleLoss(burg) {
        // Override in child if needed
    }

    // --- Event Handlers ---

    handleBattleWin(data) {
        if (data.campaignId !== this.id) return;
        this.onBattleWin(data.burg, data.rewards);
        this.refreshVisuals();
    }

    handleBattleLoss(data) {
        if (data.campaignId !== this.id) return;
        this.onBattleLoss(data.burg);
        this.refreshVisuals();
    }

    // --- Shared Interaction Logic ---

    onBeforeBurgPopup(data) {
        if (this.isHostile(data.burg)) {
            data.preventReplenish = true;
        }
    }

    onBurgPopupOpened(context) {
        const { burg, buttons } = context;

        // 1. Check if already conquered
        if (this.isConquered(burg)) {
            buttons.unshift({
                label: `City ${this.conqueredStatusLabel} (Yours)`,
                action: () => { },
                disabled: true,
                style: "background: #27ae60; cursor: default; opacity: 1.0; color: white;",
                class: "btn-recruit"
            });
            return;
        }

        // 2. Logic for Hostile Cities
        if (this.isHostile(burg)) {
            // Clear peaceful options
            buttons.length = 0;

            // Calculate Strength
            const soldierQ = burg.soldier_quartiers || 0;
            const strength = Math.max(10, 20 + (15 * soldierQ));

            buttons.push({
                label: `Attack City (Strength: ${strength})`,
                onClick: `CampaignManager.currentCampaignInstance.showBattlePopup(${burg.id}, ${strength})`,
                class: "btn-attack",
                style: "background: #c0392b; color: white;"
            });
            return;
        }

        // 3. Logic for Non-Hostile (Neutral) - allow attack if not identical to home?
        // For now, base class defaults to ONLY hostile check. 
        // Child classes can call super() and then add more buttons if they want.
    }

    // --- Shared Battle UI ---

    showBattlePopup(burgId, enemyStrength) {
        if (!AdventureManager.popupElement) AdventureManager.openPopup('');

        let overlay = document.getElementById('modalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalOverlay';
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';

        // Create a temporary battle instance just to calculate probability
        const battle = this.createBattle(burgId, enemyStrength);
        const mySoldiers = battle.playerSoldiers;

        const winProb = battle.calculateWinProbability();
        const winPercent = (winProb * 100).toFixed(1);

        const content = `
             <h2>⚔️ Battle Imminent ⚔️</h2>
             <div class="content-wrapper" style="display: flex; gap: 20px; align-items: center; justify-content: center;">
                 <div style="text-align: center;">
                    <h3>Your Army</h3>
                    <div style="font-size: 24px; color: #2ecc71; font-weight: bold;">${mySoldiers} 🛡️</div>
                 </div>
                 <div style="font-size: 20px; font-weight: bold;">VS</div>
                 <div style="text-align: center;">
                    <h3>Garrison</h3>
                    <div style="font-size: 24px; color: #e74c3c; font-weight: bold;">${enemyStrength} ⚔️</div>
                 </div>
             </div>
             
             <div style="text-align: center; margin: 15px 0;">
                <div>Win Probability: <strong>${winPercent}%</strong></div>
             </div>
             
             <div class="actions">
                 <button class="btn-recruit" style="background-color: #c0392b;" onclick="CampaignManager.currentCampaignInstance.resolveCityBattle(${burgId}, ${enemyStrength})">ATTACK!</button>
                 <button class="btn-leave" onclick="AdventureManager.closePopup()">Retreat</button>
             </div>
        `;
        AdventureManager.openPopup(content);
    }

    // --- Shared Battle Resolution ---

    resolveCityBattle(burgId, enemySoldiers) {
        AdventureManager.closePopup();

        // Use factory to get correct Strategy
        const battle = this.createBattle(burgId, enemySoldiers);
        battle.resolve();
    }

    // --- visual Helpers ---

    drawTextMarker(cellId, text) {
        if (!graphData[cellId]) return;
        let x, y;
        const burg = burgsData.find(b => b.cell_id === cellId);
        if (burg) { x = burg.x; y = burg.y; }
        else { x = graphData[cellId].p[0]; y = graphData[cellId].p[1]; }

        let container = document.getElementById('campaignHighlights');
        if (!container) return;

        const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textEl.setAttribute("x", x);
        textEl.setAttribute("y", y + 5);
        textEl.setAttribute("text-anchor", "middle");
        textEl.setAttribute("font-size", "20px");
        textEl.setAttribute("style", "pointer-events: none; user-select: none; text-shadow: 1px 1px 2px black;");
        textEl.textContent = text;
        container.appendChild(textEl);
    }
}
