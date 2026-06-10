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

const coursePrinciples = [
  "现代扑克先看范围对范围，不是只问单手牌怎么打。",
  "翻前表格是基准，不是死背答案；要理解位置、筹码深度、行动背景和边界牌。",
  "锦标赛的核心在中短码、翻前决策和 ICM；100BB 前期重要性低于中后期关键决策。",
  "短码先以 chipEV 范围做基准，再根据泡沫期、决赛桌、奖池结构和风险溢价调整。",
  "翻后先看双方范围的权益优势、坚果优势、位置和牌面结构，再挑具体手牌下注或过牌。",
  "边缘正EV不等于必须打大；要比较跟注、全下、再加注和弃牌的 EV 与风险。",
];

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

function renderQuestionAnswer(text, className = "ai-output") {
  const el = document.createElement("pre");
  el.className = className;
  el.textContent = text;
  $("#coachQuestionAnswer").replaceChildren(el);
}

function activeHandSummary() {
  const lines = [
    `游戏：${state.gameType}`,
    `人数：${state.tableSize}`,
    `有效筹码：${$("#stackInput").value}个大盲`,
    `位置：我在 ${state.heroPos}，对手 ${state.villainPositions.join("、") || "未选择"}`,
    `我的手牌：${cardsText(state.heroCards)}`,
    boardText(),
  ];
  return lines.join("\n");
}

function directAnswerSections(sections) {
  return sections.map((section) => `【${section.title}】\n${section.body}`).join("\n\n");
}

function directQuestionPrompt(question, localAnswer = "") {
  return `请你作为德州扑克 GTO 专家教练，回答我的学习问题。

我的问题：
${question}

当前页面牌局信息：
${activeHandSummary()}

课程资料整理出的回答原则：
${coursePrinciples.map((item) => `- ${item}`).join("\n")}

本地教练先给出的参考回答：
${localAnswer || "无"}

回答要求：
简洁、直接，像教练复盘。先给结论，再讲为什么和怎么练。不要长篇公式。`;
}

function localDirectAnswer(question) {
  const q = question.toLowerCase();
  const hasHand = state.heroCards.length === 2;
  const handLine = hasHand ? `当前你选的是 ${cardsText(state.heroCards)}，可以把它放进这个框架里判断。` : "如果你也选了手牌和位置，我还可以把这套判断套到当前牌局。";

  if (/(ak|a\s*k|a高|a k)/i.test(question) && /(miss|没中|不中|打不打|持续下注|c.?bet|下注)/i.test(question)) {
    return directAnswerSections([
      { title: "一句话结论", body: "AK没中不是自动下注，也不是自动放弃；看牌面、范围优势、后门权益和对手弃牌率。" },
      { title: "怎么判断", body: "A/K/Q高、干燥、你有翻前范围优势的牌面，可以小注；低张连牌、同花听牌多、明显更利于大盲防守的牌面，多过牌。" },
      { title: "牌的定位", body: "AK高通常有摊牌价值和阻断，但如果没有后门同花、后门顺子，也很难连续开火。" },
      { title: "对手调整", body: "对手爱弃牌，可以多打一枪；对手很爱跟注，少用AK高硬诈唬，把钱留给价值牌。" },
      { title: "学习重点", body: `课程核心是范围之战：先问这张牌面对谁的整体范围有利，再问我的AK是不是适合下注的那一类。${handLine}` },
    ]);
  }

  if (/(icm|泡沫|决赛|ft|风险溢价|筹码价值|奖金|苟|狗|冲)/i.test(question)) {
    return directAnswerSections([
      { title: "一句话结论", body: "锦标赛不是单纯争筹码，后期要争的是ICM EV；泡沫期和决赛桌会让很多chipEV能打的牌变成要收紧。" },
      { title: "核心逻辑", body: "常规桌每个筹码接近等值；锦标赛里筹码越多，边际价值越低。中等筹码最怕和覆盖自己的大筹码打大底池。" },
      { title: "实战调整", body: "短码该找好机会全下；中等码少和大码边缘碰撞；大码可以利用别人风险溢价施压，但不能乱送。" },
      { title: "常见错误", body: "不要为了进圈过度弃牌，也不要在高ICM阶段把边缘正EV牌打成大波动。" },
      { title: "学习重点", body: "先分清当前是前期、泡沫、刚进圈、FT泡沫还是决赛桌；阶段不同，同一手牌的策略会变。" },
    ]);
  }

  if (/(短码|中短码|全下|all.?in|aof|反推|push|jam|推|10bb|8bb|5bb|15bb|20bb)/i.test(question)) {
    return directAnswerSections([
      { title: "一句话结论", body: "短码翻前先看表格基准：5到10BB多是全下/弃牌，20BB左右重点是open后面对反推和3bet的抵抗。" },
      { title: "判断顺序", body: "先看有效筹码，再看位置，再看前面有没有open，最后看自己这手牌是价值全下、跟注全下、反推诈唬还是直接弃牌。" },
      { title: "什么牌适合推", body: "高对子、强A、高张同花是价值；带阻断的A/Kx更适合做反推；小对子和同花连接牌要看深度和对手范围，不能无脑打光。" },
      { title: "对手调整", body: "对手开得松，可以增加反推；对手开得紧，跟注和反推都要收紧。" },
      { title: "学习重点", body: "不要只背某一格颜色，要记边界：哪些牌是纯打、哪些是混合、哪些只在对手过松时进入。" },
    ]);
  }

  if (/(范围|表格|gto|原理|怎么学|学习|死背|背表)/i.test(question)) {
    return directAnswerSections([
      { title: "一句话结论", body: "GTO学习不是背表，而是理解表格为什么这样构建，然后在实战里根据位置、筹码和对手偏差调整。" },
      { title: "核心原理", body: "先从范围对范围看局面：谁有权益优势、谁有坚果优势、谁的位置更好、谁的范围更宽或更紧。" },
      { title: "怎么学表", body: "每次只学一个场景：比如20BB BB vs BTN open。先记纯继续、纯弃牌、混合边界，再看为什么这些边界牌被选中。" },
      { title: "实战用法", body: "默认用GTO做底线；对手爱跟就少诈唬多价值，对手爱弃就增加低成本诈唬，对手紧就尊重大动作。" },
      { title: "学习重点", body: "把每手牌归类成价值、摊牌价值、听牌/半诈唬、垃圾牌，比死记一个频率更重要。" },
    ]);
  }

  if (/(3bet|3b|4bet|4b|反抢|小对子|33|44|jj|冷跟)/i.test(question)) {
    return directAnswerSections([
      { title: "一句话结论", body: "3bet/4bet不是看牌面好不好看，而是看它适合价值、诈唬还是跟注实现权益。" },
      { title: "小对子逻辑", body: "小对子常有摊牌权益，但不适合拿去3bet/fold；因为被推回来时会浪费掉本来可以实现的权益。" },
      { title: "阻断牌逻辑", body: "A/K阻断牌更适合做部分诈唬再加注，因为它减少对手有AA、KK、AK等顶端牌的概率。" },
      { title: "推荐思路", body: "强牌打价值；中等对子多跟注或按表防守；阻断牌承担一部分诈唬；太边缘就弃牌。" },
      { title: "学习重点", body: "不要只问'这手牌能不能加'，要问'加完面对全下怎么办'。" },
    ]);
  }

  if (/(大盲|bb|防守|按钮|btn|偷盲|跟注)/i.test(question)) {
    return directAnswerSections([
      { title: "一句话结论", body: "大盲防守要比其他位置宽，但宽不等于乱打；便宜防守可以，翻后别把边缘牌打成大底池。" },
      { title: "为什么", body: "大盲已经投入盲注，面对按钮位宽范围open有更好的底池赔率，所以很多同花、连接、带高张的牌可以继续。" },
      { title: "推荐打法", body: "面对小尺寸open多跟注；面对大尺寸open收紧；有强阻断和合适深度时才考虑反推或3bet。" },
      { title: "翻后重点", body: "命中顶对好踢脚、两对、顺子、强听牌再继续；弱对和无后门高牌多控池。" },
      { title: "学习重点", body: `${handLine} 大盲防守的目标是实现权益，不是证明每手牌都能赢。` },
    ]);
  }

  const result = hasHand ? makeCoachSections() : null;
  if (result && result.status !== "还不能分析") {
    return `${directAnswerSections([
      { title: "一句话结论", body: "这个问题可以先套当前牌局的快速教练框架：定位牌力，再决定价值、控池、防守或放弃。" },
      { title: "当前牌局参考", body: sectionsText(result).replace(/\n+/g, " ").slice(0, 420) },
      { title: "学习重点", body: "你问得不够具体时，先补充位置、有效筹码、行动线、牌面和对手类型，答案会准很多。" },
    ])}`;
  }

  return directAnswerSections([
    { title: "一句话结论", body: "这个问题要先补齐场景：游戏类型、筹码深度、位置、行动线和对手类型。" },
    { title: "通用框架", body: "翻前看范围表和筹码深度；翻后看范围优势、坚果优势、牌面结构、位置和对手倾向。" },
    { title: "课程原则", body: "不要死背单手牌答案，要学会从表格背后的逻辑推导：为什么这类牌继续，为什么那类牌弃牌。" },
    { title: "你可以这样问", body: "例如：'25BB 大盲位 98o 面对按钮位open能不能跟？' 或 'AK在T98两同花没中要不要c-bet？'" },
  ]);
}

function directAnswerQuestion() {
  const question = $("#coachQuestionInput").value.trim();
  if (!question) {
    renderQuestionAnswer("先输入你的问题，比如：AK没中到底要不要下注？", "empty-note");
    return "";
  }
  const answer = localDirectAnswer(question);
  renderQuestionAnswer(answer);
  return answer;
}

async function smartQuestionAnswer() {
  const question = $("#coachQuestionInput").value.trim();
  if (!question) {
    renderQuestionAnswer("先输入你的问题，比如：短码什么时候可以反推？", "empty-note");
    return;
  }

  const localAnswer = directAnswerQuestion();
  const button = $("#smartQuestionButton");
  button.disabled = true;
  button.textContent = "补充中...";

  try {
    const res = await fetch("/api/analyze-ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: directQuestionPrompt(question, localAnswer), localAnalysis: localAnswer }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.message || "智能补充失败。");
    renderQuestionAnswer(data.text);
  } catch (error) {
    renderQuestionAnswer(`${localAnswer}\n\n【智能补充】\n${error.message}`, "ai-output");
  } finally {
    button.disabled = false;
    button.textContent = "智能补充";
  }
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
  $("#directAnswerButton").addEventListener("click", directAnswerQuestion);
  $("#smartQuestionButton").addEventListener("click", smartQuestionAnswer);
  $$(".quick-question").forEach((button) => button.addEventListener("click", () => {
    $("#coachQuestionInput").value = button.dataset.question;
    directAnswerQuestion();
  }));
  $("#saveApiKeyButton").addEventListener("click", saveConfig);
  $("#jumpAnalyzeButton").addEventListener("click", () => $("#handBuilder").scrollIntoView({ block: "start" }));
  $("#jumpAskButton").addEventListener("click", () => $("#askPanel").scrollIntoView({ block: "start" }));
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
