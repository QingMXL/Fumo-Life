<div align="center">

# Fumo² Life

**穿越结界的软绵陪伴** · フモフモ幻想郷

[English](README.md) · **简体中文**

**在线演示：** [fumofumo.life](https://www.fumofumo.life/)

<img src="assets/hero.png" alt="Fumo² Life" width="100%" />

</div>

---

## 这是一款什么产品

**Fumo² Life** 是一款 **AI 驱动的治愈系陪伴 Web 应用**：你与东方角色以 **Fumo 形态**一对一聊天，在 **发现** 页刷角色的「朋友圈」式动态，并在 **我的** 里用 **相册** 汇总发现页种子配图、你自己发的配图动态、以及聊天中生成的毛绒小场景图。

产品强调 **幻想乡日常感与原作口吻**，避免把「我是玩偶」挂在嘴边；界面与文案支持 **中文 / 日本語 / English** 一键切换，并对每种语言单独约束模型语气。

---

## 功能与特点

### 消息与聊天

- **单角色会话**：列表进房、输入框发消息、礼物、表情颜文字、可选的 **AI 场景配图**（Gemini 图像能力；若配置环境变量，也可走 **Nano Banana** 类外部生图接口）。
- **角色区分度**：每位角色有独立风格说明；回复与 **主动发来的消息** 带 **防复读** 提示，并在多角色之间维护 **跨角色近期用语**，减少不同人对你讲同一句套话。
- **好感与未读**：好感度、会话预览与未读状态 **云端持久化**；聊天记录写入 **Supabase**，同时在浏览器侧做 **本地镜像**，网络抖动或短暂拉取失败时，仍尽量保留你刚看过的上下文。

### 发现（朋友圈 / Moments）

- **动态流**：内置多组 **角色种子动态**（配图可走 `public/moments/` 本地资源），与你发布的 **文字 / 配图动态** 混在一起刷新。
- **互动**：点赞、评论；你发动态后可有 **AI 或模板生成的角色评论**；对用户自己动态上的 **新角色评论** 有 **未读提示**（发现页展示）。
- **配图持久化**：用户选择的照片会转为 **可入库的 JPEG 数据 URL**，避免仅用 `blob:` 导致刷新后图片消失。

### 我的与相册

- 个人资料、**语言**、通知与隐私入口、**清空所有聊天**、**切换用户**。
- **相册** 聚合三类来源：**发现页角色种子图**、**你发布的动态配图**、**聊天中 AI / 场景相关配图**，数字与网格与当前数据一致；云端请求失败时仍会尽量展示发现页种子图。

### 账号与数据策略

- **注册 / 登录**（用户名 + 密码；密码在客户端 SHA-256 后入库——生产环境建议迁移到更标准的 Auth 方案，见仓库内 schema 说明）。
- **切换用户** 会 **登出并清空该账号在本应用中的云端数据**（消息、你的动态、点赞、评论中的用户侧记录、好感、未读等），并清理本地 AI 缓存、聊天镜像等，适合 **换号从零开始**；请勿在仍想保留存档的账号上误点。
- 在 Supabase 开启 Realtime 时，聊天与动态支持 **准实时** 推送更新。

### 视觉与体验

- **奶油缝线风 UI**：柔和色块、缝线边框、天空头图与分层卡片，整体偏 **手账 / 软绵质感**，而非扁平贴纸。
- **Fumo 向视觉**：生图与文案规范偏向 **立体毛绒**（绒面、缝线、圆点眼、少高光），与「普通 Q 版贴纸」拉开距离。

---

## 技术栈

| 模块 | 说明 |
|------|------|
| 前端 | React 19、Vite、Tailwind、Motion、React Router |
| AI | Google **Gemini**（对话、朋友圈评论、图像生成） |
| 数据与同步 | **Supabase**（PostgreSQL，可选 Realtime） |
| 可选生图 | `VITE_NANO_BANANA_ENDPOINT` + `VITE_NANO_BANANA_API_KEY` |

> 本地开发请在 `.env.local` 配置 `GEMINI_API_KEY`，以及 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`。

---

## 快速启动

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
# 可选：VITE_NANO_BANANA_ENDPOINT、VITE_NANO_BANANA_API_KEY
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

---

## 贡献指南

欢迎提交 PR，尤其是各角色 **Prompt 的本地化与口吻微调**，保持不 OOC、不串戏。

**新增 Fumo 角色时**，请遵循 PRD 中的 Fumo 形态规范。优质图像 Prompt 通常包含：

- 形态：高清 3D 物理玩偶  
- 材质：软绵、天鹅绒、羊毛、缝合线  
- 光影：柔和侧光、漫反射  
- 五官：圆点眼无高光、绣花嘴等  

**示例 Prompt（将 `[CHARACTER DETAILS HERE]` 换成具体角色描述）：**

```text
(Highly detailed 3D rendering:1.2), (soft plush texture with visible velvet and wool fabrics:1.3), handcrafted quality, soft velvet body with fine stitching threads, chibi aesthetic, signature Fumo design with large head and short limbs, round black dot eyes without high reflections, embroidered mouth, photorealistic style, cute and comforting. [CHARACTER DETAILS HERE].
```

---

## 致谢

- **ZUN 上海アリス幻樂団** — 东方 Project  
- **Fumo 玩偶设计者**

---

## 许可证

MIT License
