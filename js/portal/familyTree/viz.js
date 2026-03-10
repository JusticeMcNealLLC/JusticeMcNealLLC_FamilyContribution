// js/portal/familyTree/viz.js
// Cytoscape wrapper — initialises and controls the interactive family tree graph.

const TreeViz = (function () {
    let cy = null;

    // ─── Zoom / fit controls overlay ──────────────────────────────────────────

    function createControls(container, cyInstance) {
        if (container.querySelector('.tv-controls')) return; // avoid duplicates

        const wrap = document.createElement('div');
        wrap.className = 'tv-controls';
        Object.assign(wrap.style, {
            position: 'absolute', top: '12px', right: '12px',
            zIndex: 999, display: 'flex', flexDirection: 'column', gap: '6px',
        });

        const makeBtn = (label, title) => {
            const b = document.createElement('button');
            b.type       = 'button';
            b.textContent = label;
            b.title       = title || label;
            Object.assign(b.style, {
                padding: '6px 8px', borderRadius: '10px',
                border: '1px solid rgba(0,0,0,0.06)', background: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'pointer',
            });
            b.addEventListener('click', e => e.stopPropagation());
            return b;
        };

        const zoomIn  = makeBtn('+', 'Zoom in');
        const zoomOut = makeBtn('−', 'Zoom out');
        const fitBtn  = makeBtn('⤢', 'Fit to view');

        const slider = document.createElement('input');
        Object.assign(slider, { type: 'range', min: 0.01, max: 4, step: 0.01, title: 'Zoom level' });
        slider.value = cyInstance.zoom();
        slider.style.width = '88px';

        zoomIn.addEventListener('click',  () => {
            const z = Math.min(cyInstance.maxZoom(), cyInstance.zoom() * 1.25);
            cyInstance.zoom({ level: z, renderedPosition: { x: cyInstance.width() / 2, y: cyInstance.height() / 2 } });
        });
        zoomOut.addEventListener('click', () => {
            const z = Math.max(cyInstance.minZoom(), cyInstance.zoom() / 1.25);
            cyInstance.zoom({ level: z, renderedPosition: { x: cyInstance.width() / 2, y: cyInstance.height() / 2 } });
        });
        fitBtn.addEventListener('click', () => cyInstance.fit(50));

        slider.addEventListener('input', e => cyInstance.zoom({ level: parseFloat(e.target.value) }));
        cyInstance.on('zoom', () => {
            slider.value = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), cyInstance.zoom()));
        });

        const row = document.createElement('div');
        Object.assign(row.style, { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px' });
        row.appendChild(zoomOut);
        row.appendChild(slider);
        row.appendChild(zoomIn);

        wrap.appendChild(row);
        wrap.appendChild(fitBtn);

        container.style.position = container.style.position || 'relative';
        container.appendChild(wrap);
    }

    // ─── Public: init ─────────────────────────────────────────────────────────

    function init(containerId, elements) {
        const id        = containerId.replace('#', '');
        const container = document.getElementById(id);
        if (!container) return;

        // Destroy any previous instance
        if (cy) { try { cy.destroy(); } catch (_) {} cy = null; }

        cy = cytoscape({
            container,
            elements,
            style: [
                {
                    // Base node — indigo circle, label below
                    selector: 'node',
                    style: {
                        label: 'data(label)',
                        'text-valign': 'bottom',
                        'text-halign': 'center',
                        'text-margin-y': 8,
                        color: '#374151',
                        'font-size': '11px',
                        'font-weight': '600',
                        'text-background-color': '#ffffff',
                        'text-background-opacity': 0.85,
                        'text-background-padding': '3px',
                        'text-background-shape': 'roundrectangle',
                        'background-color': '#6366f1',
                        'border-width': 2.5,
                        'border-color': '#4f46e5',
                        width: 64,
                        height: 64,
                    },
                },
                {
                    // Photo node: use profile/tree-person image as background
                    selector: 'node[photo]',
                    style: {
                        'background-image': 'data(photo)',
                        'background-fit': 'cover',
                        'background-clip': 'node',
                        'background-color': '#e0e7ff',
                    },
                },
                {
                    // Deceased / non-member: amber dashed border
                    selector: 'node[?deceased]',
                    style: {
                        'border-color': '#f59e0b',
                        'border-width': 3,
                        'border-style': 'dashed',
                    },
                },
                {
                    selector: 'edge',
                    style: {
                        'curve-style': 'bezier',
                        'target-arrow-shape': 'triangle',
                        'line-color': '#c7d2fe',
                        'target-arrow-color': '#c7d2fe',
                        width: 2,
                        label: 'data(relation)',
                        'font-size': '10px',
                        'text-rotation': 'autorotate',
                        'text-margin-y': -8,
                        color: '#6b7280',
                    },
                },
            ],
            wheelSensitivity: 0.4,
            userZoomingEnabled: true,
            zoomingEnabled: true,
            panningEnabled: true,
            minZoom: 0.01,
            maxZoom: 4,
            boxSelectionEnabled: false,
            motionBlur: true,
        });

        // Run layout then fit — resize first so Cytoscape reads actual container dimensions
        cy.resize();
        const layout = cy.layout({ name: 'breadthfirst', directed: true, padding: 10, spacingFactor: 1.2 });
        layout.run();
        layout.on('layoutstop', () => { try { cy.fit(50); } catch (_) {} });

        createControls(container, cy);

        // Node tap → profile page (members only)
        cy.on('tap', 'node', evt => {
            const node = evt.target;
            if (node.data('isMember')) {
                window.location.href = `profile.html?id=${node.id()}`;
            }
        });

        // Pointer cursor for member nodes
        cy.on('mouseover', 'node[?isMember]', () => { container.style.cursor = 'pointer'; });
        cy.on('mouseout',  'node[?isMember]', () => { container.style.cursor = 'default'; });

        // Double-click container → fit
        container.addEventListener('dblclick', e => {
            e.stopPropagation();
            try { cy.fit(50); } catch (_) {}
        });

        // Responsive resize
        window.addEventListener('resize', () => { try { cy.resize(); } catch (_) {} });
    }

    return { init };
})();

// Expose globally for pages that reference window.TreeViz
try { if (typeof window !== 'undefined') window.TreeViz = TreeViz; } catch (_) {}
