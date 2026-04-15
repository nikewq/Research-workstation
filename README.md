# 🎓 PhD Workstation

**[English](#english) | [中文](#中文)**

---

<a name="中文"></a>

> 专为博士生打造的个人科研自律工作台 —— 单文件，无需安装，开箱即用。

![License](https://img.shields.io/badge/license-MIT-blue) ![No Dependencies](https://img.shields.io/badge/dependencies-none-green) ![Single File](https://img.shields.io/badge/deploy-single%20HTML-purple) ![WeChat](https://img.shields.io/badge/微信-可用-07C160)

## ✨ 功能一览

| 模块 | 功能 |
|------|------|
| **今日概览** | 签到/签出、工时统计、博士第N天计数器 |
| **任务管理** | 增删改查，自定义项目标签，优先级，截止日期 |
| **专注计时** | 番茄工作法，绑定任务，历史记录 |
| **习惯打卡** | 自定义习惯，连续天数，本周热力图 |
| **投稿管理** | 论文投稿状态全程追踪（审核/修改/录用/拒稿） |
| **工具面板** | 自定义命令/链接快捷面板，点击即复制 |
| **反思日记** | 每日心情、亮点、卡点、明日计划 |
| **统计图表** | 近7天任务/番茄钟/工时趋势，项目分布 |
| **数据管理** | 全量导出/导入 JSON，数据完全本地存储 |

## 🚀 快速开始

**方式一：直接下载使用**
1. 下载 [`index.html`](./index.html)
2. 用浏览器打开
3. 完成 5 步个性化设置向导
4. 开始使用！

**方式二：在线访问（GitHub Pages）**
```
https://nikewq.github.io/Research-workstation
```

**方式三：Fork 后自行部署**
```bash
git clone https://github.com/nikewq/Research-workstation
# 直接打开 index.html，或部署到 GitHub Pages / Vercel
```

## 📱 微信使用指南

无需任何开发，直接在微信中使用网页版：

1. 将在线链接发送给自己或收藏：
   ```
   https://nikewq.github.io/Research-workstation
   ```
2. 在微信中点击链接，点击右上角菜单 → **在浏览器中打开**（Safari/Chrome）
3. 点击浏览器分享按钮 → **添加到主屏幕**

> ✅ 添加到主屏幕后，图标会出现在手机桌面，体验接近原生 App。
> ⚠️ 数据存储在手机浏览器本地，记得定期导出 JSON 备份。

---

## 🔧 个性化设置

首次打开时，设置向导会引导你配置：
1. **基本信息** — 姓名、学校、研究领域、博士入学日期
2. **研究方向** — 自定义标签（如：机器学习、NLP、生物信息学）
3. **项目管理** — 添加你的科研项目（最多6个，可自定颜色）
4. **每日习惯** — 选择或自定义要追踪的习惯
5. **工具面板** — 添加你常用的命令行工具/快捷链接

随时可在「⚙️ 个人设置」页面修改。

## 💾 数据说明

- 所有数据存储在**浏览器本地 localStorage**，不上传任何服务器
- 支持随时**导出 JSON** 备份
- 支持**导入 JSON** 恢复数据（换电脑/手机时使用）
- 清除浏览器数据会丢失数据，请定期导出备份

## 🛠️ 技术栈

- 纯 HTML + CSS + Vanilla JS（无任何框架依赖）
- Chart.js（从 CDN 加载，用于统计图表）
- 离线可用（图表需联网加载 Chart.js）

## 📦 文件结构

```
Research-workstation/
├── index.html              # 全部代码，单文件
├── README.md
├── LICENSE
└── examples/
    └── config-sample.json  # 数据结构示例
```

## 🤝 贡献

欢迎 PR 和 Issue！

- [ ] 移动端样式优化
- [ ] 数据云同步（Supabase / GitHub Gist）
- [ ] 亮色主题
- [ ] 多语言支持

## 📄 License

MIT — 自由使用，保留署名即可。

---

<a name="english"></a>

# 🎓 PhD Workstation (English)

> A personal productivity dashboard for PhD students — single HTML file, zero installation, works out of the box.

## ✨ Features

| Module | Description |
|--------|-------------|
| **Daily Overview** | Clock in/out, work hours, PhD day counter |
| **Task Manager** | Add/edit/delete tasks, custom project tags, priority, due dates |
| **Focus Timer** | Pomodoro technique, task binding, daily log |
| **Habit Tracker** | Custom habits, streak counter, weekly heatmap |
| **Submission Tracker** | Track paper status (Under Review / Revision / Accepted / Rejected) |
| **Tools Panel** | Custom command/link shortcuts, click to copy |
| **Reflection Journal** | Daily mood, wins, struggles, tomorrow's plan |
| **Statistics** | 7-day task/pomodoro/work-hour charts, project distribution |
| **Data Management** | Full JSON export/import, all data stored locally |

## 🚀 Quick Start

**Option 1: Download & Open**
1. Download [`index.html`](./index.html)
2. Open in any browser
3. Complete the 5-step setup wizard
4. Start working!

**Option 2: Online (GitHub Pages)**
```
https://nikewq.github.io/Research-workstation
```

**Option 3: Fork & Deploy**
```bash
git clone https://github.com/nikewq/Research-workstation
# Open index.html directly, or deploy to GitHub Pages / Vercel
```

## 📱 WeChat Usage

No setup required — use the web version directly in WeChat:

1. Send yourself the link or bookmark it:
   ```
   https://nikewq.github.io/Research-workstation
   ```
2. Open the link in WeChat, tap the top-right menu → **Open in Browser** (Safari/Chrome)
3. Tap the browser share button → **Add to Home Screen**

> ✅ Once added to the home screen, it works like a native app icon on your phone.
> ⚠️ Data is stored in the browser's localStorage — export JSON backups regularly.

---

## 🔧 Customization (Setup Wizard)

On first launch, a 5-step wizard guides you through:
1. **Profile** — Name, university, research field, PhD start date
2. **Research Areas** — Custom tags (e.g. Machine Learning, NLP, Bioinformatics)
3. **Projects** — Add up to 6 research projects with custom colors
4. **Habits** — Select from defaults or add your own
5. **Tools** — Add your favorite command-line tools or links

Everything can be edited later in ⚙️ Settings.

## 💾 Data & Privacy

- All data lives in your **browser's localStorage** — nothing is sent to any server
- Export a full **JSON backup** anytime
- **Import JSON** to restore data on a new device
- Clearing browser data will delete your data — export regularly

## 🛠️ Tech Stack

- Pure HTML + CSS + Vanilla JS (zero framework dependencies)
- Chart.js (loaded from CDN for statistics)
- Works offline (Chart.js requires internet on first load)

## 📦 File Structure

```
Research-workstation/
├── index.html              # Entire app — single file
├── README.md
├── LICENSE
└── examples/
    └── config-sample.json  # Data schema reference
```

## 🤝 Contributing

PRs and Issues welcome!

- [ ] Mobile layout improvements
- [ ] Cloud sync (Supabase / GitHub Gist)
- [ ] Light theme
- [ ] More language support

## 📄 License

MIT — Free to use, attribution appreciated.
