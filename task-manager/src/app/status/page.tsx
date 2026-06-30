'use client';

import { useEffect, useState } from 'react';

interface Status {
  now: string;
  lastSuccessfulEmailPoll: string | null;
  lastSuccessfulReminderRun: string | null;
  lastSuccessfulBackup: string | null;
  pendingTasks: number;
  overdueTasks: number;
  recentErrors: { job: string; detail: string | null; at: string }[];
  healthy: boolean;
}

function ago(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export default function StatusPage() {
  const [s, setS] = useState<Status | null>(null);

  useEffect(() => {
    const load = () =>
      fetch('/api/status', { cache: 'no-store' })
        .then((r) => r.json())
        .then(setS)
        .catch(() => {});
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="wrap">
      <header className="app-header">
        <h1>System Status</h1>
        <a className="status-link" href="/">
          ← Back to tasks
        </a>
      </header>

      {!s ? (
        <div className="spinner">Loading…</div>
      ) : (
        <div className="panel">
          <p>
            <b>Overall:</b>{' '}
            <span style={{ color: s.healthy ? 'var(--ok)' : 'var(--overdue)' }}>
              {s.healthy ? 'Healthy' : 'Attention needed'}
            </span>
          </p>
          <ul style={{ lineHeight: 1.9 }}>
            <li>Last successful email poll: <b>{ago(s.lastSuccessfulEmailPoll)}</b></li>
            <li>Last successful reminder run: <b>{ago(s.lastSuccessfulReminderRun)}</b></li>
            <li>Last successful DB backup: <b>{ago(s.lastSuccessfulBackup)}</b></li>
            <li>Pending tasks: <b>{s.pendingTasks}</b></li>
            <li>Overdue tasks: <b>{s.overdueTasks}</b></li>
          </ul>

          <div className="group-title">Recent job errors</div>
          {s.recentErrors.length === 0 ? (
            <div className="empty">No recent errors. 🎉</div>
          ) : (
            <ul>
              {s.recentErrors.map((e, i) => (
                <li key={i} style={{ marginBottom: 8 }}>
                  <b>{e.job}</b> — {ago(e.at)}
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontSize: 12,
                      color: 'var(--muted)',
                      margin: '4px 0 0',
                    }}
                  >
                    {e.detail}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
