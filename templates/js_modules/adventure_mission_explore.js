class ExploreMission extends AdventureMission {
    constructor() {
        super('explore', 'Explore');
        this.locations = [];
        this.elements = [];
    }

    init() {
        if (this.elements.length > 0) return;

        // Create Explorer Elements (4 locations)
        const locationsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.elements = [];

        for (let i = 0; i < 4; i++) {
            const locGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            locGroup.style.display = 'none';
            locGroup.style.cursor = 'pointer';

            locGroup.onclick = (e) => {
                e.stopPropagation();
                AdventureManager.handleMissionClick(this, i); // Pass index
            };

            const locCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            locCircle.setAttribute("r", "12");
            locCircle.setAttribute("fill", "#9b59b6"); // Wisteria Purple
            locCircle.setAttribute("stroke", "#ecf0f1");
            locCircle.setAttribute("stroke-width", "2");

            const locText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            locText.textContent = "🔍";
            locText.setAttribute("text-anchor", "middle");
            locText.setAttribute("dy", "5");
            locText.setAttribute("font-size", "16px");

            locGroup.appendChild(locCircle);
            locGroup.appendChild(locText);
            locationsGroup.appendChild(locGroup);
            this.elements.push(locGroup);
        }

        const svg = document.getElementById('mapSvg');
        if (svg) svg.appendChild(locationsGroup);
    }

    onSpawn() {
        this.locations = [null, null, null, null];
        for (let i = 0; i < 4; i++) {
            this.spawnLocation(i);
        }
        this.updateVisuals();
    }

    spawnLocation(index) {
        // Collect occupied cells to avoid spawning on top
        const occupiedObj = {};
        occupiedObj[AdventureManager.party.cell] = true;
        if (window.MissionTreasure && MissionTreasure.data) occupiedObj[MissionTreasure.data.cell] = true;
        if (window.MissionBattle && MissionBattle.data) occupiedObj[MissionBattle.data.cell] = true;
        if (window.MissionHunt && MissionHunt.data) occupiedObj[MissionHunt.data.cell] = true;
        if (window.MissionSiege && MissionSiege.data) occupiedObj[MissionSiege.data.armyCell] = true;
        this.locations.forEach(l => { if (l) occupiedObj[l.cell] = true; });

        let validCells = [];
        // Manual valid cell filtering because explicit exclusion list is complex and multi-object
        if (AdventureManager.accessibleCells && AdventureManager.accessibleCells.length > 0) {
            validCells = AdventureManager.accessibleCells.map(id => graphData[id]).filter(c => !occupiedObj[c.i]);
        } else {
            validCells = graphData.filter(c => c.b !== window.marineBiomeId && !occupiedObj[c.i]);
        }

        if (validCells.length > 0) {
            const randomCell = validCells[Math.floor(Math.random() * validCells.length)];
            this.locations[index] = { cell: randomCell.i, id: index };
        }
    }

    updateVisuals() {
        if (this.elements.length === 0) return;

        if (AdventureManager.active) {
            for (let i = 0; i < 4; i++) {
                const loc = this.locations[i];
                const el = this.elements[i];
                if (loc && el) {
                    const lData = graphData[loc.cell];
                    if (lData) {
                        el.setAttribute("transform", `translate(${lData.p[0]}, ${lData.p[1]})`);
                        el.style.display = "block";
                    } else {
                        el.style.display = "none";
                    }
                } else if (el) {
                    el.style.display = "none";
                }
            }
        } else {
            this.elements.forEach(el => {
                if (el) el.style.display = 'none';
            });
        }
    }

    toggle(active) {
        if (this.elements.length === 0) return;
        if (!active) {
            this.elements.forEach(el => {
                if (el) el.style.display = 'none';
            });
        } else {
            this.updateVisuals();
        }
    }

    getTargetCell(index) {
        return this.locations[index] ? this.locations[index].cell : null;
    }

    onArrival(index) {
        // Found a location!
        AdventureManager.party.gold += 5;
        AdventureManager.showFeedback("Location Discovered! +5 Gold 🔍");

        // Floating Text
        const cell = graphData[AdventureManager.party.cell];
        if (cell) {
            AdventureManager.showFloatingText(`FOUND!`, cell.p[0], cell.p[1] - 40, "#9b59b6");
            AdventureManager.showFloatingText(`+5 💰`, cell.p[0], cell.p[1] - 20, "#f1c40f");
        }

        AdventureManager.updateStats();
        this.spawnLocation(index); // Respawn immediately
        this.updateVisuals(); // Update to remove old, show new

        AdventureManager.events.emit('missionComplete', { type: 'explore' });
    }
}

window.MissionExplore = new ExploreMission();
