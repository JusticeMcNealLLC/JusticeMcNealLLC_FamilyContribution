import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

export function mountIsland(elementId: string, node: ReactNode) {
    const el = document.getElementById(elementId);
    if (!el) return;
    createRoot(el).render(<StrictMode>{node}</StrictMode>);
}
