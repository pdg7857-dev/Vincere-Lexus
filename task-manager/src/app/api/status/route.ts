import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/status — health surface (§8): last successful email poll, last
// reminder run, pending count, and recent JobLog errors.
export async function GET() {
  const [
    lastEmailPoll,
    lastReminders,
    lastBackup,
    pendingCount,
    overdueCount,
    recentErrors,
  ] = await Promise.all([
    prisma.jobLog.findFirst({
      where: { job: 'email_poll', status: 'ok' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.jobLog.findFirst({
      where: { job: 'reminders', status: 'ok' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.jobLog.findFirst({
      where: { job: 'backup', status: 'ok' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.count({ where: { status: 'pending' } }),
    prisma.task.count({ where: { status: 'pending', dueDate: { lt: new Date() } } }),
    prisma.jobLog.findMany({
      where: { status: 'error' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    now: new Date().toISOString(),
    lastSuccessfulEmailPoll: lastEmailPoll?.createdAt ?? null,
    lastSuccessfulReminderRun: lastReminders?.createdAt ?? null,
    lastSuccessfulBackup: lastBackup?.createdAt ?? null,
    pendingTasks: pendingCount,
    overdueTasks: overdueCount,
    recentErrors: recentErrors.map((e) => ({
      job: e.job,
      detail: e.detail?.slice(0, 500) ?? null,
      at: e.createdAt,
    })),
    healthy: recentErrors.length === 0,
  });
}
