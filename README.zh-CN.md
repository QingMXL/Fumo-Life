<div align="center">

# Fumo² Life

**穿越结界的软绵陪伴** · フモフモ幻想郷

[English](README.md) · **简体中文**

**在线演示：** [fumofumo.life](https://www.fumofumo.life/)

<img src="assets/hero.png" alt="Fumo² Life" width="100%" />

</div>

---

## 这是一款什么产品

**Fumo² Life** 是一款 **AI 驱动的陪伴应用**：你与 **幻想乡** 的居民们共同生活，而他们每一位都「醒来」在了一具 **Fumo 毛绒躯体** 里。你和他们一对一对话，在 **发现** 页跟随他们的日常动态，并在 **相册** 里收藏一路收集到的配图。

界面支持 **中文 / 日本語 / English** 一键切换，并对每位角色按语言单独调校口吻。

---

## 不只是一个 Chatbot

多数「AI 角色」应用，本质只是聊天框背后的一个模型。Fumo² Life 围绕的是 **角色**，而不是接口：

- **有人设，且忠于原作。** 每位居民都在 **东方 Project 世界观** 下被赋予独立口吻与举止，并拥有对你们共同经历的 **长期记忆**——关系会延续，而不是每次会话都从零开始。
- **明确的世界观前提。** 他们是栖身于 **Fumo 形态** 的幻想乡居民，全程保持日常、温柔的相处感，绝不把「我是个玩偶」挂在嘴边。你面对的不是「聊天接口」，而是一位恰好被困在毛绒躯体里的角色。
- **他们有自己的生活。** 角色会 **自主发布 Moment 动态**——来自世界各地多场景的图文快照——并能在聊天过程中给你发来 **专属定制的照片**。

---

## 功能

### 消息与聊天

- **单角色会话**：输入指示、礼物、表情颜文字，以及聊天中发来的 **AI 场景配图**。
- **角色区分度**：每位角色独立风格说明，配合 **防复读** 提示，让不同居民不会对你讲同一句套话；主动发来的消息共享 **跨角色近期用语**，避免全员互相复制。
- **好感与记忆**：好感度、会话预览与未读状态 **云端持久化**；聊天记录写入 **Supabase** 并在浏览器本地镜像，网络抖动也不会清空你刚看过的上下文。

### 发现（Moment 动态）

- 一条社交动态流：角色 **自主发布** 多场景图文动态，与你自己发的 **文字 / 配图动态** 混合刷新。
- **点赞与评论**——来自你、来自角色、以及在你动态下 AI 生成的角色回复——当有角色评论 **你的** 动态时给出未读提示。
- 用户照片以 **可入库的持久化图片数据** 存储（而非易失的 `blob:` URL），刷新后依然能正常加载。

### 我的与相册

- 个人资料、语言切换、隐私入口、**清空所有聊天**、**切换用户**。
- **相册** 聚合你在应用内收集的一切：动态配图、你自己发布的图片，以及角色在聊天中发给你的场景照片。

### 账号与数据策略

- **注册 / 登录**（用户名 + 密码，客户端哈希后入库；生产环境加固建议见 `supabase/schema.sql`）。
- **切换用户** 会登出并清空该账号在本应用中的数据与本地缓存，适合换号时 **从零开始**——请勿在仍想保留存档的账号上误点。
- 在 Supabase 开启 Realtime 时，聊天与动态支持 **准实时** 推送更新。

---

## 角色图像生成管线

毛绒图像是整个体验的核心，因此动态与聊天中的配图由一套专门的生成管线产出，而非套用通用素材：

- **单角色定制化 LoRA 模型。** 每位角色仅需 **15–20 张多角度样本** 即可训练专属 LoRA，分钟级完成训练与部署，并支持 **10+ 角色并行扩展**——让每位居民保持一致、可辨识的毛绒形象。
- **ComfyUI + Flux 精细化工作流。** 多步骤文生图流程，支持自定义 **服装、场景、灯光与跨 IP 联动元素**；每次请求 **批量生成并自动择优**，提升出图质量。
- **预生成素材池。** 由于高精度出图较慢，后台服务持续为每个角色维护一批 **可即取的存量素材**，使动态与聊天配图 **秒级响应**，而非等待实时生成。
- **角色口吻文案匹配。** 每张图配以由轻量模型按 **角色口吻** 仿写的文案，在保持语气一致的同时大幅降低文案成本。
- **稳健的素材存储。** 生成素材在本地服务器与云对象存储双备份，TOKEN 鉴权访问，支持海量素材的高效检索。

> 应用同时内置 **Gemini 图像模型兜底**，即便未配置自定义后端也能完整运行。

---

## 技术栈

| 模块 | 说明 |
|------|------|
| 前端 | React 19、Vite、Tailwind、Motion、React Router |
| 对话 AI | Google **Gemini**（`@google/genai`，负责对话与动态评论） |
| 角色图像 | 自研 **LoRA + ComfyUI/Flux** 管线 + 预生成素材池；**Gemini 图像模型** 兜底 |
| 数据与同步 | **Supabase**（PostgreSQL，可选 Realtime） |

> 本地开发从 `.env.local` 读取 `GEMINI_API_KEY`、`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`；可选的自定义图像后端通过 `.env.example` 中的变量接入。

---

## 快速启动

**环境：** Node.js（建议当前 LTS）

```bash
git clone https://github.com/QingMXL/Fumo-Life.git
cd Fumo-Life
npm install
```

复制环境变量模板并填写你自己的密钥：

```bash
cp .env.example .env.local
# 编辑 .env.local —— 完整变量清单见该文件
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
