# 每日邮件播客摘要 — 设计文档

**日期：** 2026-05-07  
**状态：** 已批准  
**项目类型：** 独立新应用（与 Atelier 电商站分开）

---

## 一、产品定位

个人知识管理工具。每天自动将前一天的 Gmail 订阅邮件整合为一期播客，同时生成可检索的文字稿。用户通过收听代替刷手机，通过追问将内容沉淀为学习笔记。类似 NotebookLM，但内容源完全自动进入，无需手动上传。

---

## 二、系统架构

```
Gmail API
    │
    ▼
Trigger.dev Job（每天凌晨 6:00 UTC+8 触发）
    │
    ├── 1. 拉取前一天的订阅邮件（只读 OAuth 2.0）
    ├── 2. Claude API：去重 + 整合 + 生成摘要文本（~2000字）
    ├── 3. OpenAI TTS（tts-1-hd）：文字 → MP3
    ├── 4. 上传音频到 Supabase Storage（bucket: podcasts/）
    ├── 5. 文本分段 → OpenAI text-embedding-3-small → 存入 pgvector
    └── 6. 写入 Episode 记录到 Supabase DB

前端（独立 React/Vite 应用，部署到 Vercel）
    ├── /              今日播客
    ├── /archive       历史列表
    ├── /episode/:id   单期详情
    ├── /notes         笔记本
    ├── /ask           跨期追问
    └── /rss.xml       RSS Feed（API Route 动态生成）

追问流程：
    用户提问
    → OpenAI text-embedding-3-small 生成 query embedding
    → pgvector 相似搜索（top-k chunks，跨所有期数）
    → 召回段落 + 元数据 → Claude API → 结构化回答
    → 自动保存为笔记（可选标签）
```

**关键服务选型：**
- **Gmail API + OAuth 2.0**：只读授权，按日期范围过滤，label 过滤识别订阅邮件
- **Trigger.dev**：解决 Vercel 10s 超时，任务失败自动重试，有可视化日志面板
- **Claude API**：摘要 + Q&A 复用同一 API，减少供应商数量
- **OpenAI TTS `tts-1-hd`**：~2000 字 ≈ $0.06/期，音质自然
- **OpenAI text-embedding-3-small**：向量维度 1536，性价比最高
- **Supabase**：PostgreSQL + pgvector + Storage 三合一，免运维
- **RSS 2.0**：`<enclosure>` 携带音频 URL，兼容 Apple Podcasts、Pocket Casts、小宇宙

---

## 三、数据模型

```sql
-- 每期播客
episodes
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  date          date UNIQUE NOT NULL        -- 对应哪天的邮件
  title         text NOT NULL               -- 如"5月6日科技早报"
  summary_text  text NOT NULL               -- 完整文字稿
  audio_url     text NOT NULL               -- Supabase Storage 公开链接
  duration_sec  integer                     -- 音频时长（秒）
  source_count  integer                     -- 本期整合了几封邮件
  created_at    timestamptz DEFAULT now()

-- 文字稿分段（向量检索单元）
episode_chunks
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  episode_id    uuid REFERENCES episodes(id) ON DELETE CASCADE
  chunk_index   integer NOT NULL            -- 段落顺序（用于文字同步高亮）
  content       text NOT NULL
  embedding     vector(1536)                -- pgvector

-- 学习笔记
notes
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  question      text NOT NULL
  answer        text NOT NULL
  source_chunks uuid[]                      -- 引用的 episode_chunks.id
  episode_ids   uuid[]                      -- 涉及哪几期（冗余，便于查询）
  tags          text[] DEFAULT '{}'
  created_at    timestamptz DEFAULT now()

-- 原始邮件记录（调试用）
raw_emails
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  episode_id    uuid REFERENCES episodes(id) ON DELETE CASCADE
  sender        text
  subject       text
  received_at   timestamptz
```

**Supabase Storage：**
```
bucket: podcasts/（公开读取）
  └── YYYY-MM-DD.mp3
```

**RSS Feed：**  
不存库。Vercel API Route 实时查询 `episodes` 表，返回最新 20 期的标准 RSS 2.0 XML。

---

## 四、前端页面

### `/` 今日播客
- 顶部：日期 + 标题 + 来源邮件数标签
- 音频播放器（进度条、速度切换 0.75x / 1x / 1.25x / 1.5x、±15s 跳转）
- 播放器下方：同步高亮文字稿——当前播放段落用淡蓝背景 `#e8f0fe` 标记
- 右侧浮出追问框（或底部抽屉，移动端）：输入问题 → 回答 → 一键保存为笔记

### `/archive` 历史存档
- 时间线卡片列表
- 每张卡片：日期、标题、时长、来源数量、简短摘要首句
- 点击进入 `/episode/:id`

### `/episode/:id` 单期详情
- 与首页布局一致
- 底部附"本期相关笔记"——当时针对本期提过的问题列在下方

### `/notes` 笔记本
- 卡片瀑布流（masonry 或等宽两列）
- 每张卡片：问题（加粗）+ 回答摘要 + 来源期数徽章 + 标签
- 顶部：标签筛选 chips + 关键词搜索框
- 点开卡片展开完整回答，底部"继续追问"按钮（追问新建关联笔记）
- 溯源：来源期数徽章可点击跳转到对应 episode

### `/ask` 跨期追问
- 单一搜索框，大字居中（Perplexity 风）
- 回答区：结构化文字 + 引用段落折叠卡片（来源期数 + 原文片段）
- 回答完成后出现"保存为笔记"按钮

### `/rss.xml`
- GET 请求返回 `Content-Type: application/rss+xml`
- 标准 RSS 2.0，每 `<item>` 包含：标题、描述（摘要首段）、`<enclosure>` 音频链接、发布日期

---

## 五、设计语言

**风格参考：** Notion（内容优先）+ Granola（暖色卡片）+ Perplexity（信息密度 + 引用溯源）

| Token | 值 |
|---|---|
| 背景 | `#f7f7f5` |
| 卡片 | `#ffffff` |
| 正文 | `#37352f` |
| 次要文字 | `#9b9a97` |
| 边框 | `rgba(55,53,47,0.09)` |
| Accent | `#2383e2` |
| 圆角 | `6px` |
| 字体 | Inter（全站）|
| 卡片阴影 | `0 1px 3px rgba(0,0,0,0.06)` |

**特殊组件：**
- **播放器 dock**：底部悬浮，`backdrop-blur-md`，毛玻璃质感
- **笔记块**：左侧 3px `#2383e2` 竖线，问题 `font-weight: 600`，来源徽章 `bg-blue-50 text-blue-600 text-xs`
- **高亮段落**：`background: #e8f0fe`，`transition: background 0.3s`
- **引用溯源**：Perplexity 风格 `[来源：5月6日]` 小徽章，可点击

---

## 六、后台任务流程

Trigger.dev Job `daily-digest`，每天 `0 22 * * *` UTC（北京时间 06:00）触发：

```
Step 1: fetchGmailEmails
  - OAuth token refresh
  - 查询前一天 00:00–23:59 的邮件
  - 过滤：排除自己发出的、排除促销/社交分类

Step 2: generateSummary
  - 发送所有邮件 subject + body 给 Claude API
  - Prompt：去重相同话题、整合相关内容、生成播客风格文字稿
  - 输出：标题 + 分段文字稿（段落有语义边界，便于 TTS 自然停顿）

Step 3: generateAudio
  - 调用 OpenAI TTS tts-1-hd，voice: "alloy"（自然男声）
  - 流式写入临时文件 → 上传 Supabase Storage

Step 4: generateEmbeddings
  - 按段落分块（每块 ~300 tokens）
  - 批量调用 OpenAI Embeddings API
  - 写入 episode_chunks + embedding

Step 5: saveEpisode
  - 写入 episodes 表
  - 写入 raw_emails 表

失败处理：任意 Step 失败，Trigger.dev 自动重试 3 次，间隔指数退避
```

---

## 七、成本估算（每天）

| 服务 | 用量 | 费用 |
|---|---|---|
| Claude API（摘要）| ~8k tokens/天 | ~$0.024 |
| Claude API（Q&A）| ~3k tokens/次问答 | 按用量 |
| OpenAI TTS tts-1-hd | ~2000 字 | ~$0.06 |
| OpenAI Embeddings | ~3k tokens | ~$0.0003 |
| Supabase | 免费层覆盖 | $0 |
| Vercel | 免费层覆盖 | $0 |
| Trigger.dev | 免费层覆盖 | $0 |
| **每日固定成本** | | **~$0.09** |

---

## 八、范围边界（不在本期）

- 多用户支持（本期只支持单用户，OAuth 只连一个 Gmail 账户）
- 移动端原生 App
- 自动生成"今日关键词"或"学习建议"
- 邮件来源分类（后续可按 newsletter 来源分组）
