'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  executeLaunchBaselineReset,
  LaunchBaselineImpact,
  previewLaunchBaselineReset,
} from './launch-baseline-reset-api';

export function LaunchBaselineResetManager() {
  const [impact, setImpact] = useState<LaunchBaselineImpact | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    setMessage('');
    setConfirmation('');
    try {
      setImpact(await previewLaunchBaselineReset());
    } catch (caught) {
      setImpact(null);
      setError(caught instanceof Error ? caught.message : 'Unable to preview launch reset.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const tableEntries = useMemo(
    () => Object.entries(impact?.tableCounts ?? {}).filter(([, count]) => count > 0).sort(([a], [b]) => a.localeCompare(b)),
    [impact],
  );
  const exact = impact !== null && confirmation === impact.confirmationPhrase;

  async function reset() {
    if (!impact || !impact.ready || !exact || busy) return;
    if (!window.confirm('This permanently removes all classified pre-launch operational and workforce data. Continue?')) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await executeLaunchBaselineReset(confirmation, impact.impactFingerprint);
      setImpact(result.verification);
      setConfirmation('');
      setMessage(`Launch baseline verified clean. Removed ${result.deletedDatabaseRows} database rows and ${result.deletedStorageObjects} Storage objects.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Launch reset failed.');
      await refresh().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  return <div className="adminWorkspace">
    <header className="pageHeader"><div><p className="eyebrow">Administration · Destructive</p><h2>Reset OS to Launch Baseline</h2><p>Return Hestiva OS to the reviewed first-day-of-business baseline after acceptance testing.</p></div></header>

    <section className="panel">
      <h3>Safety boundary</h3>
      <p>This is separate from Customer Data Cleanup. It removes classified operational/test state across the OS while preserving approved system configuration, users, migration history and protected user-access audit evidence.</p>
      <p><strong>It cannot unsend external email, WhatsApp or Messenger traffic.</strong> Ordinary LR-1 acceptance runs must therefore use controlled test recipients/provider boundaries.</p>
      <button type="button" className="secondaryButton" disabled={loading || busy} onClick={() => void refresh()}>{loading ? 'Checking…' : 'Refresh impact'}</button>
    </section>

    {error ? <p className="errorText" role="alert">{error}</p> : null}
    {message ? <p className="successText" role="status">{message}</p> : null}

    {impact ? <>
      <section className="panel">
        <h3>{impact.ready ? 'Reset is ready' : 'Reset is blocked'}</h3>
        <p><strong>{impact.totalRowsToDelete}</strong> classified database rows are currently disposable.</p>
        <p>Private Storage: {impact.storage.workOrderObjects} Work Order/evidence object(s), {impact.storage.messagingObjects} messaging object(s).</p>
        <p>Preserved baseline: {impact.preserved.users} user(s), {impact.preserved.services} service(s), {impact.preserved.cleaningJobTemplates} cleaning template(s), {impact.preserved.correspondenceTemplates} correspondence template(s), and {impact.preserved.userAccessChanges} protected access-audit event(s).</p>
        {impact.blockers.length ? <div role="alert"><strong>Resolve before reset:</strong><ul>{impact.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div> : null}
      </section>

      {tableEntries.length ? <section className="panel"><h3>Operational rows to remove</h3><div className="tableWrap"><table><thead><tr><th>Table</th><th>Rows</th></tr></thead><tbody>{tableEntries.map(([table, count]) => <tr key={table}><td><code>{table}</code></td><td>{count}</td></tr>)}</tbody></table></div></section> : null}

      <section className="panel">
        <h3>Permanent reset</h3>
        <p>Preview is concurrency-protected. If any classified data changes after this preview, execution is rejected and you must preview again.</p>
        <label htmlFor="launch-reset-confirmation">Type <code>{impact.confirmationPhrase}</code> exactly</label>
        <input id="launch-reset-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" spellCheck={false} />
        <div className="buttonRow"><button type="button" className="dangerButton" disabled={!impact.ready || !exact || busy} onClick={() => void reset()}>{busy ? 'Resetting…' : 'Reset to launch baseline'}</button></div>
      </section>
    </> : null}
  </div>;
}
