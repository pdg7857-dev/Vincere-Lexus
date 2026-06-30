'use client';

import { useRef, useState } from 'react';

// Persistent quick-add box (§5.1). Enter to add; the parent optimistically
// inserts the task and replaces it with the enriched row when the POST returns.
export default function QuickAdd({ onAdd }: { onAdd: (rawInput: string) => Promise<void> }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    const v = value.trim();
    if (!v || busy) return;
    setBusy(true);
    setValue('');
    try {
      await onAdd(v);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div>
      <div className="quickadd">
        <input
          ref={inputRef}
          value={value}
          autoFocus
          placeholder="Add a task…  e.g. “Call dentist Friday 3pm, high priority”"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          aria-label="Quick add task"
        />
        <button onClick={submit} disabled={busy}>
          {busy ? 'Adding…' : 'Add'}
        </button>
      </div>
      <div className="hint">
        Press <b>Enter</b> to add. On a focused task: <b>d</b> = done, <b>1/2/3</b> = set priority,
        <b> s</b> = snooze.
      </div>
    </div>
  );
}
