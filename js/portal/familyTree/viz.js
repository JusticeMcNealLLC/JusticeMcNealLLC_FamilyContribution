// js/portal/familyTree/viz.js
// Cytoscape wrapper — initialises and controls the interactive family tree graph.

const TreeViz = (function () {
    let cy = null;
    let isAdmin = false;

    const POSITIONS_KEY = 'jm_familyTree_positions';

    function savePositions() {
        if (!cy) return;
        const pos = {};
        cy.nodes().forEach(n => { pos[n.id()] = n.position(); });
        try { localStorage.setItem(POSITIONS_KEY, JSON.stringify(pos)); } catch (_) {}
    }

    function loadPositions() {
        try { return JSON.parse(localStorage.getItem(POSITIONS_KEY) || 'null'); } catch (_) { return null; }
    }

    function clearPositions() {
        try { localStorage.removeItem(POSITIONS_KEY); } catch (_) {}
    }

    // ─── Zoom / fit controls overlay ──────────────────────────────────────────

    function createControls(container, cyInstance) {
        if (container.querySelector('.tv-controls')) return; // avoid duplicates

        const wrap = document.createElement('div');
        wrap.className = 'tv-controls';
        Object.assign(wrap.style, {
            position: 'absolute', top: '12px', right: '12px',
            zIndex: 10, display: 'flex', flexDirection: 'column', gap: '6px',
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

        const zoomIn   = makeBtn('+', 'Zoom in');
        const zoomOut  = makeBtn('−', 'Zoom out');
        const fitBtn   = makeBtn('⤢', 'Fit to view');

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

        // Admin-only: reset layout button
        if (isAdmin) {
            const resetBtn = makeBtn('↺', 'Reset layout (clears saved positions)');
            Object.assign(resetBtn.style, { fontSize: '15px' });
            resetBtn.addEventListener('click', () => {
                clearPositions();
                const l = cyInstance.layout({ name: 'breadthfirst', directed: true, padding: 30, spacingFactor: 1.4 });
                l.run();
                l.on('layoutstop', () => { try { cyInstance.fit(50); } catch (_) {} });
            });
            wrap.appendChild(resetBtn);
        }

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
                    // Base (parent / child): directed arrow
                    selector: 'edge',
                    style: {
                        'curve-style': 'bezier',
                        'target-arrow-shape': 'triangle',
                        'source-arrow-shape': 'none',
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
                {
                    // Siblings: undirected, teal
                    selector: 'edge[relation="sibling"]',
                    style: {
                        'target-arrow-shape': 'none',
                        'source-arrow-shape': 'none',
                        'line-color': '#6ee7b7',
                        width: 2.5,
                        color: '#059669',
                    },
                },
                {
                    // Spouse: undirected, rose
                    selector: 'edge[relation="spouse"]',
                    style: {
                        'target-arrow-shape': 'none',
                        'source-arrow-shape': 'none',
                        'line-color': '#fda4af',
                        width: 2.5,
                        color: '#e11d48',
                    },
                },
                {
                    // Other: undirected, gray dashed
                    selector: 'edge[relation="other"]',
                    style: {
                        'target-arrow-shape': 'none',
                        'source-arrow-shape': 'none',
                        'line-color': '#d1d5db',
                        'line-style': 'dashed',
                        color: '#9ca3af',
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
            autoungrabify: true,   // nodes locked for regular members; admins unlock via setAdmin(true)
            motionBlur: true,
        });

        // If admin was confirmed before init() ran (timing: rAF delay), unlock now
        if (isAdmin) cy.autoungrabify(false);

        // Save node positions whenever an admin finishes dragging a node
        cy.on('dragfree', 'node', () => {
            if (isAdmin) savePositions();
        });

        // Run layout then fit — resize first so Cytoscape reads actual container dimensions
        cy.resize();

        const savedPos = loadPositions();
        if (savedPos && Object.keys(savedPos).length > 0) {
            // Restore saved positions — apply preset layout so nodes land exactly where left
            const preset = cy.layout({
                name: 'preset',
                positions: node => savedPos[node.id()] || node.position(),
                fit: false,
            });
            preset.run();
            preset.on('layoutstop', () => { try { cy.fit(50); } catch (_) {} });
        } else {
            const layout = cy.layout({ name: 'breadthfirst', directed: true, padding: 30, spacingFactor: 1.4 });
            layout.run();
            layout.on('layoutstop', () => { try { cy.fit(50); } catch (_) {} });
        }

        createControls(container, cy);

        // Node tap → profile page (members) or edit non-member (admin)
        cy.on('tap', 'node', evt => {
            const node = evt.target;
            if (node.data('isMember')) {
                window.location.href = `profile.html?id=${node.id()}`;
            } else if (isAdmin && window.FamilyTreeEdit?.openEditTreePerson) {
                window.FamilyTreeEdit.openEditTreePerson(node.id());
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

        // Admin: tap edge → open edit modal
        cy.on('tap', 'edge', evt => {
            if (!isAdmin) return;
            const edge = evt.target;
            const src  = cy.getElementById(edge.data('source'));
            const tgt  = cy.getElementById(edge.data('target'));
            if (window.FamilyTreeEdit?.openEditEdge) {
                window.FamilyTreeEdit.openEditEdge({
                    id:          edge.data('id'),
                    relation:    edge.data('relation'),
                    sourceLabel: src.data('label') || edge.data('source'),
                    targetLabel: tgt.data('label') || edge.data('target'),
                });
            }
        });

        // Edge pointer cursor for admin
        cy.on('mouseover', 'edge', () => { if (isAdmin) container.style.cursor = 'pointer'; });
        cy.on('mouseout',  'edge', () => { if (isAdmin) container.style.cursor = 'default'; });

        // Responsive resize
        window.addEventListener('resize', () => { try { cy.resize(); } catch (_) {} });
    }

    return {
        init,
        setAdmin: val => {
            isAdmin = val;
            if (cy) cy.autoungrabify(!val);
        },
    };
})();

// Expose globally for pages that reference window.TreeViz
try { if (typeof window !== 'undefined') window.TreeViz = TreeViz; } catch (_) {}
