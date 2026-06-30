'use client';

import { TaskDTO } from './types';

// "Upcoming" panel (§5.3): tasks with future due dates so the user can see
// what's coming.
export default function Upcoming({ tasks }: { tasks: TaskDTO[] }) {
  const now = Date.now();
  const upcoming = tasks
    .filter((t) => t.status !== 'done' && t.dueDate && new Date(t.dueDate).getTime() >= now)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 12);

  return (
    <aside className="panel upcoming">
      <div className="group-title" style={{ marginTop: 0 }}>
        Upcoming
      </div>
      {upcoming.length === 0 ? (
        <div className="empty">Nothing scheduled.</div>
      ) : (
        <ul>
          {upcoming.map((t) => (
            <li key={t.id}>
              <div className="u-title">{t.title}</div>
              <div className="u-when">
                {new Date(t.dueDate!).toLocaleString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
