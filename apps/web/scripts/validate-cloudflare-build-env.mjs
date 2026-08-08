const requiredVariableNames = [
  'API_URL',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const missingVariableNames = requiredVariableNames.filter(
  (name) => !process.env[name]?.trim(),
);

if (missingVariableNames.length > 0) {
  console.error('Cloudflare production build is missing required environment variables:');
  for (const name of missingVariableNames) {
    console.error(`- ${name}`);
  }
  process.exit(1);
}

console.log('Cloudflare production build environment validation passed.');
