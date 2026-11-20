import type { ArchiveCardSummaryData } from '../archiveCardSummary';

export function ArchiveCardSummary({ summary }: { summary?: ArchiveCardSummaryData }) {
  if (!summary || !Object.values(summary).some(Boolean)) return null;
  return <span className="archive-card-summary">
    {(summary.badge || summary.meta) && <span className="archive-card-meta">
      {summary.badge && <span className="archive-card-badge">{summary.badge}</span>}
      {summary.meta && <span>{summary.meta}</span>}
    </span>}
    {summary.detail && <span className="archive-card-detail">{summary.detail}</span>}
    {summary.extra && <span className="archive-card-extra">{summary.extra}</span>}
  </span>;
}
