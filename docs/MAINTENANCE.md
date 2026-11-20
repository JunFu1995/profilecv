# 项目清理与后续重构

## 已完成的清理

2026-11-20 按 `src/main.tsx`、`index.html` 的实际入口追踪静态与动态导入、CSS 资源和 `new URL()` 资源引用，并回查测试引用。

- 删除 8 个不再被界面引用的旧组件：`CheckDrawer`、`CreateVariantDialog`、`EditorSectionNav`、`ExportDialog`、`FloatingArchiveTools`、`JobLibrary`、`ResearchComposeDialog`、`TemplatePicker`。
- 删除仅服务于旧图片导出流程的 `exportPdf.ts`，以及没有其他调用者的 `html-to-image`、`jspdf` 直接依赖；当前导出入口继续使用浏览器打印。
- 删除 4 张未使用的早期插画与未使用的 Caveat TTF；保留实际使用的 WOFF2 和字体许可证。
- 修正 README 中已不符合当前界面的图片版 PDF、手动密度调整说明，并同步修正首页 PDF 问答；加入真实界面截图和可重复执行的截图脚本。

这次清理不改变存档格式、AI 请求、简历排版或当前页面的交互流程。入口之外的 `creationDraft.ts`、`lint.ts` 仍有领域测试覆盖，暂时保留；以后应先决定对应功能是否恢复，再决定移除或接回界面。

## 已完成的状态与表单拆分

2026-11-20 在不迁移存档、不改变页面结构的前提下完成第一轮拆分：

| 模块 | 职责 |
| --- | --- |
| `src/workspace/useWorkspaceDocument.ts` | 编辑会话初始化、400ms 自动保存、交接前保存、恢复快照、示例状态、导入和撤销 |
| `src/workspace/useWorkspaceRoute.ts` | 档案/简历路由、当前版本、浏览器返回、页面标题和导航偏好 |
| `src/components/editor/*Section.tsx` | 基本信息、工作、独立项目、科研、论文、教育、技能七个章节的表单 |
| `src/components/editor/WorkCard.tsx` / `ProjectCard.tsx` | 保留原有展开、STAR、总结编辑与定位行为的经历卡片 |
| `src/components/editor/useEditorActions.ts` | 各章节共用的素材修改、删除和排序操作 |

`Editor.tsx` 保留档案导航、回收站与上下文组合，`App.tsx` 保留跨模块协调和 UI。原有的 `Editor`、`MaterialImportContext`、`MaterialRewriteContext` 导出继续可用；字段定位 ID、存储键、`Doc` 数据格式、版本隔离和错误提示保持原样。论文导入弹窗仍在原有 DOM 位置。

新增 `tests/browser/workspace-lifecycle.mjs`，用同一组虚构数据验证重构前后七章编辑、版本隔离、刷新/返回、导入确认与撤销、清空后的路由回退及快照恢复。现有英文元数据测试显式设置测试日期，避免依赖示例简历中的年份。

## 后续重构建议

项目值得继续做小步重构，重点是职责与可验证性。

1. **继续拆分工作区协调逻辑。** 路由和存档生命周期已独立，`App.tsx` 还包含翻译、预览改写、打印和多个弹窗。下一步可分别抽出翻译与预览操作，继续验证取消请求、版本切换和保存边界。
2. **细化经历卡片。** 七个章节表单已拆分。后续可按需要整理 `WorkCard` 和 `ProjectCard` 内的 STAR、总结与 AI 操作，避免让同一字段在多个位置维护状态；保留定位与键盘行为。
3. **整理样式覆盖。** `styles.css` 超过 4,000 行，`workspaceTheme.css` 超过 1,000 行。先明确组件与样式归属，再逐段移除被覆盖的规则。不要只凭类名搜索删除 CSS；动态状态、打印及移动端需要截图回归。
4. **拆分 AI 接口与任务。** `ai.ts` 集中承载配置、请求以及不同生成任务。将供应商适配、通用请求和任务提示分别组织，同时保留模型参数、错误处理与数字事实校验的测试。

## 验证要求

每个小步骤先运行 `pnpm test`、`pnpm build`。修改布局、打印或页面行为时，再运行 `tests/browser/` 中相关的回归脚本。截图始终使用虚构示例，不提交真实档案、API key 或浏览器存储导出。

本轮回归包括 `workspace-lifecycle`、`multi-tab`、`variant-basics`、`responsive-workspace`、`responsive-print`、`english-metadata`、`english-research-sync`。启动本地服务并配置 Playwright 后可分别执行，例如：

```bash
PLAYWRIGHT_MODULE_PATH=/absolute/path/to/playwright/index.mjs node --import ./tests/register.mjs tests/browser/workspace-lifecycle.mjs
```
