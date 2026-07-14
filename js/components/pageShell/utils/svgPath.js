/** Wrap an SVG path `d` attribute in a stroke path element. */
export function svgPath(d) {
    return '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="' + d + '"></path>';
}
