# 云端固定版发布

推荐用 Render 发布。发布成功后会得到固定的 `onrender.com` 手机地址。

## 需要你做的一次授权

1. 登录 Render。
2. 选择 New Web Service。
3. 连接保存本项目的 GitHub 仓库。
4. 使用项目里的 `render.yaml` 创建服务。
5. 在环境变量里填写：
   - `CLOUD_DEPLOY=true`
   - `OPENAI_MODEL=gpt-4.1-mini`
   - `OPENAI_API_KEY=你的 OpenAI API 密钥`

## 已经准备好的内容

- 服务启动命令：`node server.js`
- 健康检查地址：`/api/config`
- 云端保护：云端网页不能直接修改接口密钥
- 手机支持：可以添加到手机主屏幕

## 注意

固定云地址解决“手机长期打开”的问题；智能深度分析还需要 OpenAI API 额度正常。
