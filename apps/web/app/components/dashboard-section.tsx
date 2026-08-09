'use client';

import { useId, useState, type ReactNode } from 'react';

export function DashboardSection({ title, summary, defaultExpanded = false, children }: {
  title: string;
  summary: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contentId = useId();

  return (
    <section className={`dashboardSection ${expanded ? 'expanded' : 'collapsed'}`}>
      <button
        className="dashboardSectionToggle"
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((value) => !value)}
      >
        <span><strong>{title}</strong><small>{summary}</small></span>
        <span className="dashboardChevron" aria-hidden="true">⌄</span>
      </button>
      <div id={contentId} className="dashboardSectionContent" hidden={!expanded}>{children}</div>
    </section>
  );
}
