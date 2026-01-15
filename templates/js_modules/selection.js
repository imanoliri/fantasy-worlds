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

    const modeBtn = document.getElementById('mapModeBtn');
    const currentMode = modeBtn ? modeBtn.getAttribute('data-current-mode') : null;

    // Handle State/Political Mode
    if (currentMode === 'state') {
        const burgDot = document.querySelector(`.burg-dot[data-id="${id}"]`);
        if (burgDot && burgDot.hasAttribute('data-state-id')) {
            const stateId = burgDot.getAttribute('data-state-id');
            if (window.selectState) selectState(stateId);
        }
        return;
    }

    // Restrict highlighting to Free Mode only
    const gameModeBtn = document.getElementById('gameModeBtn');
    if (gameModeBtn && !gameModeBtn.innerText.includes('Free Mode')) {
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
        // Only run diplomacy update if already in state mode
        if (currentMode === 'state') {
            const id = parseInt(stateId);
            let targetId = id;

            // Toggle logic: If clicking the same state, deselect (target "No State" / -2)
            if (diplomacySelectedStateId === id) {
                targetId = -2;
            }

            // check if Faction Selector is active/visible by checking for a radio input?
            // Or just check if the radio exists.
            const radio = document.querySelector(`input[name="warFactionSelect"][value="${targetId}"]`);

            if (radio) {
                radio.checked = true;
                if (typeof FactionSelectorInstance !== 'undefined') {
                    FactionSelectorInstance.onSelect(targetId);
                    // Sync our local tracker with what FactionSelector likely did
                    diplomacySelectedStateId = (targetId === -2) ? null : targetId;
                    return;
                }
            }

            // Fallback for when Faction Selector is not active/available
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
