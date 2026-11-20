import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import Landing from './Landing';
import './styles.css';
import './brandTheme.css';
import './landing.css';
import './landingDemos.css';

const WorkspaceGate = lazy(() => import('./WorkspaceGate'));
const isWorkspace = /^\/(app|editor|archive|resumes)\/?$/.test(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isWorkspace ? <Suspense fallback={<div className="app-loading">正在打开简历工作台…</div>}><WorkspaceGate /></Suspense> : <Landing />}
  </StrictMode>,
);
