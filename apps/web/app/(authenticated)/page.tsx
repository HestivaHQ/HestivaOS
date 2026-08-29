import { redirect } from 'next/navigation';
import Link from 'next/link';
import { workOrderDisplayLabel, workOrderReference } from '../../lib/work-order-display';
import { type AppUser, type DashboardOverview, type WorkOrder, type WorkOrderStatus } from '../../lib/api';
import { type AttentionOverview } from '../../lib/attention-api';
import { createAuthenticatedApi } from '../../lib/api-server';
import { AttentionPanel } from '../components/attention-panel';
import { DashboardSection } from '../components/dashboard-section';


const EMPTY_DASHBOARD: DashboardOverview = {
  totals: { customers: 0, properties: 0, openWorkOrders: 0, completedWorkOrders: 0 },
  statistics: { openWorkOrders: 0, completedToday: 0, overdueWorkOrders: 0, activeTechnicians: 0 },
  alerts: { overdueWorkOrders: 0, awaitingAssignment: 0, waitingForParts: 0, highPriorityJobs: 0, todayUnassignedJobs: 0 },
  performanceMetrics: { averageCompletionTimeDays: 0, completedToday: 0, completedThisWeek: 0, completedThisMonth: 0, overduePercentage: 0, onTimeCompletionRate: 0, activeWorkOrders: 0, averageJobsPerActiveTechnician: 0 },
  technicianWorkload: [], recentWorkOrderActivities: [], todayScheduledWorkOrders: [], upcomingScheduledWorkOrders: [], overdueWorkOrdersList: [],
  statusBreakdown: { NEW: 0, ASSIGNED: 0, ACCEPTED: 0, TRAVELLING: 0, ON_SITE: 0, WAITING_FOR_PARTS: 0, COMPLETED: 0, CLOSED: 0, CANCELLED: 0 },
  operationalDashboard: { operationalDate: '', todayStatusBreakdown: {}, todayUnassignedJobs: 0, actionableOverdueWorkOrders: [], upcomingWorkSummary: [], upcomingJobCount: 0, upcomingUnassignedCount: 0 },
};

const EMPTY_ATTENTION: AttentionOverview = {
  view: 'mine',
  items: [],
  eligibleOwners: [],
};

function plural(count: number, singular: string, pluralForm = `${singular}s`) { return `${count} ${count === 1 ? singular : pluralForm}`; }
function readableStatus(status: string) { return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function dashboardStatus(status: WorkOrderStatus) { return status === 'WAITING_FOR_PARTS' ? 'Needs Review' : readableStatus(status); }
function formatTime(value: string | null) { return value ? new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : 'Time pending'; }
function formatDay(value: string) { return new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00+02:00`)); }
function assignment(workOrder: WorkOrder) { return workOrder.crew?.name || (workOrder.technician ? `${workOrder.technician.firstName} ${workOrder.technician.lastName}`.trim() : 'Unassigned'); }
function address(workOrder: WorkOrder) { return [workOrder.property.addressLine1, workOrder.property.addressLine2, workOrder.property.city, workOrder.property.province].filter(Boolean).join(', '); }
function nameFor(user: AppUser) { return user.displayName || user.firstName || user.email.split('@')[0]; }
function initials(user: AppUser) { return (user.displayName || `${user.firstName} ${user.lastName}` || user.email).split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(); }

function ShortcutIcon({ kind }: { kind: 'customers' | 'new' | 'schedule' | 'management' }) {
  const icon = { customers: '◎', new: '+', schedule: '▦', management: '⋯' }[kind];
  return <span className="shortcutIcon" aria-hidden="true">{icon}</span>;
}

function JobRows({ jobs }: { jobs: WorkOrder[] }) {
  if (!jobs.length) return <div className="dashboardEmpty">No jobs scheduled.</div>;
  return <div className="todayJobList">{jobs.map((job) => {
    const assigned = assignment(job);
    return <Link className="todayJob" href={`/work-orders/${job.id}`} key={job.id}>
      <time dateTime={job.scheduledAt ?? undefined}>{formatTime(job.scheduledAt)}</time>
      <span className="jobIdentity"><strong>{workOrderReference(job)}</strong><small>{workOrderDisplayLabel(job)}</small></span>
      <span className="jobAddress">{address(job)}</span>
      <span className={assigned === 'Unassigned' ? 'jobAssignment unassigned' : 'jobAssignment'}>{assigned}</span>
      <span className="statusPill">{dashboardStatus(job.status)}</span>
    </Link>;
  })}</div>;
}

export default async function HomePage() {
  const authenticatedApi = await createAuthenticatedApi();
  const appUser = await authenticatedApi.currentUser();
  if (appUser.role === 'TECHNICIAN') redirect('/technician');

  let dashboard = EMPTY_DASHBOARD;
  let attention = EMPTY_ATTENTION;
  let dashboardAvailable = false;
  let attentionAvailable = false;
  const [dashboardResult, attentionResult] = await Promise.allSettled([
    authenticatedApi.dashboard(),
    authenticatedApi.attention('mine'),
  ]);
  if (dashboardResult.status === 'fulfilled') { dashboard = dashboardResult.value; dashboardAvailable = true; }
  if (attentionResult.status === 'fulfilled') { attention = attentionResult.value; attentionAvailable = true; }

  const operational = dashboard.operationalDashboard;
  const todayCount = dashboard.todayScheduledWorkOrders.length;
  const alertCount = attention.items.length;
  const nextJob = dashboard.todayScheduledWorkOrders.find((job) => job.scheduledAt && new Date(job.scheduledAt) > new Date());
  const workloadParts = Object.entries(operational.todayStatusBreakdown).filter(([, count]) => count).map(([status, count]) => `${count} ${readableStatus(status)}`);
  const currentHour = Number(new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const naturalDate = new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  return <>
    <div className="dashboard">
      <header className="dashboardHeader">
        <div><p className="eyebrow">Daily command centre</p><h2>{greeting}, {nameFor(appUser)}</h2><p>{naturalDate}</p><strong>{plural(todayCount, 'job')} scheduled today <span>·</span> {plural(alertCount, 'item')} require attention</strong>{!dashboardAvailable || !attentionAvailable ? <small className="dashboardUnavailable">Some live operational data is temporarily unavailable.</small> : null}</div>
        <Link className="dashboardProfile" href="/profile" aria-label="Open My Profile">{appUser.profilePhotoUrl ? <img src={appUser.profilePhotoUrl} alt="" /> : <span>{initials(appUser)}</span>}</Link>
      </header>

      <DashboardSection title="Needs Attention" summary={`${plural(alertCount, 'item')} require action`} defaultExpanded>
        <AttentionPanel initial={attention} />
      </DashboardSection>

      <DashboardSection title="Today’s Work" summary={`${plural(todayCount, 'job')} today${nextJob ? ` · Next: ${formatTime(nextJob.scheduledAt)}` : ''}${workloadParts.length ? ` · ${workloadParts.join(' · ')}` : ''}`} defaultExpanded>
        <JobRows jobs={dashboard.todayScheduledWorkOrders} />
        <div className="workloadGrid">{Object.entries(operational.todayStatusBreakdown).map(([status, count]) => <article key={status}><strong>{count}</strong><span>{readableStatus(status)}</span></article>)}</div>
      </DashboardSection>

      <section className="shortcuts" aria-labelledby="shortcuts-title"><h3 id="shortcuts-title">Shortcuts</h3><nav className="shortcutGrid" aria-label="Operational shortcuts">
        <Link className="shortcutCard primary" href="/customers"><ShortcutIcon kind="customers" /><span><strong>Customers</strong><small>Manage customer records</small></span></Link>
        <Link className="shortcutCard" href="/work-orders/new"><ShortcutIcon kind="new" /><span><strong>New Work Order</strong><small>Create and assign cleaning work</small></span></Link>
        <Link className="shortcutCard" href="/shifts"><ShortcutIcon kind="schedule" /><span><strong>Schedule</strong><small>Plan shifts and assignments</small></span></Link>
        <span className="shortcutCard disabled" aria-disabled="true" title="Management landing page is planned"><ShortcutIcon kind="management" /><span><strong>Management</strong><small>Management gateway coming soon</small></span></span>
      </nav></section>

      <DashboardSection title="Upcoming Work" summary={`${plural(operational.upcomingJobCount, 'job')} over the next 7 days · ${operational.upcomingUnassignedCount} unassigned`}>
        <div className="upcomingDays">{operational.upcomingWorkSummary.length ? operational.upcomingWorkSummary.map((day) => <div key={day.date}><strong>{formatDay(day.date)}</strong><span>{plural(day.jobCount, 'job')} · {day.unassignedCount ? `${plural(day.unassignedCount, 'job')} unassigned` : 'All assigned'}</span></div>) : <div className="dashboardEmpty">No work scheduled over the next 7 days.</div>}</div>
      </DashboardSection>
    </div>
  </>;
}
