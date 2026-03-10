// Simple Cytoscape wrapper used by the Family Tree page
const TreeViz = (function(){
    let cy = null;

    function init(containerId, elements) {
        const container = document.getElementById(containerId.replace('#',''));
        if (!container) return;

        if (cy) {
            cy.destroy();
            cy = null;
        }

        cy = cytoscape({
            container: container,
            elements: elements,
            style: [
                { selector: 'node', style: { 'label': 'data(label)', 'text-valign':'center', 'color':'#111827','font-size':'12px','background-color':'#fff','border-width':2,'border-color':'#e5e7eb','width':54,'height':54 } },
                { selector: 'edge', style: { 'curve-style':'bezier','target-arrow-shape':'triangle','line-color':'#c7d2fe','target-arrow-color':'#c7d2fe','width':2,'label':'data(relation)','font-size':'10px','text-rotation':'autorotate','text-margin-y':-8 } }
            ],
            layout: { name: 'breadthfirst', directed: true, padding: 10, spacingFactor: 1.2 },
            wheelSensitivity: 0.2,
            userZoomingEnabled: true,
            boxSelectionEnabled: false,
        });

        cy.on('tap', 'node', function(evt){
            const node = evt.target;
            const id = node.id();
            window.location.href = `profile.html?id=${id}`;
        });
    }

    return { init };
})();
