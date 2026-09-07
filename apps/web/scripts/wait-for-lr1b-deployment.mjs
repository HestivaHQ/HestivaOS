const expected = process.env.HESTIVA_LR1B_EXPECTED_SHA?.trim();
const webBase = process.env.HESTIVA_LR1B_BASE_URL?.trim().replace(/\/$/, '');
const apiBase = process.env.HESTIVA_LR1B_API_URL?.trim().replace(/\/$/, '');

if (!expected || !webBase || !apiBase) {
  throw new Error('Missing LR-1B deployment verification configuration.');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  console.log(`deployment probe ${attempt}: web=${webRevision} api=${apiRevision} ready=${apiReady}`);

  if (webRevision === expected && apiRevision === expected && apiReady) {
    console.log(`Exact deployed revision verified: ${expected}`);
    process.exit(0);
  }

  if (attempt < 80) await sleep(15_000);
}

throw new Error(`Production did not converge to expected revision ${expected} on both web and API surfaces.`);
