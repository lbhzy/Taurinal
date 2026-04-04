# Taurinal

Taurinal 是一个基于 Tauri 2 + React + xterm.js 的桌面终端工具，支持本地 Shell、SSH 和串口连接，并提供会话管理、触发器、快捷命令、Hex/Waveform 观测等能力。

## 功能特性

- 多连接类型
	- Local PTY（本地 Shell）
	- SSH（密码 / 密钥认证）
	- Serial（串口列表与波特率选择）
- 多标签会话
	- 每个会话独立 tab
	- 状态点显示连接状态（连接中 / 已连接 / 断开）
- 调试与观测
	- Quick Commands 快捷命令栏
	- Trigger 触发器（正则匹配高亮、提示、点击发送、自动发送）
	- Hex View 原始数据查看
	- Data Waveform 波形可视化
- 终端体验
	- 可配置字体、字号、光标样式、光标闪烁
	- 内置多套终端主题 + App 主题
	- 自动读取系统字体列表
- 配置持久化
	- 会话、快捷命令、触发器、布局、终端设置持久化到应用配置目录
	- 支持一键打开配置目录

## 技术栈

- 前端
	- React 19
	- TypeScript
	- Vite 8
	- Tailwind CSS 4
	- shadcn/ui + Radix UI
	- xterm.js
- 后端
	- Tauri 2
	- Rust
	- tokio
	- russh（SSH）
	- tokio-serial（串口）
	- portable-pty（本地 PTY）

## 目录结构

```text
.
├─ src/                    # React 前端
│  ├─ components/          # UI 与业务组件
│  └─ lib/                 # 配置与数据读写逻辑
├─ src-tauri/              # Tauri + Rust 后端
│  ├─ src/
│  │  ├─ pty.rs            # 本地 PTY 会话
│  │  ├─ ssh.rs            # SSH 会话
│  │  ├─ serial.rs         # 串口会话
│  │  ├─ session.rs        # 会话命令分发
│  │  └─ config.rs         # 配置读写
│  └─ tauri.conf.json      # Tauri 配置
└─ package.json
```

## 环境要求

- Bun（建议最新稳定版）
- Rust（stable）
- Tauri 2 运行依赖
	- macOS: Xcode Command Line Tools
	- Linux / Windows: 参考 Tauri 官方依赖说明

## 快速开始

```bash
bun install
bun run tauri dev
```

仅前端调试（不启动 Tauri 后端）:

```bash
bun run dev
```

## 构建

前端构建:

```bash
bun run build
```

桌面应用打包:

```bash
bun run tauri build
```

## 常用命令

```bash
# 开发模式（Vite）
bun run dev

# Tauri 开发模式
bun run tauri dev

# TypeScript 检查
bunx tsc --noEmit

# 前端构建
bun run build
```

## 配置文件说明

应用通过后端 `config_read/config_write` 将 JSON 存储到系统应用配置目录。

常见配置键:

- `terminal-settings`
- `saved-sessions`
- `quick-commands`
- `triggers`
- `layout`

可在设置面板点击 `Open Config Folder` 快速打开目录。

## 后端命令概览

- 连接与会话
	- `pty_spawn`
	- `ssh_connect`
	- `serial_list_ports`
	- `serial_connect`
	- `session_write`
	- `session_resize`
	- `session_close`
- 配置与系统
	- `config_read`
	- `config_write`
	- `config_open_folder`
	- `system_list_fonts`

## 连接说明

- SSH
	- 支持密码与私钥认证
	- 连接阶段使用超时保护（默认 2 秒）
- Serial
	- 支持常见波特率
	- 串口会话不支持 resize（收到 resize 指令时忽略）

## 故障排查

- 启动失败 / 白屏
	- 先执行 `bun install`
	- 再执行 `bunx tsc --noEmit` 检查类型错误
- Tauri 无法启动
	- 检查 Rust 工具链与系统依赖是否安装
- SSH 连接失败
	- 确认主机、端口、认证方式和密钥路径
	- 网络不可达时会在短超时后返回错误
- 字体列表异常
	- 打开设置页重新加载
	- 检查系统字体权限与缓存状态

## 开发说明

- 前端通过 Tauri `invoke` 调后端命令。
- 后端通过 `session-output-{id}` 与 `session-exit-{id}` 事件向前端推送会话输出与退出状态。
- 会话核心在 `SessionManager`，统一处理写入、resize、关闭命令分发。
