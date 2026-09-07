import { execFileSync } from 'node:child_process';

const expected = process.env.HESTIVA_LR1B_EXPECTED_SHA?.trim();
const webBase = process.env.HESTIVA_LR1B_BASE_URL?.trim().replace(/\/$/, '');
const apiBase = process.env.HESTIVA_LR1B_API_URL?.trim().replace(/\/$/, '');

if (!expected || !webBase || !apiBase) {
  throw new Error('Missing LR-1B deployment verification configuration.');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const gitShaPattern = /^[0-9a-f]{40}$/i;

const apiLagSafePrefixes = ['apps/web/', 'docs/', '.github/'];
const apiLagSafeFiles = new Set(['AGENTS.md', 'README.md', '.gitignore']);

function apiRevisionCanRepresentExpected(apiRevision) {
  if (apiRevision === expected) {
    return { compatible: true, mode: 'exact', changedFiles: [] };
  }

  if (!gitShaPattern.test(apiRevision) || !gitShaPattern.test(expected)) {
    return { compatible: false, mode: 'invalid-revision', changedFiles: [] };
  }

  try {
    execFileSync('git', ['merge-base', '--is-ancestor', apiRevision, expected], { stdio: 'ignore' });
  } catch {
    return { compatible: false, mode: 'not-ancestor', changedFiles: [] };
  }

  let changedFiles;
  try {
    changedFiles = execFileSync('git', ['diff', '--name-only', `${apiRevision}..${expected}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split(/\r?\n/)
      .map((path) => path.trim())
      .filter(Boolean);
  } catch {
    return { compatible: false, mode: 'diff-unavailable', changedFiles: [] };
  }

  const unsafeFiles = changedFiles.filter(
    (path) => !apiLagSafeFiles.has(path) && !apiLagSafePrefixes.some((prefix) => path.startsWith(prefix)),
  );

  return {
    compatible: unsafeFiles.length === 0,
    mode: unsafeFiles.length === 0 ? 'safe-ancestor' : 'api-affecting-diff',
    changedFiles,
  };
}

for (let attempt = 1; attempt <= 80; attempt += 1) {
  let webRevision = 'unavailable';
  let apiRevision = 'unavailable';
  let apiReady = false;

  try {
    const webResponse = await fetch(`${webBase}/api/revision`, { cache: 'no-store' });
    if (webResponse.ok) webRevision = String((await webResponse.json()).revision ?? 'unknown');
  } catch {}

  try {
    const apiResponse = await fetch(`${apiBase}/api/v1/ready`, { cache: 'no-store' });
    if (apiResponse.ok) {
      const payload = await apiResponse.json();
      apiRevision = String(payload.revision ?? 'unknown');
      apiReady = payload.status === 'ready';
    }
  } catch {}

  const apiCompatibility = apiRevisionCanRepresentExpected(apiRevision);
  console.log(
    `deployment probe ${attempt}: web=${webRevision} api=${apiRevision} ready=${apiReady} apiCompatibility=${apiCompatibility.mode}`,
  );

  if (webRevision === expected && apiReady && apiCompatibility.compatible) {
    console.log(
      apiRevision === expected
        ? `Exact deployed revisions verified: ${expected}`
        : `Surface-aware deployment verified: web=${expected} api=${apiRevision}; only API-lag-safe files changed since the API deployment.`,
    );
    process.exit(0);
  }

  if (attempt < 80) await sleep(15_000);
}

throw new Error(
  `Production did not converge to a compatible deployment for expected revision ${expected}. The web must be exact; the API must be ready and either exact or an ancestor separated only by API-lag-safe changes.`,
);
