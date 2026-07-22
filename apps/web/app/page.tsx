type HealthResponse = {
  data: {
    status: string;
    database: string;
    environment: string;
  };
};

async function getHealth(): Promise<HealthResponse | null> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
  try {
    const response = await fetch(`${apiUrl}/api/v1/health`, { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as HealthResponse;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const health = await getHealth();
  const healthy = health?.data.status === 'healthy';

  return (
    <main className="shell">
      <section className="card">
        <p className="eyebrow">Stage 1 · Foundation</p>
        <h1>Maintenance Marshall Operating System</h1>
        <p className="summary">The first working application checkpoint.</p>
        <div className="statusRow">
          <span className={`indicator ${healthy ? 'healthy' : 'offline'}`} aria-hidden="true" />
          <div>
            <strong>System Status: {healthy ? 'Healthy' : 'Unavailable'}</strong>
            <p>{healthy ? `Database connected · ${health.data.environment}` : 'Start the API and database to complete the health check.'}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
