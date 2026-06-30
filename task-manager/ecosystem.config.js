// pm2 process supervision (§8). Runs the Next.js app and the cron worker as two
// always-on processes that auto-restart on crash.
//
//   npm run build && npx pm2 start ecosystem.config.js
//   npx pm2 save && npx pm2 startup   # to persist across reboots
//
module.exports = {
  apps: [
    {
      name: 'task-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_restarts: 20,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'task-worker',
      script: 'node_modules/.bin/tsx',
      args: 'worker/index.ts',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_restarts: 50,
      // Restart the worker if it wedges; cron jobs are idempotent.
      env: { NODE_ENV: 'production' },
    },
  ],
};
