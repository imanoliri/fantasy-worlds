class GameState {
    constructor() {
        this.events = null; // Will bind to AdventureManager.events or own system
    }

    init() {
        console.log("GameState Initialized");
    }

    // --- Data Accessors ---

    getBurg(id) {
        if (!window.burgsData) return null;
        return window.burgsData.find(b => b.id === id);
    }

    getState(id) {
        if (!window.statesData) return null;
        return window.statesData.find(s => s.id === id);
    }

    // --- Diplomacy Helpers ---

    getDiplomacyMatrix() {
        return window.diplomacyMatrix || null;
    }

    getRelation(stateIdA, stateIdB) {
        const matrix = this.getDiplomacyMatrix();
        if (!matrix || !matrix[stateIdA]) return "Unknown";

        // Handle array vs object matrix structure (just in case)
        const rel = matrix[stateIdA][stateIdB];
        return rel || "Unknown";
    }

    isEnemy(stateIdA, stateIdB) {
        const rel = this.getRelation(stateIdA, stateIdB);
        return rel === "Enemy" || rel === "War" || rel === "Rival";
        // Added Rival as potentially hostile? 
        // campaign_diplomat used: rel === "Enemy" || rel === "War"
        // Let's stick to strict Enemy/War for now to match logic.
    }

    isStrictEnemy(stateIdA, stateIdB) {
        const rel = this.getRelation(stateIdA, stateIdB);
        // Include Rival as it is colored Red on map
        return rel === "Enemy" || rel === "War" || rel === "Rival";
    }

    // --- Navigation / Restrictions ---

    canVisitFrom(fromBurgId, toBurgId) {
        if (!fromBurgId || !toBurgId) return { allowed: true };

        const fromBurg = this.getBurg(fromBurgId);
        const toBurg = this.getBurg(toBurgId);

        if (!fromBurg || !toBurg) return { allowed: true };

        // Diplomatic check
        if (this.isStrictEnemy(fromBurg.state, toBurg.state)) {
            return {
                allowed: false,
                reason: "Political Enemy",
                details: `Cannot travel from ${fromBurg.name} (${pack.states[fromBurg.state].name}) to ${toBurg.name} due to hostile relations.`
            };
        }

        return { allowed: true };
    }
}

// Global Instance
window.GameState = new GameState();
window.GameState.init();
