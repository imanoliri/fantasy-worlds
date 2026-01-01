// Global Sets for Multi-Selection
window.selectedBurgIds = new Set();
window.selectedStateNames = new Set();
window.selectedTradeRoutes = new Set(); // Stores strings "fromId-toId"

function updateVisuals() {
    // 1. Clear ALL previous highlights
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
    // 2. Highlight Selected Burgs and their Relations
    window.selectedBurgIds.forEach(id => {
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
    window.selectedStateNames.forEach(stateName => {
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
            dot.classList.add('highlighted');
            // Only override fill if not selected (selected takes precedence)
            if (!dot.classList.contains('selected')) {
                dot.style.fill = color;
                dot.style.stroke = '#000';
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
    window.selectedTradeRoutes.forEach(key => {
        const [fromId, toId] = key.split('-');

        // Find Trade Row(s) - tricky because we don't have unique IDs on TR rows usually?
        // We need to match based on from/to cells content or we can assume unique lookup.
        // Actually, the previous code passed the element 'el'. But for general update, we search.
        // Let's assume we can find it.

        // Highlight Key Trade Rows
        highlightTradeRowsByIds(fromId, toId, 'selected');

        // Highlight Endpoints
        [fromId, toId].forEach(id => {
            const dot = document.querySelector(`.burg-dot[data-id="${id}"]`);
            if (dot) dot.classList.add('selected');
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

    // Force String ID for consistency between Map (string) and Table (number)
    const strId = id.toString();

    if (window.selectedBurgIds.has(strId)) {
        window.selectedBurgIds.delete(strId);
    } else {
        window.selectedBurgIds.add(strId);
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
    if (window.selectedStateNames.has(stateName)) {
        window.selectedStateNames.delete(stateName);
    } else {
        window.selectedStateNames.add(stateName);
        // Scroll
        const row = highlightRowByName('stateTable', stateName, 'selected'); // Dry run to find row
        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    updateVisuals();
}

function highlightTradeRoute(el, fromId, toId) {
    const key = `${fromId}-${toId}`;
    if (window.selectedTradeRoutes.has(key)) {
        window.selectedTradeRoutes.delete(key);
    } else {
        window.selectedTradeRoutes.add(key);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    updateVisuals();
}

function clearHighlights() {
    window.selectedBurgIds.clear();
    window.selectedStateNames.clear();
    window.selectedTradeRoutes.clear();
    updateVisuals();
}

function selectState(stateId) {
    // Legacy support for diplomacy click actions, can keep as is or integrate.
    // The original code toggled colors on click.
    const btn = document.getElementById('toggleMapMode');
    if (btn) {
        const currentMode = btn.getAttribute('data-mode');
        if (currentMode === 'state') {
            updateDiplomacyColors(stateId);
        }
    }
}
