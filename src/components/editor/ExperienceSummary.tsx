import { type ArchiveCardSummaryData } from '../../archiveCardSummary';
import { ArchiveCardSummary } from '../ArchiveCardSummary';

export function ExperienceSummary({ title, role, period, showRole = true, summary }: { title: string; role: string; period: string; showRole?: boolean; summary?: ArchiveCardSummaryData }) {
  return <span className={`experience-summary${showRole ? '' : ' experience-summary-brief'}`}><span className="experience-name">{title}</span>{showRole && <span className="experience-role">{role || '待填写'}</span>}<ArchiveCardSummary summary={summary}/><span className="experience-period">{period || '时间待填写'}</span></span>;
}
