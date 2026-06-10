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

const courseLessons = [
  {
    title: "短码翻前",
    tagline: "短码不是20BB就全下，先看有效筹码和行动节点。",
    keywords: ["短码", "短筹码", "20bb", "15bb", "10bb", "8bb", "5bb", "全下", "aof", "push", "jam", "反推", "跟住全下", "跟注全下"],
    points: [
      "默认用有效筹码判断，不用自己的总筹码误判风险。",
      "真正接近全下或弃牌的区间通常更短，20BB左右仍然有小加注、反推、跟注和弃牌的细分。",
      "短码看起来简单，但最容易因为跟错全下、反推过宽或过紧而损失大量EV。",
    ],
    drill: [
      "每天单独练5BB、8BB、10BB、15BB、20BB五个深度。",
      "每次只练一个位置，比如按钮位先手、盲位面对按钮位、面对枪口位open。",
      "把边界牌记成三类：稳定全下、混合可打、默认弃牌。",
    ],
    quiz: "20BB在按钮位拿一手边缘牌，能不能默认直接全下？",
    answer: "不能。20BB通常还要保留小加注和面对反推的策略，直接全下会浪费位置优势，也让强牌和弱牌更难区分。",
  },
  {
    title: "开池尺寸",
    tagline: "筹码越短，开池尺寸越小；但现场对手爱跟时可以 exploit 加大价值。",
    keywords: ["open", "开池", "加注尺寸", "2bb", "2.2bb", "2.5bb", "3bb", "偷盲", "盲注", "尺寸"],
    points: [
      "深码常用更大开池，60-100BB附近可用约2.5BB，30-60BB可降到约2.2BB，30BB以下常接近2BB。",
      "小尺寸让偷盲成本更低，也让你能用更完整的范围进入底池。",
      "如果桌上玩家非常爱跟注，强价值牌可以适当加大，目的是多拿价值，不是为了显得强硬。",
    ],
    drill: [
      "看每个筹码深度默认开池尺寸。",
      "练习同一手牌在100BB、40BB、20BB时计划有什么变化。",
      "复盘时标记：我是为了偷盲、价值，还是随手点了一个尺寸。",
    ],
    quiz: "为什么短筹码时不建议仍然开到3BB？",
    answer: "因为你投入比例太大，偷盲成本变高，面对反推也更难舒服弃牌。短码小尺寸更利于保持范围和风险控制。",
  },
  {
    title: "中码翻前",
    tagline: "20-60BB的差距来自3bet、4bet、反推和跟注边界。",
    keywords: ["中码", "中筹码", "20到60", "40bb", "60bb", "3bet", "3b", "4bet", "4b", "squeeze", "冷跟", "抵抗", "再加注"],
    points: [
      "20-60BB不只是翻牌前开池表，重点是面对open、3bet、4bet和squeeze时怎么继续。",
      "强牌承担价值；A/K类阻断牌常承担部分再加注诈唬；小对子和同花连接牌更多看赔率、位置和实现权益。",
      "每个再加注动作都要提前想好：如果对手全下，我这手牌是跟、弃，还是本来就该直接打光。",
    ],
    drill: [
      "分别练有位置3bet和没位置3bet。",
      "复盘所有被3bet的牌，写下继续理由。",
      "专门练小对子、Axs、Kxs这类边界牌。",
    ],
    quiz: "为什么小对子不总适合拿去3bet/fold？",
    answer: "小对子有一定摊牌权益和暗三价值，3bet后被全下再弃牌，会浪费本来可以实现的权益；它不是天然的阻断诈唬牌。",
  },
  {
    title: "翻后框架",
    tagline: "翻后先看范围对范围，再看自己的单手牌。",
    keywords: ["翻后", "范围", "权益", "坚果", "位置", "牌面结构", "湿润", "干燥", "动态", "静态", "范围优势"],
    points: [
      "先判断谁有范围优势、谁有坚果优势、谁有位置，最后再决定具体手牌打不打。",
      "高张干燥牌面通常更利于翻前进攻方；低张连牌和多听牌牌面常给防守方更多命中。",
      "单手牌要归类：价值、摊牌价值、半诈唬、空气牌。不同类别承担不同任务。",
    ],
    drill: [
      "每看一张翻牌，先说出它更像进攻方牌面还是防守方牌面。",
      "把自己的手牌标注成价值、摊牌价值、听牌或垃圾。",
      "同一个牌面练小注、大注、过牌三个选项的理由。",
    ],
    quiz: "AK在J-T-8这种低中连张牌面没成牌，为什么不能自动持续下注？",
    answer: "这类牌面更容易击中防守方跟注范围，AK虽然有高张和部分后门，但连续开火的基础不足，常需要更多过牌和控池。",
  },
  {
    title: "持续下注",
    tagline: "C-bet不是按钮反应，先看牌面、范围和后续转牌计划。",
    keywords: ["cbet", "c-bet", "持续下注", "下注", "过牌", "小注", "大注", "ak没中", "miss", "没中", "不中"],
    points: [
      "A/K/Q高、干燥、你有范围优势的牌面，可以更高频小注。",
      "低张连牌、两同花、顺听多、对大盲防守范围友好的牌面，要降低频率。",
      "下注前要知道转牌计划：哪些转牌继续打，哪些转牌放弃，哪些转牌转成摊牌价值。",
    ],
    drill: [
      "用同一手AK分别放到A72、K83、T98、876两同花四类牌面比较。",
      "每次C-bet前说一句：我下注是价值、保护、半诈唬，还是偷弃牌率。",
      "记录被跟注后的转牌计划，减少一枪后迷路。",
    ],
    quiz: "AK没中但有后门同花和后门顺子，和完全没后门有什么区别？",
    answer: "有后门时更适合做低频小注或继续代表强范围；完全没后门时实现权益差，过牌比例更高。",
  },
  {
    title: "复杂翻后",
    tagline: "过牌加注、缠打、延迟下注，核心都是权益实现和范围压力。",
    keywords: ["过牌加注", "check raise", "check-raise", "缠打", "延迟", "delayed", "没位置", "不利位置", "3bet池", "非大盲"],
    points: [
      "过牌加注常出现在没位置一方，用强价值和强听牌给对手范围施压。",
      "缠打不是乱跟，是用有转牌改善空间或可施压机会的牌继续。",
      "没位置时不要只看自己有牌没牌，还要看后续街能不能实现权益。",
    ],
    drill: [
      "挑10手没位置防守牌，标注哪些能过牌加注。",
      "复盘每个 flop 跟注，问自己转牌能继续的牌有多少。",
      "练习延迟C-bet：翻牌过牌后，哪些转牌适合重新下注。",
    ],
    quiz: "为什么没位置的弱后门牌不能随便缠打？",
    answer: "因为它后续实现权益很差，容易在转牌和河牌被迫弃牌，或者把小错误滚成大底池。",
  },
  {
    title: "ICM基础",
    tagline: "锦标赛后期争的不是筹码数量，而是奖金权益。",
    keywords: ["icm", "筹码价值", "奖金", "泡沫", "决赛桌", "ft", "风险溢价", "bubble factor", "chipEV", "icm ev"],
    points: [
      "现金局筹码接近线性，锦标赛筹码价值不是线性的。",
      "风险溢价越高，跟注全下越要收紧；尤其是会被覆盖时。",
      "ICM不是让你永远苟，而是让你知道什么时候该避险，什么时候该利用别人避险。",
    ],
    drill: [
      "复盘泡沫期所有全下和跟注全下。",
      "标记自己是大码、中码还是短码，以及谁覆盖谁。",
      "每次大底池前先问：输掉后我的名次权益会不会崩。",
    ],
    quiz: "泡沫期中等筹码为什么不能随便跟大码全下？",
    answer: "因为中等筹码被淘汰的代价非常高，跟注需要额外补偿风险溢价；很多chipEV接近的跟注在ICM下会变成弃牌。",
  },
  {
    title: "ICM应用",
    tagline: "同一手牌在前期、泡沫、刚进圈和决赛桌，答案可能完全不同。",
    keywords: ["票赛", "奖励分布", "钱圈", "进圈", "泡沫期", "决赛桌泡沫", "短码", "中码", "大码", "覆盖", "奖池结构"],
    points: [
      "ICM强弱取决于阶段、奖励分布、桌上筹码分布、谁覆盖谁。",
      "大码可以给中码压力，但不能用任何两张乱撞短码价值范围。",
      "短码不能只等死，要找有弃牌率或价值足够的点；中码要少和覆盖自己的大码打边缘大底池。",
    ],
    drill: [
      "同一手AJo分别放到前期、泡沫、FT泡沫，看策略如何变化。",
      "练习三种身份：大码施压、中码避险、短码找翻倍点。",
      "复盘时把chipEV答案和ICM答案分开写。",
    ],
    quiz: "为什么大码有压力优势，但仍不能乱跟短码全下？",
    answer: "施压优势主要来自你先行动时能逼别人弃牌；跟注短码全下时你的弃牌率消失了，只剩摊牌权益和ICM损失。",
  },
  {
    title: "训练方法",
    tagline: "课程不是看完就会，要把错误点变成每天训练题。",
    keywords: ["训练", "软件", "复习", "学习", "怎么学", "练习", "错题", "打分", "close decision", "表格", "范围表"],
    points: [
      "先练高频场景：短码翻前、盲位防守、面对3bet、持续下注、ICM全下。",
      "不要只看答案，重点看自己错在哪类边界牌。",
      "训练目标是稳定形成判断流程，而不是记住某一手牌的单次答案。",
    ],
    drill: [
      "每天选一个主题练20-50手，不要东点西点。",
      "所有错题只写三句话：我当时怎么想、正确原因、下次触发条件。",
      "分数稳定后再增加复杂场景，例如非大盲防守、3bet池、ICM决策。",
    ],
    quiz: "为什么学习范围表时要先看纯继续、纯弃牌，再看混合边界？",
    answer: "纯策略帮你建立骨架，混合边界帮你理解原因。先看边界会觉得全是频率，反而学不出稳定判断。",
  },
];

let activeStudyIndex = 0;
let quizAnswerVisible = false;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function listHtml(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function normalizedText(value) {
  return String(value).toLowerCase().replace(/\s+/g, "");
}

function matchedCourseLessons(question, limit = 2) {
  const q = normalizedText(question);
  if (!q) return [];

  return courseLessons
    .map((lesson) => {
      const title = normalizedText(lesson.title);
      let score = q.includes(title) ? 4 : 0;
      for (const keyword of lesson.keywords) {
        if (q.includes(normalizedText(keyword))) score += 2;
      }
      for (const point of lesson.points) {
        for (const token of ["范围", "ICM", "短码", "全下", "下注", "过牌", "训练", "牌面"]) {
          if (q.includes(normalizedText(token)) && normalizedText(point).includes(normalizedText(token))) score += 0.25;
        }
      }
      return { lesson, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.lesson);
}

function courseReferenceText(question) {
  const lessons = matchedCourseLessons(question, 2);
  if (!lessons.length) return "";
  return directAnswerSections([
    {
      title: "课程资料命中",
      body: lessons.map((lesson) => `${lesson.title}：${lesson.tagline}`).join("\n"),
    },
  ]);
}

function appendCourseReference(answer, question) {
  const reference = courseReferenceText(question);
  return reference ? `${answer}\n\n${reference}` : answer;
}

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

function renderStudyLesson() {
  const nav = $("#studyLessonNav");
  const card = $("#studyLessonCard");
  if (!nav || !card) return;

  nav.innerHTML = courseLessons
    .map((lesson, index) => (
      `<button class="study-chip ${index === activeStudyIndex ? "active" : ""}" data-study-index="${index}" type="button">${escapeHtml(lesson.title)}</button>`
    ))
    .join("");

  const lesson = courseLessons[activeStudyIndex];
  card.innerHTML = `
    <h3>${escapeHtml(lesson.title)}</h3>
    <p class="study-tagline">${escapeHtml(lesson.tagline)}</p>
    <div class="study-block">
      <strong>核心要点</strong>
      ${listHtml(lesson.points)}
    </div>
    <div class="study-block">
      <strong>怎么练</strong>
      ${listHtml(lesson.drill)}
    </div>
    <div class="study-quiz">
      <strong>自测题</strong>
      ${escapeHtml(lesson.quiz)}
    </div>
    <div class="study-answer ${quizAnswerVisible ? "show" : ""}">
      <strong>答案：</strong>${escapeHtml(lesson.answer)}
    </div>
  `;

  $$(".study-chip").forEach((button) => button.addEventListener("click", () => {
    activeStudyIndex = Number(button.dataset.studyIndex);
    quizAnswerVisible = false;
    renderStudyLesson();
  }));

  $("#quizRevealButton").textContent = quizAnswerVisible ? "收起答案" : "看自测答案";
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
  const matchedLessons = matchedCourseLessons(question, 3);
  const courseContext = matchedLessons.length
    ? matchedLessons.map((lesson) => `【${lesson.title}】${lesson.tagline}\n核心：${lesson.points.join("；")}\n练习：${lesson.drill.join("；")}`).join("\n\n")
    : "没有命中特定课程模块，按通用GTO教练框架回答。";

  return `请你作为德州扑克 GTO 专家教练，回答我的学习问题。

我的问题：
${question}

当前页面牌局信息：
${activeHandSummary()}

课程资料整理出的回答原则：
${coursePrinciples.map((item) => `- ${item}`).join("\n")}

逐字稿提炼出的相关课程知识：
${courseContext}

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
  const answer = appendCourseReference(localDirectAnswer(question), question);
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
  $("#prevLessonButton").addEventListener("click", () => {
    activeStudyIndex = (activeStudyIndex + courseLessons.length - 1) % courseLessons.length;
    quizAnswerVisible = false;
    renderStudyLesson();
  });
  $("#nextLessonButton").addEventListener("click", () => {
    activeStudyIndex = (activeStudyIndex + 1) % courseLessons.length;
    quizAnswerVisible = false;
    renderStudyLesson();
  });
  $("#quizRevealButton").addEventListener("click", () => {
    quizAnswerVisible = !quizAnswerVisible;
    renderStudyLesson();
  });
  $("#saveApiKeyButton").addEventListener("click", saveConfig);
  $("#jumpAnalyzeButton").addEventListener("click", () => $("#handBuilder").scrollIntoView({ block: "start" }));
  $("#jumpAskButton").addEventListener("click", () => $("#askPanel").scrollIntoView({ block: "start" }));
  $("#jumpStudyButton").addEventListener("click", () => $("#studyPanel").scrollIntoView({ block: "start" }));
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
renderStudyLesson();
renderAll();
refreshConfig();
