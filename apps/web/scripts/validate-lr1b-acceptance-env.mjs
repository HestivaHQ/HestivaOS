const required = [
  'HESTIVA_LR1B_BASE_URL',
  'HESTIVA_LR1B_ADMIN_EMAIL',
  'HESTIVA_LR1B_ADMIN_PASSWORD',
  'HESTIVA_LR1B_SUPERVISOR_EMAIL',
  'HESTIVA_LR1B_SUPERVISOR_PASSWORD',
  'HESTIVA_LR1B_TECHNICIAN_LEAD_EMAIL',
  'HESTIVA_LR1B_TECHNICIAN_LEAD_PASSWORD',
  'HESTIVA_LR1B_TECHNICIAN_MEMBER_EMAIL',
  'HESTIVA_LR1B_TECHNICIAN_MEMBER_PASSWORD',
];

if (process.env.HESTIVA_LR1B_ACCEPTANCE_ENABLED !== 'true') {
  throw new Error('LR-1B acceptance is disabled. Set HESTIVA_LR1B_ACCEPTANCE_ENABLED=true only for an approved pre-launch acceptance run.');
}

for (const name of required) {
  if (!process.env[name]?.trim()) throw new Error(`Missing required LR-1B acceptance configuration: ${name}`);
}

const base = new URL(process.env.HESTIVA_LR1B_BASE_URL);
if (base.protocol !== 'https:') throw new Error('HESTIVA_LR1B_BASE_URL must use HTTPS.');

const emails = [
  process.env.HESTIVA_LR1B_ADMIN_EMAIL,
  process.env.HESTIVA_LR1B_SUPERVISOR_EMAIL,
  process.env.HESTIVA_LR1B_TECHNICIAN_LEAD_EMAIL,
  process.env.HESTIVA_LR1B_TECHNICIAN_MEMBER_EMAIL,
].map((value) => value.trim().toLowerCase());

if (new Set(emails).size !== emails.length) throw new Error('LR-1B role identities must use distinct email addresses.');
