export const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

export const RANK_VALUE = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  T: 10,
  9: 9,
  8: 8,
  7: 7,
  6: 6,
  5: 5,
  4: 4,
  3: 3,
  2: 2,
};

const CHEN_POINTS = {
  A: 10,
  K: 8,
  Q: 7,
  J: 6,
  T: 5,
  9: 4.5,
  8: 4,
  7: 3.5,
  6: 3,
  5: 2.5,
  4: 2,
  3: 1.5,
  2: 1,
};

export const HAND_GRID = RANKS.map((rowRank, rowIndex) =>
  RANKS.map((colRank, colIndex) => {
    if (rowIndex === colIndex) return `${rowRank}${colRank}`;
    if (rowIndex < colIndex) return `${rowRank}${colRank}s`;
    return `${colRank}${rowRank}o`;
  }),
);

export const STARTING_HANDS = HAND_GRID.flat();

export function parseHand(label) {
  const first = label[0];
  const second = label[1];
  const suitedness = label[2] || "p";
  return {
    label,
    first,
    second,
    high: RANK_VALUE[first],
    low: RANK_VALUE[second],
    pair: first === second,
    suited: suitedness === "s",
    offsuit: suitedness === "o",
  };
}

export function comboCount(label) {
  const hand = parseHand(label);
  if (hand.pair) return 6;
  return hand.suited ? 4 : 12;
}

function chenRaw(label) {
  const hand = parseHand(label);
  const highRank = hand.high >= hand.low ? hand.first : hand.second;
  let score = CHEN_POINTS[highRank];

  if (hand.pair) {
    score = Math.max(5, score * 2);
  }

  if (hand.suited) score += 2;

  if (!hand.pair) {
    const gap = Math.abs(hand.high - hand.low) - 1;
    if (gap === 1) score -= 1;
    if (gap === 2) score -= 2;
    if (gap === 3) score -= 4;
    if (gap >= 4) score -= 5;
    if (gap <= 1 && hand.high < 12) score += 1;
  }

  return Math.max(0, score);
}

const rawScores = STARTING_HANDS.map((hand) => chenRaw(hand));
const minRaw = Math.min(...rawScores);
const maxRaw = Math.max(...rawScores);

export function handScore(label) {
  return chenRaw(label);
}

export function handStrength(label) {
  return (chenRaw(label) - minRaw) / (maxRaw - minRaw);
}

export function allComboWeight(range) {
  return STARTING_HANDS.reduce((sum, hand) => sum + comboCount(hand) * (range[hand] || 0), 0);
}

export function rangePct(range) {
  return (allComboWeight(range) / 1326) * 100;
}

export function makeRangeFromArray(values) {
  const range = {};
  STARTING_HANDS.forEach((hand, index) => {
    range[hand] = values[index] || 0;
  });
  return range;
}

export function percentileRank(label) {
  const sorted = [...STARTING_HANDS].sort((a, b) => handStrength(b) - handStrength(a));
  return sorted.indexOf(label) / (sorted.length - 1);
}
