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



// Adventure Mode Module

const AdventureManager = {
    active: false,
    party: {
        cell: 0,
        soldiers: 10,
        food: 50,
        gold: 10,
        tools: 10
    },
    partyElement: null,
    partyElement: null,
    pathElement: null,
    previewPathElement: null,
    popupElement: null,
    isMoving: false,
    movementId: 0,
    knownBurgs: {},

    treasureElement: null,
    treasureCountElement: null,

    enemy: null, // { cell: int, soldiers: int }
    enemyElement: null,
    enemyCountElement: null,

    // BEAST State
    beast: null, // { cell: int, strength: int }
    beastElement: null,
    beastCountElement: null,

    // EXPLORER State
    locations: [], // Array of { cell: int, id: int }
    locationElements: [], // Array of SVG elements

    // DIPLOMATIC TOUR State
    diplomaticTargets: [], // Array of cell IDs (capitals)
    diplomacySolvedCount: 0,
    // DIPLOMATIC TOUR State
    diplomaticTargets: [], // Array of cell IDs (capitals)
    diplomacySolvedCount: 0,
    diplomacyGroup: null, // SVG group for rings

    // SIEGE State
    siege: null, // { burgId: int, armyCell: int, soldiers: int }
    siegeElement: null, // Group for Bomb icon
    siegeCountElement: null,
    siegeRingGroup: null, // Group for siege ring

    init() {
        if (this.partyElement) return;

        // Create party element (circle)
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("r", "6");
        circle.setAttribute("fill", "#e67e22"); // Pumpkin color
        circle.setAttribute("stroke", "#2c3e50");
        circle.setAttribute("stroke-width", "2");
        circle.setAttribute("pointer-events", "none");
        circle.setAttribute("id", "partyMarker");
        circle.style.zIndex = "100";
        circle.style.transition = "cx 0.2s linear, cy 0.2s linear";
        circle.style.display = "none";

        // Create Treasure Element (Group)
        const treasureGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        treasureGroup.setAttribute("id", "treasureMarker");
        treasureGroup.style.display = "none";
        treasureGroup.style.cursor = "pointer";
        treasureGroup.setAttribute("pointer-events", "all");

        // Add click listener
        treasureGroup.onclick = (e) => {
            e.stopPropagation();
            this.handleTreasureClick();
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

        this.treasureCountElement = treasureCount;

        // Create Enemy Element (Group)
        const enemyGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        enemyGroup.setAttribute("id", "enemyMarker");
        enemyGroup.style.display = "none";
        enemyGroup.style.cursor = "pointer";
        enemyGroup.setAttribute("pointer-events", "all");

        enemyGroup.onclick = (e) => {
            e.stopPropagation();
            this.handleEnemyClick();
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

        this.enemyCountElement = enemyCount;

        // Create Beast Element (Group)
        const beastGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        beastGroup.style.display = 'none';
        beastGroup.style.cursor = 'pointer';

        // Add click listener
        beastGroup.onclick = (e) => {
            e.stopPropagation();
            this.handleBeastClick();
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

        const beastCountBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        beastCountBg.setAttribute("x", "-12");
        beastCountBg.setAttribute("y", "14");
        beastCountBg.setAttribute("width", "24");
        beastCountBg.setAttribute("height", "14");
        beastCountBg.setAttribute("rx", "4");
        beastCountBg.setAttribute("fill", "#fff");
        beastCountBg.setAttribute("stroke", "#000");
        beastCountBg.setAttribute("stroke-width", "0.5");

        const beastCount = document.createElementNS("http://www.w3.org/2000/svg", "text");
        beastCount.setAttribute("text-anchor", "middle");
        beastCount.setAttribute("dy", "24"); // Offset
        beastCount.setAttribute("font-size", "10px");

        beastGroup.appendChild(beastCircle);
        beastGroup.appendChild(beastText);
        // beastGroup.appendChild(beastCountBg); // Optional
        beastGroup.appendChild(beastCount);
        this.beastCountElement = beastCount;

        beastGroup.appendChild(beastCount);
        this.beastCountElement = beastCount;

        // Create Explorer Elements (4 locations)
        const locationsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.locationElements = [];
        for (let i = 0; i < 4; i++) {
            const locGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            locGroup.style.display = 'none';
            locGroup.style.cursor = 'pointer';

            locGroup.onclick = (e) => {
                e.stopPropagation();
                this.handleLocationClick(i);
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
            this.locationElements.push(locGroup);
        }

        // Create path element (polyline)
        const pathLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        pathLine.setAttribute("fill", "none");
        pathLine.setAttribute("stroke", "#ff0000"); // Red
        pathLine.setAttribute("stroke-width", "3");
        pathLine.setAttribute("stroke-dasharray", "5,5");
        pathLine.setAttribute("pointer-events", "none");
        pathLine.style.opacity = "0.8";
        pathLine.style.display = "none";

        // Create preview path element (polyline) different style
        const previewLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        previewLine.setAttribute("fill", "none");
        previewLine.setAttribute("stroke", "#00ffff"); // Cyan
        previewLine.setAttribute("stroke-width", "3");
        previewLine.setAttribute("stroke-dasharray", "5,5"); // Same dash as normal
        previewLine.setAttribute("pointer-events", "none");
        previewLine.style.opacity = "0.8";
        previewLine.style.display = "none";

        // Create Siege Ring Group
        const siegeRingGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.siegeRingGroup = siegeRingGroup;

        // Create Siege Element (Group)
        const siegeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        siegeGroup.setAttribute("id", "siegeMarker");
        siegeGroup.style.display = "none";
        siegeGroup.style.cursor = "pointer";
        siegeGroup.setAttribute("pointer-events", "all");

        siegeGroup.onclick = (e) => {
            e.stopPropagation();
            this.handleSiegeClick();
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

        this.siegeCountElement = siegeCount;

        const svg = document.getElementById('mapSvg');

        // Diplomatic Group (Rings)
        const diplomacyGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.diplomacyGroup = diplomacyGroup;

        svg.appendChild(diplomacyGroup); // Bottom layer for rings, under icons
        svg.appendChild(siegeRingGroup); // Siege rings
        svg.appendChild(previewLine);
        svg.appendChild(pathLine);
        svg.appendChild(locationsGroup); // Explorer locations bottom layer of interactables
        svg.appendChild(treasureGroup);
        svg.appendChild(enemyGroup);
        svg.appendChild(siegeGroup); // Siege Army icon
        svg.appendChild(beastGroup);
        svg.appendChild(circle); // Append circle after to be on top

        this.partyElement = circle;
        this.treasureElement = treasureGroup;
        this.enemyElement = enemyGroup;
        this.beastElement = beastGroup;
        this.siegeElement = siegeGroup;
        this.pathElement = pathLine;
        this.previewPathElement = previewLine;
    },

    toggle() {
        this.active = !this.active;
        const btn = document.getElementById('toggleAdventure');
        const stats = document.getElementById('adventureStats');

        if (this.active) {
            btn.classList.add('active');
            stats.style.display = 'inline-flex';
            this.init(); // Ensure element exists
            if (this.party.cell === 0) {
                this.start();
            } else {
                this.partyElement.style.display = "block";
                if (this.treasure) this.treasureElement.style.display = "block";
                if (this.enemy) this.enemyElement.style.display = "block";
                if (this.siege) this.siegeElement.style.display = "block";

                // Show Rings
                if (this.diplomacyGroup) this.diplomacyGroup.style.display = 'inline';
                if (this.siegeRingGroup) this.siegeRingGroup.style.display = 'inline';

                this.render();
            }
        } else {
            btn.classList.remove('active');
            stats.style.display = 'none';
            if (this.partyElement) this.partyElement.style.display = 'none';
            if (this.treasureElement) this.treasureElement.style.display = 'none';
            if (this.enemyElement) this.enemyElement.style.display = 'none';
            if (this.siegeElement) this.siegeElement.style.display = 'none';

            // Hide Rings
            if (this.diplomacyGroup) this.diplomacyGroup.style.display = 'none';
            if (this.siegeRingGroup) this.siegeRingGroup.style.display = 'none';

            // Hide Locations
            this.locationElements.forEach(el => {
                if (el) el.style.display = 'none';
            });
        }
    },

    start() {

        // Pick random start cell that is not water
        // We can try to pick a burg's cell if possible
        let startCell = -1;

        const validCells = graphData.filter(c => c.b !== marineBiomeId);
        if (validCells.length > 0) {
            const random = validCells[Math.floor(Math.random() * validCells.length)];
            startCell = random.i;
        }

        if (startCell !== -1) {
            this.party.cell = startCell;
            this.party.soldiers = 10;
            this.party.food = 50;
            this.party.gold = 10;
            this.party.tools = 10;
            this.partyElement.style.display = "block";

            this.partyElement.style.display = "block";

            this.spawnTreasure(); // Spawn first treasure
            this.spawnEnemy();    // Spawn first enemy
            this.spawnBeast();    // Spawn first beast

            // Spawn 4 Explorer Locations
            this.locations = [null, null, null, null];
            for (let i = 0; i < 4; i++) {
                this.spawnLocation(i);
            }

            this.startDiplomaticTour(); // Start first tour
            this.spawnSiege(); // Start first siege

            this.updateStats();
            this.render();

            // Initial message
            this.showFeedback("Adventure started! Click to move.");
        } else {
            console.error("No valid land cell found");
        }
    },

    spawnLocation(index) {
        // Collect occupied cells to avoid spawning on top
        const occupiedObj = {};
        occupiedObj[this.party.cell] = true;
        if (this.treasure) occupiedObj[this.treasure.cell] = true;
        if (this.enemy) occupiedObj[this.enemy.cell] = true;
        if (this.beast) occupiedObj[this.beast.cell] = true;
        if (this.siege) occupiedObj[this.siege.armyCell] = true;
        this.locations.forEach(l => { if (l) occupiedObj[l.cell] = true; });

        const validCells = graphData.filter(c => c.b !== marineBiomeId && !occupiedObj[c.i]);

        if (validCells.length > 0) {
            const randomCell = validCells[Math.floor(Math.random() * validCells.length)];
            this.locations[index] = { cell: randomCell.i, id: index };
        }
    },

    spawnSiege() {
        if (!this.active) return;
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

            // Calculate soldiers: half of quartiers, rounding up. 
            // We need to parse quartiers if it's not readily available as a number sum, 
            // but usually we can estimate from population or type if exact "quartiers" count isn't in burg object directly.
            // Let's rely on `soldier_quartiers` + `craftsman_quartiers` + others if available, or fallback.
            // The tooltip code used `data-quartiers`, implying it's derived.
            // `burg.quartiers` is not standard property in simple view.
            // Let's assume we can sum visible ones or use population proxy.
            // Actually, we can just use a random strength scaled by population if needed, but request asked for specific logic.
            // "half its nr of quartiers rounding up".
            // Let's check what properties `burg` has from `burgsData`.
            // Assuming `burg` has `soldier_quartiers`, `craftsman_quartiers`, `noble_quartiers` etc.
            // If they are not present, we will fallback to population / 1000.

            let totalQuartiers = (capital.soldier_quartiers || 0) + (capital.craftsman_quartiers || 0) + (capital.noble_quartiers || 0) + (capital.religious_quartiers || 0);
            if (totalQuartiers === 0) totalQuartiers = Math.ceil(capital.population / 1000); // Fallback

            const siegeSoldiers = Math.ceil(totalQuartiers / 2) * 50; // Scale it up? 
            // "number of soldiers half its nr of quartiers rounding up" -> if 10 quartiers -> 5 soldiers? seems too low.
            // Maybe "half its nr of quartiers" refers to HUNDREDS or similar unit? 
            // Or maybe it simply means the "power" value. 
            // Let's assume "Soldiers" = (Quartiers / 2) * 100 to make it a challenge. 
            // User script usually deals in 10s or 100s of soldiers.
            // Let's stick to literal "half its nr of quartiers" FIRST, but 5 soldiers is nothing.
            // Wait, existing logic: enemy soldiers 20-200.
            // Quartiers are usually 5-50. Half is 2-25. 
            // Let's multiply by 10 or 20 to make it a unit of "Army Strength".
            // Let's try Multiplier = 20. So 10 quartiers -> 5 -> 100 soldiers.

            const strength = Math.ceil(totalQuartiers / 2) * 20;

            this.siege = { burgId: capital.id, armyCell: armyCell, soldiers: strength };

            if (this.siegeElement) {
                if (this.siegeCountElement) this.siegeCountElement.textContent = strength;
                this.siegeElement.style.display = "block";
                this.render();
            }
            this.showFeedback(`Siege started at ${capital.name}!`);
        }
    },

    startDiplomaticTour() {
        if (!this.active) return;
        const capitals = burgsData.filter(b => b.is_capital);
        // Shuffle using Fisher-Yates
        for (let i = capitals.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [capitals[i], capitals[j]] = [capitals[j], capitals[i]];
        }
        // Take top 3 unique IDs
        this.diplomaticTargets = capitals.slice(0, 3).map(b => b.id);
        this.diplomacySolvedCount = 0;
        this.showFeedback("Diplomatic Tour Started! Visit 3 Capitals (Blue Rings).");
        this.render();
    },

    spawnTreasure() {
        const validCells = graphData.filter(c => c.b !== marineBiomeId && c.i !== this.party.cell);
        if (validCells.length > 0) {
            const randomCell = validCells[Math.floor(Math.random() * validCells.length)];
            const amount = Math.floor(Math.random() * (60 - 20 + 1)) + 20; // 20 to 60
            this.treasure = { cell: randomCell.i, amount: amount };
            if (this.treasureElement) {
                if (this.treasureCountElement) this.treasureCountElement.textContent = amount;
                this.treasureElement.style.display = "block";
                this.render();
            }
        }
    },

    spawnEnemy() {
        const validCells = graphData.filter(c => c.b !== marineBiomeId && c.i !== this.party.cell && (!this.treasure || c.i !== this.treasure.cell));
        if (validCells.length > 0) {
            const randomCell = validCells[Math.floor(Math.random() * validCells.length)];
            const amount = Math.floor(Math.random() * (200 - 20 + 1)) + 20; // 20 to 200
            this.enemy = { cell: randomCell.i, soldiers: amount };
            if (this.enemyElement) {
                if (this.enemyCountElement) this.enemyCountElement.textContent = amount;
                this.enemyElement.style.display = "block";
                this.render();
            }
        }
    },

    spawnBeast() {
        const validCells = graphData.filter(c => c.b !== marineBiomeId && c.i !== this.party.cell && (!this.treasure || c.i !== this.treasure.cell) && (!this.enemy || c.i !== this.enemy.cell));
        if (validCells.length > 0) {
            const randomCell = validCells[Math.floor(Math.random() * validCells.length)];
            const strength = Math.floor(Math.random() * (30 - 5 + 1)) + 5; // 5 to 30
            this.beast = { cell: randomCell.i, strength: strength };

            if (this.beastElement) {
                // If text content for strength is needed, we'd need a child element. 
                // For now, simple tooltip or just icon. UI usually separate.
                if (this.beastCountElement) this.beastCountElement.textContent = strength;
                this.beastElement.style.display = "block";
                this.render();
            }
        }
    },

    async handleClick(target) {
        if (!this.active) return;

        // Clear preview on click
        this.drawPreviewPath([]);

        // if moving, we override. No return.

        // Increment movementId to invalidate previous moves
        this.movementId++;

        const cellId = this.getTargetCellId(target);

        if (cellId !== null) {
            // Check if water
            if (graphData[cellId].b === marineBiomeId) {
                this.showFeedback("Cannot move to water!");
                return;
            }

            // Pathfinding
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

        const cellId = this.getTargetCellId(target);
        if (cellId !== null) {
            // Pathfinding Preview
            if (graphData[cellId].b === marineBiomeId) {
                this.showFeedback("Cannot preview path to water!");
                return;
            }
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
            // Fallback (though burg-dot should have data-cell-id)
            const cx = parseFloat(target.getAttribute('cx'));
            const cy = parseFloat(target.getAttribute('cy'));
            cellId = this.findCellAt(cx, cy);
        }
        return cellId;
    },

    findCellAt(x, y) {
        // Simple search for closest cell
        // Optimization: iterate all cells? Expensive? 
        // 10k cells is fine for click event usually.
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

    findPath(start, end) {
        if (start === end) return [];

        // BFS
        const queue = [start];
        const cameFrom = {}; // path reconstruction
        cameFrom[start] = null;

        // Limit search depth/nodes to avoid freeze on large maps
        let visited = 0;
        const limit = 5000;

        while (queue.length > 0) {
            const current = queue.shift();
            visited++;
            if (visited > limit) return null; // Too far

            if (current === end) break;

            const neighbors = graphData[current].c;
            for (let next of neighbors) {
                // Check bounds and water
                if (graphData[next] && graphData[next].b !== marineBiomeId) {
                    if (!(next in cameFrom)) {
                        queue.push(next);
                        cameFrom[next] = current;
                    }
                }
            }
        }

        if (!(end in cameFrom)) return null;

        // Reconstruct path
        const path = [];
        let curr = end;
        while (curr !== start) {
            path.push(curr);
            curr = cameFrom[curr];
        }
        // path is reversed (end -> start)
        return path.reverse();
    },

    handleTreasureClick() {
        if (!this.active || !this.treasure) return;

        // Calculate path to treasure
        const path = this.findPath(this.party.cell, this.treasure.cell);

        if (path && path.length > 0) {
            this.drawPath(path);
            this.moveAlongPath(path).then(() => {
                this.drawPath([]);
            });
        } else if (this.party.cell === this.treasure.cell) {
            // Already there
            this.showTreasurePopup();
        } else {
            this.showFeedback("Cannot reach treasure!");
        }
    },

    handleEnemyClick() {
        if (!this.active || !this.enemy) return;

        // Calculate path to enemy
        const path = this.findPath(this.party.cell, this.enemy.cell);

        if (path && path.length > 0) {
            this.drawPath(path);
            this.moveAlongPath(path).then(() => {
                this.drawPath([]);
            });
        } else if (this.party.cell === this.enemy.cell) {
            // Already there
            this.showBattlePopup();
        } else {
            this.showFeedback("Cannot reach enemy!");
        }
    },

    handleBeastClick() {
        if (!this.active || !this.beast) return;

        const path = this.findPath(this.party.cell, this.beast.cell);

        if (path && path.length > 0) {
            this.drawPath(path);
            this.moveAlongPath(path).then(() => {
                this.drawPath([]);
            });
        } else if (this.party.cell === this.beast.cell) {
            this.showBeastPopup();
        } else {
            this.showFeedback("Cannot reach beast!");
        }
    },

    handleSiegeClick() {
        if (!this.active || !this.siege) return;

        // Path to Siege Army (not the burg, but the army cell)
        const path = this.findPath(this.party.cell, this.siege.armyCell);

        if (path && path.length > 0) {
            this.drawPath(path);
            this.moveAlongPath(path).then(() => {
                this.drawPath([]);
            });
        } else if (this.party.cell === this.siege.armyCell) {
            this.showSiegeBattlePopup();
        } else {
            this.showFeedback("Cannot reach siege army!");
        }
    },

    handleLocationClick(index) {
        if (!this.active) return;
        const loc = this.locations[index];
        if (!loc) return;

        const path = this.findPath(this.party.cell, loc.cell);

        if (path && path.length > 0) {
            this.drawPath(path);
            this.moveAlongPath(path).then(() => {
                this.drawPath([]);
            });
        } else if (this.party.cell === loc.cell) {
            // Already there, should have triggered arrival logic
        } else {
            this.showFeedback("Cannot reach location!");
        }
    },

    async moveAlongPath(path) {
        this.isMoving = true;
        const currentId = this.movementId;

        for (let nextCell of path) {
            // Check if superseded
            if (this.movementId !== currentId) {
                // Determine if we should clear path or not. 
                // The new click will call drawPath with new path, so we don't need to do anything.
                // Just stop this loop.
                return;
            }

            if (this.party.food <= 0) {
                this.showFeedback("Out of food! Party is starving.");
                // Maybe penalty?
                this.party.soldiers = Math.max(0, this.party.soldiers - 1);
                if (this.party.soldiers === 0) {
                    this.showFeedback("Game Over! All soldiers died.");
                    this.isMoving = false;
                    return;
                }
            }

            this.party.cell = nextCell;
            this.party.food--;
            this.updateStats();
            this.render();

            // Update path visual (remove visited nodes)
            // path is the full path. We are iterating it.
            // We want to show from current nextCell to end.
            const remainingIndex = path.indexOf(nextCell);
            if (remainingIndex > -1) {
                this.drawPath(path.slice(remainingIndex));
            }

            // Wait for animation
            await new Promise(r => setTimeout(r, 150));
        }

        this.isMoving = false;

        // Check for arrival at burg
        this.checkForArrival();
    },

    checkForArrival() {
        // We know where the party is: this.party.cell
        // We need to find if there is a burg at this cell. Easiest is to search burgs_data (global var)
        const burg = burgsData.find(b => b.cell_id === this.party.cell);

        // Explorer Check
        const locIndex = this.locations.findIndex(l => l && l.cell === this.party.cell);
        if (locIndex !== -1) {
            // Found a location!
            this.party.gold += 5;
            this.showFeedback("Location Discovered! +5 Gold 🔍");
            this.spawnLocation(locIndex); // Respawn immediately
            this.updateStats();
            this.render(); // Update to remove old, show new
            return; // Don't trigger other popups if just found location
        }

        if (this.treasure && this.treasure.cell === this.party.cell) {
            this.showTreasurePopup();
        } else if (this.enemy && this.enemy.cell === this.party.cell) {
            this.showBattlePopup();
        } else if (this.beast && this.beast.cell === this.party.cell) {
            this.showBeastPopup();
        } else if (this.siege && this.siege.armyCell === this.party.cell) {
            this.showSiegeBattlePopup();
        } else if (burg) {
            this.showBurgPopup(burg);
        }
    },

    showBurgPopup(burg) {
        // Create popup if doesn't exist
        if (!this.popupElement) {
            this.popupElement = document.createElement('div');
            this.popupElement.className = 'burg-popup';
            document.body.appendChild(this.popupElement);
        }

        // Calculate Surplus and Reset Logic
        let notificationHtml = '';
        const netFood = parseFloat(burg.net_food); // Ensure number

        if (netFood > 0) {
            // Only refill if current food is LESS than the surplus capacity
            const surplusCap = Math.floor(netFood * 10);
            if (this.party.food < surplusCap) {
                this.party.food = surplusCap;
                notificationHtml = `<div class="notification">Abundant food! Supplies reset to ${surplusCap}.</div>`;
                this.updateStats();
            }
        }

        // Ensure overlay exists
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

        this.popupElement.innerHTML = `
            <h2>${burg.name}</h2>
            <div class="content-wrapper">
                <div class="info">
                    Type: ${burg.type}<br>
                    Pop: ${burg.population_fmt}<br>
                    Food Surplus: ${parseFloat(burg.net_food).toFixed(2)}<br>
                    ${craftsmanQuartiers > 0 ? `Craftsman Quartiers: ${craftsmanQuartiers}<br>` : ''}
                    ${soldierQuartiers > 0 ? `Soldier Quartiers: ${soldierQuartiers}<br>` : ''}
                </div>
                ${notificationHtml}
            </div>
            <div class="actions">
                <button class="btn-buy" onclick="AdventureManager.buyFood(10, 1)" title="1 Gold for 10 Food">Buy 10 Food (1 💰)</button>
                ${this.diplomaticTargets.includes(burg.id) ? `<button class="btn-recruit" style="background-color: #4169E1;" onclick="AdventureManager.resolveDiplomacy(${burg.id})" title="Solve diplomatic issue">Diplomatic Mission (5 💰)</button>` : ''}
                ${(this.siege && this.siege.burgId === burg.id) ? `<button class="btn-recruit" style="background-color: #000;" onclick="AdventureManager.showSiegeBattlePopup()" title="Fight Sieging Army">Fight Siege Army (💣)</button>` : ''}
                ${canRecruit ? `<button class="btn-recruit" onclick="AdventureManager.recruitSoldiers(5, ${soldierCost}, ${burg.cell_id})" title="Recruit 5 soldiers for 5 Tools and 5 Gold. Each Soldier Quartier over 1 in the burg decreases the gold cost by one (down to a minimum of 1)">Recruit 5 Soldiers (${soldierCost} 💰, 5 🛠️)</button>` : ''}
                ${canBuyTools ? `<button class="btn-buy" onclick="AdventureManager.buyTools(${toolsAmount}, 1)" title="1 Gold for an amount of Tools equal to Craftsmen Quartiers in the burg (max 5)">Buy ${toolsAmount} Tools (1 💰)</button>` : ''}
                <button class="btn-leave" onclick="AdventureManager.closePopup()">Leave</button>
            </div>
        `;

        this.popupElement.style.display = 'block';
    },

    resolveDiplomacy(burgId) {
        if (!this.diplomaticTargets.includes(burgId)) return;

        if (this.party.gold >= 5) {
            this.party.gold -= 5;
            // Remove from targets
            this.diplomaticTargets = this.diplomaticTargets.filter(id => id !== burgId);
            this.diplomacySolvedCount++;

            this.updateStats();
            this.render(); // Update rings
            this.closePopup();

            if (this.diplomacySolvedCount >= 3) {
                this.party.gold += 35;
                this.showFeedback("Diplomatic Tour Complete! +35 Gold. Starting new tour...");
                this.updateStats();
                setTimeout(() => this.startDiplomaticTour(), 2000);
            } else {
                this.showFeedback(`Diplomatic Mission Successful! (${this.diplomacySolvedCount}/3)`);
            }
        } else {
            this.showFeedback("Not enough gold (Need 5 💰)!");
        }
    },

    closePopup() {
        if (this.popupElement) {
            this.popupElement.style.display = 'none';
        }
        const overlay = document.getElementById('modalOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },

    buyFood(amount, cost) {
        if (this.party.gold >= cost) {
            this.party.gold -= cost;
            this.party.food += amount;
            this.updateStats();
            this.showFeedback(`Bought ${amount} food!`);
        } else {
            this.showFeedback("Not enough gold!");
        }
    },

    buyTools(amount, cost) {
        if (this.party.gold >= cost) {
            this.party.gold -= cost;
            this.party.tools += amount;
            this.updateStats();
            this.showFeedback(`Bought ${amount} tools!`);
        } else {
            this.showFeedback("Not enough gold!");
        }
    },

    recruitSoldiers(amount, cost, burgCellId) {
        // Find burg to update its soldier count
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
            this.showFeedback(`Recruited ${amount} soldiers!`);
        } else {
            if (this.party.gold < cost) {
                this.showFeedback("Not enough gold!");
            } else {
                this.showFeedback("Not enough tools!");
            }
        }
    },

    showTreasurePopup() {
        if (!this.popupElement) {
            // Create if missing (reuse burg logic mostly)
            this.popupElement = document.createElement('div');
            this.popupElement.className = 'burg-popup';
            document.body.appendChild(this.popupElement);
        }

        // Ensure overlay
        let overlay = document.getElementById('modalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalOverlay';
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';

        const cost = this.treasure.amount;
        const canMine = this.party.tools >= cost;

        this.popupElement.innerHTML = `
            <h2>💎 Buried Treasure 💎</h2>
            <div class="content-wrapper">
                <div class="info">
                    You found a buried treasure chest!<br>
                    It seems to contain <strong>${this.treasure.amount} Gold</strong>.
                </div>
            </div>
            <div class="actions">
                ${canMine ?
                `<button class="btn-recruit" onclick="AdventureManager.mineTreasure()">Mine Treasure (Cost: ${cost} 🛠️)</button>` :
                `<div class="warning" style="color: #e74c3c; margin-bottom: 10px;">You do not have enough tools to mine this treasure (Need ${cost} 🛠️).</div>`
            }
                <button class="btn-leave" onclick="AdventureManager.closePopup()">Leave</button>
            </div>
        `;
        this.popupElement.style.display = 'block';
    },

    mineTreasure() {
        if (!this.treasure) return;
        const cost = this.treasure.amount;

        if (this.party.tools >= cost) {
            this.party.tools -= cost;
            this.party.gold += this.treasure.amount;
            this.showFeedback(`Mined ${this.treasure.amount} Gold! Used ${cost} Tools.`);

            this.closePopup();
            this.spawnTreasure(); // Respawn
            this.updateStats();
        } else {
            this.showFeedback("Not enough tools!");
        }
    },

    showBattlePopup() {
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

        const mySoldiers = this.party.soldiers;
        const enemySoldiers = this.enemy.soldiers;

        // Use ratio R = Player / Enemy.
        // P(Win) = R^2 / (R^2 + 1)
        const ratio = mySoldiers / enemySoldiers;
        const k = 2; // Squared for sharper curve
        const winProb = (Math.pow(ratio, k) / (Math.pow(ratio, k) + 1));
        const winPercent = (winProb * 100).toFixed(1);

        this.popupElement.innerHTML = `
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
                 <button class="btn-recruit" style="background-color: #c0392b;" onclick="AdventureManager.resolveBattle()">FIGHT!</button>
                 <button class="btn-leave" onclick="AdventureManager.closePopup()">Retreat (Stay here)</button>
             </div>
        `;
        this.popupElement.style.display = 'block';
    },

    resolveBattle() {
        if (!this.enemy) return;

        const mySoldiers = this.party.soldiers;
        const enemySoldiers = this.enemy.soldiers;
        const ratio = mySoldiers / enemySoldiers;
        const k = 2;
        const winProb = (Math.pow(ratio, k) / (Math.pow(ratio, k) + 1));

        const roll = Math.random();

        if (roll < winProb) {
            // WIN
            const goldReward = Math.floor(enemySoldiers / 10) * 2;
            const soldierReward = Math.floor(enemySoldiers / 10) * 2;

            this.party.gold += goldReward;
            this.party.soldiers += soldierReward; // replenish or recruit

            this.showFeedback(`VICTORY! Gained ${goldReward} Gold & ${soldierReward} Soldiers.`);

            this.closePopup();
            this.spawnEnemy(); // Respawn
            this.updateStats();
        } else {
            // LOSE
            // Retain half of starting army, round down to nearest 5, min 5
            const retained = Math.max(5, Math.floor((mySoldiers / 2) / 5) * 5);
            this.party.soldiers = retained;

            this.updateStats();
            this.closePopup();

            // Damage enemy
            const damage = mySoldiers;
            this.enemy.soldiers = Math.max(0, this.enemy.soldiers - damage);

            if (this.enemy.soldiers === 0) {
                this.showFeedback(`DEFEAT! But you wiped out the enemy!`);
                this.enemyElement.style.display = "none";
                this.enemy = null;
                this.spawnEnemy();
            } else {
                this.showFeedback(`DEFEAT! Enemy took ${damage} casualties.`);
            }
        }
    },




    showSiegeBattlePopup() {
        if (!this.siege) return;

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

        const mySoldiers = this.party.soldiers;
        const enemySoldiers = this.siege.soldiers;

        const ratio = mySoldiers / enemySoldiers;
        const k = 2;
        const winProb = (Math.pow(ratio, k) / (Math.pow(ratio, k) + 1));
        const winPercent = (winProb * 100).toFixed(1);

        this.popupElement.innerHTML = `
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
                 <button class="btn-recruit" style="background-color: #c0392b;" onclick="AdventureManager.resolveSiegeBattle()">ATTACK!</button>
                 <button class="btn-leave" onclick="AdventureManager.closePopup()">Retreat</button>
             </div>
        `;
        this.popupElement.style.display = 'block';
    },

    resolveSiegeBattle() {
        if (!this.siege) return;

        const mySoldiers = this.party.soldiers;
        const enemySoldiers = this.siege.soldiers;
        const ratio = mySoldiers / enemySoldiers;
        const k = 2;
        const winProb = (Math.pow(ratio, k) / (Math.pow(ratio, k) + 1));

        if (Math.random() < winProb) {
            // WIN
            const goldReward = 50; // High reward
            const soldierReward = 10; // Freed prisoners?

            this.party.gold += goldReward;
            this.party.soldiers += soldierReward;

            this.showFeedback(`SIEGE BROKEN! Hero of the city! +${goldReward} Gold.`);

            this.closePopup();
            this.siege = null;
            if (this.siegeElement) this.siegeElement.style.display = 'none';
            this.render(); // remove rings

            // Spawn new siege elsewhere
            setTimeout(() => this.spawnSiege(), 3000);
            this.updateStats();
        } else {
            // LOSE
            const retained = Math.max(5, Math.floor((mySoldiers / 2) / 5) * 5);
            this.party.soldiers = retained;

            this.updateStats();
            this.closePopup();

            // Damage enemy
            const damage = mySoldiers;
            this.siege.soldiers = Math.max(0, this.siege.soldiers - damage);

            if (this.siege.soldiers === 0) {
                this.showFeedback(`DEFEAT! But siege is broken at high cost!`);
                this.siege = null;
                if (this.siegeElement) this.siegeElement.style.display = 'none';
                this.render();
                setTimeout(() => this.spawnSiege(), 3000);
            } else {
                this.showFeedback(`DEFEAT! Siege continues...`);
                // Update text to show weakened enemy
                if (this.siegeCountElement) this.siegeCountElement.textContent = this.siege.soldiers;
            }
        }
    },

    render() {
        const cell = graphData[this.party.cell];
        if (cell && this.partyElement) {
            this.partyElement.setAttribute('cx', cell.p[0]);
            this.partyElement.setAttribute('cy', cell.p[1]);
        }

        if (this.treasure && this.treasureElement) {
            const tData = graphData[this.treasure.cell];
            if (tData) {
                this.treasureElement.setAttribute("transform", `translate(${tData.p[0]}, ${tData.p[1]})`);
                this.treasureElement.style.display = "block";
            } else {
                this.treasureElement.style.display = "none";
            }
        }

        if (this.enemy && this.enemyElement) {
            const eData = graphData[this.enemy.cell];
            if (eData) {
                this.enemyElement.setAttribute("transform", `translate(${eData.p[0]}, ${eData.p[1]})`);
                this.enemyElement.style.display = "block";
            } else {
                this.enemyElement.style.display = "none";
            }
        }

        if (this.beast && this.beastElement) {
            const bData = graphData[this.beast.cell];
            if (bData) {
                this.beastElement.setAttribute("transform", `translate(${bData.p[0]}, ${bData.p[1]})`);
                this.beastElement.style.display = "block";
            } else {
                this.beastElement.style.display = "none";
            }
        }

        if (this.siege && this.siegeElement) {
            const sData = graphData[this.siege.armyCell];
            if (sData) {
                this.siegeElement.setAttribute("transform", `translate(${sData.p[0]}, ${sData.p[1]})`);
                this.siegeElement.style.display = "block";
            } else {
                this.siegeElement.style.display = "none";
            }
        }

        // Explorer Locations
        for (let i = 0; i < 4; i++) {
            const loc = this.locations[i];
            const el = this.locationElements[i];
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

        // Diplomatic Tour Rings
        if (this.diplomacyGroup) {
            while (this.diplomacyGroup.firstChild) {
                this.diplomacyGroup.removeChild(this.diplomacyGroup.firstChild);
            }
            this.diplomaticTargets.forEach(id => {
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
                    this.diplomacyGroup.appendChild(ring);
                }
            });
        }

        // Siege Rings
        if (this.siegeRingGroup) {
            while (this.siegeRingGroup.firstChild) {
                this.siegeRingGroup.removeChild(this.siegeRingGroup.firstChild);
            }
            if (this.siege) {
                const burg = burgsData.find(b => b.id === this.siege.burgId);
                if (burg) {
                    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    ring.setAttribute("cx", burg.x);
                    ring.setAttribute("cy", burg.y);
                    ring.setAttribute("r", parseFloat(burg.r) + 12); // Bigger radius
                    ring.setAttribute("fill", "none");
                    ring.setAttribute("stroke", "#000"); // Black
                    ring.setAttribute("stroke-width", "4"); // Thicker
                    ring.setAttribute("pointer-events", "none");
                    // ring.setAttribute("class", "siege-ring"); 
                    this.siegeRingGroup.appendChild(ring);
                }
            }
        }
    },

    showBeastPopup() {
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

        const mySoldiers = this.party.soldiers;
        const beastStrength = this.beast.strength;
        const willWin = mySoldiers > beastStrength;

        this.popupElement.innerHTML = `
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
                 <button class="btn-recruit" style="background-color: #8e44ad;" onclick="AdventureManager.resolveBeastBattle()">FIGHT!</button>
                 <button class="btn-leave" onclick="AdventureManager.closePopup()">Retreat</button>
             </div>
        `;
        this.popupElement.style.display = 'block';
    },

    resolveBeastBattle() {
        if (!this.beast) return;

        const mySoldiers = this.party.soldiers;
        const beastStrength = this.beast.strength;

        if (mySoldiers > beastStrength) {
            // WIN
            // Gain 1 gold for each 5 strength of the beast, rounding up.
            const goldReward = Math.ceil(beastStrength / 5);

            this.party.gold += goldReward;

            this.showFeedback(`SLAIN! Gained ${goldReward} Gold.`);

            this.closePopup();
            this.spawnBeast(); // Respawn
            this.updateStats();
        } else {
            // LOSE
            this.showFeedback("DEFEAT! The beast was too strong.");

            // Damage beast by half of nr of soldiers
            const damage = Math.floor(mySoldiers / 2);
            this.beast.strength = Math.max(0, this.beast.strength - damage);

            // Lose 5 soldiers
            this.party.soldiers = Math.max(0, this.party.soldiers - 5);

            this.updateStats();
            this.closePopup();

            // Check if beast died from damage
            if (this.beast.strength <= 0) {
                this.showFeedback("The beast succumbed to its wounds!");
                this.beastElement.style.display = "none";
                this.beast = null;
                this.spawnBeast();
            }
        }
    },

    showBeastPopup() {
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

        const mySoldiers = this.party.soldiers;
        const beastStrength = this.beast.strength;
        const willWin = mySoldiers > beastStrength;

        this.popupElement.innerHTML = `
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
                 <button class="btn-recruit" style="background-color: #8e44ad;" onclick="AdventureManager.resolveBeastBattle()">FIGHT!</button>
                 <button class="btn-leave" onclick="AdventureManager.closePopup()">Retreat</button>
             </div>
        `;
        this.popupElement.style.display = 'block';
    },

    resolveBeastBattle() {
        if (!this.beast) return;

        const mySoldiers = this.party.soldiers;
        const beastStrength = this.beast.strength;

        if (mySoldiers > beastStrength) {
            // WIN
            // Gain 1 gold for each 5 strength of the beast, rounding up.
            const goldReward = Math.ceil(beastStrength / 5);

            this.party.gold += goldReward;

            this.showFeedback(`SLAIN! Gained ${goldReward} Gold.`);

            this.closePopup();
            this.spawnBeast(); // Respawn
            this.updateStats();
        } else {
            // LOSE
            this.showFeedback("DEFEAT! The beast was too strong.");

            // Damage beast by half of nr of soldiers
            const damage = Math.floor(mySoldiers / 2);
            this.beast.strength = Math.max(0, this.beast.strength - damage);

            // Lose 5 soldiers
            this.party.soldiers = Math.max(0, this.party.soldiers - 5);

            this.updateStats();
            this.closePopup();

            // Check if beast died from damage
            if (this.beast.strength <= 0) {
                this.showFeedback("The beast succumbed to its wounds!");
                this.beastElement.style.display = "none";
                this.beast = null;
                this.spawnBeast();
            }
        }
    },

    updateStats() {
        document.getElementById('advSoldiers').textContent = this.party.soldiers;
        document.getElementById('advFood').textContent = this.party.food;
        document.getElementById('advGold').textContent = this.party.gold;
        document.getElementById('advTools').textContent = this.party.tools;
    },

    showFeedback(msg) {
        const t = document.getElementById('tooltip');
        t.innerHTML = msg;
        t.style.display = 'block';
        // Center tooltip or show at party location
        // For now just somewhere visible? Or let user clear it.
        // Let's fade it out
        t.style.left = window.innerWidth / 2 + 'px';
        t.style.top = '100px';
        setTimeout(() => t.style.display = 'none', 2000);
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


