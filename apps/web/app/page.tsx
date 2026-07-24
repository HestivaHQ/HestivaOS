import Link from 'next/link';
import { api, DashboardOverview, WorkOrderActivity, WorkOrderStatus } from '../lib/api';
import { createClient } from '../lib/supabase/server';
import { SignOutButton } from './components/sign-out-button';

export const dynamic = 'force-dynamic';

const EMPTY_STATUS_BREAKDOWN: Record<WorkOrderStatus, number> = {
  NEW: 0,
  ASSIGNED: 0,
  ACCEPTED: 0,
  TRAVELLING: 0,
  ON_SITE: 0,
  WAITING_FOR_PARTS: 0,
  COMPLETED: 0,
  CLOSED: 0,
  CANCELLED: 0,
};

async function getDashboardData(): Promise<DashboardOverview & { available: boolean }> {
  try {
    const dashboard = await api.dashboard();
    return { ...dashboard, available: true };
  } catch {
    return {
      totals: { customers: 0, properties: 0, openWorkOrders: 0, completedWorkOrders: 0 },
      recentWorkOrderActivities: [],
      todayScheduledWorkOrders: [],
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

function formatTime(value: string | null) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-ZA', { timeStyle: 'short' }).format(new Date(value));
}

function activityDescription(activity: WorkOrderActivity) {
  if (activity.type === 'WORK_ORDER_CREATED') return 'Work order created';
  if (activity.type === 'TECHNICIAN_ASSIGNED') return 'Technician assigned';
  if (activity.type === 'TECHNICIAN_CHANGED') return 'Technician changed';
  if (activity.type === 'TECHNICIAN_REMOVED') return 'Technician removed';
  if (activity.type === 'WORK_ORDER_CLOSED') return 'Work order closed';
  if (activity.type === 'WORK_ORDER_CANCELLED') return 'Work order cancelled';
  return `Status changed from ${activity.previousStatus ? readableStatus(activity.previousStatus) : 'unknown'} to ${activity.newStatus ? readableStatus(activity.newStatus) : 'unknown'}`;
}

function activityUser(activity: WorkOrderActivity) {
  if (!activity.actor) return 'System';
  return activity.actor.displayName ?? `${activity.actor.firstName} ${activity.actor.lastName}`;
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const dashboard = await getDashboardData();

  const statusCards: Array<{ status: WorkOrderStatus; label: string; value: number }> = Object.entries(dashboard.statusBreakdown).filter(([status]) => !['CLOSED', 'CANCELLED'].includes(status)).map(([status, value]) => ({ status: status as WorkOrderStatus, label: readableStatus(status), value }));

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

        <section className="panel">
          <div className="panelHeader"><div><p className="eyebrow">Current workload</p><h3>Work requiring attention</h3></div><Link href="/work-orders">Manage work</Link></div>
          <div className="metricGrid">
            {statusCards.map((status) => <Link className="metricCard" href={`/work-orders?status=${status.status}`} key={status.status}><span>{status.label}</span><strong>{status.value}</strong></Link>)}
          </div>
        </section>

        <div className="metricGrid">
          <article className="metricCard"><span>Total customers</span><strong>{dashboard.totals.customers}</strong></article>
          <article className="metricCard"><span>Total properties</span><strong>{dashboard.totals.properties}</strong></article>
          <article className="metricCard"><span>Open work orders</span><strong>{dashboard.totals.openWorkOrders}</strong></article>
          <article className="metricCard"><span>Completed work orders</span><strong>{dashboard.totals.completedWorkOrders}</strong></article>
        </div>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Today&apos;s schedule</p>
              <h3>Scheduled work orders</h3>
            </div>
            <Link href="/work-orders">View all</Link>
          </div>

          {dashboard.todayScheduledWorkOrders.length ? (
            <div className="workList">
              {dashboard.todayScheduledWorkOrders.map((workOrder) => (
                <Link className="workItem scheduledWorkItem" href={`/work-orders?edit=${workOrder.id}`} key={workOrder.id}>
                  <div className="scheduledWorkDetails">
                    <strong>{workOrder.customer.name}</strong>
                    <p>{workOrder.property.name}</p>
                    <dl>
                      <div><dt>Assigned technician</dt><dd>{workOrder.technician ? `${workOrder.technician.firstName} ${workOrder.technician.lastName}` : 'Unassigned'}</dd></div>
                      <div><dt>Scheduled time</dt><dd><time dateTime={workOrder.scheduledAt ?? undefined}>{formatTime(workOrder.scheduledAt)}</time></dd></div>
                      <div><dt>Priority</dt><dd>{workOrder.priority}</dd></div>
                    </dl>
                  </div>
                  <div className="workMeta">
                    <span className="statusPill">{readableStatus(workOrder.status)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="emptyState">
              <strong>No work scheduled for today.</strong>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Recent activity</p>
              <h3>Latest work-order updates</h3>
            </div>
            <Link href="/work-orders">View all</Link>
          </div>

          {dashboard.recentWorkOrderActivities.length ? (
            <div className="recentActivityList" role="list">
              {dashboard.recentWorkOrderActivities.map((activity) => (
                <Link className="recentActivityItem" href={`/work-orders?edit=${activity.workOrder.id}`} key={activity.id} role="listitem">
                  <div className="recentActivityField recentActivityTime">
                    <span>Time</span>
                    <time dateTime={activity.createdAt}>{formatDate(activity.createdAt)}</time>
                  </div>
                  <div className="recentActivityField">
                    <span>User</span>
                    <strong>{activityUser(activity)}</strong>
                  </div>
                  <div className="recentActivityField">
                    <span>Action</span>
                    <strong>{activityDescription(activity)}</strong>
                  </div>
                  <div className="recentActivityField">
                    <span>Work order reference</span>
                    <strong>{activity.workOrder.title}</strong>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="emptyState">
              <strong>No recent activity.</strong>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Quick actions</p>
              <h3>Manage operations</h3>
            </div>
          </div>
          <nav className="quickActionGrid" aria-label="Dashboard quick actions">
            <Link className="quickActionCard" href="/work-orders">
              <strong>New Work Order</strong>
              <span>Create and assign maintenance work.</span>
            </Link>
            <Link className="quickActionCard" href="/customers">
              <strong>Customers</strong>
              <span>View and manage customer records.</span>
            </Link>
            <Link className="quickActionCard" href="/properties">
              <strong>Properties</strong>
              <span>View and manage property details.</span>
            </Link>
            <Link className="quickActionCard" href="/technicians">
              <strong>Technicians</strong>
              <span>View and manage technician assignments.</span>
            </Link>
          </nav>
        </section>
      </section>
    </main>
  );
}
