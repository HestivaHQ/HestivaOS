const required = [
  'HESTIVA_BROWSER_AUDIT_BASE_URL',
  'HESTIVA_BROWSER_AUDIT_ADMIN_EMAIL',
  'HESTIVA_BROWSER_AUDIT_ADMIN_PASSWORD',
];

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Browser audit configuration is incomplete. Missing names: ${missing.join(', ')}`);
  process.exit(1);
}

let baseUrl;
try {
  baseUrl = new URL(process.env.HESTIVA_BROWSER_AUDIT_BASE_URL);
} catch {
  console.error('HESTIVA_BROWSER_AUDIT_BASE_URL is not a valid URL.');
  process.exit(1);
}

if (!['https:', 'http:'].includes(baseUrl.protocol)) {
  console.error('HESTIVA_BROWSER_AUDIT_BASE_URL must use HTTP or HTTPS.');
  process.exit(1);
}

if (baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
  console.error('HESTIVA_BROWSER_AUDIT_BASE_URL must be an origin/base path without credentials, query parameters, or a fragment.');
  process.exit(1);
}

console.log('Browser audit configuration names are present and the base URL is valid. Values were not printed.');
