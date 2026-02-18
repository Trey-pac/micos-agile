// Data version — increment to force refresh on load
export const DATA_VERSION = 4;

// Team members with their colors
export const teamMembers = [
    { id: 'trey', name: 'Trey', color: 'forest' },
    { id: 'halie', name: 'Halie', color: 'ocean' },
    { id: 'ricardo', name: 'Ricardo', color: 'coral' },
    { id: 'team', name: 'Team', color: 'plant-green' }
];

// Kanban board status columns (shared across KanbanBoard + TaskCard)
export const KANBAN_COLUMNS = [
  { id: 'not-started', title: '📝 Not Started', color: 'border-t-sky-500' },
  { id: 'in-progress', title: '🚀 In Progress', color: 'border-t-lime-500' },
  { id: 'roadblock', title: '🚧 Roadblock', color: 'border-t-amber-400' },
  { id: 'done', title: '✅ Done', color: 'border-t-emerald-500' },
];

// Owner color palette used across components
export const ownerColors = {
    trey: { bg: '#c8e6c9', border: '#66bb6a', text: '#2e7d32', bar: '#66bb6a' },
    halie: { bg: '#b2dfdb', border: '#4db6ac', text: '#00695c', bar: '#4db6ac' },
    ricardo: { bg: '#ffe0b2', border: '#ffa726', text: '#e65100', bar: '#ffa726' },
    team: { bg: '#e1bee7', border: '#ab47bc', text: '#6a1b9a', bar: '#ab47bc' }
};
