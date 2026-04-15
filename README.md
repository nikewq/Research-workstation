# 🎓 PhD Workstation

> 专为博士生打造的个人科研自律工作台 —— 单文件，无需安装，开箱即用。

![License](https://img.shields.io/badge/license-MIT-blue) ![No Dependencies](https://img.shields.io/badge/dependencies-none-green) ![Single File](https://img.shields.io/badge/deploy-single%20HTML-purple)

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

**方式一：直接使用**
1. 下载 `index.html`
2. 用浏览器打开
3. 完成 5 步个性化设置向导
4. 开始使用！

**方式二：Fork 后部署**
```bash
git clone https://github.com/yourname/phd-workstation
# 直接打开 index.html，或部署到 GitHub Pages / Vercel
```

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
- 支持**导入 JSON** 恢复数据（换电脑时使用）
- 清除浏览器数据会丢失数据，请定期导出备份

## 🛠️ 技术栈

- 纯 HTML + CSS + Vanilla JS（无任何框架依赖）
- Chart.js（从 CDN 加载，用于统计图表）
- 离线可用（图表需联网加载 Chart.js）

## 📦 文件结构

```
phd-workstation/
├── index.html              # 全部代码，单文件
├── README.md
├── LICENSE
└── examples/
    └── config-sample.json  # 数据结构示例
```

## 🤝 贡献

欢迎 PR 和 Issue！如有功能建议或 Bug，请提 Issue。

常见贡献方向：
- [ ] 英文界面支持
- [ ] 数据云同步（可选）
- [ ] 移动端适配优化
- [ ] 暗色/亮色主题切换
- [ ] 微信小程序版本

## 📄 License

MIT License — 自由使用，保留署名即可。
