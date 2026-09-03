// transposition-table.js

var TT_FLAG_EXACT = 0;
var TT_FLAG_LOWER = 1; // score is a lower bound (failed high, beta cutoff)
var TT_FLAG_UPPER = 2; // score is an upper bound (failed low, didn't beat alpha)

var transpositionTable = new Map();
var TT_MAX_ENTRIES = 2_000_000; // tune to taste / memory budget

function ttStore(key, depth, score, flag, bestMove) {
  var existing = transpositionTable.get(key);

  // Prefer keeping deeper/more-trustworthy entries already in the table.
  if (existing && existing.depth > depth) return;

  // If this is a new key and we're at capacity, evict the oldest entry first.
  // Map iterates in insertion order, so its first key is the oldest one.
  if (!existing && transpositionTable.size >= TT_MAX_ENTRIES) {
    var oldestKey = transpositionTable.keys().next().value;
    transpositionTable.delete(oldestKey);
  }

  // If we're overwriting an existing key, delete it first so re-setting
  // pushes it to the "newest" end of insertion order (keeps recently-used
  // entries away from eviction, closer to an LRU policy).
  if (existing) {
    transpositionTable.delete(key);
  }

  transpositionTable.set(key, {
    depth: depth,
    score: score,
    flag: flag,
    bestMove: bestMove || null
  });
}
function ttLookup(key) {
  return transpositionTable.get(key) || null;
}

function ttClear() {
  transpositionTable.clear();
}