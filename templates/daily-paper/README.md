# Daily Paper — 每天 1 篇最相关的 arXiv 新论文

GitHub Actions 每天从你关注的 arXiv 分类里挑出 **1 篇** 最新且最相关的论文，用 LLM 写成结构化摘要，发布为 `latest.json`。科研工作台「📖 文献 & 投稿 → 📬 日推」读取并展示这份 JSON。

- 不需要服务器：Actions 负责运行，GitHub Pages 负责托管 JSON。
- 只用 Python 标准库，没有第三方依赖，每次运行约 1–3 分钟。
- 每天的结果永久保存在 `docs/daily/YYYY-MM-DD.json`。

## 5 步跑通

1. **Fork 本仓库**，或点 **Use this template**。
   如果 `profile/` 里会放你的 Zotero 导出文件，又不想公开，请把仓库设为 Private。
2. **填 Secrets**：Settings → Secrets and variables → Actions → **Secrets** → New repository secret

   | Secret | 示例 | 说明 |
   |---|---|---|
   | `LLM_API_KEY` | `sk-...` | 任意 OpenAI 兼容接口的 key |
   | `LLM_BASE_URL` | `https://api.openai.com/v1` | 接口地址，只写到 `/v1` 为止 |

3. **填 Variables**：同一页面切到 **Variables** 标签

   | Variable | 示例 | 说明 |
   |---|---|---|
   | `ENABLED` | `true` | 设为 `false` 时，workflow 第一步直接退出，不消耗额度 |
   | `KEYWORDS` | `your-keyword:2, another topic` | 逗号分隔，`:数字` 表示权重（默认 1） |
   | `CATEGORIES` | `cs.LG, cs.CV, stat.ML` | arXiv 分类代码 |
   | `EXCLUDE_KEYWORDS` | `excluded-topic` | 标题或摘要里出现这些词的论文直接排除 |
   | `MODEL_NAME` | `gpt-4o-mini` | 你所用接口支持的模型名 |
   | `LANGUAGE` | `Chinese` 或 `English` | 摘要用什么语言写 |
   | `RUN_HOUR_UTC` | `23` | 每天几点运行（UTC 时间，0–23），见下方换算表 |
   | `EMBEDDING_MODEL` | `text-embedding-3-small` | 可选：配了 Zotero 画像时用它算相似度；不填就用内置的 TF-IDF |
   | `TOP_N` | `20` | 可选：交给 LLM 精排的候选篇数 |
   | `INCLUDE_CROSS_LIST` | `false` | 可选：是否包含其他分类交叉投递（cross-list）过来的论文 |

4. **开启 Pages**：Settings → Pages → Build and deployment → Source 选 **Deploy from a branch**，Branch 选 **main**，目录选 **/docs** → Save。
5. **手动运行一次验证**：Actions → **daily-paper** → **Run workflow**（`force` 保持勾选）。运行成功后，访问
   `https://<你的用户名>.github.io/<仓库名>/latest.json` 应该能看到论文 JSON。把这个地址填进工作台「个人设置 → 文献日推 → 推荐源 URL」即可。

> 第一次在 fork 出来的仓库里打开 Actions 页面时，GitHub 会先让你点一次 **I understand my workflows, go ahead and enable them**。

## 运行时间（cron 用的是 UTC）

workflow 每小时触发一次，由第一步的门控判断要不要真正执行：只有当前 UTC 小时 ≥ `RUN_HOUR_UTC`，并且今天（按 UTC 日期）还没跑过，才会执行，所以每天只跑一次。GitHub 的定时任务经常延迟几十分钟，门控用"≥"判断，延迟了也不会漏跑。

**建议把运行时间设在你推送时段开始前至少 1 小时**，保证时段一到 JSON 已经生成好。

`RUN_HOUR_UTC = (推送开始的本地小时 − 1 − UTC 偏移) mod 24`

| 时区 | UTC 偏移 | 推送时段从 08:00 开始 → `RUN_HOUR_UTC` |
|---|---|---|
| 北京 / 新加坡 (CST/SGT) | +8 | `23` |
| 东京 / 首尔 (JST/KST) | +9 | `22` |
| 印度 (IST) | +5:30 | `1`（取整到早一点的整点） |
| 柏林 / 巴黎 (CET，夏令时 CEST) | +1 / +2 | `6` / `5` |
| 伦敦 (GMT，夏令时 BST) | 0 / +1 | `7` / `6` |
| 纽约 (EST，夏令时 EDT) | −5 / −4 | `12` / `11` |
| 洛杉矶 (PST，夏令时 PDT) | −8 / −7 | `15` / `14` |
| 悉尼 (AEST，夏令时 AEDT) | +10 / +11 | `21` / `20` |

arXiv 每周日到周四的美东时间 20:00（约 00:00–01:00 UTC）发布新论文，周五、周六晚不发布（周末 RSS 为空）。RSS 为空时会自动改用 OpenAlex，按 `KEYWORDS` 检索最近 3 天新提交的 arXiv 论文，所以周末和节假日照样有推荐；兜底源也不可用时，`latest.json` 保持不变，`status.json` 写为 `no_new_papers`，不会让运行失败。

## 它是怎么挑论文的

1. 按 `CATEGORIES` 拉取 arXiv RSS 中当天新发的论文；用 `EXCLUDE_KEYWORDS` 排除；和历史推送过的论文去重（同一篇永远不会推第二次）。
2. **粗筛**：关键词加权打分（出现在标题里算 2 倍）。`profile/` 里有 Zotero 导出文件时，再加上与画像论文的相似度；画像论文按加入时间加权，越新权重越高。
3. **精排**：取粗筛前 `TOP_N` 篇，让 LLM 只看标题和摘要打 1–10 分并写一句理由，取第 1 名。LLM 调用失败时，自动退回粗筛排名，不会让整次运行失败。
4. **结构化摘要**：读 arXiv HTML 正文的开头部分（没有 HTML 版时只用摘要），生成固定字段的 JSON。提示词要求只能使用原文里出现过的数字。

## 输出格式

`docs/latest.json` 和 `docs/daily/YYYY-MM-DD.json`：

```json
{
  "title": "Paper A", "authors": ["Author One"], "arxiv_id": "2601.00001",
  "pdf_url": "https://arxiv.org/pdf/2601.00001", "date": "2026-01-05", "categories": ["cs.LG"],
  "one_line_contribution": "…", "problem": "…", "method": "…",
  "key_results": "… 70.1% → 75.3% …", "why_relevant": "…", "limitations": "…",
  "related_anchor": "…", "reading_time_min": 25, "score": 9.0, "score_reason": "…"
}
```

另有 `docs/index.json`（往期列表：日期、标题、arXiv id、分数，最新在前）和 `docs/status.json`（最近一次运行的状态）。

## 本地测试（不联网、不调用 LLM）

```bash
python -m unittest discover -s tests -v
```

## 费用

- 公开仓库：Actions 免费。
- 私有仓库：按小时触发、被门控跳过的运行，每次也会按 1 分钟计费，一个月约 720 分钟（免费额度每月 2000 分钟）。
- LLM：每天 2 次调用（1 次精排 + 1 次摘要），使用 mini 级别的模型时，每天成本不到 1 美分。

## 借鉴

设计参考了 TideDra/zotero-arxiv-daily（画像相似度的时间衰减加权、keep-alive）、dw-dengwei/daily-arXiv-ai-enhanced（fork 后填 secrets 的上手流程、结构化摘要字段）、linhkid/ArxivDigest-extra（两阶段 LLM 打分的提示词格式）。
