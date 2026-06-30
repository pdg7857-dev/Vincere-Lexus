import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendCalendarInvite } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

// POST /api/tasks/:id/calendar — manual "Send to calendar" button (§5.3/§6).
// Body: { method?: "REQUEST" | "CANCEL", force?: boolean }.
// The manual button forces a (re)send even if calendarSent is already true.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let body: { method?: string; force?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — defaults apply
  }

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const method = body.method === 'CANCEL' ? 'CANCEL' : 'REQUEST';
  // Mark the task as needing a calendar if a user explicitly sends it.
  if (method === 'REQUEST' && !task.needsCalendar) {
    await prisma.task.update({ where: { id }, data: { needsCalendar: true } });
  }

  const result = await sendCalendarInvite(task, { method, force: body.force ?? true });
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Send failed' }, { status: 502 });
  }

  const updated = await prisma.task.findUnique({ where: { id } });
  return NextResponse.json({ task: updated });
}
