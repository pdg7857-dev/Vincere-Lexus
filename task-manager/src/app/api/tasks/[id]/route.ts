import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PATCH /api/tasks/:id — task actions: Done, Snooze, Edit, set priority, etc.
// Body may contain: { action: "done" | "snooze" | "reopen" } and/or direct
// field edits { title, notes, priority, dueDate, status }.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const data: Record<string, unknown> = {};

  switch (body.action) {
    case 'done':
      data.status = 'done';
      data.completedAt = new Date();
      break;
    case 'reopen':
      data.status = 'pending';
      data.completedAt = null;
      break;
    case 'snooze': {
      // Push due date +1 day (or set to tomorrow if none). Reset reminders so
      // they re-fire against the new due date.
      const base = existing.dueDate ?? new Date();
      data.dueDate = new Date(base.getTime() + 24 * 60 * 60 * 1000);
      data.status = 'snoozed';
      data.reminderState = 'none';
      break;
    }
  }

  // Direct field edits (validated).
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim();
  if (typeof body.notes === 'string') data.notes = body.notes;
  if (body.notes === null) data.notes = null;
  if (typeof body.priority === 'number' && body.priority >= 1 && body.priority <= 3) {
    data.priority = Math.round(body.priority);
  }
  if (typeof body.status === 'string' && ['pending', 'done', 'snoozed'].includes(body.status)) {
    data.status = body.status;
  }
  if (typeof body.dueDate === 'string') {
    const d = new Date(body.dueDate);
    if (!Number.isNaN(d.getTime())) {
      data.dueDate = d;
      data.reminderState = 'none'; // re-arm reminders for the new date
    }
  } else if (body.dueDate === null) {
    data.dueDate = null;
  }
  if (typeof body.needsCalendar === 'boolean') data.needsCalendar = body.needsCalendar;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const task = await prisma.task.update({ where: { id }, data });
  return NextResponse.json({ task });
}

// DELETE /api/tasks/:id
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    await prisma.task.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
