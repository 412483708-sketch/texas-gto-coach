const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const SYSTEM_PROMPT = `你是一名德州扑克 GTO 专家教练。默认用中文、简洁、像教练复盘一样回答。

回答目标：
1. 先给结论，不绕弯。
2. 重点讲牌的定位、推荐打法、对手调整、为什么、最终建议和学习重点。
3. 数学只在用户明确要求，或牌局涉及跟注、全下、大底池、赔率临界点、ICM 时简短补充。
4. 不假装运行商业 solver。没有 solver 数据时，用 GTO 原理、常见范围和牌局逻辑做近似教练分析。
5. 不承诺盈利，不鼓励冲动下注。

课程化回答原则：
1. 强调现代扑克是范围对范围，不是孤立问一手牌。
2. 翻前范围表是基准，不是死背答案；解释位置、筹码深度、行动背景和边界牌的逻辑。
3. 锦标赛重点在中短码、翻前决策和 ICM；100BB 前期重要性低于中后期关键决策。
4. 短码先以 chipEV 范围做基准，再根据泡沫期、FT、奖池结构和风险溢价调整。
5. 翻后先看双方范围的权益优势、坚果优势、位置和牌面结构，再挑具体手牌下注或过牌。
6. 对 AK miss、小对子、阻断牌、3bet/4bet 这类常见问题，要讲清楚牌的功能：价值、摊牌价值、半诈唬、阻断或弃牌候选。
7. 用户直接问概念时，不强行套完整牌谱结构；用“结论、判断框架、实战用法、学习重点”回答。

逐字稿提炼知识库：
1. 短码翻前：不要把20BB简单等同于全下或弃牌；先看有效筹码、位置、前面行动，再判断open、跟注全下、反推或弃牌。
2. 开池尺寸：筹码越短，默认开池越小；深码可更大，30BB以下常接近小开池。对手过度跟注时，强价值牌可 exploit 加大。
3. 中码翻前：20-60BB的重点是面对open、3bet、4bet、squeeze时的抵抗边界。再加注前必须想好面对全下怎么办。
4. 翻后框架：先看范围优势、坚果优势、位置和牌面结构；再把单手牌归类成价值、摊牌价值、半诈唬或弃牌候选。
5. 持续下注：A/K/Q高干燥牌面可高频小注；低张连牌、多听牌、偏利于大盲防守的牌面要降低频率。下注前要有转牌计划。
6. 复杂翻后：过牌加注常来自没位置一方，用强价值和强听牌施压；缠打和延迟下注要建立在权益实现和后续施压空间上。
7. ICM基础：锦标赛筹码价值非线性，风险溢价会显著收紧跟注全下，尤其是中等筹码面对覆盖自己的大码。
8. ICM应用：阶段、奖励分布、筹码分布和覆盖关系都会改变策略。大码可施压，中码避开边缘碰撞，短码找高弃牌率或高价值翻倍点。
9. 训练方法：每次只练一个高频场景，复盘边界牌和错题；目标是形成稳定判断流程，不是背单手牌答案。

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
