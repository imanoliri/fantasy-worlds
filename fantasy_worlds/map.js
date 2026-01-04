const svg = document.getElementById('mapSvg');
const tooltip = document.getElementById('tooltip');
const mapContainer = document.getElementById('mapContainer');
const table = document.getElementById('burgTable');
let selectedId = null;
let highlightedIds = [];

// These variables will be defined by data injection in the HTML itself
// let diplomacyMatrix = [];
// let stateNameIdMap = [];


/* Dropdown Logic */
function toggleDropdown(id) {
    document.getElementById(id).classList.toggle("show");
}


function toggleLayer(layerClass) {
    const body = document.body;
    if (body.classList.contains(layerClass)) {
        body.classList.remove(layerClass);
    } else {
        body.classList.add(layerClass);
    }
}

function toggleTable() {
    const btn = document.getElementById('toggleTable');
    const container = document.getElementById('burgTableContainer');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
    window.dispatchEvent(new Event('resize'));
}

function toggleStateTable() {
    const btn = document.getElementById('toggleStateTable');
    const container = document.getElementById('stateTableContainer');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
    window.dispatchEvent(new Event('resize'));
}

function toggleFoodTradeTable() {
    const btn = document.getElementById('toggleFoodTradeTable');
    const container = document.getElementById('foodTradeTableContainer');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
    window.dispatchEvent(new Event('resize'));
}

function toggleGoldTradeTable() {
    const btn = document.getElementById('toggleGoldTradeTable');
    const container = document.getElementById('goldTradeTableContainer');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
    window.dispatchEvent(new Event('resize'));
}

function toggleMap() {
    const btn = document.getElementById('toggleMap');
    const mapGroup = document.getElementById('mapBackground');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        mapGroup.style.display = 'block';
    } else {
        mapGroup.style.display = 'none';
    }
}

function toggleHeaderControls() {
    const controls = document.querySelector('.controls');
    const btn = document.getElementById('headerToggleBtn');
    controls.classList.toggle('hidden');

    if (controls.classList.contains('hidden')) {
        btn.innerHTML = '▲';
    } else {
        btn.innerHTML = '▼';
    }
}

function toggleAdventureMode() {
    if (window.AdventureManager) {
        AdventureManager.toggle();
    }
}

function selectGameMode(mode) {
    const btn = document.getElementById('gameModeBtn');
    const dropdown = document.getElementById('gameModeDropdown');

    if (mode === 'adventure') {
        btn.innerHTML = "Adventure ▼";

        // If coming from Campaign Mode, we must RESET to ensure fresh Adventure
        if (window.CampaignManager && window.CampaignManager.active) {
            CampaignManager.cancelCampaign();
            // cancelCampaign calls reset(), so AdventureManager.active becomes false
        }

        // Cleanup Campaign UI if present (Do this AFTER cancelCampaign, which might reset UI)
        document.getElementById('campaignSelectContainer').classList.add('hidden');
        document.querySelector('.sidebar-controls').classList.remove('hidden');

        // Only toggle if not already active (or forced fresh start implies we must start it)
        if (!window.AdventureManager || !window.AdventureManager.active) {
            toggleAdventureMode();
        }
    } else if (mode === 'campaign') {
        btn.innerHTML = "Campaign ▼";

        // Use cancelCampaign to cleanly stop any existing campaign or adventure state if needed?
        // Actually, if we are in Adventure mode, we might want to just pause or stop it?
        // If AdventureManager is active (Free Roam), we should probably stop it (toggle off) 
        // before starting Campaign setup.

        if (window.AdventureManager && window.AdventureManager.active) {
            toggleAdventureMode();
            // We don't reset here, because Campaign Manager init will handle its own start config
        }
        console.log("Campaign Mode selected");

        // 1. Show Sidebar
        const sidebar = document.getElementById('adventureSidebar');
        if (sidebar) sidebar.classList.remove('hidden');

        // 2. Initialize Campaign Manager
        if (window.CampaignManager) {
            CampaignManager.init();
            // Hide standard controls
            document.querySelector('.sidebar-controls').classList.add('hidden');
            document.getElementById('campaignSelectContainer').classList.remove('hidden');
        }

        document.getElementById('gameModeBtn').classList.add('active');
    } else {
        btn.innerHTML = "Free Mode ▼";

        // Cleanup Campaign UI
        document.getElementById('campaignSelectContainer').classList.add('hidden');
        document.querySelector('.sidebar-controls').classList.remove('hidden');

        // Explicitly hide sidebar (fixes bug where it stays open if Adventure wasn't active)
        const sidebar = document.getElementById('adventureSidebar');
        if (sidebar) sidebar.classList.add('hidden');

        // Stop Campaign if active
        if (window.CampaignManager && window.CampaignManager.active) {
            CampaignManager.cancelCampaign();
        }

        // Stop Adventure if active
        if (window.AdventureManager && window.AdventureManager.active) {
            toggleAdventureMode();
        }
    }

    // Close dropdown
    if (dropdown) dropdown.classList.remove('show');
}


const relationColors = {
    "Ally": "#32CD32",      // Lime Green
    "Friendly": "#90EE90",  // Light Green
    "Neutral": "#D3D3D3",   // Light Grey
    "Suspicion": "#FFA500", // Orange
    "Enemy": "#FF4500",     // Orange Red
    "War": "#FF0000",       // Red
    "Vassal": "#87CEEB",    // Sky Blue
    "Suzerain": "#C8A2C8",  // Lilac
    "Unknown": "#F5F5F5",   // White Smoke
    "x": "#800080"          // Selected State (Purple)
};

const mapModes = ['biome', 'state', 'heightmap', 'temperature', 'none'];

function cycleMapMode() {
    const btn = document.getElementById('mapModeBtn');
    // Default to 'biome' if no attribute set
    const currentMode = btn.getAttribute('data-current-mode') || 'biome';

    const currentIndex = mapModes.indexOf(currentMode);
    const nextIndex = (currentIndex + 1) % mapModes.length;
    const nextMode = mapModes[nextIndex];

    setMapMode(nextMode);
}

function setMapMode(mode) {
    const mapGroup = document.getElementById('mapBackground');
    const paths = document.querySelectorAll('#mapBackground path');
    const mapBtn = document.getElementById('mapModeBtn');

    // Update button state tracking
    if (mapBtn) {
        mapBtn.setAttribute('data-current-mode', mode);
    }

    if (mode === 'none') {
        mapGroup.style.display = 'none';
        if (mapBtn) mapBtn.innerText = 'Map: None';
        return;
    }

    // Ensure map is visible for other modes
    mapGroup.style.display = 'block';

    if (mode === 'state') {
        if (mapBtn) mapBtn.innerText = 'Map: Political';
        paths.forEach(p => {
            p.setAttribute('fill', p.getAttribute('data-state-color'));
        });
    } else if (mode === 'heightmap') {
        if (mapBtn) mapBtn.innerText = 'Map: Heightmap';
        paths.forEach(p => {
            let h = parseInt(p.getAttribute('data-height'));
            let c = 255 - h * 2;
            if (c < 0) c = 0;
            if (p.getAttribute('data-is-water') === 'true') {
                p.setAttribute('fill', `rgb(${c / 2}, ${c / 2}, ${200 + h / 2})`);
            } else {
                p.setAttribute('fill', `rgb(${c}, ${c}, ${c})`);
            }
        });
    } else if (mode === 'temperature') {
        if (mapBtn) mapBtn.innerText = 'Map: Temperature';
        paths.forEach(p => {
            const t = parseInt(p.getAttribute('data-temp'));
            p.setAttribute('fill', getColorForTemp(t));
        });
    } else {
        // Biome (Default)
        if (mapBtn) mapBtn.innerText = 'Map: Biome';
        paths.forEach(p => {
            p.setAttribute('fill', p.getAttribute('data-biome-color'));
        });
    }
}

function getColorForHeight(h) {
    // Azgaar height range: 0-100 (usually)
    // Water: < 20
    // Land: >= 20

    if (h < 20) {
        // Water: Uniform Deep Blue
        return "#000080";
    } else {
        // Land gradient: Green -> Yellow -> Brown -> White
        if (h < 40) return "#228B22"; // Forest Green (Lowlands)
        if (h < 60) return "#9ACD32"; // Yellow Green (Hills)
        if (h < 80) return "#CD853F"; // Peru (Mountains)
        return "#FFFFFF"; // White (Peaks)
    }
}

function getColorForTemp(t) {
    // Range: approx -30 to 50 (Celsius)
    // Hot (> 30): Red
    // Warm (20-30): Orange
    // Temperate (10-20): Yellow/Green
    // Cool (0-10): Cyan
    // Cold (-10 to 0): Blue
    // Freezing (< -10): Purple

    if (t < -10) return "#4B0082"; // Indigo (Deep Freeze)
    if (t < -5) return "#800080"; // Purple (Freezing)
    if (t < 0) return "#0000FF"; // Blue (Cold)
    if (t < 5) return "#00BFFF"; // Deep Sky Blue (Cool)
    if (t < 10) return "#ADFF2F"; // Green Yellow (Temperate)
    if (t < 15) return "#FFD700"; // Gold (Warm)
    if (t < 20) return "#FF8C00"; // Dark Orange (Hot)
    return "#FF0000"; // Red (Scorching)
}

function updateDiplomacyColors(stateIdentifier) {
    let stateId = null;

    // Try to find state ID
    if (typeof stateIdentifier === 'number') {
        stateId = stateIdentifier;
    } else if (typeof stateIdentifier === 'string') {
        if (stateNameIdMap.hasOwnProperty(stateIdentifier)) {
            stateId = stateNameIdMap[stateIdentifier];
        }
    }

    // FIX: Treat selecting "Neutral" (0) as deselecting
    if (stateId === 0) stateId = null;

    const paths = document.querySelectorAll('#mapBackground path');

    if (stateId !== null && diplomacyMatrix[stateId]) {
        const relations = diplomacyMatrix[stateId];

        paths.forEach(p => {
            const isWater = p.hasAttribute('data-is-water');
            if (isWater) {
                p.setAttribute('fill', '#333333'); // Dark Gray for water
            } else {
                const pStateId = parseInt(p.getAttribute('data-state-id'));

                // FIX: Explicitly handle Neutrals (ID 0)
                if (pStateId === 0 && stateId !== 0) {
                    p.setAttribute('fill', '#ffffff'); // White for Neutrals
                } else if (!isNaN(pStateId) && pStateId < relations.length) {
                    const relation = relations[pStateId];
                    // Highlight self differently?
                    let color = relationColors[relation] || relationColors['Unknown'];
                    if (pStateId === stateId) color = relationColors['x'];

                    p.setAttribute('fill', color);
                }
            }
        });
    } else {
        // Reset to State Colors if no state selected
        paths.forEach(p => {
            const isWater = p.hasAttribute('data-is-water');
            if (isWater) {
                p.setAttribute('fill', '#333333'); // Dark Gray
            } else {
                // Revert to state color
                p.setAttribute('fill', p.getAttribute('data-state-color'));
            }
        });
    }
}


function toggleAllStates(source) {
    const checkboxes = document.querySelectorAll('#stateCheckboxes input[type="checkbox"]');
    for (var i = 0, n = checkboxes.length; i < n; i++) {
        checkboxes[i].checked = source.checked;
    }
    filterTable();
}


// COPY-PASTED HELPER FUNCTIONS TO ENSURE FUNCTIONALITY
function filterTable() {
    const searchInput = document.getElementById('searchInput');
    const filterText = searchInput.value.toLowerCase();

    // Get selected types
    const typeCheckboxes = document.querySelectorAll('#typeCheckboxes input[type="checkbox"]');
    const selectedTypes = [];

    typeCheckboxes.forEach(cb => {
        if (cb.value !== 'all' && cb.checked) {
            selectedTypes.push(cb.value);
        }
    });

    // Get selected states
    const stateCheckboxes = document.querySelectorAll('#stateCheckboxes input[type="checkbox"]');
    const selectedStates = [];

    stateCheckboxes.forEach(cb => {
        if (cb.value !== 'all' && cb.checked) {
            selectedStates.push(cb.value);
        }
    });

    const rows = table.getElementsByTagName('tr');

    // Filter Table
    // Start from 1 to skip header
    const visibleBurgIds = new Set(); // Track visible burgs for trade route filtering
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const nameCell = row.getElementsByTagName('td')[0];
        const typeCell = row.getElementsByTagName('td')[1];
        const stateCell = row.getElementsByTagName('td')[2];
        const burgId = row.getAttribute('data-id');

        if (nameCell && typeCell && stateCell) {
            const nameText = nameCell.textContent || nameCell.innerText;
            const typeText = typeCell.textContent || typeCell.innerText;
            const stateText = stateCell.textContent || stateCell.innerText;
            const isCapitalRow = row.classList.contains('capital-row');


            const matchesName = nameText.toLowerCase().indexOf(filterText) > -1;

            // Check if type matches ANY of the selected types
            let matchesType = false;
            if (selectedTypes.includes(typeText)) {
                matchesType = true;
            }
            if (selectedTypes.includes('Capital') && isCapitalRow) {
                matchesType = true;
            }

            // Check if state matches ANY of the selected states
            let matchesState = false;
            if (selectedStates.includes(stateText)) {
                matchesState = true;
            }

            const isVisible = matchesName && matchesType && matchesState;


            // --- UPDATED VISIBILITY LOGIC ---
            // 1. Toggle Row Visibility
            row.style.display = isVisible ? "" : "none";

            // 2. Track Visible Burgs for Trade Routes
            if (isVisible) {
                visibleBurgIds.add(burgId);
            }

            // 3. Toggle Dependent Elements (Dot, Rings)
            const elementsToToggle = [
                `.burg-dot[data-id="${burgId}"]`,
                `.burg-ring-selection[data-id="${burgId}"]`,
                `.burg-ring-gold[data-id="${burgId}"]`,
                `.burg-info-badge[data-id="${burgId}"]`,
                // Add other rings if needed, e.g. .burg-ring-food if class exists
            ];

            elementsToToggle.forEach(selector => {
                const el = document.querySelector(selector);
                if (el) {
                    if (isVisible) el.classList.remove('hidden');
                    else el.classList.add('hidden');
                }
            });
        }
    }

    // 4. Toggle Trade Routes (After collecting all visible burgs)
    const tradeRoutes = document.querySelectorAll('.trade-route');
    tradeRoutes.forEach(route => {
        const startId = route.getAttribute('data-start');
        const endId = route.getAttribute('data-end');

        // Visible only if BOTH endpoints are visible
        if (visibleBurgIds.has(startId) && visibleBurgIds.has(endId)) {
            route.classList.remove('hidden');
        } else {
            route.classList.add('hidden');
        }
    });

    // Filter State Table
    const stateTable = document.getElementById('stateTable');
    if (stateTable) {
        const stateRows = stateTable.getElementsByTagName('tr');
        // Start from 1 to skip header
        for (let i = 1; i < stateRows.length; i++) {
            const row = stateRows[i];
            const nameCell = row.getElementsByTagName('td')[1]; // Name is 2nd column

            if (nameCell) {
                const stateName = nameCell.textContent || nameCell.innerText;

                // Check if state matches ANY of the selected states
                let matchesState = false;
                if (selectedStates.includes(stateName)) {
                    matchesState = true;
                }

                // Check search text against state name
                const matchesSearch = stateName.toLowerCase().indexOf(filterText) > -1;

                if (matchesState && matchesSearch) {
                    row.style.display = "";
                } else {
                    row.style.display = "none";
                }
            }
        }
    }
}

function toggleAllTypes(source) {
    const checkboxes = document.querySelectorAll('#typeCheckboxes input');
    for (let i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = source.checked;
    }
    filterTable();
}

function sortTable(n, header, tableId) {
    const table = document.getElementById(tableId);
    let dir = "asc"; // Default to ascending if starting fresh
    const tbody = table.querySelector('tbody') || table;

    // Detect current state and cycle: No Arrow/Asc -> Desc -> Original
    if (header.innerHTML.includes('▲')) {
        dir = "desc";
    } else if (header.innerHTML.includes('▼')) {
        dir = "original";
    }

    // Reset other headers
    const headers = table.querySelectorAll('th');
    headers.forEach(h => {
        if (h !== header) {
            h.innerHTML = h.innerHTML.replace(' ▲', '').replace(' ▼', '');
        }
    });

    const rows = Array.from(table.rows).slice(1);

    if (dir === "original") {
        // Reset to original order using data-original-index
        rows.sort((a, b) => {
            const idxA = parseInt(a.getAttribute('data-original-index') || 0);
            const idxB = parseInt(b.getAttribute('data-original-index') || 0);
            return idxA - idxB;
        });

        // Clear arrow
        header.innerHTML = header.innerHTML.replace(' ▲', '').replace(' ▼', '');
    } else {
        // Normal Sort
        rows.sort((rowA, rowB) => {
            const cellA = rowA.getElementsByTagName("TD")[n];
            const cellB = rowB.getElementsByTagName("TD")[n];

            let aVal = cellA ? (cellA.textContent || cellA.innerText).toLowerCase() : "";
            let bVal = cellB ? (cellB.textContent || cellB.innerText).toLowerCase() : "";

            // Remove commas for number parsing
            const aNum = parseFloat(aVal.replace(/,/g, ''));
            const bNum = parseFloat(bVal.replace(/,/g, ''));

            if (!isNaN(aNum) && !isNaN(bNum)) {
                return dir === "asc" ? aNum - bNum : bNum - aNum;
            } else {
                if (aVal < bVal) return dir === "asc" ? -1 : 1;
                if (aVal > bVal) return dir === "asc" ? 1 : -1;
                return 0;
            }
        });

        // Update arrow
        if (dir === "asc") {
            header.innerHTML = header.innerHTML.replace(' ▼', '').replace(' ▲', '') + ' ▲';
        } else {
            header.innerHTML = header.innerHTML.replace(' ▲', '').replace(' ▼', '') + ' ▼';
        }
    }

    // Re-append rows in sorted order
    const fragment = document.createDocumentFragment();
    rows.forEach(row => fragment.appendChild(row));

    if (tbody) {
        tbody.appendChild(fragment);
    }
}


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

        AdventureManager.events.emit('beforeMissionSpawn', eventData);

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


class TreasureMission extends AdventureMission {
    constructor() {
        super('treasure', 'Treasure');
        this.countElement = null;
    }

    init() {
        if (this.element) return;

        // Create Treasure Element (Group)
        const treasureGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        treasureGroup.setAttribute("id", "treasureMarker");
        treasureGroup.style.display = "none";
        treasureGroup.style.cursor = "pointer";
        treasureGroup.setAttribute("pointer-events", "all");

        // Add click listener
        treasureGroup.onclick = (e) => {
            e.stopPropagation();
            AdventureManager.handleMissionClick(this);
        };

        const treasureCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        treasureCircle.setAttribute("r", "12");
        treasureCircle.setAttribute("fill", "#FFD700"); // Gold
        treasureCircle.setAttribute("stroke", "#DAA520");
        treasureCircle.setAttribute("stroke-width", "2");

        const treasureText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        treasureText.textContent = "💎";
        treasureText.setAttribute("text-anchor", "middle");
        treasureText.setAttribute("dy", "5");
        treasureText.setAttribute("font-size", "16px");

        const treasureCountBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        treasureCountBg.setAttribute("x", "-12");
        treasureCountBg.setAttribute("y", "14");
        treasureCountBg.setAttribute("width", "24");
        treasureCountBg.setAttribute("height", "14");
        treasureCountBg.setAttribute("rx", "4");
        treasureCountBg.setAttribute("fill", "#fff");
        treasureCountBg.setAttribute("stroke", "#000");
        treasureCountBg.setAttribute("stroke-width", "0.5");

        const treasureCount = document.createElementNS("http://www.w3.org/2000/svg", "text");
        treasureCount.setAttribute("text-anchor", "middle");
        treasureCount.setAttribute("dy", "24");
        treasureCount.setAttribute("font-size", "10px");
        treasureCount.setAttribute("fill", "#000"); // Black text
        treasureCount.setAttribute("stroke", "none"); // No stroke on text for clarity
        treasureCount.style.fontWeight = "bold";

        treasureGroup.appendChild(treasureCircle);
        treasureGroup.appendChild(treasureText);
        treasureGroup.appendChild(treasureCountBg); // Background first
        treasureGroup.appendChild(treasureCount);

        this.element = treasureGroup;
        this.countElement = treasureCount;

        const svg = document.getElementById('mapSvg');
        svg.appendChild(treasureGroup);
    }

    onSpawn() {
        const validCells = this.getValidSpawnCells();

        if (validCells.length > 0) {
            const randomCell = validCells[Math.floor(Math.random() * validCells.length)];
            const amount = Math.floor(Math.random() * (60 - 20 + 1)) + 20; // 20 to 60
            this.data = { cell: randomCell.i, amount: amount };
            this.updateVisuals();
        }
    }

    updateVisuals() {
        if (!this.element) return;

        if (this.data && AdventureManager.active) {
            const tData = graphData[this.data.cell];
            if (tData) {
                this.element.setAttribute("transform", `translate(${tData.p[0]}, ${tData.p[1]})`);
                this.element.style.display = "block";
                if (this.countElement) this.countElement.textContent = this.data.amount;
            } else {
                this.element.style.display = "none";
            }
        } else {
            this.element.style.display = "none";
        }
    }

    getTargetCell() {
        return this.data ? this.data.cell : null;
    }

    onArrival() {
        this.showPopup();
    }

    showPopup() {
        if (!AdventureManager.popupElement) AdventureManager.openPopup(''); // Initialize if needed

        // Ensure overlay
        let overlay = document.getElementById('modalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalOverlay';
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';

        const cost = this.data.amount;
        const canMine = AdventureManager.party.tools >= cost;

        const content = `
            <h2>💎 Buried Treasure 💎</h2>
            <div class="content-wrapper">
                <div class="info">
                    You found a buried treasure chest!<br>
                    It seems to contain <strong>${this.data.amount} Gold</strong>.
                </div>
            </div>
            <div class="actions">
                ${canMine ?
                `<button class="btn-recruit" onclick="MissionTreasure.mine()">Mine Treasure (Cost: ${cost} 🛠️)</button>` :
                `<div class="warning" style="color: #e74c3c; margin-bottom: 10px;">You do not have enough tools to mine this treasure (Need ${cost} 🛠️).</div>`
            }
                <button class="btn-leave" onclick="AdventureManager.closePopup()">Leave</button>
            </div>
        `;

        AdventureManager.openPopup(content);
    }

    mine() {
        if (!this.data) return;
        const cost = this.data.amount;

        if (AdventureManager.party.tools >= cost) {
            AdventureManager.party.tools -= cost;
            AdventureManager.party.gold += this.data.amount;
            AdventureManager.showFeedback(`Mined ${this.data.amount} Gold! Used ${cost} Tools.`);

            // Floating Text
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`-${cost} 🛠️`, cell.p[0], cell.p[1] - 20, "#e74c3c");
                AdventureManager.showFloatingText(`+${this.data.amount} 💰`, cell.p[0], cell.p[1] - 40, "#f1c40f");
            }

            AdventureManager.closePopup();
            this.spawn(); // Respawn
            AdventureManager.updateStats();

            // Emit Complete Event from Base Class? No, base doesn't have complete logic.
            // Using standard emit.
            AdventureManager.events.emit('missionComplete', { type: 'treasure', amount: this.data.amount });
        } else {
            AdventureManager.showFeedback("Not enough tools!");
        }
    }
}

window.MissionTreasure = new TreasureMission();


class BattleMission extends AdventureMission {
    constructor() {
        super('battle', 'Battle');
        this.countElement = null;
    }

    init() {
        if (this.element) return;

        // Create Enemy Element (Group)
        const enemyGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        enemyGroup.setAttribute("id", "enemyMarker");
        enemyGroup.style.display = "none";
        enemyGroup.style.cursor = "pointer";
        enemyGroup.setAttribute("pointer-events", "all");

        enemyGroup.onclick = (e) => {
            e.stopPropagation();
            AdventureManager.handleMissionClick(this);
        };

        const enemyCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        enemyCircle.setAttribute("r", "14");
        enemyCircle.setAttribute("fill", "#e74c3c"); // Red
        enemyCircle.setAttribute("stroke", "#c0392b");
        enemyCircle.setAttribute("stroke-width", "2");

        const enemyText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        enemyText.textContent = "⚔️";
        enemyText.setAttribute("text-anchor", "middle");
        enemyText.setAttribute("dy", "5");
        enemyText.setAttribute("font-size", "16px");

        const enemyCountBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        enemyCountBg.setAttribute("x", "-12");
        enemyCountBg.setAttribute("y", "16");
        enemyCountBg.setAttribute("width", "24");
        enemyCountBg.setAttribute("height", "14");
        enemyCountBg.setAttribute("rx", "4");
        enemyCountBg.setAttribute("fill", "#fff");
        enemyCountBg.setAttribute("stroke", "#000");
        enemyCountBg.setAttribute("stroke-width", "0.5");

        const enemyCount = document.createElementNS("http://www.w3.org/2000/svg", "text");
        enemyCount.setAttribute("text-anchor", "middle");
        enemyCount.setAttribute("dy", "26");
        enemyCount.setAttribute("font-size", "10px");
        enemyCount.setAttribute("fill", "#000"); // Black text
        enemyCount.setAttribute("stroke", "none");
        enemyCount.style.fontWeight = "bold";

        enemyGroup.appendChild(enemyCircle);
        enemyGroup.appendChild(enemyText);
        enemyGroup.appendChild(enemyCountBg); // Background first
        enemyGroup.appendChild(enemyCount);

        this.element = enemyGroup;
        this.countElement = enemyCount;

        const svg = document.getElementById('mapSvg');
        svg.appendChild(enemyGroup);
    }

    onSpawn() {
        // Need to check other missions to avoid overlap
        // getValidSpawnCells doesn't know about other mission data by default, 
        // but we can pass occupied cells if we want strict non-overlap.
        // The original code checked MissionTreasure.data.cell.

        const occupied = [AdventureManager.party.cell];
        if (MissionTreasure.data) occupied.push(MissionTreasure.data.cell);

        const validCells = this.getValidSpawnCells(occupied);

        if (validCells.length > 0) {
            const randomCell = validCells[Math.floor(Math.random() * validCells.length)];
            const amount = Math.floor(Math.random() * (200 - 20 + 1)) + 20; // 20 to 200
            this.data = { cell: randomCell.i, soldiers: amount };
            this.updateVisuals();
        }
    }

    updateVisuals() {
        if (!this.element) return;

        if (this.data && AdventureManager.active) {
            const eData = graphData[this.data.cell];
            if (eData) {
                this.element.setAttribute("transform", `translate(${eData.p[0]}, ${eData.p[1]})`);
                this.element.style.display = "block";
                if (this.countElement) this.countElement.textContent = this.data.soldiers;
            } else {
                this.element.style.display = "none";
            }
        } else {
            this.element.style.display = "none";
        }
    }

    getTargetCell() {
        return this.data ? this.data.cell : null;
    }

    onArrival() {
        this.showPopup();
    }

    showPopup() {
        if (!AdventureManager.popupElement) AdventureManager.openPopup('');

        let overlay = document.getElementById('modalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalOverlay';
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';

        const mySoldiers = AdventureManager.party.soldiers;
        const enemySoldiers = this.data.soldiers;

        // Use ratio R = Player / Enemy.
        // P(Win) = R^2 / (R^2 + 1)
        const ratio = mySoldiers / enemySoldiers;
        const k = 2; // Squared for sharper curve
        const winProb = (Math.pow(ratio, k) / (Math.pow(ratio, k) + 1));
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
                    <h3>Enemy Army</h3>
                    <div style="font-size: 24px; color: #e74c3c; font-weight: bold;">${enemySoldiers} ⚔️</div>
                 </div>
             </div>
             
             <div style="text-align: center; margin: 15px 0;">
                <div>Ratio: <strong>1:${(1 / ratio).toFixed(2)}</strong> (Player:Enemy)</div>
                <div>Win Probability: <strong>${winPercent}%</strong></div>
             </div>
             
             <div class="actions">
                 <button class="btn-recruit" style="background-color: #c0392b;" onclick="MissionBattle.resolve()">FIGHT!</button>
                 <button class="btn-leave" onclick="AdventureManager.closePopup()">Retreat (Stay here)</button>
             </div>
        `;
        AdventureManager.openPopup(content);
    }

    resolve() {
        if (!this.data) return;

        const mySoldiers = AdventureManager.party.soldiers;
        const enemySoldiers = this.data.soldiers;
        const ratio = mySoldiers / enemySoldiers;
        const k = 2;
        const winProb = (Math.pow(ratio, k) / (Math.pow(ratio, k) + 1));

        const roll = Math.random();

        if (roll < winProb) {
            // WIN
            const goldReward = Math.floor(enemySoldiers / 10) * 2;
            const soldierReward = Math.floor(enemySoldiers / 10) * 2;

            AdventureManager.party.gold += goldReward;
            AdventureManager.party.soldiers += soldierReward; // replenish or recruit

            AdventureManager.showFeedback(`VICTORY! Gained ${goldReward} Gold & ${soldierReward} Soldiers.`);

            // Emit Event
            if (AdventureManager.events) {
                AdventureManager.events.emit('battleWon', { enemySoldiers: this.data.soldiers });
            }

            // Floating Text (Win)
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`VICTORY!`, cell.p[0], cell.p[1] - 60, "#2ecc71");
                AdventureManager.showFloatingText(`+${goldReward} 💰`, cell.p[0], cell.p[1] - 40, "#f1c40f");
                AdventureManager.showFloatingText(`+${soldierReward} ⚔️`, cell.p[0], cell.p[1] - 20, "#9b59b6");
            }

            AdventureManager.closePopup();
            this.spawn(); // Respawn
            AdventureManager.updateStats();
        } else {
            // LOSE
            // Emit Event
            if (AdventureManager.events) {
                AdventureManager.events.emit('battleLost', { enemySoldiers: this.data.soldiers });
            }

            // Retain half of starting army, round down to nearest 5, min 5
            const retained = Math.max(5, Math.floor((mySoldiers / 2) / 5) * 5);
            const lost = mySoldiers - retained;
            AdventureManager.party.soldiers = retained;

            AdventureManager.updateStats();
            AdventureManager.closePopup();

            // Floating Text (Loss)
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`DEFEAT!`, cell.p[0], cell.p[1] - 40, "#e74c3c");
                if (lost > 0) AdventureManager.showFloatingText(`-${lost} ⚔️`, cell.p[0], cell.p[1] - 20, "#e74c3c");
            }

            // Damage enemy
            const damage = mySoldiers;
            this.data.soldiers = Math.max(0, this.data.soldiers - damage);

            if (this.data.soldiers === 0) {
                AdventureManager.showFeedback(`DEFEAT! But you wiped out the enemy!`);
                this.element.style.display = "none";
                this.data = null;
                this.spawn();
            } else {
                AdventureManager.showFeedback(`DEFEAT! Enemy took ${damage} casualties.`);
            }
        }
    }
}

window.MissionBattle = new BattleMission();


class HuntMission extends AdventureMission {
    constructor() {
        super('hunt', 'Hunt');
        this.countElement = null;
    }

    init() {
        if (this.element) return;

        // Create Beast Element (Group)
        const beastGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        beastGroup.style.display = 'none';
        beastGroup.style.cursor = 'pointer';

        // Add click listener
        beastGroup.onclick = (e) => {
            e.stopPropagation();
            AdventureManager.handleMissionClick(this);
        };

        const beastCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        beastCircle.setAttribute("r", "12");
        beastCircle.setAttribute("fill", "#8e44ad"); // Purple
        beastCircle.setAttribute("stroke", "#ffffff");
        beastCircle.setAttribute("stroke-width", "2");

        const beastText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        beastText.textContent = "🐺"; // Boar/Wolf emoji
        beastText.setAttribute("text-anchor", "middle");
        beastText.setAttribute("dy", "5");
        beastText.setAttribute("font-size", "16px");

        const beastCount = document.createElementNS("http://www.w3.org/2000/svg", "text");
        beastCount.setAttribute("text-anchor", "middle");
        beastCount.setAttribute("dy", "24"); // Offset
        beastCount.setAttribute("font-size", "10px");

        beastGroup.appendChild(beastCircle);
        beastGroup.appendChild(beastText);
        beastGroup.appendChild(beastCount);

        this.element = beastGroup;
        this.countElement = beastCount;

        const svg = document.getElementById('mapSvg');
        svg.appendChild(beastGroup);
    }

    onSpawn() {
        // Collect occupied cells
        const occupied = [AdventureManager.party.cell];
        if (MissionTreasure.data) occupied.push(MissionTreasure.data.cell);
        if (MissionBattle.data) occupied.push(MissionBattle.data.cell);

        const validCells = this.getValidSpawnCells(occupied);

        if (validCells.length > 0) {
            const randomCell = validCells[Math.floor(Math.random() * validCells.length)];
            const strength = Math.floor(Math.random() * (30 - 5 + 1)) + 5; // 5 to 30
            this.data = { cell: randomCell.i, strength: strength };
            this.updateVisuals();
            // Emit specific start event if needed, but base class handles 'beforeMissionSpawn'.
            // The original code emitted 'missionStart' manually here.
            AdventureManager.events.emit('missionStart', { type: 'hunt', ...this.data });
        }
    }

    updateVisuals() {
        if (!this.element) return;

        if (this.data && AdventureManager.active) {
            const bData = graphData[this.data.cell];
            if (bData) {
                this.element.setAttribute("transform", `translate(${bData.p[0]}, ${bData.p[1]})`);
                this.element.style.display = "block";
                if (this.countElement) this.countElement.textContent = this.data.strength;
            } else {
                this.element.style.display = "none";
            }
        } else {
            this.element.style.display = "none";
        }
    }

    getTargetCell() {
        return this.data ? this.data.cell : null;
    }

    onArrival() {
        this.showPopup();
    }

    showPopup() {
        if (!AdventureManager.popupElement) AdventureManager.openPopup('');

        let overlay = document.getElementById('modalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalOverlay';
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';

        const mySoldiers = AdventureManager.party.soldiers;
        const beastStrength = this.data.strength;
        const willWin = mySoldiers > beastStrength;

        const content = `
             <h2>🐺 Beast Encounter 🐺</h2>
             <div class="content-wrapper" style="display: flex; gap: 20px; align-items: center; justify-content: center;">
                 <div style="text-align: center;">
                    <h3>Your Party</h3>
                    <div style="font-size: 24px; color: #2ecc71; font-weight: bold;">${mySoldiers} 🛡️</div>
                 </div>
                 <div style="font-size: 20px; font-weight: bold;">VS</div>
                 <div style="text-align: center;">
                    <h3>The Beast</h3>
                    <div style="font-size: 24px; color: #8e44ad; font-weight: bold;">${beastStrength} 🐺</div>
                 </div>
             </div>
             
             <div style="text-align: center; margin: 15px 0;">
                ${willWin ?
                `<div style="color: #2ecc71;"><strong>Outcome: VICTORY gauranteed!</strong></div>` :
                `<div style="color: #e74c3c;"><strong>Outcome: DEFEAT likely...</strong></div>`
            }
             </div>
             
             <div class="actions">
                 <button class="btn-recruit" style="background-color: #8e44ad;" onclick="MissionHunt.resolve()">FIGHT!</button>
                 <button class="btn-leave" onclick="AdventureManager.closePopup()">Retreat</button>
             </div>
        `;
        AdventureManager.openPopup(content);
    }

    resolve() {
        if (!this.data) return;

        const mySoldiers = AdventureManager.party.soldiers;
        const beastStrength = this.data.strength;

        if (mySoldiers > beastStrength) {
            // WIN
            // Gain 1 gold for each 5 strength of the beast, rounding up.
            const goldReward = Math.ceil(beastStrength / 5);
            // Food reward equal to beast strength
            const foodReward = beastStrength;

            AdventureManager.party.gold += goldReward;
            AdventureManager.party.food += foodReward;

            AdventureManager.showFeedback(`SLAIN! Gained ${goldReward} Gold & ${foodReward} Food.`);

            // Emit Complete Event
            AdventureManager.events.emit('missionComplete', { type: 'hunt', result: 'win', ...this.data });

            // Floating Text (Win)
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`VICTORY!`, cell.p[0], cell.p[1] - 60, "#2ecc71");
                AdventureManager.showFloatingText(`+${goldReward} 💰`, cell.p[0], cell.p[1] - 40, "#f1c40f");
                AdventureManager.showFloatingText(`+${foodReward} 🍎`, cell.p[0], cell.p[1] - 20, "#2ecc71");
            }

            AdventureManager.closePopup();
            this.spawn(); // Respawn
            AdventureManager.updateStats();
        } else {
            // LOSE
            AdventureManager.showFeedback("DEFEAT! The beast was too strong.");

            // Lose 5 soldiers (or max available)
            const loss = Math.min(AdventureManager.party.soldiers, 5);

            // Damage beast by half of nr of soldiers
            const damage = Math.floor(mySoldiers / 2);
            this.data.strength = Math.max(0, this.data.strength - damage);

            // Lose soldiers
            AdventureManager.party.soldiers -= loss;

            AdventureManager.updateStats();
            AdventureManager.closePopup();

            // Floating Text (Loss)
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`DEFEAT!`, cell.p[0], cell.p[1] - 40, "#e74c3c");
                if (loss > 0) AdventureManager.showFloatingText(`-${loss} ⚔️`, cell.p[0], cell.p[1] - 20, "#e74c3c");
            }

            // Check if beast died from damage
            if (this.data.strength <= 0) {
                AdventureManager.showFeedback("The beast succumbed to its wounds!");
                this.element.style.display = "none";
                this.data = null;
                this.spawn();
            }
        }
    }
}

window.MissionHunt = new HuntMission();


class SiegeMission extends AdventureMission {
    constructor() {
        super('siege', 'Siege');
        this.countElement = null;
        this.ringGroup = null;
        this.lastSiegedBurgId = -1;
    }

    init() {
        if (this.element) return;

        // Create Siege Ring Group
        const siegeRingGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.ringGroup = siegeRingGroup;

        // Create Siege Element (Group)
        const siegeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        siegeGroup.setAttribute("id", "siegeMarker");
        siegeGroup.style.display = "none";
        siegeGroup.style.cursor = "pointer";
        siegeGroup.setAttribute("pointer-events", "all");

        siegeGroup.onclick = (e) => {
            e.stopPropagation();
            AdventureManager.handleMissionClick(this);
        };

        const siegeCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        siegeCircle.setAttribute("r", "14");
        siegeCircle.setAttribute("fill", "#2c3e50"); // Dark Blue/Black
        siegeCircle.setAttribute("stroke", "#000");
        siegeCircle.setAttribute("stroke-width", "2");

        const siegeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        siegeText.textContent = "💣";
        siegeText.setAttribute("text-anchor", "middle");
        siegeText.setAttribute("dy", "5");
        siegeText.setAttribute("font-size", "16px");

        const siegeCountBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        siegeCountBg.setAttribute("x", "-12");
        siegeCountBg.setAttribute("y", "16");
        siegeCountBg.setAttribute("width", "24");
        siegeCountBg.setAttribute("height", "14");
        siegeCountBg.setAttribute("rx", "4");
        siegeCountBg.setAttribute("fill", "#fff");
        siegeCountBg.setAttribute("stroke", "#000");
        siegeCountBg.setAttribute("stroke-width", "0.5");

        const siegeCount = document.createElementNS("http://www.w3.org/2000/svg", "text");
        siegeCount.setAttribute("text-anchor", "middle");
        siegeCount.setAttribute("dy", "26");
        siegeCount.setAttribute("font-size", "10px");
        siegeCount.setAttribute("fill", "#000");
        siegeCount.setAttribute("stroke", "none");
        siegeCount.style.fontWeight = "bold";

        siegeGroup.appendChild(siegeCircle);
        siegeGroup.appendChild(siegeText);
        siegeGroup.appendChild(siegeCountBg);
        siegeGroup.appendChild(siegeCount);

        this.element = siegeGroup;
        this.countElement = siegeCount;

        svg.appendChild(siegeRingGroup);
        svg.appendChild(siegeGroup);

        // Register Event Listener for Burg Popup
        AdventureManager.events.on('burgPopupOpened', this.handleburgPopupOpened.bind(this));
    }

    handleburgPopupOpened(context) {
        if (!this.data || !AdventureManager.active) return;

        // Check if this burg is the one under siege
        if (this.data.burgId === context.burg.id) {
            // Disable all existing buttons
            context.buttons.forEach(btn => {
                btn.disabled = true;
                btn.title = "City is under siege! You must break the siege first.";
            });

            // Inject "Fight Siege" button
            const insertIndex = this.getSiegeInsertIndex(context.buttons);
            context.buttons.splice(insertIndex, 0, {
                id: 'fight_siege',
                label: 'Fight Sieging Army (💣)',
                title: 'Fight Sieging Army',
                onClick: 'MissionSiege.showPopup()',
                style: 'background-color: #000;',
                class: 'btn-recruit',
                disabled: false
            });
        }
    }

    getSiegeInsertIndex(buttons) {
        const priorityBefore = ['leave_ship', 'rent_ship', 'buy_food', 'standard_diplomacy', 'diplomat_mission'];
        let idx = buttons.map(b => b.id).lastIndexOf(id => priorityBefore.includes(id));

        // Polyfill-ish logic if lastIndexOf with predicate isn't standard in this env, use explicit loop efficiently:
        for (let i = buttons.length - 1; i >= 0; i--) {
            if (priorityBefore.includes(buttons[i].id)) return i + 1;
        }

        // If not found, try before 'recruit' or 'tools'
        const afterIdx = buttons.findIndex(b => ['recruit_soldiers', 'buy_tools'].includes(b.id));
        return afterIdx >= 0 ? afterIdx : 0;
    }

    onSpawn() {
        const capitals = burgsData.filter(b => b.is_capital);
        if (capitals.length === 0) return;

        // Filter out the last sieged burg to avoid repetition
        let candidateCapitals = capitals;
        if (this.lastSiegedBurgId !== -1) {
            candidateCapitals = capitals.filter(b => b.id !== this.lastSiegedBurgId);
            if (candidateCapitals.length === 0) {
                candidateCapitals = capitals;
            }
        }

        // Pick random capital
        const capital = candidateCapitals[Math.floor(Math.random() * candidateCapitals.length)];
        const capitalCell = capital.cell_id;

        // Save for next time
        this.lastSiegedBurgId = capital.id;

        // Find neighbor land cell for army
        const neighbors = graphData[capitalCell].c;
        const validNeighbors = neighbors.filter(n => graphData[n].b !== window.marineBiomeId);

        if (validNeighbors.length > 0) {
            const armyCell = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];

            let totalQuartiers = (capital.soldier_quartiers || 0) + (capital.craftsman_quartiers || 0) + (capital.noble_quartiers || 0) + (capital.religious_quartiers || 0);
            if (totalQuartiers === 0) totalQuartiers = Math.ceil(capital.population / 1000); // Fallback

            const strength = Math.ceil(totalQuartiers / 2) * 20;

            this.data = { burgId: capital.id, armyCell: armyCell, soldiers: strength };
            this.updateVisuals();
            AdventureManager.showFeedback(`Siege started at ${capital.name}!`);

            AdventureManager.events.emit('missionStart', { type: 'siege', ...this.data });
        }
    }

    updateVisuals() {
        if (!this.element) return;

        if (this.data && AdventureManager.active) {
            // Icon
            const sData = graphData[this.data.armyCell];
            if (sData) {
                this.element.setAttribute("transform", `translate(${sData.p[0]}, ${sData.p[1]})`);
                this.element.style.display = "block";
                if (this.countElement) this.countElement.textContent = this.data.soldiers;
            } else {
                this.element.style.display = "none";
            }

            // Ring
            if (this.ringGroup) {
                while (this.ringGroup.firstChild) {
                    this.ringGroup.removeChild(this.ringGroup.firstChild);
                }
                const burg = burgsData.find(b => b.id === this.data.burgId);
                if (burg) {
                    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    ring.setAttribute("cx", burg.x);
                    ring.setAttribute("cy", burg.y);
                    ring.setAttribute("r", parseFloat(burg.r) + 12);
                    ring.setAttribute("fill", "none");
                    ring.setAttribute("stroke", "#000"); // Black
                    ring.setAttribute("stroke-width", "4");
                    ring.setAttribute("pointer-events", "none");
                    this.ringGroup.appendChild(ring);
                    this.ringGroup.style.display = 'inline';
                }
            }
        } else {
            this.element.style.display = "none";
            if (this.ringGroup) this.ringGroup.style.display = 'none';
        }
    }

    toggle(active) {
        if (!this.element) return;
        this.element.style.display = (active && this.data) ? "block" : "none";
        if (this.ringGroup) this.ringGroup.style.display = (active && this.data) ? "inline" : "none";
    }

    getTargetCell() {
        return this.data ? this.data.armyCell : null;
    }

    onArrival() {
        this.showPopup();
    }

    showPopup() {
        if (!AdventureManager.popupElement) AdventureManager.openPopup('');

        let overlay = document.getElementById('modalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalOverlay';
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';

        const mySoldiers = AdventureManager.party.soldiers;
        const enemySoldiers = this.data.soldiers;

        const ratio = mySoldiers / enemySoldiers;
        const k = 2;
        const winProb = (Math.pow(ratio, k) / (Math.pow(ratio, k) + 1));
        const winPercent = (winProb * 100).toFixed(1);

        const content = `
             <h2>⚔️ Break the Siege ⚔️</h2>
             <div class="content-wrapper" style="display: flex; gap: 20px; align-items: center; justify-content: center;">
                 <div style="text-align: center;">
                    <h3>Your Army</h3>
                    <div style="font-size: 24px; color: #2ecc71; font-weight: bold;">${mySoldiers} 🛡️</div>
                 </div>
                 <div style="font-size: 20px; font-weight: bold;">VS</div>
                 <div style="text-align: center;">
                    <h3>Siege Army</h3>
                    <div style="font-size: 24px; color: #000; font-weight: bold;">${enemySoldiers} 💣</div>
                 </div>
             </div>
             
             <div style="text-align: center; margin: 15px 0;">
                <div>Win Success Chance: <strong>${winPercent}%</strong></div>
             </div>
             
             <div class="actions">
                 <button class="btn-recruit" style="background-color: #c0392b;" onclick="MissionSiege.resolve()">ATTACK!</button>
                 <button class="btn-leave" onclick="AdventureManager.closePopup()">Retreat</button>
             </div>
        `;
        AdventureManager.openPopup(content);
    }

    resolve() {
        if (!this.data) return;

        const mySoldiers = AdventureManager.party.soldiers;
        const enemySoldiers = this.data.soldiers;
        const ratio = mySoldiers / enemySoldiers;
        const k = 2;
        const winProb = (Math.pow(ratio, k) / (Math.pow(ratio, k) + 1));

        if (Math.random() < winProb) {
            // WIN
            const goldReward = 35; // High reward
            const soldierReward = 10;
            AdventureManager.party.gold += goldReward;
            AdventureManager.party.soldiers += soldierReward;

            AdventureManager.showFeedback(`SIEGE BROKEN! Hero of the city! +${goldReward} Gold.`);

            // Emit Complete Event (Win)
            AdventureManager.events.emit('missionComplete', { type: 'siege', result: 'win', ...this.data });

            // Floating Text (Win)
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`SIEGE BROKEN!`, cell.p[0], cell.p[1] - 60, "#2ecc71");
                AdventureManager.showFloatingText(`+${goldReward} 💰`, cell.p[0], cell.p[1] - 40, "#f1c40f");
                AdventureManager.showFloatingText(`+${soldierReward} ⚔️`, cell.p[0], cell.p[1] - 20, "#9b59b6");
            }

            AdventureManager.closePopup();
            this.data = null;
            this.updateVisuals();

            // Spawn new siege elsewhere
            setTimeout(() => this.spawn(), 3000);
            AdventureManager.updateStats();
        } else {
            // LOSE
            const retained = Math.max(5, Math.floor((mySoldiers / 2) / 5) * 5);
            const lost = mySoldiers - retained;
            AdventureManager.party.soldiers = retained;

            AdventureManager.updateStats();
            AdventureManager.closePopup();

            // Floating Text (Loss)
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`DEFEAT!`, cell.p[0], cell.p[1] - 40, "#e74c3c");
                if (lost > 0) AdventureManager.showFloatingText(`-${lost} ⚔️`, cell.p[0], cell.p[1] - 20, "#e74c3c");
            }

            // Damage enemy
            const damage = mySoldiers;
            this.data.soldiers = Math.max(0, this.data.soldiers - damage);

            if (this.data.soldiers === 0) {
                AdventureManager.showFeedback(`DEFEAT! But siege is broken at high cost!`);

                // Emit Complete Event (Sacrifice)
                AdventureManager.events.emit('missionComplete', { type: 'siege', result: 'sacrifice', ...this.data });

                this.data = null;
                this.updateVisuals();
                setTimeout(() => this.spawn(), 3000);
            } else {
                AdventureManager.showFeedback(`DEFEAT! Siege continues...`);
                // Update text to show weakened enemy
                if (this.countElement) this.countElement.textContent = this.data.soldiers;
            }
        }
    }
}

window.MissionSiege = new SiegeMission();


class DiplomaticMission extends AdventureMission {
    constructor() {
        super('diplomacy', 'Diplomacy');
        this.targets = []; // Array of cell IDs (capitals)
        this.solvedCount = 0;
        this.group = null; // SVG group for rings
    }

    init() {
        if (this.group) return;

        // Diplomatic Group (Rings)
        const diplomacyGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.group = diplomacyGroup;

        const svg = document.getElementById('mapSvg');
        svg.appendChild(diplomacyGroup);
    }

    onSpawn() {
        this.startTour();
    }

    startTour() {
        // Event Hook check for granular control (e.g. re-tour)
        const eventData = { type: 'diplomacy', cancelled: false, mission: this };
        AdventureManager.events.emit('beforeMissionStart', eventData);

        if (eventData.cancelled) return;

        const capitals = burgsData.filter(b => b.is_capital);
        // Shuffle using Fisher-Yates
        for (let i = capitals.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [capitals[i], capitals[j]] = [capitals[j], capitals[i]];
        }
        // Take top 3 unique IDs
        this.targets = capitals.slice(0, 3).map(b => b.id);
        this.solvedCount = 0;
        const targetNames = capitals.slice(0, 3).map(b => b.name).join(", ");
        AdventureManager.showFeedback(`Diplomatic Tour Started! Visit 3 Capitals with Blue Rings: ${targetNames}.`);
        this.updateVisuals();
    }

    updateVisuals() {
        if (!this.group) return;

        if (AdventureManager.active) {
            this.group.style.display = 'inline';
            while (this.group.firstChild) {
                this.group.removeChild(this.group.firstChild);
            }
            this.targets.forEach(id => {
                const burg = burgsData.find(b => b.id === id);
                if (burg) {
                    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    ring.setAttribute("cx", burg.x);
                    ring.setAttribute("cy", burg.y);
                    ring.setAttribute("r", parseFloat(burg.r) + 8);
                    ring.setAttribute("fill", "none");
                    ring.setAttribute("stroke", "#4169E1"); // Royal Blue
                    ring.setAttribute("stroke-width", "3");
                    ring.setAttribute("pointer-events", "none");
                    ring.setAttribute("class", "diplomacy-ring"); // Add class for animation
                    this.group.appendChild(ring);
                }
            });
        } else {
            this.group.style.display = 'none';
        }
    }

    toggle(active) {
        if (!this.group) return;
        this.group.style.display = active ? 'inline' : 'none';
    }

    resolve(burgId) {
        if (!this.targets.includes(burgId)) return;

        if (AdventureManager.party.gold >= 5) {
            AdventureManager.party.gold -= 5;
            // Remove from targets
            this.targets = this.targets.filter(id => id !== burgId);
            this.solvedCount++;

            AdventureManager.updateStats();
            this.updateVisuals(); // Update rings
            AdventureManager.closePopup();

            // Floating Text (Cost & Success)
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`MISSION SUCCESS!`, cell.p[0], cell.p[1] - 40, "#2ecc71");
                AdventureManager.showFloatingText(`-5 💰`, cell.p[0], cell.p[1] - 20, "#e74c3c");
            }

            if (this.solvedCount >= 3) {
                AdventureManager.party.gold += 35;
                AdventureManager.showFeedback("Diplomatic Tour Complete! +35 Gold. Starting new tour...");
                AdventureManager.updateStats();

                if (cell) {
                    AdventureManager.showFloatingText(`TOUR COMPLETE!`, cell.p[0], cell.p[1] - 60, "#2ecc71");
                    AdventureManager.showFloatingText(`+35 💰`, cell.p[0], cell.p[1] - 40, "#f1c40f");
                }

                setTimeout(() => this.startTour(), 2000);
            } else {
                AdventureManager.showFeedback(`Diplomatic Mission Successful! (${this.solvedCount}/3)`);
            }
        } else {
            AdventureManager.showFeedback("Not enough gold (Need 5 💰)!");
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`NEED 5 💰`, cell.p[0], cell.p[1] - 20, "#e74c3c");
            }
        }
    }
}

window.MissionDiplomacy = new DiplomaticMission();


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
        svg.appendChild(locationsGroup);
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
        const occupiedObj = [];
        occupiedObj.push(AdventureManager.party.cell);
        if (MissionTreasure.data) occupiedObj.push(MissionTreasure.data.cell);
        if (MissionBattle.data) occupiedObj.push(MissionBattle.data.cell);
        if (MissionHunt.data) occupiedObj.push(MissionHunt.data.cell);
        if (MissionSiege.data) occupiedObj.push(MissionSiege.data.armyCell);
        this.locations.forEach(l => { if (l) occupiedObj[l.cell] = true; });

        let validCells = this.getValidSpawnCells(occupiedObj);

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



// Adventure Mode Module

const AdventureManager = {
    active: false,
    party: {
        cell: 0,
        soldiers: 10,
        food: 50,
        gold: 10,
        tools: 10,
        onShip: false
    },
    partyElement: null,
    pathElement: null,
    previewPathElement: null,
    popupElement: null,
    isMoving: false,
    movementId: 0,
    knownBurgs: {},
    options: {
        Treasure: true,
        Hunt: true,
        Battle: true,
        Siege: true,
        Diplomacy: true,
        Explore: true
    },

    // Default Configuration
    defaultPartyConfig: {
        cell: -1, // -1 means Random
        resources: {
            soldiers: 10,
            food: 50,
            gold: 10,
            tools: 10,
            onShip: false
        }
    },

    accessibleCells: [], // Cache for valid land cells
    portDockingCells: {}, // Map of Port Cell ID -> Valid Water Cell ID

    // Initialize Event System (Top-level to ensure availability)
    events: {
        listeners: {},
        on(event, callback) {
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(callback);
        },
        off(event, callback) {
            if (!this.listeners[event]) return;
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        },
        emit(event, data) {
            if (this.listeners[event]) {
                this.listeners[event].forEach(cb => cb(data));
            }
        }
    },

    init() {
        if (this.partyElement) return;

        // Identify Accessible Land (Islands with at least one port)
        this.identifyAccessibleLand();
        // Calculate static docking points for ports
        this.calculateDockingPoints();

        // Initialize Missions
        MissionDiplomacy.init();
        MissionSiege.init();
        MissionBattle.init();
        MissionHunt.init();
        MissionTreasure.init();
        MissionExplore.init();


        // Create party element (Group with Circle + Text)
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("id", "partyMarker");
        group.style.zIndex = "100";
        group.style.transition = "transform 0.2s linear";
        group.style.display = "none";
        group.style.pointerEvents = "none";

        // Background Circle
        const bgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        bgCircle.setAttribute("r", "10");
        bgCircle.setAttribute("fill", "#e67e22"); // Pumpkin default
        bgCircle.setAttribute("stroke", "#2c3e50");
        bgCircle.setAttribute("stroke-width", "2");
        group.appendChild(bgCircle);

        this.partyElement = group;
        this.partyBg = bgCircle;


        // Create path element (polyline)
        const pathLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        pathLine.setAttribute("fill", "none");
        pathLine.setAttribute("stroke", "#ff0000"); // Red
        pathLine.setAttribute("stroke-width", "3");
        pathLine.setAttribute("stroke-dasharray", "5,5");
        pathLine.setAttribute("pointer-events", "none");
        pathLine.style.opacity = "0.8";
        pathLine.style.display = "none";
        this.pathElement = pathLine;


        // Create preview path element (polyline) different style
        const previewLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        previewLine.setAttribute("fill", "none");
        previewLine.setAttribute("stroke", "#00ffff"); // Cyan
        previewLine.setAttribute("stroke-width", "3");
        previewLine.setAttribute("stroke-dasharray", "5,5"); // Same dash as normal
        previewLine.setAttribute("pointer-events", "none");
        previewLine.style.opacity = "0.8";
        previewLine.style.display = "none";
        this.previewPathElement = previewLine;

        const svg = document.getElementById('mapSvg');
        svg.appendChild(previewLine);
        svg.appendChild(pathLine);
        svg.appendChild(group); // Append party marker group after to be on top
    },

    calculateDockingPoints() {
        this.portDockingCells = {};
        // Iterate all cells to find ports
        graphData.forEach((cell, index) => {
            if (cell.b === marineBiomeId) return; // Skip water cells

            // Check neighbors for water
            const waterNeighbors = [];
            for (const n of cell.c) {
                if (graphData[n].b === marineBiomeId) {
                    waterNeighbors.push(n);
                }
            }

            if (waterNeighbors.length > 0) {
                // This is a port. Assign the FIRST water neighbor as the docking point.
                // Deterministic assignment (lowest ID or array order).
                this.portDockingCells[index] = waterNeighbors[0];
            }
        });
        console.log("Calculated static docking points for " + Object.keys(this.portDockingCells).length + " ports.");
    },

    identifyAccessibleLand() {
        // 1. Identify all land cells
        const landCells = graphData.map((c, i) => ({ ...c, i })).filter(c => c.b !== marineBiomeId);
        const visited = new Set();
        const validCells = [];

        // 2. Group into connected components (Islands/Continents)
        for (let cell of landCells) {
            if (visited.has(cell.i)) continue;

            const component = [];
            const queue = [cell.i];
            visited.add(cell.i);
            let hasPort = false;

            while (queue.length > 0) {
                const currentId = queue.shift();
                component.push(currentId);

                // Check if this cell is a port (has burg and is adjacent to water)
                // Actually, isPort checks neighbors. 
                // BUT user said "no burg exists where player can rent a ship".
                // So we need: Has a BURG that is a PORT.
                if (!hasPort) {
                    const burg = burgsData.find(b => b.cell_id === currentId);
                    // Check if this cell has a burg that is 'Naval' AND is technically a port
                    if (burg && burg.type === "Naval" && this.isPort(currentId)) {
                        hasPort = true;
                    }
                }

                // Neighbors
                const neighbors = graphData[currentId].c;
                for (let n of neighbors) {
                    if (graphData[n].b !== marineBiomeId && !visited.has(n)) {
                        visited.add(n);
                        queue.push(n);
                    }
                }
            }

            // 3. If component has at least one port-burg, add to allowed list
            if (hasPort) {
                validCells.push(...component);
            }
        }
        this.accessibleCells = validCells;
        console.log(`Identified ${this.accessibleCells.length} accessible land cells out of ${landCells.length} total land cells.`);
    },

    toggle() {
        this.active = !this.active;
        const btn = document.getElementById('toggleAdventure');
        const sidebar = document.getElementById('adventureSidebar');
        const banner = document.getElementById('adventureStatsBanner');
        const optionsBtn = document.getElementById('adventureOptionsBtn');

        if (this.active) {
            if (btn) btn.classList.add('active');
            if (sidebar) sidebar.classList.remove('hidden');
            if (banner) banner.classList.remove('hidden');
            if (optionsBtn) optionsBtn.classList.remove('hidden');

            this.init(); // Ensure element exists
            if (this.party.cell === 0) {
                this.start();
            } else {
                this.partyElement.style.display = "block";

                // Toggle Missions based on Options
                if (this.options.Diplomacy) MissionDiplomacy.toggle(true);
                if (this.options.Siege) MissionSiege.toggle(true);
                if (this.options.Battle) MissionBattle.toggle(true);
                if (this.options.Hunt) MissionHunt.toggle(true);
                if (this.options.Treasure) MissionTreasure.toggle(true);
                if (this.options.Explore) MissionExplore.toggle(true);

                this.render();
            }
        } else {
            this.movementId++; // Cancel any ongoing movement
            this.isMoving = false;
            if (btn) btn.classList.remove('active');

            if (sidebar) sidebar.classList.add('hidden');
            if (banner) banner.classList.add('hidden');
            if (optionsBtn) optionsBtn.classList.add('hidden');

            if (this.partyElement) this.partyElement.style.display = 'none';

            // Toggle Missions
            MissionDiplomacy.toggle(false);
            MissionSiege.toggle(false);
            MissionBattle.toggle(false);
            MissionHunt.toggle(false);
            MissionTreasure.toggle(false);
            MissionExplore.toggle(false);

            if (this.pathElement) this.pathElement.style.display = 'none';
            if (this.previewPathElement) this.previewPathElement.style.display = 'none';
        }
    },

    reset() {
        this.active = false;
        this.party.cell = 0; // 0 indicates "Not Started" / "Fresh" for start() logic

        // Reset Visuals
        if (this.pathElement) this.pathElement.style.display = 'none';
        if (this.previewPathElement) this.previewPathElement.style.display = 'none';
        if (this.partyElement) this.partyElement.style.display = 'none';

        // Clear Log
        const logContainer = document.getElementById('adventureLog');
        if (logContainer) logContainer.innerHTML = '';

        // Reset sidebar state if UI is open
        const btn = document.getElementById('toggleAdventure');
        if (btn) btn.classList.remove('active');
        const sidebar = document.getElementById('adventureSidebar');
        if (sidebar) sidebar.classList.add('hidden');
    },

    start(overrideConfig = null) {
        // Clear Adventure Log
        const logContainer = document.getElementById('adventureLog');
        logContainer.innerHTML = '';

        // Merge Defaults
        const config = {
            cell: this.defaultPartyConfig.cell,
            resources: { ...this.defaultPartyConfig.resources }
        };

        if (overrideConfig) {
            if (overrideConfig.cell !== undefined) config.cell = overrideConfig.cell;
            if (overrideConfig.resources) {
                config.resources = { ...config.resources, ...overrideConfig.resources };
            }
        }

        // Determine Start Cell
        let startCell = config.cell;
        if (startCell === -1) {
            // Default Random Logic
            if (this.accessibleCells.length > 0) {
                const randomId = this.accessibleCells[Math.floor(Math.random() * this.accessibleCells.length)];
                startCell = randomId;
            } else {
                // Fallback
                const validCells = graphData.filter(c => c.b !== marineBiomeId);
                if (validCells.length > 0) {
                    const random = validCells[Math.floor(Math.random() * validCells.length)];
                    startCell = random.i;
                }
            }
        }

        if (startCell !== -1) {
            // Apply Config to Party Status
            this.party.cell = startCell;
            this.party = { ...this.party, ...config.resources };

            // Emit Event
            this.events.emit('start', this.party);

            this.partyElement.style.display = "block";

            // Spawn Missions based on Options
            MissionTreasure.spawn();
            MissionBattle.spawn();
            MissionHunt.spawn();
            MissionDiplomacy.spawn();
            MissionSiege.spawn();
            MissionExplore.spawn();

            this.updateStats();
            this.render();

            // Trigger Start Ping (Use actual party cell in case it was moved)
            const startNode = graphData[this.party.cell];
            if (startNode) {
                this.showLocationPing(startNode.p[0], startNode.p[1]);
            }

            // Initial message
            this.showFeedback("Adventure started! Click to move.");
        } else {
            console.error("No valid land cell found");
        }
    },

    async handleClick(target) {
        if (!this.active) return;
        this.drawPreviewPath([]);
        this.movementId++;
        const cellId = this.getTargetCellId(target);

        if (cellId !== null) {
            const isWater = graphData[cellId].b === marineBiomeId;

            if (!this.party.onShip && isWater) {
                this.showFeedback("Cannot move to water!");
                return;
            }
            if (this.party.onShip && !isWater && !this.isPort(cellId)) {
                this.showFeedback("Must dock at a Port!");
                return;
            }

            const path = this.findPath(this.party.cell, cellId);
            if (path && path.length > 0) {
                this.drawPath(path);
                await this.moveAlongPath(path);
                this.drawPath([]); // Clear after
            } else {
                this.showFeedback("No path found (or too far/blocked)!");
            }
        }
    },

    handleRightClick(target) {
        if (!this.active) return;
        if (this.isMoving) return;

        const cellId = this.getTargetCellId(target);
        if (cellId !== null) {
            const isWater = graphData[cellId].b === marineBiomeId;

            if (!this.party.onShip && isWater) {
                this.showFeedback("Cannot preview path to water!");
                return;
            }
            // Pathfinding/Preview
            const path = this.findPath(this.party.cell, cellId);
            if (path && path.length > 0) {
                this.drawPreviewPath(path);
                this.showFeedback(`Path distance: ${path.length} steps`);
            } else {
                this.showFeedback("No path possible");
            }
        }
    },

    getTargetCellId(target) {
        let cellId = null;
        if (target.getAttribute('data-cell-id')) {
            const id = target.getAttribute('data-cell-id');
            cellId = parseInt(id);
        } else if (target.classList.contains('burg-dot')) {
            // Fallback
            const cx = parseFloat(target.getAttribute('cx'));
            const cy = parseFloat(target.getAttribute('cy'));
            cellId = this.findCellAt(cx, cy);
        }
        return cellId;
    },

    findCellAt(x, y) {
        let minDist = Infinity;
        let closest = -1;

        for (let i = 0; i < graphData.length; i++) {
            const c = graphData[i];
            const dx = c.p[0] - x;
            const dy = c.p[1] - y;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                closest = i;
            }
        }
        return closest;
    },

    // Helper to check if a cell is a port (adjacent to water)
    isPort(cellId) {
        if (!graphData[cellId]) return false;
        // Check if itself is water
        if (graphData[cellId].b === marineBiomeId) return false;

        const neighbors = graphData[cellId].c;
        return neighbors.some(n => graphData[n].b === marineBiomeId);
    },

    findPath(start, end) {
        if (start === end) return [];

        const queue = [start];
        const cameFrom = {};
        cameFrom[start] = null;

        let visited = 0;
        const limit = 5000;

        while (queue.length > 0) {
            const current = queue.shift();
            visited++;
            if (visited > limit) return null;

            if (current === end) break;

            const neighbors = graphData[current].c;
            for (let next of neighbors) {
                if (!graphData[next]) continue;

                const isWater = graphData[next].b === marineBiomeId;
                const isPort = this.isPort(next);

                // Movement Logic
                let canMove = false;
                if (this.party.onShip) {
                    const currentIsWater = graphData[current].b === marineBiomeId;

                    if (currentIsWater) {
                        // From Water:
                        // 1. To Water (always allowed)
                        // 2. To Port (Docking) - ONLY if 'current' is the designated docking point for 'next'
                        if (isWater) {
                            canMove = true;
                        } else if (isPort && next === end) {
                            // Check valid docking point
                            if (this.portDockingCells[next] === current) {
                                canMove = true;
                            }
                        }
                    } else {
                        // From Land (Port) - we are docked:
                        // 1. To Water (Leaving Dock) - ONLY to the designated docking point
                        // 2. To Land/Port (NEVER allowed)
                        if (isWater) {
                            // Check if 'next' is the designated docking point for 'current' (Port)
                            if (this.portDockingCells[current] === next) {
                                canMove = true;
                            }
                        }
                    }
                } else {
                    // On land: Can move to Land (including ports)
                    if (!isWater) canMove = true;
                }

                if (canMove) {
                    if (!(next in cameFrom)) {
                        queue.push(next);
                        cameFrom[next] = current;
                    }
                }
            }
        }

        if (!(end in cameFrom)) return null;

        const path = [];
        let curr = end;
        while (curr !== start) {
            path.push(curr);
            curr = cameFrom[curr];
        }
        return path.reverse();
    },

    // Generic Helper for Missions
    handleMissionClick(mission, index = null) {
        if (!this.active) return;

        this.drawPreviewPath([]);
        this.movementId++;

        let targetCell = null;
        if (index !== null) {
            targetCell = mission.getTargetCell(index);
        } else {
            targetCell = mission.getTargetCell();
        }

        if (!targetCell) return;

        const path = this.findPath(this.party.cell, targetCell);

        if (path && path.length > 0) {
            this.drawPath(path);
            this.moveAlongPath(path).then(() => {
                this.drawPath([]);
            });
        } else if (this.party.cell === targetCell) {
            if (index !== null) {
                mission.onArrival(index);
            } else {
                mission.onArrival();
            }
        } else {
            if (this.party.onShip) {
                this.showFeedback("Cannot reach destination! (Check water path)");
            } else {
                this.showFeedback("Cannot reach destination! (Check land path)");
            }
        }
    },

    async moveAlongPath(path) {
        this.isMoving = true;
        const currentId = this.movementId;
        const startedWithFood = this.party.food > 0;

        for (let nextCell of path) {
            if (this.movementId !== currentId) {
                return;
            }

            if (!this.party.onShip) {
                if (this.party.food > 0) {
                    this.party.food--;
                    // Floating text for food consumption
                    const cellData = graphData[this.party.cell];
                    if (cellData) this.showFloatingText("-1 🍎", cellData.p[0], cellData.p[1], "#e74c3c");
                } else {
                    // Starving
                    if (startedWithFood) {
                        this.showFeedback("Out of food! Travel interrupted.");
                        this.isMoving = false;
                        return;
                    }

                    // Penalty for moving while starving
                    this.showFeedback("Party is starving! Soldiers dying...");
                    this.party.soldiers = Math.max(0, this.party.soldiers - 1);

                    const cellData = graphData[this.party.cell];
                    if (cellData) {
                        this.showFloatingText("-1 ⚔️", cellData.p[0], cellData.p[1], "#e74c3c");
                    }

                    if (this.party.soldiers === 0) {
                        this.showFeedback("Game Over! All soldiers died.");
                        this.isMoving = false;
                        this.updateStats();
                        return;
                    }
                }
            }

            this.party.cell = nextCell;
            this.updateStats();
            this.render();

            const remainingIndex = path.indexOf(nextCell);
            if (remainingIndex > -1) {
                this.drawPath(path.slice(remainingIndex));
            }

            await new Promise(r => setTimeout(r, 150));
        }
        this.isMoving = false;
        this.checkForArrival();
    },

    checkForArrival() {
        if (this.party.cell === -1) return;

        const missions = [MissionTreasure, MissionBattle, MissionHunt, MissionSiege, MissionExplore];
        for (let m of missions) {
            if (m.data) {
                const target = m.data.armyCell || m.data.cell;
                if (target === this.party.cell) {
                    if (m.onArrival) {
                        m.onArrival();
                        return;
                    }
                }
            }
            if (m.locations) {
                for (let i = 0; i < m.locations.length; i++) {
                    if (m.locations[i] && m.locations[i].cell === this.party.cell) {
                        m.onArrival(i);
                        return;
                    }
                }
            }
        }

        const burg = burgsData.find(b => b.cell_id === this.party.cell);
        if (burg) {
            this.showBurgPopup(burg);
        }
    },

    // Helper to generate mini stats bar for modals (Small Top-Right)
    getModalStatsBarHtml() {
        if (!this.active) return '';
        // Compact version: Icons + Numbers only. Matches Map Banner Order.
        return `
            <div class="modal-stats-bar">
                <span title="Soldiers">🛡️ <span class="adv-stat-soldiers">${this.party.soldiers}</span></span>
                <span title="Tools">🛠️ <span class="adv-stat-tools">${this.party.tools}</span></span>
                <span title="Food">🍎 <span class="adv-stat-food">${this.party.food}</span></span>
                <span title="Gold">💰 <span class="adv-stat-gold">${this.party.gold}</span></span>
            </div>
        `;
    },

    // UI Helpers
    openPopup(htmlContent) {
        if (!this.popupElement) {
            this.popupElement = document.createElement('div');
            this.popupElement.className = 'burg-popup';
            document.body.appendChild(this.popupElement);
        }

        let overlay = document.getElementById('modalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalOverlay';
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';

        // Intelligent Injection: Try to put it before "actions" div for better flow
        let finalHtml = htmlContent;
        const statsHtml = this.getModalStatsBarHtml();

        if (finalHtml.includes('<div class="actions">')) {
            finalHtml = finalHtml.replace('<div class="actions">', statsHtml + '<div class="actions">');
        } else {
            // Fallback: Prepend
            finalHtml = statsHtml + finalHtml;
        }

        this.popupElement.innerHTML = finalHtml;
        this.popupElement.style.display = 'block';
    },

    closePopup() {
        if (this.popupElement) {
            this.popupElement.style.display = 'none';
        }
        const overlay = document.getElementById('modalOverlay');
        if (overlay) overlay.style.display = 'none';
    },

    showBurgPopup(burg) {
        if (!this.popupElement) {
            this.popupElement = document.createElement('div');
            this.popupElement.className = 'burg-popup';
            document.body.appendChild(this.popupElement);
        }

        let notificationHtml = '';
        const netFood = parseFloat(burg.net_food);

        // Allow campaigns to intervene (e.g. block replenishment)
        const eventData = { burg, preventReplenish: false };
        this.events.emit('beforeBurgPopup', eventData);

        if (!eventData.preventReplenish && netFood > 0) {
            const surplusCap = Math.floor(netFood);
            if (this.party.food < surplusCap) {
                const gained = surplusCap - this.party.food;
                this.party.food = surplusCap;
                notificationHtml = `<div class="notification">Abundant food! Supplies reset to ${surplusCap}.</div>`;

                const burgCell = graphData[burg.cell_id]; // Need coordinates
                if (burgCell) {
                    this.showFloatingText(`+${gained} 🍎`, burgCell.p[0], burgCell.p[1], "#2ecc71"); // Green for gain
                }

                this.updateStats();
            }
        }

        let overlay = document.getElementById('modalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalOverlay';
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';

        const craftsmanQuartiers = burg.craftsman_quartiers || 0;
        const toolsAmount = Math.min(craftsmanQuartiers, 5);
        const canBuyTools = craftsmanQuartiers > 0;

        const soldierQuartiers = burg.soldier_quartiers || 0;
        const soldierCost = Math.max(1, 6 - soldierQuartiers);
        const canRecruit = soldierQuartiers >= 1;

        const isPort = this.isPort(burg.cell_id);
        const onShip = this.party.onShip;

        // --- Allow Button Modification by Event Listeners ---
        const context = {
            burg,
            party: this.party,
            buttons: []
        };

        // Port Actions
        if (isPort && burg.type === "Naval") {
            if (onShip) {
                context.buttons.push({
                    id: 'leave_ship',
                    label: 'Leave Ship ⚓',
                    title: 'Return to land travel',
                    onClick: 'AdventureManager.leaveShip()',
                    style: 'background-color: #34495e;',
                    class: 'btn-recruit',
                    disabled: false
                });
            } else {
                context.buttons.push({
                    id: 'rent_ship',
                    label: 'Rent Ship (5 💰) ⛵',
                    title: 'Rent a ship for water travel (5 💰)',
                    onClick: 'AdventureManager.rentShip(5)',
                    style: 'background-color: #2980b9;',
                    class: 'btn-buy',
                    disabled: false
                });
            }
        }

        // Buy Food
        context.buttons.push({
            id: 'buy_food',
            label: 'Buy 10 Food (1 💰)',
            title: '1 Gold for 10 Food',
            onClick: 'AdventureManager.buyFood(10, 1)',
            class: 'btn-buy',
            disabled: false
        });

        // Standard Diplomacy
        if (MissionDiplomacy.targets.includes(burg.id)) {
            context.buttons.push({
                id: 'standard_diplomacy',
                label: 'Diplomatic Mission (5 💰)',
                title: 'Solve diplomatic issue',
                onClick: `MissionDiplomacy.resolve(${burg.id})`,
                style: 'background-color: #4169E1;',
                class: 'btn-recruit',
                disabled: false
            });
        }



        // Recruit
        if (canRecruit) {
            context.buttons.push({
                id: 'recruit_soldiers',
                label: `Recruit 5 Soldiers (${soldierCost} 💰, 5 🛠️)`,
                title: `Recruit 5 soldiers for 5 Tools and 5 Gold.`,
                onClick: `AdventureManager.recruitSoldiers(5, ${soldierCost}, ${burg.cell_id})`,
                class: 'btn-recruit',
                disabled: false
            });
        }

        // Buy Tools
        if (canBuyTools) {
            context.buttons.push({
                id: 'buy_tools',
                label: `Buy ${toolsAmount} Tools (1 💰)`,
                title: `1 Gold for an amount of Tools equal to Craftsmen Quartiers`,
                onClick: `AdventureManager.buyTools(${toolsAmount}, 1)`,
                class: 'btn-buy',
                disabled: false
            });
        }


        // 2. Emit Event to allow Listeners (Siege, Campaigns) to modify buttons
        this.events.emit('burgPopupOpened', context);

        // 3. Render Buttons
        let actionsHtml = context.buttons.map(btn => {
            const style = btn.style ? `style="${btn.style}"` : '';
            const cls = btn.class || 'btn-recruit'; // default class
            const disabled = btn.disabled ? 'disabled' : '';
            return `<button class="${cls}" ${style} onclick="${btn.onClick}" title="${btn.title}" ${disabled}>${btn.label}</button>`;
        }).join('\n');

        // Always add Leave button at the end
        actionsHtml += `\n<button class="btn-leave" onclick="AdventureManager.closePopup()">Leave</button>`;

        if (burg.capital) {
            this.popupElement.classList.add('capital-popup');
        } else {
            this.popupElement.classList.remove('capital-popup');
        }

        // Content Buffer to build HTML
        let html = `
            <h2>${burg.name}</h2>
            <div class="content-wrapper">
                <div class="info">
                    Type: ${burg.type}<br>
                    Pop: ${burg.population_fmt}<br>
                    Food Surplus: ${Math.floor(parseFloat(burg.net_food))}<br>
                    ${craftsmanQuartiers > 0 ? `Craftsman Quartiers: ${craftsmanQuartiers}<br>` : ''}
                    ${soldierQuartiers > 0 ? `Soldier Quartiers: ${soldierQuartiers}<br>` : ''}
                </div>
                ${notificationHtml}
            </div>
            ${this.getModalStatsBarHtml()}
            <div class="actions">
                ${actionsHtml}
            </div>
        `;

        this.popupElement.innerHTML = html;
        this.popupElement.style.display = 'block';
    },

    rentShip(cost) {
        if (this.party.gold >= cost) {
            this.party.gold -= cost;
            this.party.onShip = true;
            this.updateStats();
            this.showFeedback("Ship rented! Water travel enabled ⛵");

            const cell = graphData[this.party.cell];
            if (cell) {
                this.showFloatingText(`-${cost} 💰`, cell.p[0], cell.p[1], "#e74c3c");
                this.showFloatingText(`+Ship ⛵`, cell.p[0], cell.p[1] - 20, "#3498db");
            }

            this.closePopup();
            this.render();
        } else {
            this.showFeedback("Not enough gold!");
        }
    },

    leaveShip() {
        this.party.onShip = false;
        this.showFeedback("Returned to land ⛺");
        this.closePopup();
        this.render();
    },

    buyFood(amount, cost) {
        if (this.party.gold >= cost) {
            this.party.gold -= cost;
            this.party.food += amount;
            this.updateStats();

            const cell = graphData[this.party.cell];
            if (cell) {
                this.showFloatingText(`-${cost} 💰`, cell.p[0], cell.p[1], "#e74c3c");
                this.showFloatingText(`+${amount} 🍎`, cell.p[0], cell.p[1] - 20, "#2ecc71");
            }
        } else {
            this.showFeedback("Not enough gold!");
        }
    },

    buyTools(amount, cost) {
        if (this.party.gold >= cost) {
            this.party.gold -= cost;
            this.party.tools += amount;
            this.updateStats();

            const cell = graphData[this.party.cell];
            if (cell) {
                this.showFloatingText(`-${cost} 💰`, cell.p[0], cell.p[1], "#e74c3c");
                this.showFloatingText(`+${amount} 🛠️`, cell.p[0], cell.p[1] - 20, "#f1c40f");
            }
        } else {
            this.showFeedback("Not enough gold!");
        }
    },

    recruitSoldiers(amount, cost, burgCellId) {
        const burg = burgsData.find(b => b.cell_id === burgCellId);

        if (!burg) {
            console.error("Burg not found for recruitment");
            return;
        }

        const availableQuartiers = burg.soldier_quartiers || 0;
        if (availableQuartiers < 1) {
            this.showFeedback("No military quarters available!");
            return;
        }

        const toolsCost = 5;

        if (this.party.gold >= cost && this.party.tools >= toolsCost) {
            this.party.gold -= cost;
            this.party.tools -= toolsCost;
            this.party.soldiers += amount;

            this.updateStats();

            const cell = graphData[this.party.cell];
            if (cell) {
                this.showFloatingText(`-${cost} 💰`, cell.p[0], cell.p[1], "#e74c3c");
                this.showFloatingText(`-${toolsCost} 🛠️`, cell.p[0], cell.p[1] - 20, "#e74c3c");
                this.showFloatingText(`+${amount} ⚔️`, cell.p[0], cell.p[1] - 40, "#9b59b6");
            }
        } else {
            if (this.party.gold < cost) {
                this.showFeedback("Not enough gold!");
            } else {
                this.showFeedback("Not enough tools!");
            }
        }
    },

    render() {
        const cell = graphData[this.party.cell];
        if (cell && this.partyElement) {
            this.partyElement.setAttribute('transform', `translate(${cell.p[0]}, ${cell.p[1]})`);

            if (this.party.onShip) {
                if (this.partyBg) this.partyBg.setAttribute('fill', '#2980b9'); // Blue
            } else {
                if (this.partyBg) this.partyBg.setAttribute('fill', '#e67e22'); // Pumpkin
            }
        }

        if (this.options.Treasure) MissionTreasure.updateVisuals();
        if (this.options.Battle) MissionBattle.updateVisuals();
        if (this.options.Hunt) MissionHunt.updateVisuals();
        if (this.options.Siege) MissionSiege.updateVisuals();
        if (this.options.Diplomacy) MissionDiplomacy.updateVisuals();
        if (this.options.Explore) MissionExplore.updateVisuals();

        if (this.events) this.events.emit('render', null);
    },

    updateStats() {
        // Update all elements with the specific stat class
        document.querySelectorAll('.adv-stat-soldiers').forEach(el => el.textContent = this.party.soldiers);
        document.querySelectorAll('.adv-stat-food').forEach(el => el.textContent = this.party.food);
        document.querySelectorAll('.adv-stat-gold').forEach(el => el.textContent = this.party.gold);
        document.querySelectorAll('.adv-stat-tools').forEach(el => el.textContent = this.party.tools);

        // Also update legacy IDs if they exist (Header Banner)
        if (document.getElementById('advSoldiers')) document.getElementById('advSoldiers').textContent = this.party.soldiers;
        if (document.getElementById('advFood')) document.getElementById('advFood').textContent = this.party.food;
        if (document.getElementById('advGold')) document.getElementById('advGold').textContent = this.party.gold;
        if (document.getElementById('advTools')) document.getElementById('advTools').textContent = this.party.tools;

        if (this.events) this.events.emit('updateStats', this.party);

        // Game Over Check
        if (this.party.soldiers <= 0 && this.active) {
            this.showFeedback("GAME OVER! All soldiers are dead.");
            // Prevent further updates/clicks
            const modal = document.getElementById('gameOverModal');
            if (modal) {
                modal.style.display = 'flex';
                this.isGameOver = true; // Flag to prevent movement
            }
        }

        // Win Condition Check
        if (this.active && !this.hasWon && !this.isGameOver) {
            if (this.party.soldiers >= 300 &&
                this.party.food >= 300 &&
                this.party.gold >= 300 &&
                this.party.tools >= 300) {

                this.hasWon = true;
                this.showWinModal();
            }
        }
    },

    showWinModal() {
        const modal = document.getElementById('gameWonModal');
        if (modal) {
            modal.style.display = 'flex';
            this.isGameOver = true; // Pause movement/interaction while modal is open
        }
    },

    closeWinModal() {
        const modal = document.getElementById('gameWonModal');
        if (modal) modal.style.display = 'none';
        this.isGameOver = false; // Resume play
        // hasWon remains true, so it won't trigger again
        this.showFeedback("You continue your adventure as a legend!");
    },

    exitAdventureMode() {
        const modal = document.getElementById('gameWonModal');
        if (modal) modal.style.display = 'none';
        this.isGameOver = false;
        this.toggle(); // Turn off adventure mode
    },

    closeGameOver() {
        const modal = document.getElementById('gameOverModal');
        if (modal) modal.style.display = 'none';
        // User wants to look around, so we don't toggle() or reset.
        // isGameOver remains true, blocking movement.
    },

    restartGame() {
        const modal = document.getElementById('gameOverModal');
        if (modal) modal.style.display = 'none';
        this.isGameOver = false;

        // Reset and Start New
        if (this.active) this.toggle(); // Turn off first if on
        this.toggle(); // Turn on
        this.start(); // Start new
    },

    showFeedback(msg) {
        // Log to sidebar instead of tooltip
        const log = document.getElementById('adventureLog');
        if (log) {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.textContent = msg;
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight; // Auto scroll
        } else {
            // Fallback
            console.log(msg);
        }
    },

    drawPath(path) {
        if (!this.pathElement) return;

        if (!path || path.length === 0) {
            this.pathElement.style.display = "none";
            return;
        }

        const points = path.map(id => {
            const cell = graphData[id];
            return cell ? `${cell.p[0]},${cell.p[1]}` : "";
        }).join(" ");

        this.pathElement.setAttribute("points", points);
        this.pathElement.style.display = "block";
    },

    drawPreviewPath(path) {
        if (!this.previewPathElement) return;

        if (!path || path.length === 0) {
            this.previewPathElement.style.display = "none";
            return;
        }

        const points = path.map(id => {
            const cell = graphData[id];
            return cell ? `${cell.p[0]},${cell.p[1]}` : "";
        }).join(" ");

        this.previewPathElement.setAttribute("points", points);
        this.previewPathElement.style.display = "block";
    },

    toggleOptions() {
        const modal = document.getElementById('adventureOptionsModal');
        if (modal.style.display === 'block') {
            modal.style.display = 'none';
        } else {
            modal.style.display = 'block';
        }
    },

    toggleMissionOption(type, enabled) {
        if (this.options.hasOwnProperty(type)) {
            this.options[type] = enabled;
            this.showFeedback(`${type} missions ${enabled ? 'enabled' : 'disabled'}`);

            // Live update for active adventure
            if (this.active) {
                const missionMap = {
                    'Treasure': MissionTreasure,
                    'Battle': MissionBattle,
                    'Hunt': MissionHunt,
                    'Diplomacy': MissionDiplomacy,
                    'Siege': MissionSiege,
                    'Explore': MissionExplore
                };

                const mission = missionMap[type];
                if (mission) {
                    if (enabled) {
                        mission.toggle(true);
                    } else {
                        mission.toggle(false); // Hide visuals
                    }
                    this.render();
                }
            }
        }
    },

    showLocationPing(x, y) {
        const svg = document.getElementById('mapSvg');
        if (!svg) return;

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", "120"); // Start Big
        circle.setAttribute("fill", "none");
        circle.setAttribute("stroke", "#e74c3c"); // Alizarin Red
        circle.setAttribute("stroke-width", "1");
        circle.style.pointerEvents = "none";
        circle.style.opacity = "0"; // Start invisible
        circle.style.transition = "all 2.0s ease-out"; // Slower (2.5s)
        circle.style.zIndex = "200";

        svg.appendChild(circle);

        // Trigger animation in next frame
        requestAnimationFrame(() => {
            circle.setAttribute("r", "15"); // End Small (Pinpoint)
            circle.style.opacity = "1";   // Fade In
            circle.style.strokeWidth = "5"; // Thicker stroke
        });

        // Cleanup after animation + delay
        setTimeout(() => {
            circle.style.transition = "opacity 0.5s ease-out";
            circle.style.opacity = "0";

            setTimeout(() => {
                if (circle.parentNode) {
                    circle.parentNode.removeChild(circle);
                }
            }, 500);

        }, 2000); // Wait for main animation (2.5s)
    },

    showFloatingText(text, x, y, color = "#fff") {
        const svg = document.getElementById('mapSvg');
        if (!svg) return;

        const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textEl.setAttribute("x", x);
        textEl.setAttribute("y", y);
        textEl.setAttribute("text-anchor", "middle"); // Center
        textEl.setAttribute("fill", color);
        textEl.setAttribute("font-size", "14px");
        textEl.setAttribute("font-weight", "bold");
        textEl.setAttribute("stroke", "#000");
        textEl.setAttribute("stroke-width", "0.5px"); // Outline for readability
        textEl.style.pointerEvents = "none";
        textEl.style.zIndex = "300"; // Topmost
        textEl.textContent = text;

        // Inline styles for animation
        textEl.style.opacity = "1";
        textEl.style.transition = "transform 2.5s ease-out, opacity 2.5s ease-out";

        svg.appendChild(textEl);

        // Animate
        requestAnimationFrame(() => {
            textEl.style.transform = `translateY(-30px)`; // Float up
            textEl.style.opacity = "0"; // Fade out
        });

        // Cleanup
        setTimeout(() => {
            if (textEl.parentNode) {
                textEl.parentNode.removeChild(textEl);
            }
        }, 2500);
    }
};

window.toggleAdventureMode = () => AdventureManager.toggle();
window.AdventureManager = AdventureManager;


const tablesWrapper = document.querySelector('.tables-wrapper');

// --- Global Click Delegation ---
document.body.addEventListener('click', (e) => {
    const target = e.target;

    // Adventure Mode Map Clicks
    if (AdventureManager.active && target.closest('#mapSvg')) {
        return AdventureManager.handleClick(target);
    }

    // Map Elements
    if (target.classList.contains('burg-dot')) {
        return selectBurg(target.getAttribute('data-id'));
    }
    if (target.hasAttribute('data-state-id')) {
        return window.selectState && selectState(target.getAttribute('data-state-id'));
    }

    // Generic Action (data-click-action="Object.method" or "func")
    const action = target.getAttribute('data-click-action');
    if (action) {
        const [obj, method] = action.split('.');
        return method ? window[obj][method]() : window[action]();
    }

    // Specific UI Interactions
    if (target.hasAttribute('data-dropdown-toggle')) {
        return toggleDropdown(target.getAttribute('data-dropdown-toggle'));
    }
    if (target.hasAttribute('data-game-mode')) {
        return selectGameMode(target.getAttribute('data-game-mode'));
    }

    // Table Interactions
    const th = target.closest('th');
    if (th?.hasAttribute('data-sort-col')) {
        return sortTable(parseInt(th.getAttribute('data-sort-col')), th, th.getAttribute('data-sort-table'));
    }

    const tr = target.closest('tr');
    if (tr) {
        if (tr.hasAttribute('data-burg-id')) {
            return highlightBurg(tr.getAttribute('data-burg-id'));
        }
        if (tr.hasAttribute('data-state-name')) {
            return highlightState(tr.getAttribute('data-state-name'), tr.getAttribute('data-state-color'));
        }
        if (tr.hasAttribute('data-trade-from')) {
            return highlightTradeRoute(tr, tr.getAttribute('data-trade-from'), tr.getAttribute('data-trade-to'));
        }
    }
});

// --- Global Change Delegation ---
document.body.addEventListener('change', ({ target }) => {
    if (target.type === 'checkbox') {
        const action = target.getAttribute('data-change-action');
        if (action === 'toggleAllTypes') toggleAllTypes(target);
        if (action === 'toggleAllStates') toggleAllStates(target);
        if (action === 'toggleLayer') toggleLayer(target.getAttribute('data-layer-class'));
        if (action === 'filterTable') filterTable();

        if (target.hasAttribute('data-mission-toggle') && AdventureManager) {
            AdventureManager.toggleMissionOption(target.getAttribute('data-mission-toggle'), target.checked);
        }
    } else if (target.tagName === 'SELECT') {
        if (target.getAttribute('data-change-action') === 'CampaignManager.selectCampaign') {
            CampaignManager.selectCampaign(target.value);
        }
    }
});

// --- Map Context Menu ---
svg.addEventListener('contextmenu', (e) => {
    if (AdventureManager.active) {
        e.preventDefault();
        AdventureManager.handleRightClick(e.target);
    }
});

// --- Tooltips ---
const showTooltip = (content, x, y) => {
    tooltip.innerHTML = content;
    tooltip.style.display = 'block';

    let top = y + 10;
    if (top + 100 > window.innerHeight) top = y - 100;
    tooltip.style.left = (x + 10) + 'px';
    tooltip.style.top = top + 'px';
};



function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.display = 'none';
}

document.body.addEventListener('mousemove', (e) => {
    const target = e.target;

    // 1. Generic Data Tooltip (e.g., UI Labels)
    const tooltipTarget = target.closest('[data-tooltip]');
    if (tooltipTarget) {
        return showTooltip(tooltipTarget.getAttribute('data-tooltip'), e.clientX, e.clientY);
    }

    // 2. Burg Tooltip
    if (target.classList.contains('burg-dot')) {
        const d = target.dataset;
        const displayName = target.classList.contains('capital') ? `★ ${d.name}` : d.name;
        let content = `<strong>${displayName}</strong><br>State: ${d.state}<br>Type: ${d.type}<br>Pop: ${parseInt(d.pop).toLocaleString()}<br>Food: ${d.food}<br>Gold: ${d.gold}`;
        if (d.quartiers) content += `<hr style="margin:5px 0;border-top:1px solid rgba(255,255,255,0.3)">${d.quartiers}`;
        return showTooltip(content, e.clientX, e.clientY);
    }

    // 3. Table Tooltip
    if (target.classList.contains('quartier-cell')) {
        const details = target.getAttribute('data-details');
        if (details) return showTooltip(details, e.clientX, e.clientY);
    }

    // 4. Map Cell Tooltip (Cells)
    if (target.tagName === 'path' && target.closest('#mapBackground')) {
        const modeBtn = document.getElementById('mapModeBtn');
        const mode = modeBtn ? (modeBtn.getAttribute('data-current-mode') || 'biome') : 'biome';

        const d = target.dataset;
        let content = '';

        if (mode === 'biome') {
            content = `<strong>Biome</strong><br>${d.biome}`;
        } else if (mode === 'state') {
            content = `<strong>State</strong><br>${d.state}`;
        } else if (mode === 'heightmap') {
            content = `<strong>Height</strong><br>${d.height}`;
        } else if (mode === 'temperature') {
            content = `<strong>Temperature</strong><br>${d.temp}°C`;
        } else {
            content = `<strong>${d.stateName}</strong><br>Biome: ${d.biome}`;
        }

        return showTooltip(content, e.clientX, e.clientY);
    }

    // 5. No match -> Hide Tooltip
    hideTooltip();
});
// Ensure hide on leave
if (mapContainer) mapContainer.addEventListener('mouseleave', hideTooltip);
if (tablesWrapper) tablesWrapper.addEventListener('mouseleave', hideTooltip);

// --- Pan and Zoom (Mouse & Touch) ---
let isPanning = false;
let startX, startY;
let viewBox = svg.getAttribute('viewBox').split(' ').map(parseFloat);
const updateViewBox = () => svg.setAttribute('viewBox', viewBox.join(' '));

mapContainer.addEventListener('mousedown', (e) => {
    if (['svg', 'circle', 'line', 'path'].includes(e.target.tagName) || e.target === svg) {
        isPanning = true;
        startX = e.clientX;
        startY = e.clientY;
        mapContainer.style.cursor = 'grabbing';
    }
});

mapContainer.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    e.preventDefault();
    const w = mapContainer.clientWidth;
    const h = mapContainer.clientHeight;
    viewBox[0] -= (e.clientX - startX) * (viewBox[2] / w);
    viewBox[1] -= (e.clientY - startY) * (viewBox[3] / h);
    updateViewBox();
    startX = e.clientX;
    startY = e.clientY;
});

const stopPan = () => {
    isPanning = false;
    mapContainer.style.cursor = 'default';
};
mapContainer.addEventListener('mouseup', stopPan);
mapContainer.addEventListener('mouseleave', stopPan);

mapContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    const oldW = viewBox[2];
    const oldH = viewBox[3];
    viewBox[2] *= scale;
    viewBox[3] *= scale;
    viewBox[0] -= (viewBox[2] - oldW) / 2;
    viewBox[1] -= (viewBox[3] - oldH) / 2;
    updateViewBox();
});

// Touch Logic
let isTouchPanning = false;
let touchStartX = 0;
let touchStartY = 0;
let initialPinchDistance = null;
const getDist = (ts) => Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);

mapContainer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        isTouchPanning = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        isTouchPanning = false;
        initialPinchDistance = getDist(e.touches);
    }
}, { passive: false });

mapContainer.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isTouchPanning) {
        const sensitivity = 1.25;
        viewBox[0] -= (e.touches[0].clientX - touchStartX) * (viewBox[2] / mapContainer.clientWidth) * sensitivity;
        viewBox[1] -= (e.touches[0].clientY - touchStartY) * (viewBox[3] / mapContainer.clientHeight) * sensitivity;
        updateViewBox();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    } else if (e.touches.length === 2 && initialPinchDistance > 0) {
        const dist = getDist(e.touches);
        const scale = initialPinchDistance / dist;
        const oldW = viewBox[2];
        const oldH = viewBox[3];
        viewBox[2] *= scale;
        viewBox[3] *= scale;
        viewBox[0] -= (viewBox[2] - oldW) / 2;
        viewBox[1] -= (viewBox[3] - oldH) / 2;
        updateViewBox();
        initialPinchDistance = dist;
    }
}, { passive: false });

mapContainer.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) initialPinchDistance = null;
    if (e.touches.length === 0) isTouchPanning = false;
    if (e.touches.length === 1) {
        isTouchPanning = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }
});


/* Campaign Mode Logic */

// Base Class for all Campaigns
class BaseCampaign {
    constructor(id, name, description) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.active = false;
        this.objectives = [];
        this.startConfig = null;
    }

    // Lifecycle Hooks
    onStart() {
        this.active = true;
        console.log(`Campaign '${this.name}' Started.`);
    }

    onEnd() {
        this.active = false;
        this.clearHighlights();
        console.log(`Campaign '${this.name}' Ended.`);
    }

    // Configuration Hooks
    getPartyStartConfig() {
        return this.partyStartConfig || {};
    }

    // Event Handlers
    onAdventureStart() {
        if (this.partyStartConfig) {
            AdventureManager.updateStats();
        }
    }
    onMissionStart(data) { }
    onMissionComplete(data) { }
    onBeforeMissionSpawn(data) { }
    onBeforeBurgPopup(data) { }
    onBurgPopupOpened(context) { }
    onUpdateStats(party) {
        if (!this.active) return;
        this.checkObjectives(party);
    }

    // Internal Logic
    addObjective(id, text, type, checkFn) {
        this.objectives.push({ id, text, type, checkFn, completed: false });
    }

    renderObjectives() {
        const list = document.getElementById('objectivesList');
        list.innerHTML = "";
        this.objectives.forEach(obj => {
            const li = document.createElement('li');
            li.textContent = obj.text;
            if (obj.completed) li.classList.add('completed');
            list.appendChild(li);
        });
    }

    checkObjectives(party) {
        let changed = false;
        this.objectives.forEach(obj => {
            if (obj.completed) return;
            if (obj.checkFn(party)) {
                obj.completed = true;
                changed = true;
                AdventureManager.showFeedback(`Objective Complete: ${obj.text}`);
            }
        });

        if (changed) {
            this.renderObjectives();
            this.checkVictory();
        }
    }

    checkVictory() {
        if (this.objectives.length > 0 && this.objectives.every(o => o.completed)) {
            this.onVictory();
        }
    }

    onVictory() {
        CampaignManager.showCampaignWinModal();
    }

    // Visual Helpers
    highlightCell(cellId, color = "#00ffff") {
        if (!graphData[cellId]) return;

        let x, y;

        // Try to find exact Burg coordinates first for better centering
        const burg = burgsData.find(b => b.cell_id === cellId);
        if (burg) {
            x = burg.x;
            y = burg.y;
        }

        // Fallback to cell center
        if (x === undefined || y === undefined) {
            const cell = graphData[cellId];
            x = cell.p[0];
            y = cell.p[1];
        }

        // Ensure container exists
        let container = document.getElementById('campaignHighlights');
        if (!container) {
            container = document.createElementNS("http://www.w3.org/2000/svg", "g");
            container.setAttribute("id", "campaignHighlights");
            const svg = document.getElementById('mapSvg');
            svg.appendChild(container);
        }

        const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        ring.setAttribute("cx", x);
        ring.setAttribute("cy", y);
        ring.setAttribute("r", "15");
        ring.setAttribute("fill", "none");
        ring.setAttribute("stroke", color);
        ring.setAttribute("stroke-width", "3");
        ring.setAttribute("stroke-dasharray", "4,4");

        // Animation
        const anim = document.createElementNS("http://www.w3.org/2000/svg", "animate");
        anim.setAttribute("attributeName", "r");
        anim.setAttribute("values", "15;35;15");
        anim.setAttribute("dur", "3s");
        anim.setAttribute("repeatCount", "indefinite");
        ring.appendChild(anim);

        container.appendChild(ring);
    }

    clearHighlights() {
        const container = document.getElementById('campaignHighlights');
        if (container) container.innerHTML = "";
    }
}

// ---------------------------------------------------------
// Campaign Manager
// ---------------------------------------------------------

const CampaignManager = {
    active: false,
    currentCampaignInstance: null,

    // Registry of Campaign Classes
    availableCampaigns: [],

    init() {
        this.populateSidebar();
    },

    populateSidebar() {
        const dropdown = document.getElementById('campaignDropdown');
        dropdown.innerHTML = '<option value="" disabled selected>Select a Campaign...</option>';

        this.availableCampaigns.forEach((CampClass, index) => {
            // Instantiate temporarily just to get metadata (or make static)
            // For now, simple instantiation is fine as they are lightweight
            const temp = new CampClass();
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = temp.name;
            opt.title = temp.description;
            dropdown.appendChild(opt);
        });

        // UI Reset
        document.getElementById('campaignObjectives').classList.add('hidden');
        document.getElementById('campaignStartBtn').classList.add('hidden');
        document.getElementById('campaignCancelBtn').classList.add('hidden');
    },

    selectCampaign(index) {
        if (index === "") return;
        const CampClass = this.availableCampaigns[index];
        this.currentCampaignInstance = new CampClass();

        document.getElementById('campaignStartBtn').classList.remove('hidden');
        document.getElementById('campaignCancelBtn').classList.add('hidden'); // Ensure cancel is hidden
        this.currentCampaignInstance.renderObjectives();
        document.getElementById('campaignObjectives').classList.remove('hidden');
    },

    startCampaign() {
        if (!this.currentCampaignInstance) return;

        this.active = true;
        this.active = true;
        AdventureManager.init();
        AdventureManager.active = true;

        AdventureManager.events.on('start', () => this.currentCampaignInstance.onAdventureStart());
        AdventureManager.events.on('updateStats', () => this.currentCampaignInstance.onUpdateStats(AdventureManager.party));
        AdventureManager.events.on('missionStart', (d) => this.currentCampaignInstance.onMissionStart(d));
        AdventureManager.events.on('missionComplete', (d) => this.currentCampaignInstance.onMissionComplete(d));
        AdventureManager.events.on('burgPopupOpened', (d) => this.currentCampaignInstance.onBurgPopupOpened(d));
        AdventureManager.events.on('beforeBurgPopup', (d) => this.currentCampaignInstance.onBeforeBurgPopup(d));
        AdventureManager.events.on('beforeMissionSpawn', (d) => this.currentCampaignInstance.onBeforeMissionSpawn(d));

        this.currentCampaignInstance.onStart(); // Call *before* Adventure start to register listeners

        // AdventureManager starts with current campaign's config
        AdventureManager.start(this.currentCampaignInstance.getPartyStartConfig());
        AdventureManager.showFeedback(`Campaign Started: ${this.currentCampaignInstance.name}`);

        document.getElementById('campaignStartBtn').classList.add('hidden');
        document.getElementById('campaignCancelBtn').classList.remove('hidden'); // Show Cancel
        document.getElementById('campaignDropdown').disabled = true;

        // Show Stats Banner & Options Btn
        const banner = document.getElementById('adventureStatsBanner');
        if (banner) banner.classList.remove('hidden');
        const optionsBtn = document.getElementById('adventureOptionsBtn');
        if (optionsBtn) optionsBtn.classList.remove('hidden');
    },

    showCampaignWinModal() {
        const modal = document.getElementById('campaignVictoryModal');
        if (modal) {
            modal.style.display = 'flex';
            AdventureManager.isGameOver = true;
        }
    },

    cancelCampaign() {
        // 1. Cleanup current campaign
        if (this.currentCampaignInstance) {
            this.currentCampaignInstance.onEnd();
            this.currentCampaignInstance = null;
        }
        this.active = false;

        // 2. Reset Adventure Manager (Ensures fresh start next time)
        AdventureManager.reset();

        // 3. Force Sidebar back open (restore Campaign Menu state)
        const sidebar = document.getElementById('adventureSidebar');
        if (sidebar) sidebar.classList.remove('hidden');

        // Hide Stats Banner & Options Btn
        const banner = document.getElementById('adventureStatsBanner');
        if (banner) banner.classList.add('hidden');
        const optionsBtn = document.getElementById('adventureOptionsBtn');
        if (optionsBtn) optionsBtn.classList.add('hidden');

        // 4. Reset UI Elements to Selection State
        document.querySelector('.sidebar-controls').classList.add('hidden');
        document.getElementById('campaignSelectContainer').classList.remove('hidden');

        // Reset Dropdown & Buttons
        this.populateSidebar();
        document.getElementById('campaignDropdown').disabled = false;

        AdventureManager.showFeedback("Campaign Cancelled.");
    },

    endCampaign() {
        const modal = document.getElementById('campaignVictoryModal');
        if (modal) modal.style.display = 'none';

        AdventureManager.closePopup();

        // Cleanup Instance
        if (this.currentCampaignInstance) {
            this.currentCampaignInstance.onEnd();
            this.currentCampaignInstance = null;
        }
        this.active = false;

        // Reset UI
        document.getElementById('campaignDropdown').disabled = false;
        document.getElementById('campaignDropdown').value = "";
        document.getElementById('campaignStartBtn').classList.add('hidden');
        document.getElementById('campaignCancelBtn').classList.add('hidden');
        document.getElementById('campaignObjectives').classList.add('hidden');

        selectGameMode('free');
        AdventureManager.isGameOver = false;
        AdventureManager.reset();

        document.getElementById('campaignDescription').textContent = "";
    }
};

window.CampaignManager = CampaignManager;


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

        this.partyStartConfig = {
            resources: { soldiers: 20, tools: 20, food: 15, gold: 0 }
        };
    }

    onStart() {
        super.onStart();
    }

    getPartyStartConfig() {
        // Force Spawn
        MissionSiege.onSpawn();

        let startCell = -1;
        // Check where it spawned
        if (MissionSiege.data && MissionSiege.data.burgId) {
            const siegedBurg = burgsData.find(b => b.id === MissionSiege.data.burgId);
            if (siegedBurg) {
                startCell = siegedBurg.cell_id;
                console.log(`SiegeDefenseCampaign: Pre-calculated start at ${siegedBurg.name}`);
            }
        }

        const config = {
            resources: this.partyStartConfig.resources,
            cell: startCell
        };

        return config;
    }

    onBeforeMissionSpawn(data) {
        // Prevent AdventureManager from spawning a random siege, because we already forced one in getStartConfig
        if (data.type === 'siege') {
            data.cancelled = true;
            console.log("SiegeDefenseCampaign: Prevented default Siege spawn (using pre-calculated one).");
        }
    }

    onAdventureStart() {
        super.onAdventureStart();
        // Note: Party Cell is already set by AdventureManager.start(config) now.

        AdventureManager.updateStats();

        // Initial Capture of Siege if it already exists
        // Since we called MissionSiege.onSpawn(), it likely already emitted 'missionStart'.
        // BUT listeners might not have been registered then because we register them in CampaignManager.startCampaign BEFORE calling onStart/getStartConfig?
        // Wait, CampaignManager registers listeners BEFORE calling getStartConfig.
        // So when we called MissionSiege.onSpawn() in getStartConfig, the 'missionStart' event WAS fired.
        // And we are listening to it. So onMissionStart should have been called.

        // Just in case, RE-APPLY to ensure local state is in sync
        if (MissionSiege.data) {
            this.onMissionStart({ type: 'siege', ...MissionSiege.data });
        }
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
        if (burgsData.length > 0) {
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
CampaignManager.availableCampaigns.push(ExplorerCampaign);


class DiplomatCampaign extends BaseCampaign {
    constructor() {
        super("diplomat_v1", "The Diplomat", "Travel to every capital and complete a diplomatic mission.");

        this.visitedCapitals = new Set();
        this.totalCapitals = 0;

        // Navigation Tracking for Constraints
        this.currentBurgId = null;
        this.previousBurgId = null;

        this.addObjective("obj_diplomat", "Complete Diplomat Missions (0/?)", "diplomacy", () => false);
    }

    onStart() {
        super.onStart();

        // 1. Disable Standard Diplomatic Missions via Event Listener
        this._blockDiplomacyHandler = (e) => {
            if (e.type === 'diplomacy') {
                e.cancelled = true;
                console.log("DiplomatCampaign blocked diplomacy mission.");
            }
        };

        AdventureManager.events.on('beforeMissionSpawn', this._blockDiplomacyHandler);


        const initCampaignData = () => {
            console.log("DiplomatCampaign: burgsData length:", burgsData.length);
            const capitals = burgsData.filter(b => b.is_capital);
            console.log("DiplomatCampaign: Found capitals:", capitals.length);
            this.totalCapitals = capitals.length;
            this.updateObjectiveText();

            // Highlight all unvisited capitals
            capitals.forEach(c => this.highlightCell(c.cell_id, "#FFD700")); // Gold highlight
        };

        initCampaignData();
    }

    onEnd() {
        super.onEnd();

        AdventureManager.events.off('beforeMissionSpawn', this._blockDiplomacyHandler);

    }

    updateObjectiveText() {
        const obj = this.objectives.find(o => o.id === "obj_diplomat");
        if (obj) {
            obj.text = `Complete Diplomat Missions (${this.visitedCapitals.size}/${this.totalCapitals})`;
            this.renderObjectives();
        }
    }

    onBurgPopupOpened(context) {
        // 1. Navigation Tracking
        // Only update if it's a NEW burg visited
        if (this.currentBurgId !== context.burg.id) {
            this.previousBurgId = this.currentBurgId;
            this.currentBurgId = context.burg.id;
        }

        // 2. Logic for Capital
        if (!context.burg.is_capital) return;

        // If already visited, maybe show a "Completed" indicator?
        if (this.visitedCapitals.has(context.burg.id)) {
            context.buttons.push({
                id: 'diplomacy_completed',
                label: 'Mission Completed ✅',
                title: 'You have already completed the mission here.',
                onClick: '',
                class: 'btn-recruit', // Keep styling
                disabled: true
            });
            return;
        }

        // 3. Constraints Check
        let isDisabled = false;
        let tooltip = "Complete diplomatic mission (Costs 5 💰)";
        let label = "Diplomatic Mission (5 💰)";

        // Constraint A: Resources
        if (context.party.food < 50 || context.party.gold < 50) {
            isDisabled = true;
            tooltip = "Requires 50 Food and 50 Gold reserve.";
            label += " 🔒";
        }

        // Constraint B: Enemy State
        if (!isDisabled && this.previousBurgId !== null) {
            const prevBurg = burgsData.find(b => b.id === this.previousBurgId);
            if (prevBurg) {
                const prevState = prevBurg.state;
                const currState = context.burg.state;

                // Check Diplomacy
                // data is in 'diplomacyMatrix' (global from map.js)
                // Check Diplomacy
                // data is in 'diplomacyMatrix' (global from map.js)
                if (window.diplomacyMatrix && diplomacyMatrix[prevState]) {
                    const relation = diplomacyMatrix[prevState][currState] || "Unknown";
                    if (relation === "Enemy" || relation === "War") {
                        isDisabled = true;
                        tooltip = `Cannot negotiate! You arrived from ${prevBurg.name} (${pack.states[prevState].name}), an Enemy state.`;
                        label += " ⚔️";
                    }
                }
            }
        }

        // Add Button
        context.buttons.push({
            id: 'diplomacy_mission',
            label: label,
            title: tooltip,
            onClick: `CampaignManager.currentCampaignInstance.completeMission(${context.burg.id})`,
            style: 'background-color: #8e44ad;',
            class: 'btn-recruit',
            disabled: isDisabled
        });
    }

    completeMission(burgId) {
        if (AdventureManager.party.gold < 5) {
            AdventureManager.showFeedback("Not enough Gold (5)!");
            return;
        }

        AdventureManager.party.gold -= 5;
        this.visitedCapitals.add(burgId);

        AdventureManager.showFeedback("Diplomatic Mission Successful!");

        // Floating text
        const burg = burgsData.find(b => b.id === burgId);
        if (burg) {
            // Remove highlight
            // Need to redraw highlights for all EXCEPT visited? Or just clear invalid ones?
            // Since 'highlightCell' adds a generic circle, I can't easily remove just one without ID.
            // Simplest: Clear all and redraw unvisited.
            this.clearHighlights();
            const capitals = burgsData.filter(b => b.is_capital);
            capitals.forEach(c => {
                if (!this.visitedCapitals.has(c.id)) {
                    this.highlightCell(c.cell_id, "#FFD700");
                }
            });

            // Show text
            AdventureManager.showFloatingText("-5 💰", burg.x, burg.y, "#f1c40f");
            AdventureManager.showFloatingText("✅", burg.x, burg.y - 20, "#2ecc71");
        }

        this.updateObjectiveText();
        AdventureManager.updateStats(); // To show gold change
        AdventureManager.closePopup(); // Close to refresh state (or force refresh?)

        // Check Victory
        if (this.visitedCapitals.size >= this.totalCapitals) {
            this.objectives[0].completed = true;
            this.renderObjectives();
            setTimeout(() => this.checkVictory(), 500);
        }
    }
}

// Register Campaign
CampaignManager.availableCampaigns.push(DiplomatCampaign);



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
                    onClick: `CampaignManager.currentCampaignInstance.showBattlePopup(${burg.id}, ${strength})`,
                    class: "btn-attack",
                    style: "background: #c0392b; color: white;"
                });
            }
        }
    }

    showBattlePopup(burgId, enemyStrength) {
        if (!AdventureManager.popupElement) AdventureManager.openPopup('');

        // Ensure overlay
        let overlay = document.getElementById('modalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalOverlay';
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';

        const mySoldiers = AdventureManager.party.soldiers;

        // Win Probability Logic
        const ratio = mySoldiers / enemyStrength;
        const k = 2;
        const winProb = (Math.pow(ratio, k) / (Math.pow(ratio, k) + 1));
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
                    <h3>City Garrison</h3>
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

    resolveCityBattle(burgId, enemySoldiers) {
        // Find burg again since we passed ID
        const burg = burgsData.find(b => b.id === burgId);
        if (!burg) return;

        const playerSoldiers = AdventureManager.party.soldiers;

        if (playerSoldiers <= 0) {
            AdventureManager.showFeedback("You have no soldiers to fight with!");
            AdventureManager.closePopup();
            return;
        }

        const ratio = playerSoldiers / enemySoldiers;
        const winProbability = (ratio * ratio) / ((ratio * ratio) + 1);

        const isWin = Math.random() < winProbability;

        AdventureManager.closePopup(); // Close battle popup

        if (isWin) {
            // Victory
            // Losses: Low (5-15%)
            const lossPct = 0.05 + (Math.random() * 0.10);
            const losses = Math.floor(playerSoldiers * lossPct);
            AdventureManager.party.soldiers = Math.max(0, playerSoldiers - losses);

            // Rewards (Aligned with BattleMission + Food = Gold)
            const goldReward = Math.floor(enemySoldiers / 10) * 2;
            const soldierReward = Math.floor(enemySoldiers / 10) * 2;
            const foodReward = goldReward;

            AdventureManager.party.gold += goldReward;
            AdventureManager.party.soldiers += soldierReward;
            AdventureManager.party.food += foodReward;

            // Mark as pillaged if capital (or just pillaged city in general)
            this.pillagedCapitals.add(burg.id);

            AdventureManager.showFeedback(`Victory! Pillaged ${burg.name}. Lost ${losses} soldiers. Gained ${goldReward} gold, ${foodReward} food, ${soldierReward} soldiers.`);

            // Floating Text (Win)
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`VICTORY!`, cell.p[0], cell.p[1] - 80, "#2ecc71");
                AdventureManager.showFloatingText(`+${goldReward} 💰`, cell.p[0], cell.p[1] - 60, "#f1c40f");
                AdventureManager.showFloatingText(`+${foodReward} 🍎`, cell.p[0], cell.p[1] - 40, "#e67e22");
                AdventureManager.showFloatingText(`+${soldierReward} ⚔️`, cell.p[0], cell.p[1] - 20, "#9b59b6");
            }

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

            // Floating Text (Loss)
            const cell = graphData[AdventureManager.party.cell];
            if (cell) {
                AdventureManager.showFloatingText(`DEFEAT!`, cell.p[0], cell.p[1] - 40, "#e74c3c");
                if (losses > 0) AdventureManager.showFloatingText(`-${losses} ⚔️`, cell.p[0], cell.p[1] - 20, "#e74c3c");
            }
        }

        AdventureManager.updateStats();
    }

}

// Register Campaign
CampaignManager.availableCampaigns.push(HordeCampaign);


// Global Sets for Multi-Selection
window.selectedBurgIds = new Set();
window.selectedStateNames = new Set();
window.selectedTradeRoutes = new Set(); // Stores strings "fromId-toId"
let diplomacySelectedStateId = null;

function updateVisuals() {
    // 1. Clear ALL previous highlights
    document.querySelectorAll('.burg-dot, .burg-ring-selection, .burg-ring-gold').forEach(el => {
        el.classList.remove('selected', 'highlighted');
        if (el.classList.contains('burg-dot')) {
            el.style.fill = '';
            el.style.stroke = '';
        }
    });
    document.querySelectorAll('tr').forEach(el => {
        el.classList.remove('selected', 'related-highlight');
    });

    // 2. Highlight Selected Burgs and their Relations
    selectedBurgIds.forEach(id => {
        const row = document.querySelector(`tr[data-id="${id}"]`);

        // Select all circles (dot, ring, selection ring) to apply selection style
        const matches = document.querySelectorAll(`circle[data-id="${id}"]`);

        matches.forEach(dot => {
            dot.classList.add('selected');
        });

        // Use main dot for data retrieval
        const mainDot = document.querySelector(`.burg-dot[data-id="${id}"]`);

        if (mainDot) {
            // Related State
            const stateName = mainDot.getAttribute('data-state');
            if (stateName) {
                highlightRowByName('stateTable', stateName, 'related-highlight');
            }

            // Related Trade Routes
            const burgName = mainDot.getAttribute('data-name');
            if (burgName) {
                highlightTradeRowsByBurgName(burgName, 'related-highlight');
            }
        }

        if (row) row.classList.add('selected');
    });

    // 3. Highlight Selected States and their Relations
    selectedStateNames.forEach(stateName => {
        // Highlight State Row
        const stateRow = highlightRowByName('stateTable', stateName, 'selected');

        let color = '#ccc';
        if (stateRow) {
            const colorBox = stateRow.querySelector('.color-box');
            if (colorBox) color = colorBox.style.backgroundColor;
        }

        // Highlight Burgs in State
        const dots = document.querySelectorAll(`.burg-dot[data-state="${stateName}"]`);
        dots.forEach(dot => {
            // Only apply state highlight if not individually selected
            if (!dot.classList.contains('selected')) {
                dot.classList.add('highlighted');
                dot.style.fill = color;
                dot.style.setProperty('stroke', '#000', 'important'); // Force override of producer colors
            }

            const id = dot.getAttribute('data-id');
            const burgName = dot.getAttribute('data-name');
            if (id) {
                const bRow = document.querySelector(`tr[data-id="${id}"]`);
                if (bRow) bRow.classList.add('related-highlight');
            }
            // Highlight Trade Routes belonging to these burgs
            if (burgName) {
                highlightTradeRowsByBurgName(burgName, 'related-highlight');
            }
        });
    });

    // 4. Highlight Selected Trade Routes
    selectedTradeRoutes.forEach(key => {
        const [fromId, toId] = key.split('-');

        // Highlight Key Trade Rows
        highlightTradeRowsByIds(fromId, toId, 'selected');

        // Highlight Endpoints
        [fromId, toId].forEach(id => {
            // Select all circles (dot, ring, selection ring) to apply selection style
            const matches = document.querySelectorAll(`circle[data-id="${id}"]`);
            matches.forEach(dot => {
                dot.classList.add('selected');
            });

            const row = document.querySelector(`tr[data-id="${id}"]`);
            if (row) row.classList.add('selected');
        });
    });
}

// Helper: Find row in table by "Name" (assumed col 1, index 1)
function highlightRowByName(tableId, name, className) {
    const table = document.getElementById(tableId);
    if (!table) return null;
    const rows = table.getElementsByTagName('tr');
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName('td');
        if (cells.length > 1) {
            // State table: Name is col 1. Burg table: Name is col 0. checking.
            // State Table: Color(0), Name(1)
            const cell = cells[tableId === 'stateTable' ? 1 : 0];
            if (cell && (cell.textContent || cell.innerText).trim() === name) {
                row.classList.add(className);
                return row;
            }
        }
    }
    return null;
}

// Helper: Highlight trade rows containing a burg name
function highlightTradeRowsByBurgName(burgName, className) {
    ['foodTradeTable', 'goldTradeTable'].forEach(tableId => {
        const table = document.getElementById(tableId);
        if (table) {
            const rows = table.getElementsByTagName('tr');
            for (let i = 1; i < rows.length; i++) {
                const r = rows[i];
                const from = r.cells[0].textContent.trim();
                const to = r.cells[1].textContent.trim();
                if (from === burgName || to === burgName) {
                    r.classList.add(className);
                }
            }
        }
    });
}

// Helper: Highlight specific trade row by IDs (Need to match Names actually, as table has names)
// We need to lookup Names from IDs if possible. 
// OR, we can pass the logic differently.
// Let's assume we can map ID -> Name using the dot.
function highlightTradeRowsByIds(fromId, toId, className) {
    const d1 = document.querySelector(`.burg-dot[data-id="${fromId}"]`);
    const d2 = document.querySelector(`.burg-dot[data-id="${toId}"]`);
    if (d1 && d2) {
        const n1 = d1.getAttribute('data-name');
        const n2 = d2.getAttribute('data-name');

        ['foodTradeTable', 'goldTradeTable'].forEach(tableId => {
            const table = document.getElementById(tableId);
            if (table) {
                const rows = table.getElementsByTagName('tr');
                for (let i = 1; i < rows.length; i++) {
                    const r = rows[i];
                    const c1 = r.cells[0].textContent.trim();
                    const c2 = r.cells[1].textContent.trim();
                    if ((c1 === n1 && c2 === n2) || (c1 === n2 && c2 === n1)) {
                        r.classList.add(className);
                    }
                }
            }
        });
    }
}


function selectBurg(id) {
    if (!id) return; // Ignore clear calls if any

    // Restrict highlighting to Free Mode only
    const modeBtn = document.getElementById('gameModeBtn');
    if (modeBtn && !modeBtn.innerText.includes('Free Mode')) {
        return;
    }

    // Force String ID for consistency between Map (string) and Table (number)
    const strId = id.toString();

    if (selectedBurgIds.has(strId)) {
        selectedBurgIds.delete(strId);
    } else {
        selectedBurgIds.add(strId);
        // Scroll to it only on Add
        const row = document.querySelector(`tr[data-id="${strId}"]`);
        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    updateVisuals();
}

function highlightBurg(id) {
    selectBurg(id);
}

function highlightState(stateName, color) {
    if (selectedStateNames.has(stateName)) {
        selectedStateNames.delete(stateName);
    } else {
        selectedStateNames.add(stateName);
        // Scroll
        const row = highlightRowByName('stateTable', stateName, 'selected'); // Dry run to find row
        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    updateVisuals();
}

function highlightTradeRoute(el, fromId, toId) {
    const key = `${fromId}-${toId}`;
    if (selectedTradeRoutes.has(key)) {
        selectedTradeRoutes.delete(key);
    } else {
        selectedTradeRoutes.add(key);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    updateVisuals();
}

function clearHighlights() {
    selectedBurgIds.clear();
    selectedStateNames.clear();
    selectedTradeRoutes.clear();

    const btn = document.getElementById('mapModeBtn');
    if (btn && btn.getAttribute('data-current-mode') === 'state') {
        updateDiplomacyColors(null);
        diplomacySelectedStateId = null;
    }

    updateVisuals();
}

function selectState(stateId) {
    const btn = document.getElementById('mapModeBtn');
    if (btn) {
        const currentMode = btn.getAttribute('data-current-mode');
        // Only run diplomacy update if already in state mode (or switch to it?)
        // User said "when you are on the state map", so we assume mode is already 'state'.
        if (currentMode === 'state') {
            const id = parseInt(stateId);
            if (diplomacySelectedStateId === id) {
                // Toggle Off
                updateDiplomacyColors(null);
                diplomacySelectedStateId = null;
            } else {
                // Toggle On
                updateDiplomacyColors(id);
                diplomacySelectedStateId = id;
            }
        }
    }
}


