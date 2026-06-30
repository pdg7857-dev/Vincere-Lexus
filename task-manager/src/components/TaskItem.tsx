'use client';

import { TaskDTO, PRIORITY_LABEL } from './types';

interface Props {
  task: TaskDTO;
  focused: boolean;
  onFocus: () => void;
  onPatch: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
  onSendCalendar: () => void;
}

function isOverdue(t: TaskDTO): boolean {
  return t.status === 'pending' && !!t.dueDate && new Date(t.dueDate).getTime() < Date.now();
}

function fmt(d: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function TaskItem({
  task,
  focused,
  onFocus,
  onPatch,
  onDelete,
  onSendCalendar,
}: Props) {
  const done = task.status === 'done';
  const overdue = isOverdue(task);

  return (
    <div
      className={`task pri-${task.priority} ${focused ? 'focused' : ''} ${done ? 'done' : ''}`}
      tabIndex={0}
      onFocus={onFocus}
      onClick={onFocus}
    >
      <div className="body">
        <div className="title">{task.title}</div>
        <div className="meta">
          <span className={`badge p${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
          {task.dueDate && (
            <span className={`badge ${overdue ? 'overdue' : ''}`}>
              {overdue ? 'Overdue · ' : 'Due '}
              {fmt(task.dueDate)}
            </span>
          )}
          {task.needsCalendar && (
            <span className="badge cal">{task.calendarSent ? 'On calendar' : 'Needs calendar'}</span>
          )}
          {task.source === 'email' && <span className="badge">email</span>}
          {!task.enriched && <span className="badge">parsing…</span>}
        </div>
        {task.notes && <div className="meta">{task.notes}</div>}
      </div>
      <div className="actions">
        {!done ? (
          <button onClick={() => onPatch({ action: 'done' })} title="Mark done (d)">
            ✓ Done
          </button>
        ) : (
          <button onClick={() => onPatch({ action: 'reopen' })}>Reopen</button>
        )}
        {!done && (
          <button onClick={() => onPatch({ action: 'snooze' })} title="Snooze +1 day (s)">
            Snooze
          </button>
        )}
        <button onClick={onSendCalendar} title="Send Outlook invite">
          📅 Calendar
        </button>
        <button className="danger" onClick={onDelete} title="Delete">
          Delete
        </button>
      </div>
    </div>
  );
}
