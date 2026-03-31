<div align="center">

# Fumo² Life

**穿越结界的软绵陪伴** · フモフモ幻想郷

[English](README.md) · **简体中文**

**在线演示：** [fumofumo.life](https://www.fumofumo.life/)

<img src="assets/hero.png" alt="Fumo² Life" width="100%" />

</div>

---

### 项目简介

「Fumo² Life」让饲养员穿越结界，与 **Fumo 形态**的幻想乡居民零距离生活。

这是一款基于 AI 的治愈系养成 Web App，借助 **Nano Banana 2** 语言与图像能力，带来一种可以「摸到软绵」的陪伴感。你面对的不是普通玩偶界面，而是被迫以 Fumo 躯体存在的居民：性格与记忆贴近原作，只是受短手短脚、棉花填充等物理限制。

> 实现上通过 **Google Gemini API** 接入模型能力；本地开发请配置 `GEMINI_API_KEY`（见下文快速启动）。

### 视觉风格规范 (Visual Identity)

设计目标是 **「可以触摸到的软萌」**，避免扁平、贴纸感。

1. **核心 UI：奶油缝线风 (Stitching Aesthetic)**  
   暖奶油色与棉麻织物纹理；卡片与气泡边缘有可见的布料缝合线；光影柔和、有厚度，像叠放的毛绒面板。

2. **硬核 Fumo 形态 (Hardcore Fumo Form)**  
   头像、朋友圈、旅行照等需呈现 **3D 软绵材质**（天鹅绒、羊毛等）、**圆点眼（无高光）**、**绣花五官** 的玩偶质感，而非 2D 贴纸。

### 核心功能

1. **多语言 AI 性格引擎 (Soul of Fumo)**  
   - **形态而非本体**：第一人称日常，不主动强调「我是玩偶」；避免「作为一只 Fumo」「摸摸毛茸茸」等 OOC 话术。  
   - **消息拆分**：长句拆成 2–3 条短消息，贴近真实聊天节奏。

2. **国际化 (i18n)**  
   中文 / 日本語 / English 一键切换；对话语气随语言适配（如日文敬语体系）。

3. **Fumo 生活**  
   - **消息**：对话列表（头像为 Fumo 形态）  
   - **通讯录**：已结识角色的档案索引  
   - **发现**：幻想乡朋友圈式异步动态  
   - **我的**：设置与 Fumo 相册（可按角色分类）  
   - **相机**：生成实时生活照  
   - **探索**：旅行机制

### 快速启动

**环境：** Node.js（建议当前 LTS）

```bash
git clone https://github.com/QingMXL/Fumo-Life.git
cd Fumo-Life
npm install
```

复制环境变量模板并填写密钥：

```bash
cp .env.example .env.local
# 编辑 .env.local，设置：
# GEMINI_API_KEY
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
```

初始化 Supabase 数据表：

```sql
-- 在 Supabase SQL Editor 中执行 supabase/schema.sql 全部内容
```

启动开发服务器：

```bash
npm run dev
```

其他脚本：`npm run build`（构建）、`npm run preview`（预览构建结果）、`npm run lint`（TypeScript 检查）。

### 贡献指南

欢迎提交 PR，尤其是各角色 **核心 Prompt 的本地化**，以保持不 OOC。

**新增 Fumo 角色时**，请遵循 PRD 中的 Fumo 形态规范。优质图像 Prompt 通常包含：

- 形态：高清 3D 物理玩偶  
- 材质：软绵、天鹅绒、羊毛、缝合线  
- 光影：柔和侧光、漫反射  
- 五官：圆点眼无高光、绣花嘴等  

**示例 Prompt（角色细节替换 `[CHARACTER DETAILS HERE]`）：**

```text
(Highly detailed 3D rendering:1.2), (soft plush texture with visible velvet and wool fabrics:1.3), handcrafted quality, soft velvet body with fine stitching threads, chibi aesthetic, signature Fumo design with large head and short limbs, round black dot eyes without high reflections, embroidered mouth, photorealistic style, cute and comforting. [CHARACTER DETAILS HERE].
```

### 致谢

- **ZUN 上海アリス幻樂団** — 东方 Project 
- **Fumo 玩偶设计者**  


### 许可证

MIT License
