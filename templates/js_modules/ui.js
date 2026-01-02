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

    // Rotate triangle based on visibility
    if (controls.classList.contains('hidden')) {
        btn.innerHTML = '▲';
    } else {
        btn.innerHTML = '▼';
    }
}
