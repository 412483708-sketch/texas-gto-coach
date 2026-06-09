const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function createNode(actions) {
  return {
    actions,
    regretSum: Object.fromEntries(actions.map((action) => [action, 0])),
    strategySum: Object.fromEntries(actions.map((action) => [action, 0])),
  };
}

function strategyFor(node, reachWeight) {
  const positiveRegrets = node.actions.map((action) => Math.max(0, node.regretSum[action]));
  const normalizer = positiveRegrets.reduce((sum, value) => sum + value, 0);
  const strategy = {};

  node.actions.forEach((action, index) => {
    strategy[action] = normalizer > 0 ? positiveRegrets[index] / normalizer : 1 / node.actions.length;
    node.strategySum[action] += reachWeight * strategy[action];
  });

  return strategy;
}

function averageStrategy(node) {
  const normalizer = node.actions.reduce((sum, action) => sum + node.strategySum[action], 0);
  const strategy = {};
  node.actions.forEach((action) => {
    strategy[action] = normalizer > 0 ? node.strategySum[action] / normalizer : 1 / node.actions.length;
  });
  return strategy;
}

function actionsFor(history) {
  if (history === "") return ["x", "b"];
  if (history === "x") return ["x", "b"];
  if (history === "b") return ["c", "f"];
  if (history === "xb") return ["c", "f"];
  return [];
}

function isTerminal(history) {
  return history === "xx" || history === "bc" || history === "bf" || history === "xbc" || history === "xbf";
}

function playerFor(history) {
  if (history === "") return 0;
  if (history === "x") return 1;
  if (history === "b") return 1;
  if (history === "xb") return 0;
  return -1;
}

function terminalPayoff({ cards, history, pot, bet }) {
  const p0Wins = cards[0] > cards[1];
  const showdownPayoff = history.includes("c") ? pot / 2 + bet : pot / 2;

  if (history === "xx" || history === "bc" || history === "xbc") {
    return p0Wins ? showdownPayoff : -showdownPayoff;
  }

  if (history === "bf") return pot / 2;
  if (history === "xbf") return -pot / 2;
  return 0;
}

function labelAction(history, action) {
  if (history === "" && action === "x") return "过牌";
  if (history === "" && action === "b") return "下注";
  if (history === "x" && action === "x") return "随后过牌";
  if (history === "x" && action === "b") return "下注";
  if (action === "c") return "跟注";
  if (action === "f") return "弃牌";
  return action;
}

export function solveRiverCfr(input = {}) {
  const buckets = Math.round(clamp(Number(input.buckets || 13), 5, 20));
  const iterations = Math.round(clamp(Number(input.iterations || 1800), 200, 12000));
  const pot = 1;
  const bet = clamp(Number(input.betSizePot || 0.75), 0.25, 1.5) * pot;
  const nodes = new Map();

  function getNode(player, card, history) {
    const key = `${player}|${card}|${history}`;
    if (!nodes.has(key)) nodes.set(key, createNode(actionsFor(history)));
    return nodes.get(key);
  }

  function cfr(cards, history, p0Reach, p1Reach) {
    if (isTerminal(history)) {
      return terminalPayoff({ cards, history, pot, bet });
    }

    const player = playerFor(history);
    const card = cards[player];
    const node = getNode(player, card, history);
    const strategy = strategyFor(node, player === 0 ? p0Reach : p1Reach);
    const util = {};
    let nodeUtil = 0;

    for (const action of node.actions) {
      const nextHistory = history + action;
      util[action] =
        player === 0
          ? cfr(cards, nextHistory, p0Reach * strategy[action], p1Reach)
          : cfr(cards, nextHistory, p0Reach, p1Reach * strategy[action]);
      nodeUtil += strategy[action] * util[action];
    }

    for (const action of node.actions) {
      const regret = player === 0 ? util[action] - nodeUtil : nodeUtil - util[action];
      node.regretSum[action] += (player === 0 ? p1Reach : p0Reach) * regret;
    }

    return nodeUtil;
  }

  let util = 0;
  const cards = Array.from({ length: buckets }, (_, index) => index + 1);

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (const p0Card of cards) {
      for (const p1Card of cards) {
        if (p0Card === p1Card) continue;
        util += cfr([p0Card, p1Card], "", 1, 1);
      }
    }
  }

  const spots = [];
  for (const [key, node] of nodes) {
    const [player, card, history] = key.split("|");
    const avg = averageStrategy(node);
    spots.push({
      player: Number(player),
      bucket: Number(card),
      history,
      actions: node.actions.map((action) => ({
        code: action,
        label: labelAction(history, action),
        frequency: Number(avg[action].toFixed(3)),
      })),
    });
  }

  const byHistory = Object.groupBy
    ? Object.groupBy(spots, (spot) => spot.history)
    : spots.reduce((acc, spot) => {
        acc[spot.history] = acc[spot.history] || [];
        acc[spot.history].push(spot);
        return acc;
      }, {});

  return {
    type: "river-cfr",
    buckets,
    iterations,
    betSizePot: Number((bet / pot).toFixed(2)),
    generatedAt: new Date().toISOString(),
    averageP0Utility: Number((util / (iterations * buckets * (buckets - 1))).toFixed(4)),
    summary: {
      model: "Single-street river toy game",
      note: "Buckets represent hidden hand strength from weakest to strongest.",
    },
    spots: spots.sort((a, b) => a.history.localeCompare(b.history) || a.player - b.player || a.bucket - b.bucket),
    byHistory,
  };
}
