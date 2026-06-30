import { promises as fs } from 'fs';
import path from 'path';
import { BACKUP_KEEP } from '../src/lib/config';

// ─────────────────────────────────────────────────────────────────────────────
// Automatic DB backup (§8): copy the SQLite file to a timestamped backup and
// retain only the last N. Runnable standalone (`npm run backup`) or from cron.
// ─────────────────────────────────────────────────────────────────────────────

function dbPathFromUrl(): string {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  const file = url.replace(/^file:/, '');
  // Prisma resolves relative file URLs against the `prisma/` dir.
  return path.isAbsolute(file) ? file : path.resolve(process.cwd(), 'prisma', file);
}

export async function runBackup(): Promise<string> {
  const src = dbPathFromUrl();
  await fs.access(src); // throws if the DB doesn't exist yet

  const backupDir = path.resolve(process.cwd(), 'backups');
  await fs.mkdir(backupDir, { recursive: true });

  // Timestamp like 2026-06-30T03-15-00 (filesystem-safe).
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const dest = path.join(backupDir, `dev-${stamp}.db`);
  await fs.copyFile(src, dest);

  // Retention: keep the newest BACKUP_KEEP.
  const files = (await fs.readdir(backupDir))
    .filter((f) => f.startsWith('dev-') && f.endsWith('.db'))
    .sort();
  const excess = files.slice(0, Math.max(0, files.length - BACKUP_KEEP));
  for (const f of excess) {
    await fs.unlink(path.join(backupDir, f)).catch(() => {});
  }

  return dest;
}

// Allow running directly: `tsx scripts/backup.ts`
if (process.argv[1] && process.argv[1].endsWith('backup.ts')) {
  runBackup()
    .then((dest) => {
      // eslint-disable-next-line no-console
      console.log(`Backup written: ${dest}`);
      process.exit(0);
    })
    .catch((e) => {
      console.error('Backup failed:', e);
      process.exit(1);
    });
}
