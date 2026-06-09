import {
  STARTING_HANDS,
  allComboWeight,
  comboCount,
  handScore,
  handStrength,
  parseHand,
  rangePct,
} from "./ranges.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function headToHeadEquity(hero, villain) {
  if (hero === villain) return 0.5;

  const heroHand = parseHand(hero);
  const villainHand = parseHand(villain);
  const heroStrength = handStrength(hero);
  const villainStrength = handStrength(villain);
  let edge = (heroStrength - villainStrength) * 4.2;

  if (heroHand.pair && !villainHand.pair) edge += 0.3;
  if (!heroHand.pair && villainHand.pair) edge -= 0.3;
  if (heroHand.suited && !villainHand.suited) edge += 0.08;
  if (!heroHand.suited && villainHand.suited) edge -= 0.08;

  const sharedHigh = heroHand.first === villainHand.first || heroHand.first === villainHand.second;
  const sharedLow = heroHand.second === villainHand.first || heroHand.second === villainHand.second;
  if (sharedHigh || sharedLow) {
    const domination =
      Math.max(heroHand.high, heroHand.low) - Math.max(villainHand.high, villainHand.low) +
      (Math.min(heroHand.high, heroHand.low) - Math.min(villainHand.high, villainHand.low)) * 0.35;
    edge += domination * 0.05;
  }

  return clamp(1 / (1 + Math.exp(-edge)), 0.08, 0.92);
}

function equityVsRange(hero, range) {
  let weightedEquity = 0;
  let weight = 0;

  for (const villain of STARTING_HANDS) {
    const villainWeight = comboCount(villain) * (range[villain] || 0);
    if (villainWeight <= 0) continue;
    weightedEquity += headToHeadEquity(hero, villain) * villainWeight;
    weight += villainWeight;
  }

  return weight > 0 ? weightedEquity / weight : 0.5;
}

function initialStrategy(kind, hand) {
  const strength = handStrength(hand);
  if (kind === "shove") return clamp((strength - 0.43) / 0.27, 0.02, 0.98);
  return clamp((strength - 0.58) / 0.22, 0.01, 0.96);
}

function rangeObjectFromMix(mix) {
  const range = {};
  STARTING_HANDS.forEach((hand, index) => {
    range[hand] = mix[index];
  });
  return range;
}

function bestResponseMix({ stackBB, villainRange, actor }) {
  return STARTING_HANDS.map((hand) => {
    const equity = equityVsRange(hand, villainRange);
    if (actor === "bb") {
      const callEV = (2 * equity - 1) * stackBB;
      const foldEV = -1;
      return callEV > foldEV ? 1 : 0;
    }

    const callWeight = allComboWeight(villainRange) / 1326;
    const calledEV = (2 * equity - 1) * stackBB;
    const shoveEV = (1 - callWeight) * 1 + callWeight * calledEV;
    const foldEV = -0.5;
    return shoveEV > foldEV ? 1 : 0;
  });
}

function smoothInto(current, target, rate) {
  return current.map((value, index) => value * (1 - rate) + target[index] * rate);
}

function averageStrategy(sum, count) {
  return sum.map((value) => clamp(value / count, 0, 1));
}

function pct(value) {
  return Number(value.toFixed(1));
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

export function solvePushFold(input = {}) {
  const stackBB = clamp(Number(input.stackBB || 12), 3, 30);
  const iterations = Math.round(clamp(Number(input.iterations || 450), 60, 2500));

  let sbMix = STARTING_HANDS.map((hand) => initialStrategy("shove", hand));
  let bbMix = STARTING_HANDS.map((hand) => initialStrategy("call", hand));
  let sbSum = Array(STARTING_HANDS.length).fill(0);
  let bbSum = Array(STARTING_HANDS.length).fill(0);

  for (let i = 0; i < iterations; i += 1) {
    const rate = Math.min(0.28, 1 / Math.sqrt(i + 8));
    const sbRange = rangeObjectFromMix(sbMix);
    const bbRange = rangeObjectFromMix(bbMix);

    const bbBest = bestResponseMix({ stackBB, villainRange: sbRange, actor: "bb" });
    const nextBbMix = smoothInto(bbMix, bbBest, rate);
    const nextBbRange = rangeObjectFromMix(nextBbMix);
    const sbBest = bestResponseMix({ stackBB, villainRange: nextBbRange, actor: "sb" });

    sbMix = smoothInto(sbMix, sbBest, rate);
    bbMix = nextBbMix;

    sbSum = sbSum.map((value, index) => value + sbMix[index]);
    bbSum = bbSum.map((value, index) => value + bbMix[index]);
  }

  const sbAverage = averageStrategy(sbSum, iterations);
  const bbAverage = averageStrategy(bbSum, iterations);
  const sbRange = rangeObjectFromMix(sbAverage);
  const bbRange = rangeObjectFromMix(bbAverage);
  const bbCallWeight = allComboWeight(bbRange) / 1326;

  const hands = STARTING_HANDS.map((hand, index) => {
    const sbEquity = equityVsRange(hand, bbRange);
    const bbEquity = equityVsRange(hand, sbRange);
    const sbCalledEV = (2 * sbEquity - 1) * stackBB;
    const sbShoveEV = (1 - bbCallWeight) * 1 + bbCallWeight * sbCalledEV;
    const bbCallEV = (2 * bbEquity - 1) * stackBB;

    return {
      hand,
      combos: comboCount(hand),
      score: round(handScore(hand), 1),
      strength: round(handStrength(hand), 3),
      sb: {
        shove: round(sbAverage[index]),
        fold: round(1 - sbAverage[index]),
        evShove: round(sbShoveEV),
        evFold: -0.5,
        equityVsCall: round(sbEquity),
      },
      bb: {
        call: round(bbAverage[index]),
        fold: round(1 - bbAverage[index]),
        evCall: round(bbCallEV),
        evFold: -1,
        equityVsShove: round(bbEquity),
      },
    };
  });

  const sortedBySb = [...hands].sort((a, b) => b.sb.shove - a.sb.shove || b.strength - a.strength);
  const sortedByBb = [...hands].sort((a, b) => b.bb.call - a.bb.call || b.strength - a.strength);

  return {
    type: "push-fold",
    stackBB,
    iterations,
    generatedAt: new Date().toISOString(),
    summary: {
      sbShovePct: pct(rangePct(sbRange)),
      bbCallPct: pct(rangePct(bbRange)),
      bbFoldPct: pct(100 - rangePct(bbRange)),
      model: "HU small-stack push/fold abstraction",
      note: "Approximate equilibrium for study; not a full no-limit Hold'em solver.",
      topShoves: sortedBySb.slice(0, 12).map((item) => item.hand),
      topCalls: sortedByBb.slice(0, 12).map((item) => item.hand),
    },
    hands,
  };
}
