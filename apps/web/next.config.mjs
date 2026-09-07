/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    HESTIVA_WEB_BUILD_REVISION:
      process.env.WORKERS_CI_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'unknown',
  },
};

export default nextConfig;
