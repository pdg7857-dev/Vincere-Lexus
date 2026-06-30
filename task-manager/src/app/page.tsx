'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import QuickAdd from '@/components/QuickAdd';
import TaskItem from '@/components/TaskItem';
import Upcoming from '@/components/Upcoming';
import { TaskDTO, Filter } from '@/components/types';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'priority', label: 'By Priority' },
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/tasks?status=all', { cache: 'no-store' });
    const data = await res.json();
    setTasks(data.tasks ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Poll so email-ingested tasks and enrichment updates show up.
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const addTask = useCallback(
    async (rawInput: string) => {
      // Optimistic placeholder.
      const tempId = `temp-${Date.now()}`;
      const placeholder: TaskDTO = {
        id: tempId,
        rawInput,
        title: rawInput,
        notes: null,
        priority: 1,
        dueDate: null,
        status: 'pending',
        source: 'web',
        needsCalendar: false,
        calendarSent: false,
        calendarEventTime: null,
        enriched: false,
        reminderState: 'none',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      };
      setTasks((prev) => [placeholder, ...prev]);

      try {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawInput }),
        });
        const data = await res.json();
        if (data.task) {
          setTasks((prev) => prev.map((t) => (t.id === tempId ? data.task : t)));
        } else {
          setTasks((prev) => prev.filter((t) => t.id !== tempId));
        }
      } catch {
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
      }
    },
    [],
  );

  const patchTask = useCallback(async (id: string, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (data.task) setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  }, []);

  const sendCalendar = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/tasks/${id}/calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'REQUEST', force: true }),
      });
      const data = await res.json();
      if (data.task) {
        setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)));
        alert('Calendar invite sent to your work email. Accept it in Outlook.');
      } else {
        alert(`Could not send invite: ${data.error || 'unknown error'}`);
      }
    },
    [],
  );

  // Keyboard-first controls on the focused task (§9).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!focusedId) return;
      if (e.key === 'd') patchTask(focusedId, { action: 'done' });
      else if (e.key === 's') patchTask(focusedId, { action: 'snooze' });
      else if (e.key === '1') patchTask(focusedId, { priority: 1 });
      else if (e.key === '2') patchTask(focusedId, { priority: 2 });
      else if (e.key === '3') patchTask(focusedId, { priority: 3 });
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusedId, patchTask]);

  // Active (non-done) tasks subject to filtering.
  const visible = useMemo(() => {
    const active = tasks.filter((t) => t.status !== 'done');
    const now = Date.now();
    const todayStart = startOfDay(new Date());
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;
    const weekEnd = todayStart + 7 * 24 * 60 * 60 * 1000;

    switch (filter) {
      case 'today':
        return active.filter(
          (t) => t.dueDate && new Date(t.dueDate).getTime() < todayEnd,
        );
      case 'week':
        return active.filter(
          (t) => t.dueDate && new Date(t.dueDate).getTime() < weekEnd,
        );
      case 'overdue':
        return active.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < now);
      default:
        return active;
    }
  }, [tasks, filter]);

  // Group by priority (3→1), within each by dueDate asc (nulls last).
  const groups = useMemo(() => {
    const byPri: Record<number, TaskDTO[]> = { 3: [], 2: [], 1: [] };
    for (const t of visible) byPri[t.priority]?.push(t);
    for (const k of [3, 2, 1]) {
      byPri[k].sort((a, b) => {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return ad - bd;
      });
    }
    return byPri;
  }, [visible]);

  const doneTasks = useMemo(
    () => tasks.filter((t) => t.status === 'done').slice(0, 20),
    [tasks],
  );

  const labels: Record<number, string> = { 3: 'High priority', 2: 'Medium priority', 1: 'Low priority' };

  return (
    <div className="wrap">
      <header className="app-header">
        <div>
          <h1>Task Capture &amp; Reminders</h1>
          <div className="sub">Drop tasks all day — parsed, organized, and reminded.</div>
        </div>
        <a className="status-link" href="/status">
          System status →
        </a>
      </header>

      <div className="layout">
        <main>
          <QuickAdd onAdd={addTask} />

          <div className="chips">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`chip ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="spinner">Loading…</div>
          ) : visible.length === 0 ? (
            <div className="empty">No tasks here. Add one above.</div>
          ) : (
            [3, 2, 1].map((p) =>
              groups[p].length > 0 ? (
                <section key={p}>
                  <div className="group-title">{labels[p]}</div>
                  {groups[p].map((t) => (
                    <TaskItem
                      key={t.id}
                      task={t}
                      focused={focusedId === t.id}
                      onFocus={() => setFocusedId(t.id)}
                      onPatch={(patch) => patchTask(t.id, patch)}
                      onDelete={() => deleteTask(t.id)}
                      onSendCalendar={() => sendCalendar(t.id)}
                    />
                  ))}
                </section>
              ) : null,
            )
          )}

          {doneTasks.length > 0 && (
            <section>
              <div className="group-title">Recently completed</div>
              {doneTasks.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  focused={focusedId === t.id}
                  onFocus={() => setFocusedId(t.id)}
                  onPatch={(patch) => patchTask(t.id, patch)}
                  onDelete={() => deleteTask(t.id)}
                  onSendCalendar={() => sendCalendar(t.id)}
                />
              ))}
            </section>
          )}
        </main>

        <Upcoming tasks={tasks} />
      </div>
    </div>
  );
}
