/** One writer for every local document, draft and recovery record on this origin. */
const WORKSPACE_LOCK = 'resume-tool:workspace-editor';
export const FLUSH_WORKSPACE_EVENT = 'resume-tool:flush-workspace';

export interface WorkspaceLease {
  release(): Promise<void>;
}

/** Never steal or expire a background tab's lock. The browser arbitrates atomically. */
export function acquireWorkspaceLock(manager: Pick<LockManager, 'request'> | undefined): Promise<WorkspaceLease | null> {
  return new Promise((resolve, reject) => {
    if (!manager) {
      reject(new Error('当前环境不支持安全的多标签页编辑。'));
      return;
    }
    const finished = manager.request(WORKSPACE_LOCK, { mode: 'exclusive', ifAvailable: true }, lock => {
      if (!lock) {
        resolve(null);
        return;
      }
      return new Promise<void>(unlock => {
        resolve({ release: async () => { unlock(); await finished; } });
      });
    });
    finished.catch(reject);
  });
}
