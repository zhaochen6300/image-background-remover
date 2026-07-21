# 图片背景移除网站 MVP 需求文档

## 1. 项目概述

### 1.1 产品名称

暂定：Image Background Remover。

### 1.2 项目目标

提供一个无需登录、无需保存图片的在线工具：用户上传一张图片后，网站调用 Remove.bg API 去除背景，用户可预览并下载透明背景 PNG。

### 1.3 MVP 成功标准

- 用户能在桌面端与移动端完成上传、处理、预览与下载。
- Remove.bg API 密钥不暴露给浏览器。
- 应用不将原图或处理结果写入数据库、对象存储或文件系统。
- 正常网络环境下，常见图片处理的状态与错误对用户清晰可见。

## 2. 范围

### 2.1 本期包含

- 单页工具页。
- 点击选择与拖拽上传图片。
- 调用 Remove.bg API 自动移除背景。
- 处理前后预览与透明棋盘格展示。
- 下载 PNG。
- 上传格式、文件大小、请求中与失败状态提示。
- 部署至 Cloudflare。

### 2.2 本期不包含

- 用户注册、登录、历史记录和额度系统。
- 图片、处理结果或日志中的图片持久化存储。
- 批量处理、编辑抠图边缘、手动修复、替换背景。
- 订阅、支付、推广页、SEO 专题页与多语言。
- 自建图像分割模型。

## 3. 用户与核心流程

### 3.1 目标用户

需要快速获得透明背景 PNG 的普通用户，例如处理头像、商品图或简单素材。

### 3.2 主流程

1. 用户打开首页，看到上传区域和功能说明。
2. 用户拖拽文件到上传区域，或点击后从本地选择图片。
3. 前端校验文件类型和大小；不符合要求时显示提示，不发送请求。
4. 前端显示原图预览和“正在移除背景”加载状态，并禁用重复上传。
5. 前端将图片发送到同域 `POST /api/remove-background`。
6. Next.js Route Handler 使用服务端密钥请求 Remove.bg API。
7. 接口将透明 PNG 二进制直接返回浏览器，不落盘、不缓存。
8. 前端显示结果图与“下载 PNG”按钮。
9. 用户点击下载，浏览器下载 `image-without-background.png`。
10. 用户可点击“处理另一张图片”，回到上传状态并释放本地 Object URL。

### 3.3 异常流程

- 文件类型不支持：提示“请选择 JPG、PNG 或 WebP 图片”。
- 文件过大：提示“图片不能超过 10 MB”。
- Remove.bg 额度耗尽或鉴权失败：提示“服务暂时不可用，请稍后再试”。
- 上游处理失败、网络超时或服务异常：提示“处理失败，请更换图片后重试”。
- 用户请求中刷新、离开或取消：前端使用 `AbortController` 中止请求并恢复可上传状态。

## 4. 页面与交互需求

### 4.1 首页（也是工具页）

页面由以下区域组成：

| 区域 | 内容与行为 |
| --- | --- |
| 顶部导航 | 左侧产品名称，右侧锚点链接“如何使用”。不要求账户入口。 |
| Hero | 标题“Remove Image Backgrounds in Seconds”、一句简短说明和上传组件。 |
| 上传组件 | 虚线拖拽区、上传图标、主按钮“上传图片”、支持格式与 10 MB 限制说明。点击与拖拽均可触发上传。 |
| 处理区 | 上传后显示左右或上下对比：原图与结果图。结果使用棋盘格背景表示透明区域。 |
| 操作区 | 成功后显示主按钮“下载 PNG”和次级按钮“处理另一张图片”。 |
| 使用说明 | 三步说明：上传、自动处理、下载。 |
| 页脚 | 简短隐私说明：“图片仅用于本次处理，不会被本站保存。” |

### 4.2 视觉与响应式要求

- 使用 Tailwind CSS 构建，整体风格简洁、轻量、工具导向。
- 主内容最大宽度约 1,120px；桌面端预览双栏，移动端自动堆叠为单栏。
- 主按钮有默认、悬停、禁用和加载态；键盘 Tab 焦点可见。
- 上传区域支持拖入激活态，并在不支持的文件上给出错误反馈。
- 预览图片保持比例，容器高度受限，避免超大图片撑破页面。
- 页面文案本期使用英文或中文之一，开发时统一；建议首版采用英文以匹配产品名。

## 5. 功能需求

### 5.1 文件上传与校验

- 接受 `image/jpeg`、`image/png`、`image/webp`。
- 最大文件大小：10 MB。
- 每次只允许选择一张图片；新上传会覆盖当前会话的预览结果。
- 前端先校验，服务端再次校验，避免绕过浏览器限制。
- 前端通过 `URL.createObjectURL()` 生成原图预览，并在替换图片或卸载组件时调用 `URL.revokeObjectURL()`。

### 5.2 去背景处理

- 浏览器以 `multipart/form-data` 向 `POST /api/remove-background` 上传字段 `image`。
- 服务端将文件转发给 Remove.bg，建议参数：`size=auto`、`format=png`。
- 服务端不修改、存储或记录原始图片、结果图片和完整请求体。
- 前端请求期间显示加载遮罩与文字；阻止重复提交。
- 成功时前端把响应转成 `Blob`，用于结果预览与下载。

### 5.3 下载与重置

- 成功后下载按钮下载服务端返回的 PNG。
- 下载使用浏览器临时 Object URL，不创建服务器文件。
- “处理另一张图片”清空选中文件、预览 URL、错误和处理状态，回到初始上传界面。

## 6. 技术设计

### 6.1 技术栈

| 层级 | 方案 |
| --- | --- |
| 框架 | Next.js（App Router）+ TypeScript |
| 样式 | Tailwind CSS |
| 图标 | 可选 `lucide-react` |
| 服务端接口 | Next.js Route Handler：`app/api/remove-background/route.ts` |
| 图像处理 | Remove.bg API |
| 部署 | Cloudflare Workers（Next.js on Cloudflare / OpenNext） |
| 数据与文件 | 不使用数据库、KV、R2、D1 或持久化文件系统 |

### 6.2 接口定义

#### `POST /api/remove-background`

**请求**

- Content-Type：`multipart/form-data`
- 字段：`image`，单个图片文件

**成功响应**

- 状态：`200`
- Content-Type：`image/png`
- Content-Disposition：`attachment; filename="image-without-background.png"`
- 响应体：透明背景 PNG 二进制

**失败响应**

```json
{
  "error": "INVALID_FILE",
  "message": "Please upload a JPG, PNG, or WebP image under 10 MB."
}
```

错误码约定：`INVALID_FILE`（400）、`PROCESSING_FAILED`（502）、`SERVICE_UNAVAILABLE`（503）、`INTERNAL_ERROR`（500）。不向客户端返回 Remove.bg API Key、上游原始响应或内部堆栈。

### 6.3 服务端处理逻辑

1. 读取并验证 `FormData` 中的 `image`。
2. 判断 MIME 类型与文件大小。
3. 新建服务端 `FormData`，加入图片、`size=auto`、`format=png`。
4. 通过 `fetch` 请求 Remove.bg；密钥从 `REMOVE_BG_API_KEY` 环境变量读取并放入 `X-Api-Key` 请求头。
5. 上游成功时，以流或二进制响应直接返回，并设置 PNG 下载头和 `Cache-Control: no-store`。
6. 上游失败时记录不含图片与密钥的最小错误信息，映射为统一 JSON 错误响应。

### 6.4 安全与隐私

- `REMOVE_BG_API_KEY` 仅配置在 Cloudflare Worker Secret / 环境变量中；禁止使用 `NEXT_PUBLIC_` 前缀。
- 前端仅调用同域接口，避免将 Remove.bg Key 暴露给用户。
- 响应添加 `Cache-Control: no-store`，避免处理结果被浏览器共享缓存或边缘缓存复用。
- 不在分析、控制台、错误日志或监控事件中记录图片内容、Base64、文件名（如无必要）或 API Key。
- 在页面页脚显示隐私说明：本站不保存图片，但图片会被发送给 Remove.bg 完成处理。

## 7. 配置与部署

### 7.1 环境变量

| 变量 | 必填 | 用途 |
| --- | --- | --- |
| `REMOVE_BG_API_KEY` | 是 | Remove.bg 服务端 API 密钥 |
| `REMOVE_BG_API_URL` | 否 | 便于测试或切换环境；默认使用 Remove.bg 正式 API 地址 |

本地开发使用 `.env.local`，该文件必须加入 `.gitignore`；生产密钥通过 Cloudflare Secret 配置。

### 7.2 Cloudflare 上线要求

- 使用 Cloudflare Workers 兼容的 Next.js 部署方案（例如 OpenNext 适配层）。
- 配置生产环境 `REMOVE_BG_API_KEY` Secret。
- 绑定项目域名后，确保前端与 `/api/remove-background` 使用同一域名。
- 不配置 R2、D1、KV 或 Durable Objects。
- 首次发布后使用真实小图片验证：上传、预览、下载、错误提示和移动端布局。

## 8. 验收标准

| 编号 | 验收项 | 通过条件 |
| --- | --- | --- |
| AC-01 | 有效上传 | 用户可通过点击或拖拽上传小于等于 10 MB 的 JPG、PNG、WebP。 |
| AC-02 | 无效拦截 | 不支持格式或超过 10 MB 的文件不会发出 API 请求，并出现明确错误。 |
| AC-03 | 处理成功 | 合法图片能显示加载状态，成功后展示透明背景结果。 |
| AC-04 | 下载 | 点击“下载 PNG”可获得可打开的透明 PNG。 |
| AC-05 | 错误反馈 | 密钥无效、额度不足、上游失败和网络错误均有用户可理解的提示。 |
| AC-06 | 密钥安全 | 浏览器构建产物、网络请求和页面源码中均不含 Remove.bg API Key。 |
| AC-07 | 无持久化 | 项目代码与 Cloudflare 配置不使用数据库、对象存储或图片缓存。 |
| AC-08 | 响应式 | 在常见手机宽度与桌面宽度下，上传、预览与下载均可操作。 |
| AC-09 | 重置 | 处理另一张图片后，旧图片与结果不再显示，且可重新上传。 |

## 9. 建议项目结构

```text
app/
  api/remove-background/route.ts
  globals.css
  layout.tsx
  page.tsx
components/
  upload-dropzone.tsx
  image-comparison.tsx
  processing-state.tsx
lib/
  file-validation.ts
public/
```

## 10. 开发完成定义

当满足所有验收标准、生产环境已配置 Remove.bg 密钥、Cloudflare 预览部署可完整处理并下载至少一张测试图片时，本 MVP 视为完成。
