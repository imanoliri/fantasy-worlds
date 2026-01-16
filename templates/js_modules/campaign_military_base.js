class MilitaryCampaign extends BaseCampaign {
    constructor(id, name, description) {
        super(id, name, description);
        // Configuration
        this.battleMarker = "⚔️";
        this.conqueredStatusLabel = "Conquered";
        this.BattleClass = Battle; // Default Strategy
        this.showEnemyMarkers = true;     // Default on
        this.showConqueredMarkers = true; // Default on
        this.showFriendlyMarkers = false; // Default off

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

    // Configurable Labels (Override in Child)
    getAttackButtonLabel(burg) {
        return this.attackButtonLabel || "Attack City"; // Default
    }

    getConqueredButtonLabel(burg) {
        return `City ${this.conqueredStatusLabel} (Yours)`; // Default
    }

    onBurgPopupOpened(context) {
        const { burg, buttons } = context;

        // 1. Check if already conquered
        if (this.isConquered(burg)) {
            // Preserve utility buttons (Ship/Leave)
            const preserved = buttons.filter(b => this.shouldPreserveButton(b.id));
            buttons.length = 0;
            if (preserved.length) buttons.push(...preserved);

            buttons.unshift({
                label: this.getConqueredButtonLabel(burg),
                action: () => { },
                disabled: true,
                style: "background: #27ae60; cursor: default; opacity: 1.0; color: white;",
                class: "btn-recruit"
            });
            return;
        }

        // 2. Logic for Hostile Cities
        if (this.isHostile(burg)) {
            // Preserve utility buttons (Ship/Leave)
            const preserved = buttons.filter(b => this.shouldPreserveButton(b.id));

            // Clear peaceful options
            buttons.length = 0;
            if (preserved.length) buttons.push(...preserved);

            // Calculate Strength
            const soldierQ = burg.soldier_quartiers || 0;
            // Allow child class to tune strength calculation if needed, or use default logic
            const strength = this.calculateGarrisonStrength(burg);

            buttons.push({
                label: `${this.getAttackButtonLabel(burg)} (Strength: ${strength})`,
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

    shouldPreserveButton(btnId) {
        // List of IDs to keep even when hostile
        const keep = ['leave_ship', 'rent_ship', 'fight_siege'];
        return keep.includes(btnId);
    }

    calculateGarrisonStrength(burg) {
        const soldierQ = burg.soldier_quartiers || 0;
        return Math.max(10, (15 * soldierQ));
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

    // --- Visual Helpers ---

    refreshVisuals() {
        this.clearHighlights();

        if (!window.burgsData) return;

        burgsData.forEach(burg => {
            if (this.showConqueredMarkers && this.isConquered(burg)) {
                this.drawTextMarker(burg.cell_id, "🚩");
            } else if (this.showEnemyMarkers && this.isHostile(burg)) {
                this.drawTextMarker(burg.cell_id, "⚔️");
            } else if (this.showFriendlyMarkers) {
                // Friendly / Neutral
                this.drawTextMarker(burg.cell_id, "🛡️");
            }
        });
    }

    drawTextMarker(cellId, text) {
        if (!graphData[cellId]) return;
        let x, y;
        const burg = burgsData.find(b => b.cell_id === cellId);
        if (burg) { x = burg.x; y = burg.y; }
        else { x = graphData[cellId].p[0]; y = graphData[cellId].p[1]; }

        let container = document.getElementById('campaignHighlights');
        if (!container) {
            container = document.createElementNS("http://www.w3.org/2000/svg", "g");
            container.setAttribute("id", "campaignHighlights");
            const svg = document.getElementById('mapSvg');
            if (svg) svg.appendChild(container);
            else return; // If mapSvg missing, we really can't draw
        }

        const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textEl.setAttribute("x", x);
        textEl.setAttribute("y", y + 5);
        textEl.setAttribute("text-anchor", "middle");
        textEl.setAttribute("font-size", "14px"); // Slightly smaller for global clutter reduction
        textEl.setAttribute("style", "pointer-events: none; user-select: none; text-shadow: 1px 1px 2px black;");
        textEl.textContent = text;
        container.appendChild(textEl);
    }

    // --- UI Integration ---

    // --- UI Integration ---

    renderFloatingControls() {
        // Ensure only one exists
        this.removeFloatingControls();

        const container = document.getElementById('mapContainer');
        if (!container) return;

        const controls = document.createElement('div');
        controls.id = 'militaryCampaignControls';
        controls.className = 'campaign-floating-controls';

        // Inline styles for simplicity/portability
        controls.style.position = 'absolute';
        controls.style.top = '60px'; // Below the top header/stats
        controls.style.right = '10px';
        controls.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        controls.style.padding = '10px';
        controls.style.borderRadius = '8px';
        controls.style.color = '#fff';
        controls.style.fontSize = '12px';
        controls.style.zIndex = '1000';
        controls.style.display = 'flex';
        controls.style.flexDirection = 'column';
        controls.style.gap = '5px';
        controls.style.backdropFilter = 'blur(2px)';
        controls.style.border = '1px solid rgba(255,255,255,0.2)';

        controls.innerHTML = `
            <label style="cursor: pointer; display: flex; align-items: center; gap: 5px;">
                <input type="checkbox" onchange="CampaignManager.currentCampaignInstance.toggleSetting('showEnemyMarkers', this.checked)" ${this.showEnemyMarkers ? 'checked' : ''}>
                <span>Enemies (⚔️)</span>
            </label>
            <label style="cursor: pointer; display: flex; align-items: center; gap: 5px;">
                <input type="checkbox" onchange="CampaignManager.currentCampaignInstance.toggleSetting('showConqueredMarkers', this.checked)" ${this.showConqueredMarkers ? 'checked' : ''}>
                <span>Conquered (🚩)</span>
            </label>
            <label style="cursor: pointer; display: flex; align-items: center; gap: 5px;">
                <input type="checkbox" onchange="CampaignManager.currentCampaignInstance.toggleSetting('showFriendlyMarkers', this.checked)" ${this.showFriendlyMarkers ? 'checked' : ''}>
                <span>Friendly (🛡️)</span>
            </label>
        `;

        container.appendChild(controls);
    }

    removeFloatingControls() {
        const controls = document.getElementById('militaryCampaignControls');
        if (controls) controls.remove();
    }

    onAdventureStart() {
        super.onAdventureStart();
        // Render Floating UI
        this.renderFloatingControls();
    }

    onEnd() {
        super.onEnd();
        this.removeFloatingControls();
    }

    toggleSetting(setting, value) {
        if (this[setting] !== undefined) {
            this[setting] = value;
            this.refreshVisuals();
            console.log(`Updated ${setting} to ${value}`);
        }
    }
}
