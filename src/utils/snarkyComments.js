import { teamMembers } from '../data/constants';
import { isCurrentSprint, isFutureSprint } from './sprintUtils';

/**
 * Context-aware snarky comment generator.
 *
 * @param {string} activeRoute   - 'kanban' | 'planning' | 'calendar' | 'vendors' | etc.
 * @param {object} opts
 * @param {string} opts.viewFilter         - 'all' | owner id
 * @param {object} opts.sprint             - current sprint object (for kanban/planning context)
 * @param {number} opts.backlogCount       - number of backlog tasks
 */
export function getSnarkyComment(activeRoute, opts = {}) {
  const { viewFilter = 'all', sprint = null, backlogCount = 0 } = opts;

  const today = new Date();
  const dayOfYear = Math.floor(
    (today - new Date(today.getFullYear(), 0, 0)) / 86400000
  );
  const dayOfWeek = today.getDay();
  const dayNames = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday',
  ];

  const pick = (arr) => arr[(dayOfYear + arr.length) % arr.length];

  const ownerName =
    viewFilter !== 'all'
      ? teamMembers.find((m) => m.id === viewFilter)?.name
      : null;

  const sprintNum = sprint ? sprint.number : 1;
  const isCurrent = sprint ? isCurrentSprint(sprint) : false;
  const isFuture = sprint ? isFutureSprint(sprint) : false;
  const isPast = sprint && !isCurrent && !isFuture;
  const weeksOut = sprint
    ? Math.max(
        0,
        Math.round((new Date(sprint.startDate) - today) / (7 * 86400000))
      )
    : 0;

  // --- KANBAN ---
  if (activeRoute === 'kanban') {
    if (ownerName) {
      return pick([
        `\uD83D\uDC40 ${ownerName}'s tasks only. If you're not ${ownerName}, avert your eyes or forever hold your peace.`,
        `\uD83D\uDD12 Welcome to ${ownerName}'s private task kingdom. Trespassers will be assigned extra work.`,
        `\uD83D\uDCCB ${ownerName}'s hit list. Not that kind. The productive kind. Probably.`,
        `\uD83C\uDFAF Showing ${ownerName}'s tasks. Everyone else, go look busy somewhere.`,
        `\uD83C\uDF31 ${ownerName}'s personal garden of responsibilities. Water them with effort.`,
        `\u26A1 ${ownerName}'s to-do list has entered the chat. No pressure. (Lots of pressure.)`,
        `\uD83C\uDFAA Ladies and gentlemen, presenting: the things ${ownerName} said they'd get done.`,
        `\uD83D\uDD75\uFE0F ${ownerName}'s task file \u2014 classified. Well, not anymore.`,
        `\uD83D\uDCAA ${ownerName}'s workload. If it seems like a lot, that's because it is.`,
        `\uD83D\uDCCC Only ${ownerName}'s stuff here. The rest of you can relax. ${ownerName} cannot.`,
      ]);
    }

    return pick([
      `\uD83D\uDCCB The whole team's tasks for Sprint ${sprintNum}. Yes, all of them. Don't panic.`,
      `\uD83D\uDE80 Sprint ${sprintNum} Kanban \u2014 where dreams become checkboxes and checkboxes become done.`,
      `\u26A1 It's ${dayNames[dayOfWeek]}. Sprint ${sprintNum} won't finish itself. Or will it? No. It won't.`,
      `\uD83D\uDCCB Everything the team needs to crush this week. The microgreens are counting on you.`,
      `\uD83D\uDD25 Sprint ${sprintNum} task board. Move things to Done or the microgreens get it.`,
      `\uD83C\uDFAF Team board for Sprint ${sprintNum}. Remember: roadblocks are just speed bumps with attitude.`,
      `\uD83D\uDCBC Sprint ${sprintNum}: The stuff that needs doing. By humans. That's you.`,
      `\uD83C\uDF31 All hands on deck for Sprint ${sprintNum}. The greens wait for no one.`,
    ]);
  }

  // --- PLANNING ---
  if (activeRoute === 'planning') {
    if (isCurrent) {
      return pick([
        `\uD83D\uDCCB Sprint ${sprintNum} is THIS WEEK. Drag tasks in, drag yourself out of bed, get it done.`,
        `\u26A1 You're looking at Sprint ${sprintNum} \u2014 the one that's happening RIGHT NOW. Chop chop.`,
        `\uD83D\uDD25 Sprint ${sprintNum} is live. If it's not in here, it's not getting done this week.`,
        `\uD83C\uDFAF This is Sprint ${sprintNum}. It's happening. The backlog is watching. Drag and drop, people.`,
        `\uD83D\uDCAA Sprint ${sprintNum}: currently active. Your backlog items are getting jealous of the ones already assigned.`,
        `\uD83C\uDF31 Sprint ${sprintNum} is go time. Those microgreens aren't going to grow themselves. Wait\u2014they are. But YOUR tasks aren't.`,
      ]);
    }
    if (isFuture) {
      return pick([
        `\uD83D\uDD2E Sprint ${sprintNum} is ${weeksOut === 1 ? 'next week' : weeksOut + ' weeks out'}. Planning ahead? Look at you being all responsible.`,
        `\uD83D\uDCC5 Future Sprint ${sprintNum} \u2014 ${weeksOut === 1 ? 'coming up next week' : weeksOut + ' weeks away'}. Load it up now so future-you doesn't hate present-you.`,
        `\uD83D\uDE80 Sprint ${sprintNum} doesn't start for ${weeksOut === 1 ? 'another week' : weeksOut + ' weeks'}. But the early planner catches the... microgreen?`,
        `\u231B You're ${weeksOut} week${weeksOut !== 1 ? 's' : ''} ahead looking at Sprint ${sprintNum}. The backlog appreciates your ambition.`,
        `\uD83C\uDFAF Sprint ${sprintNum}: still in the future. Drag stuff here now so you can pretend to be organized later.`,
        `\uD83C\uDF31 Sprint ${sprintNum} is coming in ${weeksOut} week${weeksOut !== 1 ? 's' : ''}. Pre-loading tasks is basically time travel.`,
      ]);
    }
    if (isPast) {
      return pick([
        `\uD83D\uDCDC Sprint ${sprintNum} is ancient history. Hopefully the good kind, not the "we don't talk about that" kind.`,
        `\uD83D\uDD70\uFE0F Looking back at Sprint ${sprintNum}. Nostalgia hits different when it's a task list.`,
        `\uD83D\uDCCB Sprint ${sprintNum}: completed. Feel free to admire your past productivity.`,
        `\u23EA Sprint ${sprintNum} is in the rearview. What's done is done. Unless it's not done. Then yikes.`,
      ]);
    }

    return pick([
      `\uD83D\uDCCB Backlog + Sprints = your master plan. Drag tasks from left to right. It's that simple. (It's never that simple.)`,
      `\uD83D\uDDC2\uFE0F The backlog is everything you need to do. The sprints are when you'll actually do them. Hopefully.`,
      `\uD83D\uDCCB Plan your sprints here. Your backlog has ${backlogCount} tasks waiting. They're very patient. For now.`,
      `\uD83C\uDF31 Sprint Planning HQ. Grab a task, drop it in a sprint, feel accomplished. Repeat.`,
    ]);
  }

  // --- CALENDAR ---
  if (activeRoute === 'calendar') {
    return pick([
      `\uD83D\uDDD3\uFE0F The calendar view. Because sometimes you need to see the chaos laid out in neat little boxes.`,
      `\uD83D\uDCC5 Your schedule, visualized. Each box is a tiny container of responsibility.`,
      `\uD83D\uDDD3\uFE0F Calendar mode: where you realize ${dayNames[dayOfWeek]} was supposed to be productive.`,
      `\uD83D\uDCC5 Look at all these days. So many opportunities to move tasks to "Done."`,
    ]);
  }

  // --- VENDORS ---
  if (activeRoute === 'vendors') {
    return pick([
      `\uD83C\uDFEA Vendor contacts \u2014 the people who make it all possible. Call them. Email them. Send carrier pigeons.`,
      `\uD83D\uDCDE Your vendor rolodex. Yes, we said rolodex. We're bringing it back.`,
      `\uD83E\uDD1D Vendor directory \u2014 keeping track of the people who keep us in business.`,
    ]);
  }

  // --- FUTURE MODULES ---
  if (activeRoute === 'inventory') {
    return pick([
      `\uD83D\uDCE6 Inventory tracking \u2014 coming soon. For now, just count the trays manually like a pioneer.`,
      `\uD83C\uDF31 Inventory module loading... just kidding. It's not built yet. But it will be!`,
    ]);
  }

  if (activeRoute === 'budget') {
    return pick([
      `\uD83D\uDCB0 Budget tracker \u2014 coming soon. Until then, try not to spend all the money.`,
      `\uD83D\uDCB8 Expense tracking is on the roadmap. For now, just wince at the bank statement.`,
    ]);
  }

  if (activeRoute === 'production') {
    return pick([
      `\uD83C\uDF3F Production tracking \u2014 coming soon. The microgreens are growing whether we track them or not.`,
      `\uD83D\uDCCA Harvest logs are on the way. For now, eyeball it and hope for the best.`,
    ]);
  }

  return `\uD83C\uDF31 Let's get it done today, team.`;
}
