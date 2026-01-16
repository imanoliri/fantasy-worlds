
const events = {
    listeners: {},
    on(event, callback, options = {}) {
        if (!this.listeners[event]) this.listeners[event] = [];
        const listener = {
            callback: callback,
            priority: options.priority || 0,
            id: options.id || null,
            after: options.after || [],
            before: options.before || []
        };
        this.listeners[event].push(listener);
        this.sortListeners(event);
    },
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(l => l.callback(data));
        }
    },
    sortListeners(event) {
        const list = this.listeners[event];
        // 1. Base Sort by Priority (Low -> High)
        list.sort((a, b) => a.priority - b.priority);

        // 2. Resolve 'after' / 'before' constraints
        let changed = true;
        let iterations = 0;
        const limit = list.length * list.length;
        while (changed && iterations < limit && list.length > 1) {
            changed = false;
            iterations++;
            for (let i = 0; i < list.length - 1; i++) {
                const current = list[i];
                const next = list[i + 1];
                let shouldSwap = false;
                if (next.id && current.after.includes(next.id)) shouldSwap = true;
                if (current.id && next.before.includes(current.id)) shouldSwap = true;
                if (shouldSwap) {
                    list[i] = next;
                    list[i + 1] = current;
                    changed = true;
                }
            }
        }
    }
};

// Simulation
const log = [];
events.on('test', () => log.push('campaign'), { id: 'campaign_base', priority: 10 });
events.on('test', () => log.push('siege'), { id: 'mission_siege', priority: 100, after: ['campaign_base'] });

events.emit('test');

console.log('Execution Order:', log.join(' -> '));

if (log[0] === 'campaign' && log[1] === 'siege') {
    console.log("PASS: Campaign -> Siege");
} else {
    console.log("FAIL: Order Incorrect");
    process.exit(1);
}
