/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The worker (cron jobs) uses these native deps; keep them external so Next
  // never tries to bundle them into server routes.
  serverExternalPackages: ['@prisma/client', 'imapflow', 'nodemailer', 'mailparser'],
};

export default nextConfig;
