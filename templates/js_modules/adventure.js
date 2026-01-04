
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
            off(event, callback) {
                if (!this.listeners[event]) return;
                this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
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

            // Emit Event (Campaigns may override start location here)
            if (this.events) this.events.emit('start', this.party);

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
        if (this.events && typeof this.events.emit === 'function') {
            this.events.emit('burgPopupOpened', context);
        }

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
