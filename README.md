# Profile CV

**一份职业档案，多份岗位简历。**

Profile CV 是一个以浏览器本地存储为基础的开源简历工作台。先把工作、项目、科研与教育经历整理成素材库，再按岗位制作独立的简历版本，调整文案与排版，导出 PDF。

无需注册，也不需要部署业务后端。基础编辑、排版与导出不依赖 AI；需要润色、翻译或辅助解析时，可以自行配置兼容的模型接口。

[在线体验](https://profilecv.pages.dev) · [快速开始](#快速开始) · [数据与隐私](#数据与隐私) · [MIT License](LICENSE)

## 功能

| 模块 | 能做什么 |
| --- | --- |
| 职业档案 | 记录基本信息、工作经历、独立项目、科研、论文、教育、技能和自定义分类；按 STAR 整理项目成果 |
| 投递版本 | 从素材库选取内容，为不同岗位保留独立文案、简介、JD 和版式；比较版本差异 |
| 岗位匹配 | 基于 JD 关键词推荐素材、检查覆盖情况；结果是字面匹配参考，不是招聘系统评分 |
| 简历导入 | 导入文字版 PDF、DOCX、TXT、Markdown 或粘贴文本，核对解析结果后再写入；支持 JSON 备份恢复 |
| 排版与导出 | 四套模板、主题色、密度调整、A4 预览与智能一页；导出可选中文字的打印版 PDF 或图片版 PDF |
| 可选 AI | 文案改写、STAR 合成、简介建议、英文翻译和简历解析；改写建议可核对后采用 |
| 科研材料 | 记录论文元数据，通过标题或 DOI 查询 Crossref，辅助组织科研经历 |
| 本地数据保护 | 自动保存、恢复快照、导入撤销、JSON 备份和同一站点多标签页编辑保护 |

## 使用流程

1. 打开首页，进入档案库，手动录入经历或导入已有简历。
2. 核对内容，建立职业档案；也可以载入示例了解操作。
3. 新建投递版本，填写目标岗位和 JD，选择相关经历并调整表达。
4. 选择模板、主题与密度，预览分页；需要时使用 AI 润色或翻译。
5. 导出 PDF，并定期通过「更多」导出 JSON 备份。

## 快速开始

需要 **Node.js 22.13 或更高版本**（建议 Node.js 24）和 **pnpm 11.25.0**。

```bash
git clone https://github.com/JunFu1995/profilecv.git
cd profilecv
pnpm install --frozen-lockfile
pnpm dev
```

打开终端显示的本地地址，默认是 `http://127.0.0.1:5273`。项目不要求 `.env` 文件，也不需要在源码中填写 API key。

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动开发服务器 |
| `pnpm test` | 运行 Node.js 自动化测试 |
| `pnpm build` | TypeScript 类型检查并构建到 `dist/` |
| `pnpm preview` | 本地预览生产构建 |

不要直接通过 `file://` 打开 `dist/index.html`，请使用开发服务器、预览服务器或静态托管。

## 配置 AI

在工作台的「AI 设置」中选择供应商，填写接口地址、模型 ID 和自己的 API key。支持兼容 Chat Completions 的接口，也可配置允许浏览器访问的本地模型。

- 接口地址应是 API 基础地址；程序会追加 `/chat/completions`。
- 供应商预设用于帮助填写，具体模型名称和可用性以你的账号为准，可以手动修改。
- 「测试连接」只发送固定短消息，不发送简历，但可能产生接口费用。
- 模型接口必须允许当前网页的跨域请求（CORS）；若接口不支持，浏览器无法直接调用。
- 选择「记住配置」会将 key 保存到当前站点的浏览器存储；选择「仅本次使用」则只保存在页面内存，刷新后清除。
- 不要把个人 key 写入源码、`VITE_*` 变量或公开托管的文件。前端构建中的变量可以被访问者读取。

## 数据与隐私

**本地保存不等于所有功能都不联网。** 项目没有自建的简历存储后端，具体数据流如下：

| 操作 | 数据去向 |
| --- | --- |
| 编辑、保存职业档案与投递版本 | 当前浏览器、当前站点的 `localStorage` |
| 读取 PDF / DOCX 文本、规则解析、PDF 导出 | 在浏览器内处理 |
| AI 润色、翻译、AI 解析 | 所需文本和认证 key 由浏览器直接发送到你配置的模型接口 |
| 查询论文元数据 | 标题或 DOI 发送到 Crossref |
| 打开在线站点 | 浏览器向静态托管服务请求网页资源，托管方可能记录常规访问日志 |
| JSON 备份 | 下载档案与版本数据到本机；AI 设置单独存储，不包含在应用的档案备份中 |

浏览器存储没有由本应用加密，同源脚本和有权限的浏览器扩展可能访问它。请使用可信的设备、站点与模型接口。清除网站数据、使用隐私浏览模式或更换浏览器/域名，都可能导致原档案不可用；换设备请手动导出、导入 JSON 备份。

## 部署

这是一个静态前端项目，构建后将 `dist/` 托管到支持单页应用的静态服务器即可。生产环境请使用 HTTPS；多标签页编辑保护依赖安全上下文中的 Web Locks。

### Cloudflare Pages

连接本仓库时使用以下构建配置：

- 构建命令：`pnpm install --frozen-lockfile && pnpm build`
- 输出目录：`dist`
- Node.js：24 或符合要求的版本
- 不需要配置用户的模型 API key，也不需要 Cloudflare Functions

仓库的 `wrangler.jsonc` 指定输出目录为 `dist`。若使用 Wrangler 手动发布，请先登录自己的 Cloudflare 账号，并把项目名改为自己的 Pages 项目：

```bash
pnpm build
pnpm dlx wrangler pages deploy dist --project-name YOUR_PROJECT_NAME
```

其他静态服务器需要把 `/archive`、`/editor` 等前端路由回退到 `index.html`，否则直接访问或刷新这些路径可能返回 404。

## 开发与验证

技术栈：React 19、TypeScript、Vite；PDF 文本提取使用 pdf.js，DOCX 提取使用 Mammoth，图片版 PDF 使用 html-to-image 与 jsPDF。

```text
src/
  components/       档案、简历编辑、预览及对话框
  import/           文件文本提取、解析与导入
  assets/           插画与字体
  ai.ts             AI 配置和接口请求
  storage.ts        本地存档、恢复与备份
  types.ts          数据结构
  Landing.tsx       首页
  WorkspaceGate.tsx 工作区入口与多标签页保护
public/             静态资源、示例和字体许可
tests/              单元测试、虚构导入样例及浏览器回归脚本
```

提交修改前运行：

```bash
pnpm test
pnpm build
```

自动化单元测试使用模拟存储和模型接口，不要求真实 API key。`tests/browser/` 还提供浏览器回归脚本，需要自行准备 Playwright 与 Chrome，并先启动本地服务。例如：

```bash
PLAYWRIGHT_MODULE_PATH=/absolute/path/to/playwright/index.mjs node --import ./tests/register.mjs tests/browser/responsive-workspace.mjs
```

可用 `TEST_BASE_URL` 指定测试地址。浏览器测试不是 `pnpm test` 的一部分。

## 已知边界

- 不提供账号系统或云端同步，数据需要自行备份。
- 扫描版 PDF 暂不支持 OCR；复杂布局的文本提取、规则解析或 AI 解析都需要人工核对。
- 智能一页有最小字号和压缩限制，不保证任意长度内容都能装进一页。
- 图片版 PDF 的文字不可选择；需要文本检索或复制时，请使用文字版 PDF。
- AI 可能改错事实、数字或术语；模型建议不应代替本人核实。
- 多标签页编辑保护需要浏览器支持 Web Locks；不支持时工作区会限制编辑。

## 贡献与许可

欢迎通过 Issue 反馈可复现的问题，或提交 Pull Request。请描述修改目的、复现步骤和验证结果；涉及简历时使用虚构示例，避免上传个人档案、API key、浏览器存储或真实部署日志。

项目源码采用 [MIT License](LICENSE)。字体与依赖保留各自的许可，见 [第三方说明](THIRD_PARTY_NOTICES.md)。测试导入样例中的人物与经历为虚构内容。
