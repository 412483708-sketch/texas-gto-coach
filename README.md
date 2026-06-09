# 德州扑克 GTO 教练

这是一个手机可用的德州扑克牌局复盘工具。你可以点选游戏、人数、位置、手牌、公共牌、行动线，然后直接得到本地快速分析；配置接口密钥后，可以使用智能深度分析。

## 本机使用

```bash
node server.js
```

打开：

```text
http://localhost:5173
```

## 手机使用

如果手机和电脑在同一个 Wi-Fi，可以用页面里显示的本机地址。

如果手机打不开同 Wi-Fi 地址，可以使用临时公网链接。当前运行时会用 Cloudflare Tunnel 生成一个 HTTPS 地址，手机直接打开即可。

注意：临时公网链接不是永久固定地址，电脑关机、服务重启或隧道断开后会变化。

## 云端固定地址

要长期在手机上固定使用，推荐部署到 Render。部署后会得到一个固定的 `onrender.com` 地址，手机收藏或添加到主屏幕即可。

已准备好这些云端配置：

- `render.yaml`
- `railway.json`
- `package.json` 的 `start` 命令

Render 配置：

- Build Command: `true`
- Start Command: `node server.js`
- Health Check Path: `/api/config`
- 环境变量：
  - `CLOUD_DEPLOY=true`
  - `OPENAI_API_KEY=你的接口密钥`
  - `OPENAI_MODEL=gpt-4.1-mini`

云端版不会允许任何人在网页里修改接口密钥，密钥必须放在云平台环境变量里。

Railway 也可以使用，项目已经包含 `railway.json`。部署后同样需要在 Variables 里设置 `CLOUD_DEPLOY=true` 和 `OPENAI_API_KEY`。

## 智能分析配置

网页右侧「手机长期使用」区域可以保存接口密钥和分析强度。密钥会保存在本机 `.env.local`，不会写进前端代码。

云端版不会使用 `.env.local`，而是读取云平台环境变量。

如果提示「接口额度不足或账单还没开通」，说明密钥已经保存成功，但 OpenAI 平台拒绝生成，需要检查接口余额、账单或用量限制。
