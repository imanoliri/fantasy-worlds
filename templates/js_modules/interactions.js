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

            // Show relationship if a state is selected in Faction Selector
            if (typeof FactionSelectorInstance !== 'undefined') {
                const activeOption = document.querySelector('input[name="warFactionSelect"]:checked');
                if (activeOption) {
                    const selectedStateId = parseInt(activeOption.value);
                    const hoveredStateId = parseInt(d.stateId); // Use data-state-id

                    if (!isNaN(selectedStateId) && selectedStateId >= 0 && !isNaN(hoveredStateId) && selectedStateId !== hoveredStateId) {
                        // Calculate Relation
                        let relation = "Unknown";
                        if (window.GameState) {
                            relation = window.GameState.getRelation(selectedStateId, hoveredStateId);
                        } else if (window.diplomacyMatrix && diplomacyMatrix[selectedStateId]) {
                            relation = diplomacyMatrix[selectedStateId][hoveredStateId] || "Unknown";
                        }

                        // Add to tooltip
                        content += `<br>Relation: ${relation}`;
                    }
                }
            }
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
