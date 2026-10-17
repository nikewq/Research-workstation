# RESEARCH — 文献日推 & Rebuttal 工作台

调研日期：2026-10-17。star 数与"最近推送"取自 GitHub API 当天数据。每条借鉴点标注来源仓库；"不采用"写明原因。

---

## 1a. arXiv 日推 / 论文摘要展示

### 候选项目一览

| 仓库 | ⭐ | 最近推送 | 维护状态 | 定位 |
|---|---|---|---|---|
| TideDra/zotero-arxiv-daily | 6061 | 2026-10-01 | 活跃 | Zotero 画像 + embedding 排序 + LLM TL;DR + 邮件 |
| dw-dengwei/daily-arXiv-ai-enhanced | 3024 | 2026-09-08 | 活跃 | Actions 爬取 + LLM 结构化摘要 + Pages 前端 |
| Vincentqyw/cv-arxiv-daily | 1506 | 2026-10-16 | 活跃 | Actions 按关键词抓取，JSON/Markdown 归档 |
| ScholarXIV/OpenScholarXIV | 1194 | 2026-08-29 | 活跃 | 移动端阅读/摘要 App（任务书中的 eyuelzero/ScholArxiv 是它的 0⭐ fork，2024-09 后无更新） |
| bojone/papers.cool | 814 | 2026-07-06 | 活跃 | 沉浸式刷论文，Kimi 解读 |
| AutoLLM/ArxivDigest | 469 | 2024-05-26 | **停更** | LLM 相关性评分 prompt 原型 |
| zezhishao/DailyArXiv | 451 | 2026-10-15 | 活跃 | 关键词 → README 列表 |
| linhkid/ArxivDigest-extra | 48 | 2025-06-19 | 低活跃 | ArxivDigest 的两阶段 LLM 版本 |
| Hugging Face Daily Papers（`/api/daily_papers`） | — | 在线服务 | — | 社区投票 + `ai_summary` / `ai_keywords` |
| alphaXiv overview 页 | — | 在线服务 | — | 长篇结构化解读 |

### 可借鉴的具体设计

**抓取与打分**

1. **画像打分带时间衰减**（TideDra/zotero-arxiv-daily，`reranker/base.py`）：画像论文按加入时间倒序，权重为 `1/(1+log10(rank+1))` 并归一化；候选论文得分 = 与每篇画像论文相似度的加权和 ×10。近期读的论文权重更高，能跟上兴趣漂移。→ 用于粗筛。
   - 注：该项目**没有** LLM 精排，LLM 只用来写 TL;DR。任务书里"embedding 粗筛 → LLM 精排"的两级结构，真正的出处是下一条。
2. **两阶段 LLM 筛选**（linhkid/ArxivDigest-extra，`relevancy_filter_prompt.txt` / `relevancy_prompt.txt`）：
   - Stage 1 只看标题+摘要打 1–10 分，并附 1–2 句 "Reasons for match"；
   - Stage 2 只对过阈值的论文做深度分析。
   - prompt 要求"保持输入顺序 + 带编号的 JSON 行 + 禁止 ```json 包裹"，便于健壮解析。→ 精排 prompt 采用这种输出约束。
3. **评分校准语**（AutoLLM/ArxivDigest，`relevancy_prompt.txt`）："score > 7 needs attention"。→ 在 prompt 里给出分数含义，减少分数漂移。
4. **结构化输出用 schema 固定字段**（dw-dengwei/daily-arXiv-ai-enhanced，`ai/structure.py`，pydantic：tldr / motivation / method / result / conclusion）。→ 我们用固定字段的 JSON schema 并在本地校验，缺字段就重试一次，仍失败则写入空字符串，并在 `score_reason` 里标注。
5. **去重**（dw-dengwei，`check_stats.py`）：与前一天数据比对，去掉 cross-list 和 replace 造成的重复；无新论文时 workflow 以约定退出码跳过后续步骤。→ 我们与全部历史 `arxiv_id` 去重（同一篇永不推第二次）；arXiv 周末不发布，当天无新论文时保留 `latest.json` 不变。
6. **数据源选 arXiv RSS**：`rss.arxiv.org/rss/<cat>` 每条带 `announce_type`（new / cross / replace），已实测可用。→ 默认只取 `new`，`cross` 可选（与 TideDra 的 `include_cross_list` 同义）。

**上手流程与 Actions 模板**

7. **fork → 填 secrets/variables → 手动 Run workflow 验证**（dw-dengwei README 第 1–10 步；TideDra 用 `workflow_dispatch` 做测试）。→ 模板 README 照这个顺序写成 5 步。
8. **secrets 与 variables 分离**（dw-dengwei：敏感信息放 `OPENAI_API_KEY` / `OPENAI_BASE_URL` secrets，`CATEGORIES` / `LANGUAGE` / `MODEL_NAME` 放 variables）。→ 与任务书的 `LLM_API_KEY` / `LLM_BASE_URL` + variables 方案一致。
9. **keep-alive**（TideDra，`keep-alive.yml`）：GitHub 会在仓库 60 天无活动后停掉定时 workflow。→ 我们每天提交 JSON 本身就算活动；仍附一个每 30 天运行的 keep-alive 兜底（`ENABLED=false` 时没有提交，就靠它保活）。
10. **归档分文件**（Vincentqyw/cv-arxiv-daily，config 注释："GitHub 超过 512 KB 不渲染 Markdown，按年归档"）。→ 每天一个 `daily/YYYY-MM-DD.json`，外加一个精简的 `index.json`（日期 / 标题 / 分数）供往期列表翻页，前端不必逐日请求。

**展示（"一眼读完"的信息层级）**

11. **一句话 + 关键词**（HF `/api/daily_papers`：`ai_summary` 一句话，`ai_keywords` 5 个左右短语）。→ 卡片顶部放一句话贡献；`why_relevant` 里高亮命中的用户关键词。
12. **问题 → 方法 → 结果 → 局限 → 相关工作 的顺序**（alphaXiv overview：Introduction → Limitations of current … → Methodology → Evidence / Results → Implications → Related Work → Similar Papers）。→ 主体五段沿用这个顺序，每段压到 ≤4 行。alphaXiv 是长文，我们只取它的层级，不取篇幅。
13. **"至少有一瞬间引起兴趣"的轻量动作**（papers.cool：点击 [PDF] / [Kimi] 自动加星标，可导出星标列表）。→ 「打开 PDF」和「加入精读」都记为本地正反馈，「不感兴趣」记为负反馈，只存本地。
14. **本地偏好、隐私优先**（dw-dengwei："Local preference storage for privacy"，关键词高亮在前端完成）。→ 设置纯前端存储，不上报。

### 不采用的设计及原因

| 设计 | 来源 | 不采用原因 |
|---|---|---|
| 邮件推送（SMTP secrets） | TideDra | 工作台内展示即可；SMTP 授权码是额外敏感信息，会增加上手步骤 |
| 本地 embedding 模型（sentence-transformers，jina） | TideDra | Actions 每次要下载模型、装 torch，耗时长；改为可选的 OpenAI 兼容 `/embeddings` 接口，没配就退回纯 Python TF-IDF（零依赖） |
| 直连 Zotero API（`ZOTERO_ID` / `ZOTERO_KEY`） | TideDra | 多两个 secret；任务书要求画像用导出文件放在 `profile/` |
| Scrapy 爬虫 | dw-dengwei | 依赖重；RSS + 标准库足够 |
| 每天推全部论文 / 推 100 篇 | dw-dengwei、TideDra、cv-arxiv-daily | 与"每天只推 1 篇"的目标相反 |
| 访问密码（`ACCESS_PASSWORD`） | dw-dengwei | 工作台只读 JSON；需要私密时用户可把仓库设为私有 + 自建代理，超出本期范围 |
| Stage 2 读全文（PDF 解析） | ArxivDigest-extra | 成本和失败率高；Top-1 的结构化摘要基于摘要 + arXiv HTML 正文前几节已足够（HTML 版拿不到时只用摘要） |
| `arxiv.paperswithcode.com` API | cv-arxiv-daily | 第三方镜像，可用性不稳定 |
| Semantic Scholar Recommendations API | 补充检索 | 实测新论文冷启动时返回 `recommendedPapers: []`，当天发布的论文覆盖不到；只作为后续可选增强 |
| 社区投票 / 评论 | HF Daily Papers、alphaXiv | 单用户场景，没有社区数据 |
| 在线 AI 对话 | papers.cool（Kimi）、OpenScholarXIV | 工作台已有 AI 阅读器，加入精读后在那里聊即可 |

---

## 1b. Rebuttal / 审稿回复管理

### 候选项目一览

| 仓库 | ⭐ | 最近推送 | 形态 |
|---|---|---|---|
| Galaxy-Dawn/claude-scholar（`skills/review-response`） | 5808 | 2026-09-23 | skill（prompt + references） |
| M1n-n9/paper-lifecycle（`rebuttal-response`） | 696 | 2026-06-16 | Codex skill + playbook |
| AutoLab-SAI-SJTU/Paper2Rebuttal | 561 | 2026-08-04 | 多 agent + Gradio（ACL 2026） |
| TobiasLee/Rebuttal-Skill | 479 | 2026-08-20 | skill，强调合规与证据 |
| MLNLP-World/Paper-Rebuttal-Tips | 358 | 2026-10-06 | 经验合集，按问题类型组织 |
| shellywhen/Journal-Response-Letter-Template-LaTeX | 361 | 2026-04-15 | 期刊回复 LaTeX 模板 |
| runtsang/RebuttalStudio | 218 | 2026-04-03 | **唯一的桌面 UI**（Electron，中英 i18n） |
| klb2/review-response-template | 146 | 2026-09-07 | LaTeX 类（`revcomment` / `revresponse`） |
| andreas-bauer/rejoinderoo | 29 | 2026-09-02 | CSV/Excel → LaTeX/Typst 回复信 |
| openreview/openreview-py | 270 | 2026-10-16 | OpenReview 官方客户端（数据结构权威来源） |

与任务书预判一致：除 RebuttalStudio 外，都是 prompt / skill / 模板，没有"表格化追踪"的 UI。这正是本模块的空位。

### 审稿意见分类法：对照与合并

| 我们的 `category` | claude-scholar（4 类） | paper-lifecycle（5 类 triage） | Rebuttal-Skill | MLNLP Tips（3 大类） |
|---|---|---|---|---|
| `experiment` | Major | Decision blockers（缺 baseline、协议不公平） | 实验计划 P0–P3 | 实验与评测证据类 |
| `clarification` | Minor | Fixable issues | — | 写作澄清 |
| `writing` | Typos/Formatting | Low-value comments | — | 写作澄清 |
| `related_work` | — | Novelty and relation to prior work | novelty defense 模板 | 创新性、动机、理论与边界类 |
| `misunderstanding` | Misunderstandings | Misunderstandings | correcting misunderstandings 模板 | 沟通策略 |
| `decline` | （Defend 策略） | Scope mismatches | limitation / scope 模板 | 边界类 |

- 严重度沿用二值 `major` / `minor`（claude-scholar 的 Major/Minor）。Rebuttal-Skill 的 FATAL→MINOR 四级更细，但用户手工标注时二值最快，四级不采用。
- **优先级规则**（paper-lifecycle playbook §3）：多审稿人共同关心的问题 > 最低分审稿人的核心阻碍 > 正面审稿人的疑虑 > AC 关注点 > 格式小问题。→ 表格默认排序：`major` 优先，`cross_refs` 数量多的优先，再按审稿人分数从低到高。

### 回复结构

- 逐条三段式 **Comment / Response / Changes**（claude-scholar `rebuttal-templates.md`）与 **Direct Answer → Evidence → Revision**（Rebuttal-Skill）本质相同。→ 导出骨架固定为「Comment（复述/引用原文）→ Response（回应 + 证据）→ Changes（修改位置）」，`manuscript_change_location` 填进 Changes。
- 编号格式 `Rev1.1` / `R1.2`（rejoinderoo 的 ID 列；RebuttalStudio 的 `{{issueTypeLabel}}-{{issueIndex}}`）。→ 导出编号为 `R{审稿人}.{序号}`。
- 期刊信结构：给 Editor 的总体回复 → `\reviewer` 分节 → `revcomment` / `revresponse` 成对出现（klb2）。→ LaTeX 导出采用同样的成对结构，但输出**自包含**的 `article` 文档（只用 `\section*` + `quote` 环境），不依赖任何 `.cls` 文件。
- AC 摘要（paper-lifecycle §4 "AC-Facing Executive Summary"；RebuttalStudio Stage 5 Key Concerns 表）。→ 导出文件开头可选生成"共性问题汇总"：列出被 `cross_refs` 关联的问题组。

### UI / 流程借鉴（RebuttalStudio）

- 原子化拆分：每条 weakness / question 单独成为一项，并保留原文引用 → 对应我们的 `quote` 字段。
- **按 venue 抽取分数字段**：ICLR = Rating / Confidence / Soundness / Presentation / Contribution，NeurIPS = Rating / Confidence / Quality / Clarity / Significance / Originality，ARR = Confidence / Soundness / Excitement …。→ `reviewers[].score` 和 `confidence` 两个必填，其余分数放进 `reviewers[].extra` 自由键值（不改 schema 主体）。
- summary / strengths 原样保留，供上下文参考 → `reviewers[].summary`、`reviewers[].strengths`（可选）。
- 多轮讨论（Stage 4）作为追加轮次 → 对应 `round` 递增，旧轮只读。

### 合规约束（影响 AI 辅助设计）

- TobiasLee/Rebuttal-Skill 明确提醒：ACL 系列会议（含 ARR）要求披露 rebuttal 中使用生成式 AI 的情况；工具只产出"供作者审阅的材料"，不产出可直接提交的 rebuttal；**禁止编造数值、禁止把计划中的工作说成已完成**。→ 这与任务书的"只给意图解读 + 回复结构建议，不生成最终文字"完全一致。AI 面板顶部常驻一条 venue 政策提醒，prompt 中明令禁止编造数字。

### OpenReview 数据结构（导入兼容）

来源：openreview-py `openreview/api/client.py`（`class Note`）、`openreview/stages/default_content.py`。

- Note 字段：`id, forum, replyto, invitations[], signatures[], readers, writers, content, cdate, mdate, number …`
- 线程：同一篇论文的所有 note 共享 `forum`（= 投稿 note 的 id）；`replyto` 指向父 note。review 的 `replyto` 是投稿本身，rebuttal / comment 的 `replyto` 是被回复的 review 或 comment，由此构成树。
- 类型：看 `invitations[0]` 的 `/-/` 之后的后缀，如 `Official_Review`、`Rebuttal`、`Official_Comment`、`Meta_Review`、`Decision`。
- 审稿人：`signatures[0]` 末段是匿名 id，例如 `.../Submission123/Reviewer_abcd`。
- 内容：API v2 的每个字段包了一层 `{"value": …}`（v1 是裸值）。默认 review 字段为 `title / review / rating / confidence`；各会议会自定义，例如 `summary / strengths / weaknesses / questions / soundness …`。`rating` 常见形如 `"6: marginally above"` 的字符串，需取前导数字。
- 获取方式：2026-10 实测匿名访问 `api2.openreview.net` 返回 `ChallengeRequiredError 403`（需要人机验证）。所以导入只接受用户自己导出的 JSON：登录后用 openreview-py 的 `client.get_all_notes(forum=…)` 导出，或在浏览器中下载 API 返回结果。两种格式都兼容：`{"notes":[…]}` 与 `[…]`，v1 / v2 的 `content` 写法也都兼容。

→ 映射规则：`Official_Review` → `reviewers[]`（匿名 id 依次映射为 R1…Rn，原 id 存为 `source_id`）+ 按 weaknesses / questions 字段切条成 `comments[]`；`Official_Comment` 中由审稿人签名的 → 追加为该审稿人的 comment；作者的 `Rebuttal` / `Official_Comment` → 按 `replyto` 填入对应审稿人第一条 comment 的 `response_draft`（仅在该字段为空时填入，不覆盖用户内容）。

### 不采用的设计及原因

| 设计 | 来源 | 不采用原因 |
|---|---|---|
| LLM 自动拆分审稿意见（Breakdown） | RebuttalStudio、Paper2Rebuttal | 默认路径不应依赖 API key；规则拆分（空行 / 编号 / W1 Q1）+ 手动合并拆分已够用。AI 只在可选面板中用 |
| 自动检索文献、生成完整 rebuttal | Paper2Rebuttal | 违背"不生成最终文字"；需要 GPU、单次运行 15–60 分钟 |
| 四级严重度、P0–P3 实验计划 | Rebuttal-Skill | 手工标注负担大；二值 severity + 关联实验状态已能表达 |
| 先判断"值不值得 rebuttal"（Stage 0） | Rebuttal-Skill | 属于决策建议，不是追踪工具的职责 |
| 依赖 `reviewresponse.cls` | klb2 | 导出必须开箱即可编译；需要该样式的用户可以手动替换 |
| Electron 桌面应用 | RebuttalStudio | 本项目是纯浏览器单页，无需安装 |
| 回复中写"见上文 / 见 R1" | 常见做法 | 任务书要求每处完整重复（审稿人往往只读写给自己的部分） |

---

## 1c. 审稿意见 PDF 识别（Rebuttal 工作台 · 📄 PDF）

调研日期：2026-10-17。结论：GitHub 上**没有**现成的"审稿意见 PDF → 结构化条目"工具（RebuttalStudio 只支持粘贴；Paper2Rebuttal 解析的是论文本身而不是审稿意见）。可借鉴的是审稿语篇的**标注体系**和**浏览器端的 PDF / OCR 库**。

| 仓库 | ⭐ | 最近推送 | 借鉴 | 不采用 |
|---|---|---|---|---|
| nnkennard/DISAPERE（EMNLP 2022） | 1 | 2022-07 | 每个审稿句子都标了 `review_action`：`arg_request`（细分为 edit / explanation / experiment / typo …）、`arg_evaluative`、`arg_structuring`（summary / heading）、`arg_fact`、`arg_social`，以及 `polarity`（正面 / 负面）。我们由此确定**成条规则**：只有"请求"和"负面评价"的句子才成为一条意见；总结、标题、夸奖、客套归入"已忽略"，用户可一键恢复。数据文件里的 `rebuttal_stance`（concur / dispute）和"作者回复对齐到哪条意见"也印证了作者回复挂到对应意见下的做法 | 分类模型需要训练，无法在浏览器里运行 → 改用关键词规则 |
| neulab/ReviewAdvisor（ASAP-Review） | 204 | 2023-06 | 8 个审稿方面：summary / motivation / originality / soundness / substance / replicability / meaningful-comparison / clarity → 映射到我们的 6 个类别：substance、meaningful-comparison → experiment，originality → related_work，clarity → writing / clarification，soundness、replicability → clarification。预览里显示方面标签，方便用户核对 | 方面标注模型 |
| UKPLab/nlpeer | 35 | 2025-02 | 把 ARR、OpenReview、F1000、PLOS、eLife 的审稿统一成一种格式 → 说明不同平台的字段差异很大，所以**按平台分别写识别模板**：OpenReview / ARR / 期刊决定信，识别不了时用通用规则 | Python 数据加载代码 |
| LiyingCheng95/ArgumentPairExtraction | 24 | 2022-11 | 审稿意见与作者回复的配对数据 → 识别"Official Comment by Authors"，把它填入对应审稿人第一条意见的回复草稿（只在草稿为空时填） | BiLSTM-CRF 模型 |
| mozilla/pdf.js | 54k | 活跃 | 能拿到每段文字的坐标和字号 → 按坐标还原行、按行距还原段落；站点已经在用 3.11 版，浏览器缓存可以复用 | — |
| unjs/unpdf | 1.2k | 活跃 | 提取接口更简洁 | 打包的 PDF.js v6 需要 Safari 18.4 以上，兼容性不如站点现在用的 3.11 版 |
| naptha/tesseract.js | 38k | 活跃 | 在浏览器里做 OCR，处理扫描版 PDF；英文模型约 3 MB，中文约 1.7 MB（压缩版） | 默认不加载，检测到扫描版后由用户手动开启 |
| grobidOrg/grobid、datalab-to/marker、docling-project/docling | 5k–69k | 活跃 | 版面分析的效果标杆 | 都需要服务器或 Python 环境，和本项目"纯浏览器、不需要服务器"的定位冲突 |

清理规则（参考常见的打印版 PDF）：
- 页眉页脚：出现在每页前后两行、且在 ≥50% 页面上重复的行（数字归一化后比较），视为页眉页脚并删除；
- 页码：`Page n of m`、`n/m`、`- n -`、`第 n 页`；
- 跨行断词：行尾是"字母-"、下一行以小写字母开头时，直接拼接；
- OpenReview 打印页里的多余内容：Add / Reply / Readers / 修改时间戳等；
- 期刊信的套话：Dear / Yours sincerely / Ms. No. 等。

AI 校正：只把**带编号的句子**发给用户自己配置的模型，模型只返回"哪些编号属于同一条意见 + 类别 + 严重度"，然后**用原句重新拼出引用原文**。模型编造的编号会被丢弃，原文不会被改写。
