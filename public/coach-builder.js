const ranks = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
const suits = [
  { code: "s", symbol: "♠", color: "black" },
  { code: "h", symbol: "♥", color: "red" },
  { code: "d", symbol: "♦", color: "red" },
  { code: "c", symbol: "♣", color: "black" },
];

const rankValue = { A: 14, K: 13, Q: 12, J: 11, 10: 10, 9: 9, 8: 8, 7: 7, 6: 6, 5: 5, 4: 4, 3: 3, 2: 2 };
const targetOrder = ["heroCards", "flopCards", "turnCard", "riverCard"];
const targetLimits = { heroCards: 2, flopCards: 3, turnCard: 1, riverCard: 1 };
const targetLabels = { heroCards: "我的手牌", flopCards: "翻牌", turnCard: "转牌", riverCard: "河牌" };

const state = {
  gameType: "现金局",
  tableSize: "6人",
  heroPos: "按钮位",
  villainPositions: ["大盲位"],
  opponentTypes: ["未知"],
  questionType: "请用简洁教练风格告诉我这手牌应该怎么打。",
  activeCardTarget: "heroCards",
  heroCards: [],
  flopCards: [],
  turnCard: [],
  riverCard: [],
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function rankText(rank) {
  return rank === "T" ? "10" : rank;
}

function cardText(card) {
  return `${rankText(card.rank)}${card.symbol}`;
}

function cardKey(card) {
  return `${card.rank}${card.suit}`;
}

function normalizeRank(rank) {
  const value = rank.toUpperCase();
  return value === "T" ? "10" : value;
}

function cardFromToken(token) {
  const match = token.trim().match(/^(10|[AKQJT98765432])([shdc♠♥♦♣])$/i);
  if (!match) return null;
  const rank = normalizeRank(match[1]);
  const suitRaw = match[2].toLowerCase();
  const suit = suits.find((item) => item.code === suitRaw || item.symbol === match[2]);
  return suit ? { rank, suit: suit.code, symbol: suit.symbol, color: suit.color } : null;
}

function selectedCards() {
  return [...state.heroCards, ...state.flopCards, ...state.turnCard, ...state.riverCard];
}

function sameCard(a, b) {
  return a.rank === b.rank && a.suit === b.suit;
}

function hasCard(cards, card) {
  return cards.some((item) => sameCard(item, card));
}

function cardsText(cards) {
  return cards.length ? cards.map(cardText).join(" ") : "未选择";
}

function defaultVillainForHero(heroPosition) {
  if (heroPosition === "大盲位") return "按钮位";
  if (heroPosition === "小盲位") return "大盲位";
  return "大盲位";
}

function tidyVillainPositions() {
  state.villainPositions = state.villainPositions.filter((position) => position !== state.heroPos);
  if (!state.villainPositions.length) state.villainPositions = [defaultVillainForHero(state.heroPos)];
}

function setCopyStatus(message, kind = "") {
  const el = $("#copyStatus");
  el.textContent = message;
  el.classList.toggle("success", kind === "success");
}

function renderCards() {
  const grid = $("#cardGrid");
  const used = selectedCards();
  const activeCards = state[state.activeCardTarget];
  grid.innerHTML = "";

  for (const suit of suits) {
    for (const rank of ranks) {
      const card = { rank, suit: suit.code, symbol: suit.symbol, color: suit.color };
      const selected = hasCard(activeCards, card);
      const unavailable = hasCard(used, card) && !selected;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `card ${suit.color === "red" ? "red" : ""} ${selected ? "selected" : ""} ${unavailable ? "used" : ""}`;
      button.textContent = cardText(card);
      button.disabled = unavailable;
      button.addEventListener("click", () => toggleCard(card));
      grid.appendChild(button);
    }
  }
}

function toggleCard(card) {
  const cards = state[state.activeCardTarget];
  if (hasCard(cards, card)) {
    state[state.activeCardTarget] = cards.filter((item) => !sameCard(item, card));
  } else {
    if (cards.length >= targetLimits[state.activeCardTarget]) cards.shift();
    cards.push(card);
    if (cards.length >= targetLimits[state.activeCardTarget]) moveNextTarget();
  }
  renderAll();
}

function moveNextTarget() {
  const next = targetOrder[targetOrder.indexOf(state.activeCardTarget) + 1];
  if (next) state.activeCardTarget = next;
}

function renderPreviews() {
  for (const key of targetOrder) {
    $(`#${key}Preview`).textContent = cardsText(state[key]);
  }

  $$(".card-target").forEach((button) => button.classList.toggle("active", button.dataset.target === state.activeCardTarget));
  $$("[data-card-input]").forEach((input) => {
    if (document.activeElement !== input) input.value = state[input.dataset.cardInput].map(cardText).join(" ");
  });

  const active = state.activeCardTarget;
  $("#cardHelperText").textContent = `当前选择：${targetLabels[active]}，需要 ${targetLimits[active]} 张，已选 ${state[active].length} 张。`;
}

function syncControls() {
  $$("[data-group]").forEach((group) => {
    const key = group.dataset.group;
    group.querySelectorAll(".choice").forEach((button) => button.classList.toggle("active", button.dataset.value === state[key]));
  });

  $$("[data-multi]").forEach((group) => {
    const key = group.dataset.multi;
    group.querySelectorAll(".choice").forEach((button) => button.classList.toggle("active", state[key].includes(button.dataset.value)));
  });

  const blind = $("#blindsInput").value.trim();
  $$("[data-blind]").forEach((button) => button.classList.toggle("active", button.dataset.blind === blind));
  const stack = $("#stackInput").value;
  $$("[data-stack]").forEach((button) => button.classList.toggle("active", button.dataset.stack === stack));
}

function boardText() {
  const parts = [];
  if (state.flopCards.length) parts.push(`翻牌：${cardsText(state.flopCards)}`);
  if (state.turnCard.length) parts.push(`转牌：${cardsText(state.turnCard)}`);
  if (state.riverCard.length) parts.push(`河牌：${cardsText(state.riverCard)}`);
  return parts.length ? parts.join("\n") : "公共牌：未选择";
}

function generatePrompt() {
  const opponent = state.opponentTypes.length ? state.opponentTypes.join("、") : "未知";
  return `请你作为德州扑克 GTO 专家教练，帮我专业分析这手牌。

游戏：${state.gameType}
人数：${state.tableSize}
盲注：${$("#blindsInput").value.trim() || "未填写"}
有效筹码：${$("#stackInput").value}个大盲
位置：我在 ${state.heroPos}，对手位置 ${state.villainPositions.join("、") || "未选择"}
我的手牌：${cardsText(state.heroCards)}

${boardText()}

翻前行动：
${$("#preflopInput").value.trim() || "未填写"}

翻牌行动：
${$("#flopInput").value.trim() || "未填写"}

转牌行动：
${$("#turnInput").value.trim() || "未填写"}

河牌行动：
${$("#riverInput").value.trim() || "未填写"}

对手信息：
${opponent}

我的问题：
${state.questionType}

回答要求：
默认保持简洁，像教练复盘一样直接。数学模型只在影响决策时用一两句话说明，不要展开长篇公式。

请按这个结构回答：
【一句话结论】
【牌的定位】
【推荐打法】
【对手调整】
【为什么】
【最终建议】
【学习重点】`;
}

function preflopProfile() {
  const [a, b] = state.heroCards;
  const values = [rankValue[a.rank], rankValue[b.rank]].sort((x, y) => y - x);
  const pair = a.rank === b.rank;
  const suited = a.suit === b.suit;
  const gap = Math.abs(values[0] - values[1]);
  const low = values[1];
  const high = values[0];

  if (pair && high >= 11) return ["高对子", "强价值牌", "主动加注或再加注"];
  if (pair && high >= 8) return ["中等对子", "中强牌", "可以继续，但不适合无脑打光"];
  if (pair) return ["小对子", "看翻牌型牌", "便宜入池看暗三价值"];
  if (high === 14 && low >= 12) return [suited ? "同花强A高牌" : "强A高牌", "强起手牌", "可以主动打价值"];
  if (high === 14 && suited) return ["同花A高牌", "可进攻/可防守牌", "有阻断和坚果同花潜力"];
  if (low >= 10) return [suited ? "同花高张" : "非同花高张", "可继续牌", "注意反向隐含赔率"];
  if (gap === 1 && suited) return ["同花连接牌", "投机型可防守牌", "靠顺子、同花和强听牌赚钱"];
  if (gap === 1) return ["非同花连接牌", "边缘可防守牌", "靠顺子、两对和强听牌赚钱"];
  if (suited && gap <= 3) return ["同花间隔牌", "投机型边缘牌", "适合便宜看翻牌"];
  return ["弱边缘牌", "弱牌/弃牌候选", "除非赔率很好，否则不用硬防守"];
}

function boardProfile() {
  const board = [...state.flopCards, ...state.turnCard, ...state.riverCard];
  const hero = state.heroCards;
  const boardRanks = new Set(board.map((card) => card.rank));
  const paired = hero.filter((card) => boardRanks.has(card.rank));
  const top = Math.max(...board.map((card) => rankValue[card.rank]));
  if (!paired.length) return ["未成牌", "弱摊牌价值/半诈唬候选"];
  const best = paired.sort((a, b) => rankValue[b.rank] - rankValue[a.rank])[0];
  if (rankValue[best.rank] === top) return [`顶对 ${rankText(best.rank)}`, "薄价值/中强摊牌价值"];
  return [`${rankText(best.rank)} 对`, "中等摊牌价值"];
}

function makeCoachSections() {
  if (state.heroCards.length < 2) {
    return { status: "还不能分析", sections: [{ title: "需要补充", body: "请先选择完整的两张手牌。" }] };
  }
  if (state.flopCards.length > 0 && state.flopCards.length < 3) {
    return { status: "还不能分析", sections: [{ title: "需要补充", body: "翻牌只选了一部分。请补齐三张翻牌，或清空翻牌按翻前局面分析。" }] };
  }

  const isPreflop = state.flopCards.length < 3;
  const loose = state.opponentTypes.some((item) => item.includes("偏松"));
  const tight = state.opponentTypes.some((item) => item.includes("偏紧"));
  const [name, strength, plan] = isPreflop ? preflopProfile() : boardProfile();
  const heroBb = state.heroPos === "大盲位";
  const lateVillain = state.villainPositions.some((pos) => ["按钮位", "关煞位", "小盲位"].includes(pos));
  const facingAllIn = /全下|all.?in/i.test($("#preflopInput").value + $("#riverInput").value);

  let conclusion = isPreflop ? "这手牌翻前可以低成本继续，但不是价值牌。" : "当前牌力不要无脑打大，先判断价值和摊牌价值。";
  let recommendation = isPreflop ? "面对常规小加注可以跟注；面对大加注或全下弃牌。" : "中等牌控池，强牌下注拿价值，弱牌减少硬诈唬。";
  let adjustment = "对手未知时按标准范围处理。";
  let why = `${cardsText(state.heroCards)} 是${name}，属于${strength}，${plan}。`;
  let finalAdvice = isPreflop ? "便宜看翻牌，命中强牌或强听牌再继续打大。" : "不要把小错滚成大底池。";
  let study = "学习重点：先分清价值牌、防守牌、摊牌价值和诈唬候选。";

  if (isPreflop && heroBb && lateVillain && name.includes("非同花连接牌")) {
    conclusion = "面对按钮位常规加注，这手牌大盲位可以跟注防守，但不是价值牌。";
    recommendation = "对手小加注时跟注；加到 3个大盲以上收紧；不建议再加注诈唬。";
    finalAdvice = "默认跟注看翻牌，命中两对、顺子或强听牌再继续。";
  }

  if (facingAllIn && strength !== "强价值牌") {
    conclusion = "面对全下，这手牌应该弃牌。";
    recommendation = "不要跟全下，也不要反推。";
    finalAdvice = "保留筹码，等更好的对子、高牌或同花A类牌。";
  }

  if (loose) adjustment = "对手偏松：他的范围更宽，你可以多防守一点；但边缘牌不要主动打大。";
  if (tight) adjustment = "对手偏紧：他的范围更强，边缘牌要收紧，面对大加注直接弃牌。";

  return {
    status: isPreflop ? "已生成翻前教练分析" : "已生成本地教练分析",
    sections: [
      { title: "一句话结论", body: conclusion },
      { title: "牌的定位", body: `${cardsText(state.heroCards)} 是${name}，属于${strength}。` },
      { title: "推荐打法", body: recommendation },
      { title: "对手调整", body: adjustment },
      { title: "为什么", body: why },
      { title: "最终建议", body: finalAdvice },
      { title: "学习重点", body: study },
    ],
  };
}

function renderAnalysis() {
  const result = makeCoachSections();
  $("#analysisStatus").textContent = result.status;
  $("#analysisResult").innerHTML = result.sections
    .map((section) => `<section class="coach-section"><h3>${section.title}</h3><p>${section.body}</p></section>`)
    .join("");
}

function sectionsText(result) {
  return result.sections.map((section) => `【${section.title}】\n${section.body}`).join("\n\n");
}

function renderPlain(text, className = "ai-output") {
  const el = document.createElement("pre");
  el.className = className;
  el.textContent = text;
  $("#analysisResult").replaceChildren(el);
}

function modelLabel(model) {
  return { "gpt-4.1-mini": "日常学习", "gpt-4.1": "更细复盘", "gpt-5.2": "更强分析" }[model] || "自定义";
}

function publicUrl() {
  return location.protocol.startsWith("http") ? `${location.protocol}//${location.host}` : "";
}

function applyConfig(config) {
  $("#apiSetupBadge").textContent = config.hasApiKey ? "已配置" : "未配置";
  if (config.model) $("#modelInput").value = config.model;
  const canConfigure = config.browserConfigEnabled !== false;
  $("#apiKeyInput").disabled = !canConfigure;
  $("#modelInput").disabled = !canConfigure;
  $("#saveApiKeyButton").disabled = !canConfigure;

  if (!canConfigure) {
    $("#apiKeyInput").placeholder = "云端版密钥在平台环境变量中设置";
    $("#apiSetupStatus").textContent = config.hasApiKey
      ? `云端智能分析已配置，当前强度：${modelLabel(config.model)}。`
      : "云端还没有配置接口密钥，请在部署平台环境变量中设置 OPENAI_API_KEY。";
  } else {
    $("#apiSetupStatus").textContent = config.hasApiKey ? `智能分析已配置，当前强度：${modelLabel(config.model)}。` : "还没有配置智能分析密钥。";
  }
  $("#apiSetupStatus").className = `setup-status ${config.hasApiKey ? "success" : ""}`;
  $("#phoneAccessValue").textContent = config.networkUrls?.[0] || "未检测到";
  $("#publicAccessValue").textContent = publicUrl() || "本地页面";
}

async function refreshConfig() {
  try {
    const res = await fetch("/api/config");
    applyConfig(await res.json());
  } catch {
    $("#apiSetupBadge").textContent = "离线";
    $("#apiSetupStatus").textContent = "没有连上本地服务。";
    $("#apiSetupStatus").className = "setup-status error";
  }
}

async function saveConfig() {
  const button = $("#saveApiKeyButton");
  const body = { apiKey: $("#apiKeyInput").value.trim(), model: $("#modelInput").value };
  const alreadyConfigured = $("#apiSetupBadge").textContent === "已配置";
  if (!body.apiKey && !alreadyConfigured) {
    $("#apiSetupStatus").textContent = "请先粘贴接口密钥。";
    $("#apiSetupStatus").className = "setup-status error";
    return;
  }

  button.disabled = true;
  button.textContent = "保存中...";
  try {
    const res = await fetch("/api/config/openai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.message || "保存失败。");
    $("#apiKeyInput").value = "";
    applyConfig(data);
  } catch (error) {
    $("#apiSetupStatus").textContent = error.message;
    $("#apiSetupStatus").className = "setup-status error";
  } finally {
    button.disabled = false;
    button.textContent = "保存配置";
  }
}

async function smartAnalysis() {
  const result = makeCoachSections();
  if (result.status === "还不能分析") {
    renderAnalysis();
    return;
  }

  $("#aiAnalyzeButton").disabled = true;
  $("#aiAnalyzeButton").textContent = "分析中...";
  $("#analysisStatus").textContent = "智能教练正在复盘...";
  renderPlain("正在连接智能教练，请稍等。", "empty-note");

  try {
    const res = await fetch("/api/analyze-ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: generatePrompt(), localAnalysis: sectionsText(result) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.message || "智能分析失败。");
    $("#analysisStatus").textContent = `智能深度分析已完成｜${modelLabel(data.model)}`;
    renderPlain(data.text);
  } catch (error) {
    $("#analysisStatus").textContent = "智能分析暂时不可用";
    renderPlain(error.message, "empty-note");
  } finally {
    $("#aiAnalyzeButton").disabled = false;
    $("#aiAnalyzeButton").textContent = "智能深度分析";
  }
}

function updateOutput() {
  $("#promptOutput").value = generatePrompt();
}

function renderAll() {
  renderPreviews();
  syncControls();
  renderCards();
  updateOutput();
}

function bindControls() {
  $$("[data-group]").forEach((group) => {
    const key = group.dataset.group;
    group.querySelectorAll(".choice").forEach((button) => {
      button.addEventListener("click", () => {
        state[key] = button.dataset.value;
        if (key === "heroPos") tidyVillainPositions();
        renderAll();
      });
    });
  });

  $$("[data-multi]").forEach((group) => {
    const key = group.dataset.multi;
    group.querySelectorAll(".choice").forEach((button) => {
      button.addEventListener("click", () => {
        const value = button.dataset.value;
        if (key === "villainPositions" && value === state.heroPos) return;
        if (value === "未知") {
          state[key] = ["未知"];
        } else {
          state[key] = state[key].filter((item) => item !== "未知");
          state[key] = state[key].includes(value) ? state[key].filter((item) => item !== value) : [...state[key], value];
        }
        if (!state[key].length) state[key] = key === "villainPositions" ? [defaultVillainForHero(state.heroPos)] : ["未知"];
        renderAll();
      });
    });
  });

  $$("[data-blind]").forEach((button) => button.addEventListener("click", () => {
    $("#blindsInput").value = button.dataset.blind;
    renderAll();
  }));

  $$("[data-stack]").forEach((button) => button.addEventListener("click", () => {
    $("#stackInput").value = button.dataset.stack;
    $("#stackOutput").textContent = `${button.dataset.stack}个大盲`;
    renderAll();
  }));

  $("#stackInput").addEventListener("input", () => {
    $("#stackOutput").textContent = `${$("#stackInput").value}个大盲`;
    renderAll();
  });

  ["blindsInput", "preflopInput", "flopInput", "turnInput", "riverInput"].forEach((id) => $(`#${id}`).addEventListener("input", updateOutput));

  $$(".card-target").forEach((button) => button.addEventListener("click", () => {
    state.activeCardTarget = button.dataset.target;
    renderAll();
  }));

  $$("[data-card-input]").forEach((input) => {
    input.addEventListener("input", () => {
      const cards = input.value.split(/[\s,，/]+/).filter(Boolean).map(cardFromToken).filter(Boolean).slice(0, targetLimits[input.dataset.cardInput]);
      const others = selectedCards().filter((card) => !state[input.dataset.cardInput].some((item) => sameCard(item, card)));
      state[input.dataset.cardInput] = cards.filter((card, index) => !hasCard(others, card) && !cards.slice(0, index).some((item) => sameCard(item, card)));
      renderAll();
    });
    input.addEventListener("focus", () => {
      state.activeCardTarget = input.dataset.cardInput;
      renderAll();
    });
  });

  $$(".quick-action").forEach((button) => button.addEventListener("click", () => {
    $(`#${button.dataset.street}Input`).value = button.dataset.text;
    updateOutput();
  }));

  $("#analyzeButton").addEventListener("click", renderAnalysis);
  $("#aiAnalyzeButton").addEventListener("click", smartAnalysis);
  $("#saveApiKeyButton").addEventListener("click", saveConfig);
  $("#jumpAnalyzeButton").addEventListener("click", () => $("#handBuilder").scrollIntoView({ block: "start" }));
  $("#jumpConfigButton").addEventListener("click", () => $("#accessPanel").scrollIntoView({ block: "start" }));
  $("#copyPhoneUrlButton").addEventListener("click", () => navigator.clipboard.writeText(publicUrl()).catch(() => {}));
  $("#copyButton").addEventListener("click", async () => {
    await navigator.clipboard.writeText($("#promptOutput").value).catch(() => {});
    setCopyStatus("已复制。", "success");
  });
  $("#clearButton").addEventListener("click", () => {
    state.heroCards = [];
    state.flopCards = [];
    state.turnCard = [];
    state.riverCard = [];
    state.activeCardTarget = "heroCards";
    renderAll();
  });
  $("#exampleButton").addEventListener("click", fillExample);
}

function fillExample() {
  state.gameType = "锦标赛";
  state.tableSize = "7人";
  state.heroPos = "大盲位";
  state.villainPositions = ["按钮位"];
  state.opponentTypes = ["偏松"];
  state.questionType = "请重点告诉我这手牌的牌力定位和是否应该继续打价值。";
  state.heroCards = [
    { rank: "9", suit: "s", symbol: "♠", color: "black" },
    { rank: "8", suit: "h", symbol: "♥", color: "red" },
  ];
  state.flopCards = [];
  state.turnCard = [];
  state.riverCard = [];
  $("#blindsInput").value = "1000/2000";
  $("#stackInput").value = 25;
  $("#stackOutput").textContent = "25个大盲";
  $("#preflopInput").value = "该如何行动";
  $("#flopInput").value = "";
  $("#turnInput").value = "";
  $("#riverInput").value = "";
  renderAll();
}

bindControls();
renderAll();
refreshConfig();
