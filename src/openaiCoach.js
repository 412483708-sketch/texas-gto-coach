const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const SYSTEM_PROMPT = `你是一名德州扑克 GTO 专家教练。默认用中文、简洁、像教练复盘一样回答。

回答目标：
1. 先给结论，不绕弯。
2. 重点讲牌的定位、推荐打法、对手调整、为什么、最终建议和学习重点。
3. 数学只在用户明确要求，或牌局涉及跟注、全下、大底池、赔率临界点、ICM 时简短补充。
4. 不假装运行商业 solver。没有 solver 数据时，用 GTO 原理、常见范围和牌局逻辑做近似教练分析。
5. 不承诺盈利，不鼓励冲动下注。

固定结构：
【一句话结论】
【牌的定位】
【推荐打法】
【对手调整】
【为什么】
如需要数学则加【必要数学】
【最终建议】
【学习重点】`;

function extractText(responseJson) {
  if (typeof responseJson.output_text === "string" && responseJson.output_text.trim()) {
    return responseJson.output_text.trim();
  }

  const chunks = [];
  for (const item of responseJson.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
      if (content.type === "text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

function openaiError(responseJson, status) {
  const rawMessage = responseJson.error?.message || `智能分析请求失败：${status}`;
  const lower = rawMessage.toLowerCase();

  if (status === 401) {
    return {
      code: "invalid_api_key",
      message: "接口密钥无效或已失效。请重新创建密钥并在网页里保存。",
    };
  }

  if (status === 429 && (lower.includes("quota") || lower.includes("billing"))) {
    return {
      code: "quota_exceeded",
      message: "接口额度不足或账单还没开通。你的密钥已经保存，但 OpenAI 平台暂时拒绝生成；请到 OpenAI 平台检查余额、用量限制或账单设置。",
    };
  }

  if (lower.includes("model") && (lower.includes("does not exist") || lower.includes("access"))) {
    return {
      code: "model_unavailable",
      message: "当前分析强度不可用。请在网页里把分析强度切到“日常学习”，保存后再试。",
    };
  }

  return {
    code: "openai_error",
    message: rawMessage,
  };
}

export async function analyzeWithOpenAI(input = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      code: "missing_api_key",
      message: "还没有配置接口密钥。ChatGPT Pro 和接口调用是分开的，需要先在网页里保存接口密钥。",
    };
  }

  const prompt = String(input.prompt || "").trim();
  if (!prompt) {
    return {
      ok: false,
      code: "missing_prompt",
      message: "没有收到牌谱内容。",
    };
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const localAnalysis = String(input.localAnalysis || "").trim();
  const userInput = localAnalysis
    ? `${prompt}\n\n网页本地快速分析参考：\n${localAnalysis}`
    : prompt;

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: SYSTEM_PROMPT,
      input: userInput,
      max_output_tokens: 900,
    }),
  });

  const responseJson = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = openaiError(responseJson, response.status);
    return {
      ok: false,
      code: error.code,
      message: error.message,
      status: response.status,
    };
  }

  const text = extractText(responseJson);
  return {
    ok: true,
    model,
    text: text || "智能教练没有返回可读文本，请稍后再试。",
  };
}
