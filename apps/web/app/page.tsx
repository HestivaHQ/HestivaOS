import { createClient } from '../lib/supabase/server';
import { SignOutButton } from './components/sign-out-button';

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const health = await getHealth();
  const healthy = health?.data.status === 'healthy';

  return (
    <main className="shell">
      <section className="card">
        <p className="eyebrow">Stage 2 · Authentication</p>
        <h1>Maintenance Marshall Operating System</h1>
        <p className="summary">Signed in as {user?.email ?? 'authenticated user'}.</p>
        <div className="statusRow">
          <span className={`indicator ${healthy ? 'healthy' : 'offline'}`} aria-hidden="true" />
          <div>
            <strong>System Status: {healthy ? 'Healthy' : 'Unavailable'}</strong>
            <p>{healthy ? `Database connected · ${health.data.environment}` : 'The API health check is currently unavailable.'}</p>
          </div>
        </div>
        <div style={{ marginTop: 24 }}>
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
