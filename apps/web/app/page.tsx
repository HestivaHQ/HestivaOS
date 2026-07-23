import Link from 'next/link';
import { api, DashboardOverview, WorkOrderStatus } from '../lib/api';
import { createClient } from '../lib/supabase/server';
import { SignOutButton } from './components/sign-out-button';

const EMPTY_STATUS_BREAKDOWN: Record<WorkOrderStatus, number> = {
  DRAFT: 0,
  OPEN: 0,
  SCHEDULED: 0,
  IN_PROGRESS: 0,
  ON_HOLD: 0,
  COMPLETED: 0,
  CANCELLED: 0,
};

async function getDashboardData(): Promise<DashboardOverview & { available: boolean }> {
  try {
    const dashboard = await api.dashboard();
    return { ...dashboard, available: true };
  } catch {
    return {
      totals: { customers: 0, properties: 0, openWorkOrders: 0, completedWorkOrders: 0 },
      recentWorkOrders: [],
      statusBreakdown: EMPTY_STATUS_BREAKDOWN,
      available: false,
    };
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function readableStatus(status: string) {
  return status.replaceAll('_', ' ');
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const dashboard = await getDashboardData();

  const statusCards: Array<{ label: string; value: number }> = [
    { label: 'Open', value: dashboard.statusBreakdown.OPEN },
    { label: 'Scheduled', value: dashboard.statusBreakdown.SCHEDULED },
    { label: 'In progress', value: dashboard.statusBreakdown.IN_PROGRESS },
    { label: 'On hold', value: dashboard.statusBreakdown.ON_HOLD },
  ];

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
          <article className="metricCard"><span>Total customers</span><strong>{dashboard.totals.customers}</strong></article>
          <article className="metricCard"><span>Total properties</span><strong>{dashboard.totals.properties}</strong></article>
          <article className="metricCard"><span>Open work orders</span><strong>{dashboard.totals.openWorkOrders}</strong></article>
          <article className="metricCard"><span>Completed work orders</span><strong>{dashboard.totals.completedWorkOrders}</strong></article>
        </div>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Current workload</p>
              <h3>Status overview</h3>
            </div>
            <Link href="/work-orders">Manage work</Link>
          </div>
          <div className="metricGrid">
            {statusCards.map((status) => (
              <article className="metricCard" key={status.label}>
                <span>{status.label}</span>
                <strong>{status.value}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Latest activity</p>
              <h3>Recent work orders</h3>
            </div>
            <Link href="/work-orders">View all</Link>
          </div>

          {dashboard.recentWorkOrders.length ? (
            <div className="workList">
              {dashboard.recentWorkOrders.map((workOrder) => (
                <Link className="workItem" href={`/work-orders?edit=${workOrder.id}`} key={workOrder.id}>
                  <div>
                    <strong>{workOrder.title}</strong>
                    <p>{workOrder.customer.name} · {workOrder.property.name} · {workOrder.technician ? `${workOrder.technician.firstName} ${workOrder.technician.lastName}` : 'Unassigned'} · {workOrder.priority} priority</p>
                  </div>
                  <div className="workMeta">
                    <span className="statusPill">{readableStatus(workOrder.status)}</span>
                    <time>{formatDate(workOrder.scheduledAt ?? workOrder.createdAt)}</time>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="emptyState">
              <strong>No work orders yet</strong>
              <p>Create a work order and it will appear here.</p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Quick actions</p>
              <h3>Create a record</h3>
            </div>
          </div>
          <nav className="navList" aria-label="Dashboard quick actions">
            <Link className="navLink" href="/customers">New customer</Link>
            <Link className="navLink" href="/properties">New property</Link>
            <Link className="navLink" href="/work-orders">New work order</Link>
          </nav>
        </section>
      </section>
    </main>
  );
}
