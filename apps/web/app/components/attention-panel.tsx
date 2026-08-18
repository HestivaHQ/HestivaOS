'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  assignAttention,
  attentionOverview,
  markAttentionSeen,
  type AttentionItem,
  type AttentionOverview,
  type AttentionOwner,
  type AttentionView,
} from '../../lib/attention-api';
import { createClient } from '../../lib/supabase/client';
import styles from './attention-panel.module.css';

async function accessToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session?.access_token) throw new Error('Authenticated session is required.');
  return session.access_token;
}

function ownerLabel(owner: AttentionOwner): string {
  return owner.displayName || `${owner.firstName} ${owner.lastName}`.trim() || owner.email;
}

function dueLabel(item: AttentionItem): string {
  if (!item.dueAt) return 'No fixed deadline';
  const value = new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(item.dueAt));
  return item.priority === 'CRITICAL' ? `Was due ${value}` : `Matters by ${value}`;
}

export function AttentionPanel({ initial }: { initial: AttentionOverview }) {
  const [overview, setOverview] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function refresh(view: AttentionView = overview.view) {
    setBusy('view');
    try {
      setOverview(await attentionOverview(await accessToken(), view));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load Needs Attention.');
    } finally {
      setBusy(null);
    }
  }

  async function seen(id: string) {
    setBusy(id);
    try {
      await markAttentionSeen(await accessToken(), id);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to mark the item seen.');
      setBusy(null);
    }
  }

  async function assign(item: AttentionItem, ownerId: string | null) {
    setBusy(item.id);
    try {
      await assignAttention(await accessToken(), item.id, ownerId);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to assign the item.');
      setBusy(null);
    }
  }

  return <div className={styles.panel}>
    <div className={styles.toolbar}>
      <div className={styles.views} aria-label="Needs Attention view">
        {(['mine', 'all'] as AttentionView[]).map((view) => <button
          type="button"
          key={view}
          aria-pressed={overview.view === view}
          disabled={busy !== null}
          onClick={() => void refresh(view)}
        >{view === 'mine' ? 'Mine' : 'All'}</button>)}
      </div>
      <span className={styles.count}>{overview.items.length} unresolved {overview.items.length === 1 ? 'item' : 'items'}</span>
    </div>

    {error ? <p className={styles.error} role="alert">{error}</p> : null}

    <div className={styles.list}>
      {overview.items.map((item) => {
        const owners = overview.eligibleOwners.filter((owner) => owner.eligibleQueues.includes(item.queue));
        return <article className={styles.item} data-priority={item.priority} key={item.id}>
          <div className={styles.identity}>
            <h4>{item.title}</h4>
            <p>{item.summary}</p>
            <div className={styles.meta}>
              <span className={styles.priority}>{item.priority === 'CRITICAL' ? 'Critical' : item.priority === 'HIGH' ? 'High priority' : 'Normal priority'}</span>
              <span>{dueLabel(item)}</span>
              {item.occurrenceCount > 1 ? <span>Occurred {item.occurrenceCount} times</span> : null}
            </div>
          </div>
          <div className={styles.controls}>
            <select
              aria-label={`Owner for ${item.title}`}
              disabled={busy !== null}
              value={item.ownerId ?? ''}
              onChange={(event) => void assign(item, event.target.value || null)}
            >
              <option value="">Unassigned queue</option>
              {owners.map((owner) => <option key={owner.id} value={owner.id}>{ownerLabel(owner)}</option>)}
            </select>
            {item.seenAt
              ? <span className={styles.seen}>Seen</span>
              : <button type="button" disabled={busy !== null} onClick={() => void seen(item.id)}>Mark seen</button>}
            <Link className={styles.action} href={item.actionHref}>{item.actionLabel}</Link>
          </div>
        </article>;
      })}
      {!overview.items.length ? <div className={styles.empty}>No actionable exceptions in this view.</div> : null}
    </div>
  </div>;
}
