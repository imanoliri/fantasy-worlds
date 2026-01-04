class AdventureMission {
    constructor(type, name) {
        this.type = type; // e.g., 'diplomacy', 'battle'
        this.name = name;
        this.data = null;
        this.element = null;
    }

    init() {
        // To be implemented by subclasses
        console.log(`Initializing ${this.name}...`);
    }

    spawn() {
        if (!AdventureManager.active) return;

        // Centralized Event Hook for cancellation
        const eventData = { type: this.type, cancelled: false, mission: this };

        if (AdventureManager.events) {
            AdventureManager.events.emit('beforeMissionSpawn', eventData);
        }

        if (eventData.cancelled) {
            console.log(`Mission ${this.name}: Spawn cancelled by event listener.`);
            return;
        }

        this.onSpawn();
    }

    // Abstract method for actual spawn logic
    onSpawn() {
        console.warn(`${this.name}: onSpawn not implemented.`);
    }

    // Helper to check standard constraints
    getValidSpawnCells(occupiedCells = []) {
        let validCells = [];
        if (AdventureManager.accessibleCells && AdventureManager.accessibleCells.length > 0) {
            validCells = AdventureManager.accessibleCells.map(id => graphData[id]).filter(c => !occupiedCells.includes(c.i));
        } else {
            // Fallback if accessibleCells not calculated yet or empty
            const marineBiomeId = window.marineBiomeId || 0; // Ensure it exists
            validCells = graphData.filter(c => c.b !== marineBiomeId && !occupiedCells.includes(c.i));
        }
        return validCells;
    }

    updateVisuals() {
        // Abstract
    }

    toggle(active) {
        if (!this.element) return;
        this.element.style.display = (active && this.data) ? "block" : "none";
    }
}
