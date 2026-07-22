import Link from 'next/link';
import { api, WorkOrder } from '../lib/api';
import { createClient } from '../lib/supabase/server';
import { SignOutButton } from './components/sign-out-button';

async function getDashboardData() {
  try {
    const [customers, properties, openWorkOrders, scheduledWorkOrders] = await Promise.all([
      api.customers('?page=1&pageSize=1'),
      api.properties('?page=1&pageSize=1'),
      api.workOrders('?page=1&pageSize=5&status=OPEN'),
      api.workOrders('?page=1&pageSize=5&status=SCHEDULED'),
    ]);

    const upcoming = [...scheduledWorkOrders.items, ...openWorkOrders.items]
      .sort((a, b) => {
        if (!a.scheduledAt) return 1;
        if (!b.scheduledAt) return -1;
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      })
      .slice(0, 5);

    return {
      customers: customers.total,
      properties: properties.total,
      openWorkOrders: openWorkOrders.total,
      scheduledWorkOrders: scheduledWorkOrders.total,
      upcoming,
      available: true,
    };
  } catch {
    return {
      customers: 0,
      properties: 0,
      openWorkOrders: 0,
      scheduledWorkOrders: 0,
      upcoming: [] as WorkOrder[],
      available: false,
    };
  }
}

function formatDate(value: string | null) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const dashboard = await getDashboardData();

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Maintenance Marshall</p>
          <h1 className="brand">Operations</h1>
        </div>
        <nav className="navList" aria-label="Primary navigation">
          <Link className="navLink active" href="/">Dashboard</Link>
          <Link className="navLink" href="/customers">Customers</Link>
          <Link className="navLink" href="/properties">Properties</Link>
          <Link className="navLink" href="/work-orders">Work orders</Link>
        </nav>
        <div className="accountBlock">
          <span>{user?.email ?? 'Authenticated user'}</span>
          <SignOutButton />
        </div>
      </aside>

      <section className="content">
        <header className="pageHeader">
          <div>
            <p className="eyebrow">Live overview</p>
            <h2>Dashboard</h2>
            <p>Customers, properties, and maintenance work at a glance.</p>
          </div>
          <span className={`systemBadge ${dashboard.available ? 'online' : 'offline'}`}>
            {dashboard.available ? 'API connected' : 'API unavailable'}
          </span>
        </header>

        <div className="metricGrid">
          <article className="metricCard"><span>Customers</span><strong>{dashboard.customers}</strong></article>
          <article className="metricCard"><span>Properties</span><strong>{dashboard.properties}</strong></article>
          <article className="metricCard"><span>Open work orders</span><strong>{dashboard.openWorkOrders}</strong></article>
          <article className="metricCard"><span>Scheduled</span><strong>{dashboard.scheduledWorkOrders}</strong></article>
        </div>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Work queue</p>
              <h3>Upcoming work</h3>
            </div>
            <Link href="/work-orders">View all</Link>
          </div>

          {dashboard.upcoming.length ? (
            <div className="workList">
              {dashboard.upcoming.map((workOrder) => (
                <article className="workItem" key={workOrder.id}>
                  <div>
                    <strong>{workOrder.title}</strong>
                    <p>{workOrder.customer.name} · {workOrder.property.name}</p>
                  </div>
                  <div className="workMeta">
                    <span className="statusPill">{workOrder.status.replaceAll('_', ' ')}</span>
                    <time>{formatDate(workOrder.scheduledAt)}</time>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="emptyState">
              <strong>No upcoming work orders</strong>
              <p>New and scheduled work will appear here.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
