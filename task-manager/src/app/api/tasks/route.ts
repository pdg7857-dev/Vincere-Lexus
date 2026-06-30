import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRawTask, enrichTask } from '@/lib/tasks';

export const dynamic = 'force-dynamic';

// GET /api/tasks?status=pending — list tasks (default pending), sorted for the
// dashboard: priority DESC, then dueDate ASC with nulls last.
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') ?? 'pending';
  const where = status === 'all' ? {} : { status };

  // SQLite + Prisma sorts NULLs first on ASC; we want due-dated tasks before
  // undated ones, so split and concatenate.
  const tasks = await prisma.task.findMany({ where });

  const sorted = tasks.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    const ad = a.dueDate ? a.dueDate.getTime() : Infinity;
    const bd = b.dueDate ? b.dueDate.getTime() : Infinity;
    if (ad !== bd) return ad - bd;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return NextResponse.json({ tasks: sorted });
}

// POST /api/tasks { rawInput } — quick-add (§5.1).
// (a) save raw immediately, (b) enrich, (c) return the enriched row.
export async function POST(req: NextRequest) {
  let body: { rawInput?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawInput = typeof body.rawInput === 'string' ? body.rawInput.trim() : '';
  if (!rawInput) {
    return NextResponse.json({ error: 'rawInput is required' }, { status: 400 });
  }

  // (a) Persist first — this must succeed before anything else (§2).
  const task = await createRawTask(rawInput, 'web');

  // (b) Enrich. enrichTask never throws and never loses the task.
  const enriched = await enrichTask(task);

  // (c) Return the enriched row.
  return NextResponse.json({ task: enriched }, { status: 201 });
}
