// Simple Cytoscape wrapper used by the Family Tree page
const TreeViz = (function(){
    let cy = null;

    function createControls(container, cyInstance) {
        // avoid duplicate controls
        if (container.querySelector('.tv-controls')) return;

        const wrap = document.createElement('div');
        wrap.className = 'tv-controls';
        wrap.style.position = 'absolute';
        wrap.style.top = '12px';
        wrap.style.right = '12px';
        wrap.style.zIndex = 999;
        wrap.style.display = 'flex';
        wrap.style.flexDirection = 'column';
        wrap.style.gap = '6px';

        const btn = (label, title) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = label;
            b.title = title || label;
            b.style.padding = '6px 8px';
            b.style.borderRadius = '10px';
            b.style.border = '1px solid rgba(0,0,0,0.06)';
            b.style.background = 'white';
            b.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
            b.style.cursor = 'pointer';
            b.addEventListener('click', (ev) => ev.stopPropagation());
            return b;
        };

        const zoomIn = btn('+', 'Zoom in');
        const zoomOut = btn('−', 'Zoom out');
        const fitBtn = btn('⤢', 'Fit to view');

        // slider
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = 0.01;
        slider.max = 4;
        slider.step = 0.01;
        slider.value = cyInstance.zoom();
        slider.title = 'Zoom level';
        slider.style.width = '88px';

        // hook events
        zoomIn.addEventListener('click', function(){
            const z = Math.min(cyInstance.maxZoom(), cyInstance.zoom() * 1.25);
            cyInstance.zoom({ level: z, renderedPosition: { x: cyInstance.width()/2, y: cyInstance.height()/2 } });
        });
        zoomOut.addEventListener('click', function(){
            const z = Math.max(cyInstance.minZoom(), cyInstance.zoom() / 1.25);
            cyInstance.zoom({ level: z, renderedPosition: { x: cyInstance.width()/2, y: cyInstance.height()/2 } });
        });
        fitBtn.addEventListener('click', function(){ cyInstance.fit(50); });

        // slider change
        slider.addEventListener('input', function(e){
            const z = parseFloat(e.target.value);
            cyInstance.zoom({ level: z });
        });

        // update slider on zoom events
        cyInstance.on('zoom', function(){
            const z = cyInstance.zoom();
            slider.value = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), z));
        });

        // pack controls
        const vbox = document.createElement('div');
        vbox.style.display = 'flex';
        vbox.style.flexDirection = 'row';
        vbox.style.alignItems = 'center';
        vbox.style.gap = '6px';
        vbox.appendChild(zoomOut);
        vbox.appendChild(slider);
        vbox.appendChild(zoomIn);

        wrap.appendChild(vbox);
        wrap.appendChild(fitBtn);

        // place in container
        container.style.position = container.style.position || 'relative';
        container.appendChild(wrap);
    }

    function init(containerId, elements) {
        const id = containerId.replace('#','');
        const container = document.getElementById(id);
        if (!container) return;

        if (cy) {
            try { cy.destroy(); } catch (_) {}
            cy = null;
        }

        cy = cytoscape({
            container: container,
            elements: elements,
            style: [
                { selector: 'node', style: { 'label': 'data(label)', 'text-valign':'center', 'color':'#ffffff','font-size':'12px','background-color':'#6366f1','border-width':2,'border-color':'#4f46e5','width':54,'height':54 } },
                { selector: 'edge', style: { 'curve-style':'bezier','target-arrow-shape':'triangle','line-color':'#c7d2fe','target-arrow-color':'#c7d2fe','width':2,'label':'data(relation)','font-size':'10px','text-rotation':'autorotate','text-margin-y':-8 } }
            ],
            layout: { name: 'breadthfirst', directed: true, padding: 10, spacingFactor: 1.2 },
            wheelSensitivity: 0.4,
            userZoomingEnabled: true,
            zoomingEnabled: true,
            panningEnabled: true,
            minZoom: 0.01,
            maxZoom: 4,
            boxSelectionEnabled: false,
            motionBlur: true,
        });

        // attach controls overlay
        createControls(container, cy);

        // node click -> profile
        cy.on('tap', 'node', function(evt){
            const node = evt.target;
            const id = node.id();
            window.location.href = `profile.html?id=${id}`;
        });

        // Ensure layout runs and then fit the view so nodes are visible
        try {
            const layout = cy.layout({ name: 'breadthfirst', directed: true, padding: 10, spacingFactor: 1.2 });
            layout.run();
            layout.on('layoutstop', function(){
                try { cy.fit(50); } catch(_){}
                try {
                    console.log('[TreeViz] layoutstop - nodes:', cy.nodes().length, 'edges:', cy.edges().length, 'ids:', cy.nodes().map(n=>n.id()));
                    const bb = cy.elements().boundingBox();
                    console.log('[TreeViz] boundingBox:', bb);
                } catch (e) { console.warn('[TreeViz] layout debug error', e); }
                // if no nodes, show a friendly message
                if (cy.nodes().length === 0) {
                    if (!container.querySelector('.tv-empty')) {
                        const msg = document.createElement('div');
                        msg.className = 'tv-empty';
                        msg.style.position = 'absolute';
                        msg.style.left = '50%';
                        msg.style.top = '50%';
                        msg.style.transform = 'translate(-50%, -50%)';
                        msg.style.padding = '12px 16px';
                        msg.style.background = 'rgba(255,255,255,0.95)';
                        msg.style.border = '1px solid rgba(0,0,0,0.06)';
                        msg.style.borderRadius = '10px';
                        msg.style.boxShadow = '0 6px 18px rgba(16,24,40,0.06)';
                        msg.style.zIndex = 998;
                        msg.textContent = 'No nodes to display — ensure there are active profiles or approved relations.';
                        container.appendChild(msg);
                    }
                } else {
                    const existing = container.querySelector('.tv-empty');
                    if (existing) existing.remove();
                }

                // DEBUG: force a compact grid layout after breadthfirst so nodes are definitely visible
                try {
                    if (cy.nodes().length > 0) {
                        const count = cy.nodes().length;
                        const rows = Math.ceil(Math.sqrt(count));
                        const grid = cy.layout({ name: 'grid', rows: rows, spacingFactor: 1.1, avoidOverlap: true, animate: true, animationDuration: 300 });
                        grid.run();
                        grid.on('layoutstop', function(){ 
                            try { cy.fit(40); } catch(_){}; 
                            try { cy.center(); cy.zoom(1); cy.resize(); } catch(_){}
                            try { cy.nodes().forEach(n => { n.style('width', 80); n.style('height', 80); n.style('font-size', '14px'); }); } catch(_){}
                            console.log('[TreeViz] debug grid layout applied - fit/center/zoom and nodes enlarged');
                        });
                    }
                } catch (err) { console.warn('[TreeViz] debug grid layout error', err); }
            });

        // Visible debug panel inside container to display layout diagnostics
        (function createDebugPanel(){
            try {
                let panel = container.querySelector('.tv-debug-panel');
                if (!panel) {
                    panel = document.createElement('div');
                    panel.className = 'tv-debug-panel';
                    panel.style.position = 'absolute';
                    panel.style.right = '12px';
                    panel.style.bottom = '12px';
                    panel.style.zIndex = 1001;
                    panel.style.background = 'rgba(255,255,255,0.95)';
                    panel.style.border = '1px solid rgba(0,0,0,0.06)';
                    panel.style.padding = '8px 10px';
                    panel.style.borderRadius = '8px';
                    panel.style.fontSize = '12px';
                    panel.style.color = '#0f172a';
                    panel.style.maxWidth = '280px';
                    panel.style.boxShadow = '0 6px 20px rgba(2,6,23,0.08)';
                    panel.innerText = 'TreeViz debug: initializing...';
                    container.appendChild(panel);
                }

                function updatePanel() {
                    try {
                        const nodes = cy.nodes().length;
                        const edges = cy.edges().length;
                        const ids = cy.nodes().map(n=>n.id()).slice(0,10).join(', ');
                        const bb = (() => { try { return cy.elements().boundingBox(); } catch(e){ return {}; } })();
                        panel.innerText = `TreeViz debug:\nnodes: ${nodes}\nedges: ${edges}\nids: ${ids}\nbb: ${Math.round(bb.x1||0)},${Math.round(bb.y1||0)} → ${Math.round(bb.x2||0)},${Math.round(bb.y2||0)}`;
                    } catch (e) { panel.innerText = 'TreeViz debug: error reading cy'; }
                }

                // update after layoutstop and on viewport events
                try { updatePanel(); } catch(_){}
                cy.on('layoutstop', updatePanel);
                cy.on('viewport', updatePanel);
            } catch (err) { console.warn('[TreeViz] debug panel error', err); }
        })();
        } catch (err) {
            console.warn('layout/run error', err);
        }

        // quick post-init debug: report nodes/edges
        try { console.log('[TreeViz] init - nodes:', cy.nodes().length, 'edges:', cy.edges().length); } catch(_){}

        // responsive: resize on window resize
        window.addEventListener('resize', function(){
            try { cy.resize(); } catch(_){ }
        });

        // double-click container to fit
        container.addEventListener('dblclick', function(e){
            e.stopPropagation();
            try { cy.fit(50); } catch(_){ }
        });
    }

    return { init };
})();
