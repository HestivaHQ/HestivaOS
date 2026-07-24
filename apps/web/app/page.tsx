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
      statistics: { openWorkOrders: 0, completedToday: 0, overdueWorkOrders: 0, activeTechnicians: 0 },
      alerts: { overdueWorkOrders: 0, awaitingAssignment: 0, waitingForParts: 0, highPriorityJobs: 0, todayUnassignedJobs: 0 },
      performanceMetrics: { averageCompletionTimeDays: 0, completedToday: 0, completedThisWeek: 0, completedThisMonth: 0, overduePercentage: 0, onTimeCompletionRate: 0, activeWorkOrders: 0, averageJobsPerActiveTechnician: 0 },
      technicianWorkload: [],
      recentWorkOrderActivities: [],
      todayScheduledWorkOrders: [],
      upcomingScheduledWorkOrders: [],
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

function formatDecimal(value: number, suffix = '') {
  return `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}${suffix}`;
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

function QuickActionIcon({ name }: { name: 'workOrder' | 'customers' | 'properties' | 'technicians' }) {
  const paths = {
    workOrder: <><path d="M12 5v14M5 12h14" /></>,
    customers: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0M17 11a3 3 0 1 0-1.7-5.47M18.5 20a5.5 5.5 0 0 0-3.2-5" /></>,
    properties: <><path d="M4 21V5l8-3v19M12 9h8v12M8 7h.01M8 11h.01M8 15h.01M16 13h.01M16 17h.01" /><path d="M2 21h20" /></>,
    technicians: <><path d="m14.7 6.3 3-3 3 3-3 3zM4 20l5.2-5.2M7 17l-2-2 6.7-6.7 2 2z" /></>,
  };

  return <svg className="quickActionIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
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

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Technician workload</p>
              <h3>Active assignments and today&apos;s scheduled jobs</h3>
            </div>
          </div>
          {dashboard.technicianWorkload.length ? (
            <div className="technicianWorkloadList">
              {dashboard.technicianWorkload.map((technician) => (
                <article className="technicianWorkloadItem" key={technician.technicianId}>
                  <strong>{technician.technicianName}</strong>
                  <dl>
                    <div><dt>Active work orders</dt><dd>{technician.activeWorkOrderCount}</dd></div>
                    <div><dt>Scheduled today</dt><dd>{technician.scheduledTodayCount}</dd></div>
                    <div><dt>High priority</dt><dd>{technician.highPriorityCount}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <div className="emptyState"><strong>No active technicians found.</strong></div>
          )}
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Alerts</p>
              <h3>Action required</h3>
            </div>
          </div>
          {(() => {
            const alerts = [
              { title: 'Overdue work orders', count: dashboard.alerts.overdueWorkOrders, severity: 'Critical', alert: 'overdue' },
              { title: 'Jobs awaiting assignment', count: dashboard.alerts.awaitingAssignment, severity: 'High', alert: 'awaiting-assignment' },
              { title: 'Jobs waiting for parts', count: dashboard.alerts.waitingForParts, severity: 'Warning', alert: 'waiting-for-parts' },
              { title: 'High priority jobs', count: dashboard.alerts.highPriorityJobs, severity: 'High', alert: 'high-priority' },
              { title: 'Today’s unassigned jobs', count: dashboard.alerts.todayUnassignedJobs, severity: 'Warning', alert: 'today-unassigned' },
            ];
            const actionableAlerts = alerts.filter((alert) => alert.count > 0);
            return actionableAlerts.length ? <div className="alertGrid">{actionableAlerts.map((alert) => <Link className="alertCard" href={`/work-orders?alert=${alert.alert}`} key={alert.alert}><span className={`alertSeverity ${alert.severity.toLowerCase()}`}>{alert.severity}</span><strong>{alert.title}</strong><b>{alert.count}</b></Link>)}</div> : <div className="emptyState"><strong>No alerts.</strong><p>All operational work is up to date.</p></div>;
          })()}
        </section>

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
              <p className="eyebrow">Upcoming work</p>
              <h3>Scheduled for the next 7 days</h3>
            </div>
            <Link href="/work-orders">View all</Link>
          </div>

          {dashboard.upcomingScheduledWorkOrders.length ? (
            <div className="workList">
              {dashboard.upcomingScheduledWorkOrders.map((workOrder) => (
                <Link className="workItem scheduledWorkItem" href={`/work-orders?edit=${workOrder.id}`} key={workOrder.id}>
                  <div className="scheduledWorkDetails">
                    <strong>{workOrder.customer.name}</strong>
                    <p>{workOrder.property.name}</p>
                    <dl>
                      <div><dt>Date</dt><dd><time dateTime={workOrder.scheduledAt ?? undefined}>{formatDate(workOrder.scheduledAt)}</time></dd></div>
                      <div><dt>Assigned technician</dt><dd>{workOrder.technician ? `${workOrder.technician.firstName} ${workOrder.technician.lastName}` : 'Unassigned'}</dd></div>
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
              <strong>No work scheduled for the next 7 days.</strong>
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
              <QuickActionIcon name="workOrder" />
              <div><strong>New Work Order</strong><span>Create and assign maintenance work.</span></div>
            </Link>
            <Link className="quickActionCard" href="/customers">
              <QuickActionIcon name="customers" />
              <div><strong>Customers</strong><span>View and manage customer records.</span></div>
            </Link>
            <Link className="quickActionCard" href="/properties">
              <QuickActionIcon name="properties" />
              <div><strong>Properties</strong><span>View and manage property details.</span></div>
            </Link>
            <Link className="quickActionCard" href="/technicians">
              <QuickActionIcon name="technicians" />
              <div><strong>Technicians</strong><span>View and manage technician assignments.</span></div>
            </Link>
          </nav>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Statistics</p>
              <h3>Operational summary</h3>
            </div>
          </div>
          <div className="metricGrid statisticsGrid">
            <article className="metricCard"><span>Open work orders</span><strong>{dashboard.statistics.openWorkOrders}</strong></article>
            <article className="metricCard"><span>Completed today</span><strong>{dashboard.statistics.completedToday}</strong></article>
            <article className="metricCard"><span>Overdue work orders</span><strong>{dashboard.statistics.overdueWorkOrders}</strong></article>
            <article className="metricCard"><span>Active technicians</span><strong>{dashboard.statistics.activeTechnicians}</strong></article>
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Performance metrics</p>
              <h3>Management overview</h3>
            </div>
          </div>
          <div className="metricGrid performanceMetricsGrid">
            <article className="metricCard"><span>Average completion time</span><strong>{formatDecimal(dashboard.performanceMetrics.averageCompletionTimeDays, ' days')}</strong></article>
            <article className="metricCard"><span>Completed today</span><strong>{dashboard.performanceMetrics.completedToday}</strong></article>
            <article className="metricCard"><span>Completed this week</span><strong>{dashboard.performanceMetrics.completedThisWeek}</strong></article>
            <article className="metricCard"><span>Completed this month</span><strong>{dashboard.performanceMetrics.completedThisMonth}</strong></article>
            <article className="metricCard"><span>Overdue percentage</span><strong>{formatDecimal(dashboard.performanceMetrics.overduePercentage, '%')}</strong></article>
            <article className="metricCard"><span>On-time completion rate</span><strong>{formatDecimal(dashboard.performanceMetrics.onTimeCompletionRate, '%')}</strong></article>
            <article className="metricCard"><span>Active work orders</span><strong>{dashboard.performanceMetrics.activeWorkOrders}</strong></article>
            <article className="metricCard"><span>Average jobs per technician</span><strong>{formatDecimal(dashboard.performanceMetrics.averageJobsPerActiveTechnician)}</strong></article>
          </div>
        </section>
      </section>
    </main>
  );
}
