const forbiddenProviderHosts = new Set([
  'graph.facebook.com',
  'www.facebook.com',
  'facebook.com',
]);

const forbiddenProviderPaths = [
  /\/messaging\/conversations\/[^/]+\/manual-replies(?:\/|$)/,
  /\/webhooks\/meta(?:\/|$)/,
  /\/whatsapp(?:\/|$)/,
  /\/messenger(?:\/|$)/,
];

export function installAcceptanceSafetyGuard(page) {
  page.on('request', (request) => {
    const url = new URL(request.url());
    const method = request.method().toUpperCase();

    if (forbiddenProviderHosts.has(url.hostname)) {
      throw new Error(`LR-1B Meta exclusion violated by browser request to ${url.hostname}.`);
    }

    if (method !== 'GET' && method !== 'HEAD' && forbiddenProviderPaths.some((pattern) => pattern.test(url.pathname))) {
      throw new Error(`LR-1B Meta exclusion violated by ${method} request to a forbidden provider-edge path.`);
    }
  });
}

export async function expectNoServerErrors(page, action) {
  const failures = [];
  const listener = (response) => {
    if (response.status() >= 500) failures.push(response.status());
  };
  page.on('response', listener);
  try {
    await action();
  } finally {
    page.off('response', listener);
  }
  if (failures.length) throw new Error(`Observed ${failures.length} server 5xx response(s) during LR-1B scenario.`);
}
