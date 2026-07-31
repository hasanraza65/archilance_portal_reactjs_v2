import { fetchProjects, fetchJobRootTasks, fetchProjectsWithMembers } from "@/api/projects";
import { fetchMyWorkSessions } from "@/api/workSessions";
import { fetchMyLeaveRequests } from "@/api/leave";
import { isCompletedStatus } from "@/lib/statusMeta";
import { formatDuration, formatDate } from "@/lib/format";

/* ----------------------------- date helpers ---------------------------- */

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const iso = (d) => d.toISOString().slice(0, 10);

function dayDiff(dueDate) {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - startOfToday()) / 86400000);
}

function inWindow(dueDate, window) {
  if (!dueDate) return false;
  const diff = dayDiff(dueDate);
  switch (window) {
    case "overdue": return diff < 0;
    case "today": return diff === 0;
    case "tomorrow": return diff === 1;
    case "week": return diff >= 0 && diff <= 7;
    case "month": return diff >= 0 && diff <= 30;
    default: return true;
  }
}

const WINDOW_LABEL = {
  overdue: "overdue", today: "due today", tomorrow: "due tomorrow",
  week: "due this week", month: "due this month",
};

/* --------------------------- assignee matching -------------------------- */

/** A task/job row is "mine" when I appear in its assignees pivot. */
function isAssignedTo(row, userId, key = "assignees") {
  const list = row?.[key];
  if (!Array.isArray(list) || list.length === 0) return false;
  return list.some((a) => Number(a?.employee_id) === Number(userId) || Number(a?.user?.id) === Number(userId));
}

function matchesPerson(row, needle, key = "assignees") {
  const list = row?.[key];
  if (!Array.isArray(list)) return false;
  const q = needle.toLowerCase();
  return list.some((a) => (a?.user?.name || "").toLowerCase().includes(q));
}

const MANAGER_ROLES = ["admin", "manager", "supervisor", "executive"];

/* --------------------------- task collection --------------------------- */

/**
 * Tasks the assistant should reason over.
 *
 * Managers/admins get the cross-project members feed, which lists EVERY task
 * assigned to each person (including sub-tasks) — the most accurate source.
 * Everyone else falls back to fanning out over their jobs' root tasks, which do
 * carry an `assignees` pivot we can filter on.
 */
async function collectTasks({ role, userId }, { scope = "me" } = {}) {
  if (MANAGER_ROLES.includes(role)) {
    try {
      const members = await fetchProjectsWithMembers(role);
      const wanted =
        scope === "me"
          ? members.filter((m) => Number(m.id) === Number(userId))
          : scope === "team"
          ? members
          : members.filter((m) => (m.name || "").toLowerCase().includes(String(scope).toLowerCase()));

      const rows = [];
      for (const m of wanted) {
        for (const bucket of Object.values(m.tasks_by_status || {})) {
          for (const t of bucket?.tasks || []) {
            rows.push({ ...t, __owner: m.name });
          }
        }
      }
      // De-dupe: the same task can be assigned to several people.
      const seen = new Set();
      const unique = rows.filter((t) => (seen.has(t.id) ? false : seen.add(t.id)));
      if (unique.length > 0 || scope !== "me") return { tasks: unique, viaMembers: true };
      // Fall through when a manager genuinely has no assigned tasks of their own.
    } catch {
      // 403 or network — fall back to the job fan-out below.
    }
  }

  const jobs = await fetchProjects(role, {});
  const lists = await Promise.all(
    jobs.slice(0, 15).map((j) =>
      fetchJobRootTasks(role, j.id)
        .then((tasks) => tasks.map((t) => ({ ...t, __job: j })))
        .catch(() => [])
    )
  );
  let tasks = lists.flat();

  if (scope === "me") tasks = tasks.filter((t) => isAssignedTo(t, userId));
  else if (scope !== "team") tasks = tasks.filter((t) => matchesPerson(t, scope));

  return { tasks, viaMembers: false };
}

/**
 * UI vocabulary vs. database reality:
 *   root task (no parent_task_id) -> "Project"
 *   child task (has parent)       -> "Task"
 * The members feed exposes `parent_task`; the job fan-out exposes
 * `parent_task_id`. Either one tells us which layer a row belongs to.
 */
const isRootTask = (t) => !t.parent_task_id && !t.parent_task;

const taskItem = (t) => ({
  id: t.id,
  title: t.task_title,
  meta: [
    t.__owner,
    t.__job?.project_name || t.project?.project_name,
    t.due_date ? `Due ${formatDate(t.due_date)}` : null,
  ].filter(Boolean).join(" · "),
  status: t.task_status,
  priority: t.priority,
  link: `/jobs/task/${t.id}`,
});

const jobItem = (j) => ({
  id: j.id,
  title: j.project_name,
  meta: [j.customer?.name, j.due_date ? `Due ${formatDate(j.due_date)}` : null].filter(Boolean).join(" · "),
  status: j.status,
  link: `/jobs/${j.id}`,
});

/* ------------------------------- runner -------------------------------- */

export async function runIntent({ intent, slots }, ctx) {
  const { role, user } = ctx;
  const userId = user?.id;
  const scope = slots.scope || "me";
  const scopeLabel = scope === "me" ? "you" : scope === "team" ? "the team" : scope;

  switch (intent) {
    case "my_projects":
    case "my_tasks":
    case "due_tasks":
    case "urgent_tasks": {
      const { tasks } = await collectTasks({ role, userId }, { scope });
      let filtered = tasks;

      // "Projects" in the UI are root tasks; "Tasks" are their children.
      // Deadline/priority questions span both layers.
      const layer =
        intent === "my_projects" ? "project" : intent === "my_tasks" ? "task" : "any";
      if (layer === "project") filtered = filtered.filter(isRootTask);
      else if (layer === "task") filtered = filtered.filter((t) => !isRootTask(t));

      // Priority
      if (intent === "urgent_tasks" || slots.priority) {
        const wanted = slots.priority || "Urgent";
        filtered = filtered.filter((t) => String(t.priority || "").toLowerCase() === wanted.toLowerCase());
      }
      // Status
      if (slots.status) {
        filtered = filtered.filter((t) => String(t.task_status || "").toLowerCase() === slots.status.toLowerCase());
      }
      // Time window
      if (slots.time) {
        filtered = filtered.filter((t) => inWindow(t.due_date, slots.time));
      } else if (intent === "due_tasks") {
        filtered = filtered.filter((t) => t.due_date);
      }
      // Anything deadline/priority-driven is about outstanding work.
      if (!slots.status || !isCompletedStatus(slots.status)) {
        filtered = filtered.filter((t) => !isCompletedStatus(t.task_status));
      }

      filtered.sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });

      // Build an honest description of what was actually filtered, using the
      // UI's vocabulary (project = root task, task = child task, item = both).
      const parts = [];
      if (slots.priority || intent === "urgent_tasks") parts.push((slots.priority || "Urgent").toLowerCase());
      if (slots.status) parts.push(slots.status);
      const one = filtered.length === 1;
      const base = layer === "project" ? (one ? "project" : "projects") : layer === "task" ? (one ? "task" : "tasks") : one ? "item" : "items";
      const noun = `${parts.join(" ")} ${base}`.trim();
      const windowLabel = slots.time ? ` ${WINDOW_LABEL[slots.time]}` : "";
      const owner = scope === "me" ? "assigned to you" : scope === "team" ? "across the team" : `assigned to ${scope}`;

      if (filtered.length === 0) {
        return { text: `No ${noun}${windowLabel} ${owner}. 🎉` };
      }
      return {
        text: `**${filtered.length}** ${noun}${windowLabel} ${owner}:`,
        items: filtered.slice(0, 12).map(taskItem),
        more: Math.max(0, filtered.length - 12),
        link: { label: "Open Jobs", to: "/jobs" },
      };
    }

    // The backend `projects` table — called "Jobs" throughout the UI.
    case "my_jobs": {
      const jobs = await fetchProjects(role, {});
      let filtered = jobs;

      // Only jobs I'm actually on, unless asked about the team/someone else.
      if (scope === "me") {
        const mine = jobs.filter((j) => isAssignedTo(j, userId, "project_assignees"));
        // Customers/admins may have no assignee pivot — don't wrongly show zero.
        if (mine.length > 0) filtered = mine;
      } else if (scope !== "team") {
        filtered = jobs.filter((j) => matchesPerson(j, scope, "project_assignees"));
      }

      if (slots.status) {
        filtered = filtered.filter((j) => String(j.status || "").toLowerCase() === slots.status.toLowerCase());
      }
      if (slots.time) filtered = filtered.filter((j) => inWindow(j.due_date, slots.time));

      if (filtered.length === 0) return { text: `No jobs match that for ${scopeLabel}.` };
      return {
        text: `**${filtered.length}** job${filtered.length === 1 ? "" : "s"}${slots.status ? ` in ${slots.status}` : ""} for ${scopeLabel}:`,
        items: filtered.slice(0, 12).map(jobItem),
        more: Math.max(0, filtered.length - 12),
        link: { label: "Open Jobs", to: "/jobs" },
      };
    }

    case "my_hours": {
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 6);
      const useWeek = slots.time !== "today";
      const data = await fetchMyWorkSessions(role, {
        startDate: useWeek ? iso(weekAgo) : iso(today),
        endDate: iso(today),
      });
      const sessions = data?.data || [];
      const totalSeconds = sessions.reduce((sum, s) => sum + Math.max(0, s.raw_calculation?.net_seconds || 0), 0);
      const label = useWeek ? "in the last 7 days" : "today";
      if (sessions.length === 0) {
        return { text: `No tracked sessions ${label}.`, link: { label: "Open Work Diary", to: "/work-diary" } };
      }
      return {
        text: `You tracked **${formatDuration(totalSeconds)}** across **${sessions.length}** session${sessions.length === 1 ? "" : "s"} ${label}.`,
        link: { label: "Open Work Diary", to: "/work-diary" },
      };
    }

    case "my_leaves": {
      const list = await fetchMyLeaveRequests(role);
      if (list.length === 0) {
        return { text: "You haven't submitted any leave requests.", link: { label: "Apply for leave", to: "/my-leaves" } };
      }
      const pending = list.filter((l) => l.status === "Pending").length;
      const approved = list.filter((l) => l.status === "Approved").length;
      return {
        text: `**${list.length}** leave request${list.length === 1 ? "" : "s"} — ${approved} approved, ${pending} pending.`,
        items: list.slice(0, 6).map((l) => ({
          id: l.id,
          title: `${l.leave_type} leave`,
          meta: `${formatDate(l.start_date)} – ${formatDate(l.end_date)}`,
          status: l.status,
          link: "/my-leaves",
        })),
        link: { label: "Open My Leaves", to: "/my-leaves" },
      };
    }

    case "team_overview": {
      if (!MANAGER_ROLES.includes(role)) {
        return { text: "Team overview is only available to managers and admins." };
      }
      const members = await fetchProjectsWithMembers(role);
      const ranked = members
        .map((m) => ({ ...m, __open: m.total_tasks || 0 }))
        .filter((m) => m.__open > 0)
        .sort((a, b) => b.__open - a.__open)
        .slice(0, 8);
      if (ranked.length === 0) return { text: "No open tasks assigned across the team right now." };
      return {
        text: `**${ranked.length}** team member${ranked.length === 1 ? " has" : "s have"} open work — busiest first:`,
        items: ranked.map((m) => ({
          id: m.id,
          title: m.name,
          meta: `${m.__open} open task${m.__open === 1 ? "" : "s"}`,
          link: `/work-diary/${m.id}`,
        })),
        link: { label: "Open Members view", to: "/jobs" },
      };
    }

    case "help":
    default:
      return {
        text: `Hi ${user?.name?.split(" ")[0] || "there"} 👋 I can pull things up instantly. Ask about your **tasks**, **jobs**, **deadlines**, **hours** or **leaves** — try "what's due today" or "my urgent tasks".`,
        isHelp: true,
      };
  }
}
