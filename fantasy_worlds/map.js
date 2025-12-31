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

function showStateTooltip(e, content) {
    const tooltip = document.getElementById('tooltip');
    tooltip.innerHTML = content;
    tooltip.style.display = 'block';

    // Position near the cursor
    let left = e.clientX + 15;
    let top = e.clientY + 15;

    // Adjust if going off screen
    if (left + 220 > window.innerWidth) {
        left = e.clientX - 230;
    }

    if (top + 150 > window.innerHeight) {
        top = e.clientY - 160;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.display = 'none';
}

function toggleFoodTrades() {
    const btn = document.getElementById('toggleFoodTrades');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        document.body.classList.add('show-food-trades');
    } else {
        document.body.classList.remove('show-food-trades');
    }
}

function toggleGoldTrades() {
    const btn = document.getElementById('toggleGoldTrades');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        document.body.classList.add('show-gold-trades');
    } else {
        document.body.classList.remove('show-gold-trades');
    }
}

function toggleCapitals() {
    const btn = document.getElementById('toggleCapitals');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
        document.body.classList.add('show-capitals');
    } else {
        document.body.classList.remove('show-capitals');
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

function toggleMapMode() {
    const btn = document.getElementById('toggleMapMode');
    const paths = document.querySelectorAll('#mapBackground path');

    // Use data attribute for state tracking
    const currentMode = btn.getAttribute('data-mode') || 'biome';

    if (currentMode === 'biome') {
        // Switch to State
        btn.innerText = 'Mode: State';
        btn.setAttribute('data-mode', 'state');
        paths.forEach(p => {
            p.setAttribute('fill', p.getAttribute('data-state-color'));
        });
    } else if (currentMode === 'state') {
        // Switch to Heightmap
        btn.innerText = 'Mode: Heightmap';
        btn.setAttribute('data-mode', 'heightmap');

        paths.forEach(p => {
            // Heightmap logic: darken color based on height
            let h = parseInt(p.getAttribute('data-height'));
            let c = 255 - h * 2;
            if (c < 0) c = 0;
            if (p.getAttribute('data-is-water') === 'true') {
                p.setAttribute('fill', `rgb(${c / 2}, ${c / 2}, ${200 + h / 2})`);
            } else {
                p.setAttribute('fill', `rgb(${c}, ${c}, ${c})`);
            }
        });
    } else if (currentMode === 'heightmap') {
        // Switch to Temperature
        btn.innerText = 'Mode: Temperature';
        btn.setAttribute('data-mode', 'temperature');
        paths.forEach(p => {
            const t = parseInt(p.getAttribute('data-temp'));
            p.setAttribute('fill', getColorForTemp(t));
        });
    } else {
        // Switch to Biome
        btn.innerText = 'Mode: Biome';
        btn.setAttribute('data-mode', 'biome');
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

            if (isVisible) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }

            // Filter Map Dot corresponding to this row
            const dot = document.querySelector(`.burg-dot[data-id="${burgId}"]`);
            if (dot) {
                if (isVisible) {
                    dot.classList.remove('hidden');
                } else {
                    dot.classList.add('hidden');
                }
            }
        }
    }

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
    let dir = "asc";
    const tbody = table.querySelector('tbody') || table;

    // Reset other headers
    const headers = table.querySelectorAll('th');
    headers.forEach(h => {
        if (h !== header) {
            h.innerHTML = h.innerHTML.replace(' ▲', '').replace(' ▼', '');
        }
    });

    if (header.innerHTML.includes('▲')) {
        dir = "desc";
    }

    const rows = Array.from(table.rows).slice(1);

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

    // Re-append rows in sorted order
    // Using DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    rows.forEach(row => fragment.appendChild(row));

    // Append fragment to cached tbody
    if (tbody) {
        tbody.appendChild(fragment);
    }

    if (dir === "asc") {
        header.innerHTML = header.innerHTML.replace(' ▼', '') + ' ▲';
    } else {
        header.innerHTML = header.innerHTML.replace(' ▲', '') + ' ▼';
    }
}


const MissionTreasure = {
    data: null, // { cell: int, amount: int }
    element: null,
    countElement: null,

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
        if (svg) svg.appendChild(this.element);
    },

    spawn() {
        let validCells = [];
        if (AdventureManager.accessibleCells && AdventureManager.accessibleCells.length > 0) {
            validCells = AdventureManager.accessibleCells.map(id => graphData[id]).filter(c => c.i !== AdventureManager.party.cell);
        } else {
            validCells = graphData.filter(c => c.b !== marineBiomeId && c.i !== AdventureManager.party.cell);
        }

        if (validCells.length > 0) {
            const randomCell = validCells[Math.floor(Math.random() * validCells.length)];
            const amount = Math.floor(Math.random() * (60 - 20 + 1)) + 20; // 20 to 60
            this.data = { cell: randomCell.i, amount: amount };
            this.updateVisuals();
        }
    },

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
    },

    toggle(active) {
        if (!this.element) return;
        this.element.style.display = (active && this.data) ? "block" : "none";
    },

    getTargetCell() {
        return this.data ? this.data.cell : null;
    },

    onArrival() {
        this.showPopup();
    },

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
    },

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
        } else {
            AdventureManager.showFeedback("Not enough tools!");
        }
    }
};

window.MissionTreasure = MissionTreasure;


const MissionBattle = {
    data: null, // { cell: int, soldiers: int }
    element: null,
    countElement: null,

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
        if (svg) svg.appendChild(this.element);
    },

    spawn() {
        const occupied = [AdventureManager.party.cell];
        if (MissionTreasure.data) occupied.push(MissionTreasure.data.cell);

        let validCells = [];
        if (AdventureManager.accessibleCells && AdventureManager.accessibleCells.length > 0) {
            validCells = AdventureManager.accessibleCells.map(id => graphData[id]).filter(c => !occupied.includes(c.i));
        } else {
            validCells = graphData.filter(c => c.b !== marineBiomeId && !occupied.includes(c.i));
        }

        if (validCells.length > 0) {
            const randomCell = validCells[Math.floor(Math.random() * validCells.length)];
            const amount = Math.floor(Math.random() * (200 - 20 + 1)) + 20; // 20 to 200
            this.data = { cell: randomCell.i, soldiers: amount };
            this.updateVisuals();
        }
    },

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
    },

    toggle(active) {
        if (!this.element) return;
        this.element.style.display = (active && this.data) ? "block" : "none";
    },

    getTargetCell() {
        return this.data ? this.data.cell : null;
    },

    onArrival() {
        this.showPopup();
    },

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
    },

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
};

window.MissionBattle = MissionBattle;


const MissionHunt = {
    data: null, // { cell: int, strength: int }
    element: null,
    countElement: null,

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
        beastText.textContent = "🐺"; // Boar emoji
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
        if (svg) svg.appendChild(this.element);
    },

    spawn() {
        const occupied = [AdventureManager.party.cell];
        if (MissionTreasure.data) occupied.push(MissionTreasure.data.cell);
        if (MissionBattle.data) occupied.push(MissionBattle.data.cell);

        let validCells = [];
        if (AdventureManager.accessibleCells && AdventureManager.accessibleCells.length > 0) {
            validCells = AdventureManager.accessibleCells.map(id => graphData[id]).filter(c => !occupied.includes(c.i));
        } else {
            validCells = graphData.filter(c => c.b !== marineBiomeId && !occupied.includes(c.i));
        }

        if (validCells.length > 0) {
            const randomCell = validCells[Math.floor(Math.random() * validCells.length)];
            const strength = Math.floor(Math.random() * (30 - 5 + 1)) + 5; // 5 to 30
            this.data = { cell: randomCell.i, strength: strength };
            this.updateVisuals();
            // Emit Start Event
            if (AdventureManager.events) AdventureManager.events.emit('missionStart', { type: 'hunt', ...this.data });
        }
    },

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
    },

    toggle(active) {
        if (!this.element) return;
        this.element.style.display = (active && this.data) ? "block" : "none";
    },

    getTargetCell() {
        return this.data ? this.data.cell : null;
    },

    onArrival() {
        this.showPopup();
    },

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
    },

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
            if (AdventureManager.events) AdventureManager.events.emit('missionComplete', { type: 'hunt', result: 'win', ...this.data });

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
};

window.MissionHunt = MissionHunt;


const MissionSiege = {
    data: null, // { burgId: int, armyCell: int, soldiers: int }
    element: null, // Group for Bomb icon
    countElement: null,
    ringGroup: null, // Group for siege ring

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

        const svg = document.getElementById('mapSvg');
        if (svg) {
            svg.appendChild(siegeRingGroup);
            svg.appendChild(siegeGroup);
        }
    },

    spawn() {
        if (!AdventureManager.active) return;
        const capitals = burgsData.filter(b => b.is_capital);
        if (capitals.length === 0) return;

        // Pick random capital
        const capital = capitals[Math.floor(Math.random() * capitals.length)];
        const capitalCell = capital.cell_id;

        // Find neighbor land cell for army
        const neighbors = graphData[capitalCell].c;
        const validNeighbors = neighbors.filter(n => graphData[n].b !== marineBiomeId);

        if (validNeighbors.length > 0) {
            const armyCell = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];

            let totalQuartiers = (capital.soldier_quartiers || 0) + (capital.craftsman_quartiers || 0) + (capital.noble_quartiers || 0) + (capital.religious_quartiers || 0);
            if (totalQuartiers === 0) totalQuartiers = Math.ceil(capital.population / 1000); // Fallback

            const strength = Math.ceil(totalQuartiers / 2) * 20;

            this.data = { burgId: capital.id, armyCell: armyCell, soldiers: strength };
            this.updateVisuals();
            AdventureManager.showFeedback(`Siege started at ${capital.name}!`);

            // Emit Start Event
            if (AdventureManager.events) AdventureManager.events.emit('missionStart', { type: 'siege', ...this.data });
        }
    },

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
                    ring.setAttribute("r", parseFloat(burg.r) + 12); // Bigger radius
                    ring.setAttribute("fill", "none");
                    ring.setAttribute("stroke", "#000"); // Black
                    ring.setAttribute("stroke-width", "4"); // Thicker
                    ring.setAttribute("pointer-events", "none");
                    this.ringGroup.appendChild(ring);
                    this.ringGroup.style.display = 'inline';
                }
            }
        } else {
            this.element.style.display = "none";
            if (this.ringGroup) this.ringGroup.style.display = 'none';
        }
    },

    toggle(active) {
        if (!this.element) return;
        this.element.style.display = (active && this.data) ? "block" : "none";
        if (this.ringGroup) this.ringGroup.style.display = (active && this.data) ? "inline" : "none";
    },

    getTargetCell() {
        return this.data ? this.data.armyCell : null;
    },

    onArrival() {
        this.showPopup();
    },

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
    },

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
            const soldierReward = 10; // Freed prisoners?

            AdventureManager.party.gold += goldReward;
            AdventureManager.party.soldiers += soldierReward;

            AdventureManager.showFeedback(`SIEGE BROKEN! Hero of the city! +${goldReward} Gold.`);

            // Emit Complete Event (Win)
            if (AdventureManager.events) AdventureManager.events.emit('missionComplete', { type: 'siege', result: 'win', ...this.data });

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
                if (AdventureManager.events) AdventureManager.events.emit('missionComplete', { type: 'siege', result: 'sacrifice', ...this.data });

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
};

window.MissionSiege = MissionSiege;


const MissionDiplomacy = {
    targets: [], // Array of cell IDs (capitals)
    solvedCount: 0,
    group: null, // SVG group for rings

    init() {
        if (this.group) return;

        // Diplomatic Group (Rings)
        const diplomacyGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.group = diplomacyGroup;

        const svg = document.getElementById('mapSvg');
        if (svg) svg.appendChild(diplomacyGroup);
    },

    spawn() {
        if (!AdventureManager.active) return;
        this.startTour();
    },

    startTour() {
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
    },

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
    },

    toggle(active) {
        if (!this.group) return;
        this.group.style.display = active ? 'inline' : 'none';
    },

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
};

window.MissionDiplomacy = MissionDiplomacy;


const MissionExplore = {
    locations: [], // Array of { cell: int, id: int }
    elements: [], // Array of SVG elements

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
    },

    spawn() {
        this.locations = [null, null, null, null];
        for (let i = 0; i < 4; i++) {
            this.spawnLocation(i);
        }
        this.updateVisuals();
    },

    spawnLocation(index) {
        // Collect occupied cells to avoid spawning on top
        const occupiedObj = {};
        occupiedObj[AdventureManager.party.cell] = true;
        if (MissionTreasure.data) occupiedObj[MissionTreasure.data.cell] = true;
        if (MissionBattle.data) occupiedObj[MissionBattle.data.cell] = true;
        if (MissionHunt.data) occupiedObj[MissionHunt.data.cell] = true;
        if (MissionSiege.data) occupiedObj[MissionSiege.data.armyCell] = true;
        this.locations.forEach(l => { if (l) occupiedObj[l.cell] = true; });

        let validCells = [];
        if (AdventureManager.accessibleCells && AdventureManager.accessibleCells.length > 0) {
            validCells = AdventureManager.accessibleCells.map(id => graphData[id]).filter(c => !occupiedObj[c.i]);
        } else {
            validCells = graphData.filter(c => c.b !== marineBiomeId && !occupiedObj[c.i]);
        }

        if (validCells.length > 0) {
            const randomCell = validCells[Math.floor(Math.random() * validCells.length)];
            this.locations[index] = { cell: randomCell.i, id: index };
        }
    },

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
    },

    toggle(active) {
        if (this.elements.length === 0) return;
        if (!active) {
            this.elements.forEach(el => {
                if (el) el.style.display = 'none';
            });
        } else {
            this.updateVisuals();
        }
    },

    getTargetCell(index) {
        return this.locations[index] ? this.locations[index].cell : null;
    },

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

        this.spawnLocation(index); // Respawn immediately
        AdventureManager.updateStats();
        this.updateVisuals(); // Update to remove old, show new
    }
};

window.MissionExplore = MissionExplore;



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

    accessibleCells: [], // Cache for valid land cells
    portDockingCells: {}, // Map of Port Cell ID -> Valid Water Cell ID

    init() {
        if (this.partyElement) return;

        // Initialize Event System
        this.events = {
            listeners: {},
            on(event, callback) {
                if (!this.listeners[event]) this.listeners[event] = [];
                this.listeners[event].push(callback);
            },
            emit(event, data) {
                if (this.listeners[event]) {
                    this.listeners[event].forEach(cb => cb(data));
                }
            }
        };

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

        if (this.active) {
            if (btn) btn.classList.add('active');
            if (sidebar) {
                sidebar.classList.remove('hidden');
            }
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
            const sidebar = document.getElementById('adventureSidebar');
            if (sidebar) {
                sidebar.classList.add('hidden');
            }
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

    start() {
        // Clear Adventure Log
        const logContainer = document.getElementById('adventureLog');
        if (logContainer) logContainer.innerHTML = '';

        // Pick random start cell from ACCESSIBLE cells
        let startCell = -1;

        if (this.accessibleCells.length > 0) {
            const randomId = this.accessibleCells[Math.floor(Math.random() * this.accessibleCells.length)];
            startCell = randomId;
        } else {
            // Fallback if something went wrong or no ports exist
            const validCells = graphData.filter(c => c.b !== marineBiomeId);
            if (validCells.length > 0) {
                const random = validCells[Math.floor(Math.random() * validCells.length)];
                startCell = random.i;
            }
        }

        if (startCell !== -1) {
            this.party.cell = startCell;
            this.party.soldiers = 10;
            this.party.food = 50;
            this.party.gold = 10;
            this.party.tools = 10;
            this.party.onShip = false;
            this.partyElement.style.display = "block";

            // Spawn Missions based on Options
            if (this.options.Treasure) MissionTreasure.spawn();
            if (this.options.Battle) MissionBattle.spawn();
            if (this.options.Hunt) MissionHunt.spawn();
            if (this.options.Diplomacy) MissionDiplomacy.spawn();
            if (this.options.Siege) MissionSiege.spawn();
            if (this.options.Explore) MissionExplore.spawn();

            this.updateStats();
            this.render();

            // Trigger Start Ping
            const startNode = graphData[startCell];
            if (startNode) {
                this.showLocationPing(startNode.p[0], startNode.p[1]);
            }

            // Emit Event
            if (this.events) this.events.emit('start', this.party);

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

        this.popupElement.innerHTML = htmlContent;
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

        if (netFood > 0) {
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

        const diplomatic = MissionDiplomacy.targets.includes(burg.id);
        const siege = (MissionSiege.data && MissionSiege.data.burgId === burg.id);

        const isPort = this.isPort(burg.cell_id);
        const onShip = this.party.onShip;

        let shipHtml = '';
        if (isPort && burg.type === "Naval") {
            if (onShip) {
                shipHtml = `<button class="btn-recruit" style="background-color: #34495e;" onclick="AdventureManager.leaveShip()" title="Return to land travel">Leave Ship ⚓</button>`;
            } else {
                shipHtml = `<button class="btn-buy" style="background-color: #2980b9;" onclick="AdventureManager.rentShip(5)" title="Rent a ship for water travel (5 💰)">Rent Ship (5 💰) ⛵</button>`;
            }
        }

        this.popupElement.innerHTML = `
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
            <div class="actions">
                ${shipHtml}
                <button class="btn-buy" onclick="AdventureManager.buyFood(10, 1)" title="1 Gold for 10 Food">Buy 10 Food (1 💰)</button>
                ${diplomatic ? `<button class="btn-recruit" style="background-color: #4169E1;" onclick="MissionDiplomacy.resolve(${burg.id})" title="Solve diplomatic issue">Diplomatic Mission (5 💰)</button>` : ''}
                ${siege ? `<button class="btn-recruit" style="background-color: #000;" onclick="MissionSiege.showPopup()" title="Fight Sieging Army">Fight Siege Army (💣)</button>` : ''}
                ${canRecruit ? `<button class="btn-recruit" onclick="AdventureManager.recruitSoldiers(5, ${soldierCost}, ${burg.cell_id})" title="Recruit 5 soldiers for 5 Tools and 5 Gold. Each Soldier Quartier over 1 in the burg decreases the gold cost by one (down to a minimum of 1)">Recruit 5 Soldiers (${soldierCost} 💰, 5 🛠️)</button>` : ''}
                ${canBuyTools ? `<button class="btn-buy" onclick="AdventureManager.buyTools(${toolsAmount}, 1)" title="1 Gold for an amount of Tools equal to Craftsmen Quartiers in the burg (max 5)">Buy ${toolsAmount} Tools (1 💰)</button>` : ''}
                <button class="btn-leave" onclick="AdventureManager.closePopup()">Leave</button>
            </div>
        `;

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
        if (document.getElementById('advSoldiers')) document.getElementById('advSoldiers').textContent = this.party.soldiers;
        if (document.getElementById('advFood')) document.getElementById('advFood').textContent = this.party.food;
        if (document.getElementById('advGold')) document.getElementById('advGold').textContent = this.party.gold;

        if (this.events) this.events.emit('updateStats', this.party);

        if (document.getElementById('advTools')) document.getElementById('advTools').textContent = this.party.tools;

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
                        mission.init();
                        mission.spawn(); // Try to spawn immediately
                        mission.toggle(true);
                    } else {
                        mission.toggle(false); // Hide visuals
                        // We might want to clear data too, but hiding is safer for now
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


svg.addEventListener('click', (e) => {
    // Adventure Mode
    if (window.AdventureManager && window.AdventureManager.active) {
        window.AdventureManager.handleClick(e.target);
        return;
    }

    if (e.target.classList.contains('burg-dot')) {
        const id = e.target.getAttribute('data-id');
        selectBurg(id);
    } else {
        // Deselect if clicking empty space
        // selectBurg(null);
    }
});

svg.addEventListener('contextmenu', (e) => {
    if (window.AdventureManager && window.AdventureManager.active) {
        e.preventDefault(); // Prevent default context menu
        window.AdventureManager.handleRightClick(e.target);
    }
});

svg.addEventListener('mousemove', (e) => {
    if (e.target.classList.contains('burg-dot')) {
        const name = e.target.getAttribute('data-name');
        const pop = parseInt(e.target.getAttribute('data-pop')).toLocaleString();
        const type = e.target.getAttribute('data-type');
        const state = e.target.getAttribute('data-state');
        const gold = e.target.getAttribute('data-gold');
        const food = e.target.getAttribute('data-food');
        const quartiers = e.target.getAttribute('data-quartiers');
        const isCapital = e.target.classList.contains('capital');

        let displayName = isCapital ? `★ ${name}` : name;

        let tooltipContent = `<strong>${displayName}</strong><br>State: ${state}<br>Type: ${type}<br>Pop: ${pop}<br>Food: ${food}<br>Gold: ${gold}`;
        if (quartiers) {
            tooltipContent += `<hr style="margin: 5px 0; border: 0; border-top: 1px solid rgba(255,255,255,0.3);">${quartiers}`;
        }

        tooltip.innerHTML = tooltipContent;
        tooltip.style.display = 'block';

        // Smart positioning to keep within viewport
        let top = e.clientY + 10;
        let left = e.clientX + 10;

        // Check if tooltip goes off bottom
        if (top + 100 > window.innerHeight) {
            top = e.clientY - 100; // Move above cursor
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    } else if (e.target.tagName === 'path') {
        const btn = document.getElementById('toggleMapMode');
        const mode = btn.getAttribute('data-mode') || 'biome';

        let content = '';
        if (mode === 'biome') {
            const biome = e.target.getAttribute('data-biome');
            if (biome) content = `<strong>Biome:</strong> ${biome}`;
        } else if (mode === 'state') {
            const state = e.target.getAttribute('data-state');
            if (state) content = `<strong>State:</strong> ${state}`;
        } else if (mode === 'heightmap') {
            const h = e.target.getAttribute('data-height');
            if (h) content = `<strong>Height:</strong> ${h}`;
        } else if (mode === 'temperature') {
            const t = e.target.getAttribute('data-temp');
            if (t) content = `<strong>Temp:</strong> ${t}°C`;
        }

        if (content) {
            tooltip.innerHTML = content;
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
        } else {
            tooltip.style.display = 'none';
        }
    } else {
        tooltip.style.display = 'none';
    }
});

// Table Tooltip Interactions
table.addEventListener('mousemove', (e) => {
    if (e.target.classList.contains('quartier-cell')) {
        const details = e.target.getAttribute('data-details');
        if (details) {
            tooltip.innerHTML = details;
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 10) + 'px';
            tooltip.style.top = (e.clientY + 10) + 'px';
        }
    } else {
        // Only hide if not over map dot (which is separate)
        // But we are in table container, so map tooltip is not active
        tooltip.style.display = 'none';
    }
});

table.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
});

// Pan and Zoom (Basic)
let isPanning = false;
let startX, startY;
let viewBox = svg.getAttribute('viewBox').split(' ').map(parseFloat);

mapContainer.addEventListener('mousedown', (e) => {
    if (e.target === svg || e.target.tagName === 'circle' || e.target.tagName === 'line' || e.target.tagName === 'path') {
        isPanning = true;
        startX = e.clientX;
        startY = e.clientY;
        mapContainer.style.cursor = 'grabbing';
    }
});

mapContainer.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    e.preventDefault();
    const dx = (e.clientX - startX) * (viewBox[2] / mapContainer.clientWidth);
    const dy = (e.clientY - startY) * (viewBox[3] / mapContainer.clientHeight);

    viewBox[0] -= dx;
    viewBox[1] -= dy;
    svg.setAttribute('viewBox', viewBox.join(' '));

    startX = e.clientX;
    startY = e.clientY;
});

mapContainer.addEventListener('mouseup', () => {
    isPanning = false;
    mapContainer.style.cursor = 'default';
});

mapContainer.addEventListener('mouseleave', () => {
    isPanning = false;
    mapContainer.style.cursor = 'default';
});

mapContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    const w = viewBox[2];
    const h = viewBox[3];

    viewBox[2] *= scale;
    viewBox[3] *= scale;

    // Zoom towards center
    viewBox[0] -= (viewBox[2] - w) / 2;
    viewBox[1] -= (viewBox[3] - h) / 2;

    svg.setAttribute('viewBox', viewBox.join(' '));
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
    }

    // Lifecycle Hooks
    onStart() {
        this.active = true;
        console.log(`Campaign '${this.name}' Started.`);
    }

    onEnd() {
        this.active = false;
        console.log(`Campaign '${this.name}' Ended.`);
    }

    // Event Handlers
    onAdventureStart() { }
    onMissionStart(data) { }
    onMissionComplete(data) { }
    onUpdateStats(party) { this.checkObjectives(party); }

    // Internal Logic
    addObjective(id, text, type, checkFn) {
        this.objectives.push({ id, text, type, checkFn, completed: false });
    }

    renderObjectives() {
        const list = document.getElementById('objectivesList');
        if (!list) return;
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
}

// ---------------------------------------------------------
// Specific Campaign: The Siege Defense
// ---------------------------------------------------------
class SiegeDefenseCampaign extends BaseCampaign {
    constructor() {
        super("siege_defense_v1", "The Siege Defense", "A dark army surrounds the capital. You must gather resources, build an army, and break the siege before the city falls.");

        // Define Objectives
        // Note: We use lambda functions for checks to encapsulate the logic
        this.addObjective("obj1", "Gather 30 Tools", "resources", (p) => p.tools >= 30);
        this.addObjective("obj2", "Gather 70 Soldiers", "resources", (p) => p.soldiers >= 70);
        this.addObjective("obj3", "Gather 150 Food", "resources", (p) => p.food >= 150);

        // Custom logic for Siege Objective
        this.siegeDefeated = false;
        this.addObjective("obj4", "Defeat the Siege", "defeat_siege", (p) => this.siegeDefeated);

        this.startConfig = {
            resources: { soldiers: 20, tools: 20, food: 15, gold: 0 }
        };
    }

    onStart() {
        super.onStart();
        // Apply Start Config
        if (this.startConfig.resources) {
            AdventureManager.party = { ...AdventureManager.party, ...this.startConfig.resources };
            AdventureManager.updateStats(); // Ensure UI reflects changes immediately
        }
    }

    onAdventureStart() {
        // Enforce Start Location
        if (this.startConfig.cell) {
            AdventureManager.party.cell = this.startConfig.cell;
            setTimeout(() => AdventureManager.render(), 100);
        }
        AdventureManager.updateStats();

        // Initial Capture of Siege if it already exists
        if (window.MissionSiege && MissionSiege.data) {
            this.onMissionStart({ type: 'siege', ...MissionSiege.data });
        }
    }

    onMissionStart(data) {
        // Enforce Rules (Modifers)
        if (data.type === 'siege') {
            const FORCED_STRENGTH = 60;
            if (window.MissionSiege && MissionSiege.data && MissionSiege.data.soldiers !== FORCED_STRENGTH) {
                MissionSiege.data.soldiers = FORCED_STRENGTH;
                MissionSiege.updateVisuals();
                console.log(`SiegeDefenseCampaign: Enforced Siege Strength to ${FORCED_STRENGTH}`);
            }
            console.log(`SiegeDefenseCampaign: Tracking Siege on Burg ID ${data.burgId}`);
        }

        if (data.type === 'hunt') {
            const FORCED_STRENGTH = 25;
            if (window.MissionHunt && MissionHunt.data && MissionHunt.data.strength !== FORCED_STRENGTH) {
                MissionHunt.data.strength = FORCED_STRENGTH;
                MissionHunt.updateVisuals();
                console.log(`SiegeDefenseCampaign: Enforced Hunt Strength to ${FORCED_STRENGTH}`);
            }
        }
    }

    onMissionComplete(data) {
        if (data.type === 'siege') {
            // In this specific campaign, completing ANY siege counts as victory
            this.siegeDefeated = true;
            this.checkObjectives(AdventureManager.party);
        }
    }
}

// ---------------------------------------------------------
// Manager (Singleton)
// ---------------------------------------------------------
const CampaignManager = {
    active: false,
    currentCampaignInstance: null,

    // Registry of Campaign Classes
    availableCampaigns: [
        SiegeDefenseCampaign
    ],

    init() {
        this.populateSidebar();
    },

    populateSidebar() {
        const dropdown = document.getElementById('campaignDropdown');
        if (!dropdown) return;

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
    },

    selectCampaign(index) {
        if (index === "") return;
        const CampClass = this.availableCampaigns[index];
        this.currentCampaignInstance = new CampClass();

        document.getElementById('campaignStartBtn').classList.remove('hidden');
        this.currentCampaignInstance.renderObjectives();
        document.getElementById('campaignObjectives').classList.remove('hidden');
    },

    startCampaign() {
        if (!this.currentCampaignInstance) return;

        this.active = true;
        if (window.AdventureManager) {
            AdventureManager.init();
            AdventureManager.active = true;

            // Wire up Events to the Instance
            if (AdventureManager.events) {
                AdventureManager.events.on('start', () => this.currentCampaignInstance.onAdventureStart());
                AdventureManager.events.on('updateStats', () => this.currentCampaignInstance.onUpdateStats(AdventureManager.party));
                AdventureManager.events.on('missionStart', (d) => this.currentCampaignInstance.onMissionStart(d));
                AdventureManager.events.on('missionComplete', (d) => this.currentCampaignInstance.onMissionComplete(d));
            }

            AdventureManager.start();
            this.currentCampaignInstance.onStart(); // Call *after* Adventure start? Or before? BaseCampaign.onStart sets active=true.
            AdventureManager.showFeedback(`Campaign Started: ${this.currentCampaignInstance.name}`);
        }

        document.getElementById('campaignStartBtn').classList.add('hidden');
        document.getElementById('campaignDropdown').disabled = true;
    },

    showCampaignWinModal() {
        const modal = document.getElementById('campaignVictoryModal');
        if (modal) {
            modal.style.display = 'flex';
            if (window.AdventureManager) AdventureManager.isGameOver = true;
        }
    },

    endCampaign() {
        const modal = document.getElementById('campaignVictoryModal');
        if (modal) modal.style.display = 'none';

        if (window.AdventureManager && typeof AdventureManager.closePopup === 'function') {
            AdventureManager.closePopup();
        }

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
        document.getElementById('campaignObjectives').classList.add('hidden');

        if (typeof selectGameMode === 'function') {
            selectGameMode('free');
        } else {
            if (window.AdventureManager) {
                AdventureManager.isGameOver = false;
                AdventureManager.toggle();
            }
        }
        document.getElementById('campaignDescription').textContent = "";
    }
};

window.CampaignManager = CampaignManager;


function selectBurg(id) {
    // Remove previous selection
    if (selectedId) {
        const prevRow = document.querySelector(`tr[data-id="${selectedId}"]`);
        const prevDot = document.querySelector(`.burg-dot[data-id="${selectedId}"]`);
        if (prevRow) prevRow.classList.remove('selected');
        if (prevDot) prevDot.classList.remove('selected');
    }

    // Clear any trade route highlights
    clearHighlights();

    // Clear previous table highlights (State and Trade)
    document.querySelectorAll('.related-highlight').forEach(el => el.classList.remove('selected'));

    selectedId = id;

    if (id) {
        const row = document.querySelector(`tr[data-id="${id}"]`);
        const dot = document.querySelector(`.burg-dot[data-id="${id}"]`);

        if (row) {
            row.classList.add('selected');
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        if (dot) {
            dot.classList.add('selected');

            // Highlight Related State
            const stateName = dot.getAttribute('data-state');
            if (stateName) {
                // Update Diplomacy Map if active
                const btn = document.getElementById('toggleMapMode');
                if (btn && btn.getAttribute('data-mode') === 'state') {
                    updateDiplomacyColors(stateName);
                }

                const stateTable = document.getElementById('stateTable');
                const stateRows = stateTable.getElementsByTagName('tr');
                for (let i = 1; i < stateRows.length; i++) {
                    const sRow = stateRows[i];
                    const nameCell = sRow.getElementsByTagName('td')[1]; // Name is 2nd column
                    if (nameCell && (nameCell.textContent || nameCell.innerText).trim() === stateName) {
                        sRow.classList.add('related-highlight');
                        sRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        break;
                    }
                }
            }

            // Highlight Related Trade Routes
            const burgName = dot.getAttribute('data-name');
            if (burgName) {
                ['foodTradeTable', 'goldTradeTable'].forEach(tableId => {
                    let scrolled = false;
                    const tTable = document.getElementById(tableId);
                    if (tTable) {
                        const tRows = tTable.getElementsByTagName('tr');
                        for (let i = 1; i < tRows.length; i++) {
                            const tRow = tRows[i];
                            const fromCell = tRow.getElementsByTagName('td')[0];
                            const toCell = tRow.getElementsByTagName('td')[1];

                            const fromName = (fromCell.textContent || fromCell.innerText).trim();
                            const toName = (toCell.textContent || toCell.innerText).trim();

                            if (fromName === burgName || toName === burgName) {
                                tRow.classList.add('related-highlight');
                                if (!scrolled) {
                                    tRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    scrolled = true;
                                }
                            }
                        }
                    }
                });
            }
        }
    }
}

function highlightBurg(id) {
    selectBurg(id);
}

function clearHighlights() {
    // Clear Burg Dots
    document.querySelectorAll('.burg-dot').forEach(el => {
        el.classList.remove('selected', 'highlighted');
        el.style.fill = '';
        el.style.stroke = '';
    });

    // Clear Table Rows (Burgs, States, Trades)
    document.querySelectorAll('tr').forEach(el => {
        el.classList.remove('selected', 'related-highlight');
    });

    highlightedIds = [];
    selectedId = null;
}

function highlightState(stateName, color) {
    clearHighlights();

    // Find and highlight state row
    const stateTable = document.getElementById('stateTable');
    if (stateTable) {
        const stateRows = stateTable.getElementsByTagName('tr');
        for (let i = 1; i < stateRows.length; i++) {
            const sRow = stateRows[i];
            const nameCell = sRow.getElementsByTagName('td')[1];
            if (nameCell && (nameCell.textContent || nameCell.innerText).trim() === stateName) {
                sRow.classList.add('selected');
                break;
            }
        }
    }

    const burgsInState = [];
    let firstBurgScrolled = false;

    // Highlight Burg Dots and accumulate names
    const dots = document.querySelectorAll(`.burg-dot[data-state="${stateName}"]`);
    dots.forEach(dot => {
        dot.classList.add('highlighted');
        dot.style.fill = color;
        dot.style.stroke = '#000';

        const id = dot.getAttribute('data-id');
        const name = dot.getAttribute('data-name');
        if (id) {
            highlightedIds.push(id);
            // Highlight Burg Row
            const row = document.querySelector(`tr[data-id="${id}"]`);
            if (row) {
                row.classList.add('related-highlight');
                if (!firstBurgScrolled) {
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstBurgScrolled = true;
                }
            }
        }
        if (name) burgsInState.push(name);
    });

    // Highlight Trade Routes
    if (burgsInState.length > 0) {
        ['foodTradeTable', 'goldTradeTable'].forEach(tableId => {
            let firstTradeScrolled = false;
            const tTable = document.getElementById(tableId);
            if (tTable) {
                const tRows = tTable.getElementsByTagName('tr');
                for (let i = 1; i < tRows.length; i++) {
                    const tRow = tRows[i];
                    const fromCell = tRow.getElementsByTagName('td')[0];
                    const toCell = tRow.getElementsByTagName('td')[1];

                    const fromName = (fromCell.textContent || fromCell.innerText).trim();
                    const toName = (toCell.textContent || toCell.innerText).trim();

                    if (burgsInState.includes(fromName) || burgsInState.includes(toName)) {
                        tRow.classList.add('related-highlight');
                        if (!firstTradeScrolled) {
                            tRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            firstTradeScrolled = true;
                        }
                    }
                }
            }
        });
    }
}

function highlightTradeRoute(el, fromId, toId) {
    clearHighlights();
    if (selectedId) selectBurg(null); // Reset single burg selection mode

    // 1. Highlight the Trade Route Row(s)
    if (el) el.classList.add('selected');

    // 2. Identify and Highlight Burgs (Dots and Rows)
    const burgIds = [fromId, toId];
    const stateNames = new Set();

    burgIds.forEach(id => {
        // Highlight Dot
        const dot = document.querySelector(`.burg-dot[data-id="${id}"]`);
        if (dot) {
            dot.classList.add('selected');
            highlightedIds.push(id);

            const sName = dot.getAttribute('data-state');
            if (sName) stateNames.add(sName);
        }

        // Highlight Row
        const row = document.querySelector(`tr[data-id="${id}"]`);
        if (row) {
            row.classList.add('selected');
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    // 3. Highlight States
    const stateTable = document.getElementById('stateTable');
    if (stateTable && stateNames.size > 0) {
        const stateRows = stateTable.getElementsByTagName('tr');
        let firstStateScrolled = false;
        for (let i = 1; i < stateRows.length; i++) {
            const sRow = stateRows[i];
            const nameCell = sRow.getElementsByTagName('td')[1];
            const rowStateName = (nameCell.textContent || nameCell.innerText).trim();

            if (nameCell && stateNames.has(rowStateName)) {
                sRow.classList.add('related-highlight');
                if (!firstStateScrolled) {
                    sRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstStateScrolled = true;
                }
            }
        }
    }
}

function selectState(stateId) {
    const btn = document.getElementById('toggleMapMode');
    const currentMode = btn.getAttribute('data-mode');

    if (currentMode === 'state') {
        updateDiplomacyColors(stateId);
    }
}


