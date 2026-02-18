export const getNextWednesday = (fromDate = new Date()) => {
    const date = new Date(fromDate);
    const day = date.getDay();
    const daysUntilWednesday = day <= 3 ? 3 - day : 10 - day;
    date.setDate(date.getDate() + daysUntilWednesday);
    return date;
};

export const getSprintDates = (sprintNumber) => {
    const firstWednesday = getNextWednesday(new Date('2026-02-17'));
    const weeksToAdd = sprintNumber - 1;
    const startDate = new Date(firstWednesday);
    startDate.setDate(startDate.getDate() + (weeksToAdd * 7));

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    return { startDate, endDate };
};

export const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatDateRange = (startDate, endDate) => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

export const getCurrentSprint = (sprints) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sprints.find(sprint => {
        const start = new Date(sprint.startDate);
        const end = new Date(sprint.endDate);
        return today >= start && today <= end;
    });
};

/**
 * Best sprint to auto-select on page load. Uses exclusive end date so the
 * last day of a sprint already rolls forward to the next one. Falls back to
 * the nearest upcoming sprint, then the final sprint.
 */
export const getAutoSelectedSprint = (sprints) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Active sprint: started but not yet on its end day
    const active = sprints.find(s => {
        const start = new Date(s.startDate);
        const end = new Date(s.endDate);
        return today >= start && today < end;
    });
    if (active) return active;
    // Next upcoming: soonest sprint that hasn't started yet (or starts today)
    const upcoming = sprints
        .filter(s => new Date(s.startDate) >= today)
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
    return upcoming || sprints[sprints.length - 1];
};

export const isCurrentSprint = (sprint) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);
    return today >= start && today <= end;
};

export const isFutureSprint = (sprint) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(sprint.startDate);
    return start > today;
};
