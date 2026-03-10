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

        // (debug removed) initialize normally

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
                try { cy.fit(50); } catch(_){ }
            });
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

// expose TreeViz to window for pages that check `window.TreeViz`
try { if (typeof window !== 'undefined' && typeof TreeViz !== 'undefined') window.TreeViz = TreeViz; } catch (_) {}
