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

        // Cleanup Campaign UI if present
        document.getElementById('campaignSelectContainer').classList.add('hidden');
        document.querySelector('.sidebar-controls').classList.remove('hidden');

        // If coming from Campaign Mode, we must RESET to ensure fresh Adventure
        if (window.CampaignManager && window.CampaignManager.active) {
            CampaignManager.cancelCampaign();
            // cancelCampaign calls reset(), so AdventureManager.active becomes false
        }

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
