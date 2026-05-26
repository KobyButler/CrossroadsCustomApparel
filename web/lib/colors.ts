export const COLOR_MAP: Record<string, string> = {
    "black":"#111827","white":"#ffffff","red":"#dc2626","navy":"#1e3a5f",
    "navy blue":"#1e3a5f","royal blue":"#2563eb","royal":"#2563eb",
    "light blue":"#93c5fd","sky blue":"#7dd3fc","blue":"#3b82f6",
    "maroon":"#7f1d1d","charcoal":"#374151","dark charcoal":"#1f2937",
    "gray":"#9ca3af","grey":"#9ca3af","dark gray":"#4b5563","dark grey":"#4b5563",
    "heather gray":"#d1d5db","heather grey":"#d1d5db","sport grey":"#d1d5db",
    "ash":"#d1d5db","green":"#16a34a","dark green":"#15803d",
    "forest green":"#166534","kelly green":"#22c55e","lime":"#a3e635",
    "yellow":"#facc15","gold":"#d97706","athletic gold":"#d97706",
    "dark gold":"#b45309","orange":"#f97316","pink":"#ec4899",
    "hot pink":"#db2777","light pink":"#fbcfe8","purple":"#7c3aed",
    "lavender":"#a78bfa","brown":"#92400e","tan":"#d4a96a","khaki":"#c4a96a",
    "olive":"#84795a","cardinal":"#9b1c1c","crimson":"#dc2626",
    "vegas gold":"#c5a028","columbia blue":"#b0c4de","carolina blue":"#56a0d3",
    "copper":"#b45309","silver":"#c0c0c0","cream":"#fef9c3","natural":"#fef3c7",
    "safety green":"#a3e635","safety orange":"#f97316","deep navy":"#1e2a4a",
    "midnight navy":"#0f172a","heather navy":"#3b4f6e","heather red":"#ef4444",
    "heather royal":"#4b7fd4","true royal":"#2563eb","burgundy":"#7f1d1d",
    "wine":"#881337","teal":"#0d9488","cyan":"#06b6d4","coral":"#fb7185",
    "sand":"#fde68a","cobalt":"#1d4ed8","violet":"#7c3aed","indigo":"#4338ca",
};

export function getColorCss(name: string): string {
    return COLOR_MAP[name.toLowerCase().trim()] ?? "#94a3b8";
}
