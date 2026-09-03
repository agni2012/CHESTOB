//Vibe Coded, sorry god.

// zobrist.js

// --- deterministic 64-bit PRNG (splitmix64), so hashes are reproducible each run ---
function makeSplitMix64(seed) {
  let state = BigInt.asUintN(64, seed);
  return function next() {
    state = BigInt.asUintN(64, state + 0x9E3779B97F4A7C15n);
    let z = state;
    z = BigInt.asUintN(64, (z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n);
    z = BigInt.asUintN(64, (z ^ (z >> 27n)) * 0x94D049BB133111EBn);
    z = z ^ (z >> 31n);
    return BigInt.asUintN(64, z);
  };
}

var rand64 = makeSplitMix64(0x1234567890ABCDEFn);

var ZOBRIST_PIECE_TYPES = ["pawn", "rook", "bishop", "knight", "queen", "king"];
var ZOBRIST_SIDES = ["white", "black"];

// zobristPieceKeys[typeIndex][sideIndex][x][y]
var zobristPieceKeys = [];
for (var t = 0; t < ZOBRIST_PIECE_TYPES.length; t++) {
  zobristPieceKeys.push([]);
  for (var s = 0; s < ZOBRIST_SIDES.length; s++) {
    zobristPieceKeys[t].push([]);
    for (var x = 0; x < 8; x++) {
      zobristPieceKeys[t][s].push([]);
      for (var y = 0; y < 8; y++) {
        zobristPieceKeys[t][s][x].push(rand64());
      }
    }
  }
}

var zobristSideToMove = rand64(); // XORed in only when it's black's turn
var zobristCastling = {
  whiteKingSide:  rand64(),
  whiteQueenSide: rand64(),
  blackKingSide:  rand64(),
  blackQueenSide: rand64()
};
var zobristEnPassantFile = [];
for (var f = 0; f < 8; f++) zobristEnPassantFile.push(rand64());

function pieceTypeIndex(type) { return ZOBRIST_PIECE_TYPES.indexOf(type); }
function sideIndex(side) { return side === "white" ? 0 : 1; }

// Derives castling rights purely from piece state, mirroring the
// conditions your getAllLegalMoves() castling logic checks (king/rook
// still present at their home square and never having moved).


function getCastlingRights(board) {
  var rights = {
    whiteKingSide: false, whiteQueenSide: false,
    blackKingSide: false, blackQueenSide: false
  };

  var wk = board[4][7];
  if (wk.type === "king" && wk.side === "white" && !wk.hasMoved) {
    var wqr = board[0][7], wkr = board[7][7];
    if (wqr.type === "rook" && wqr.side === "white" && !wqr.hasMoved) rights.whiteQueenSide = true;
    if (wkr.type === "rook" && wkr.side === "white" && !wkr.hasMoved) rights.whiteKingSide = true;
  }

  var bk = board[4][0];
  if (bk.type === "king" && bk.side === "black" && !bk.hasMoved) {
    var bqr = board[0][0], bkr = board[7][0];
    if (bqr.type === "rook" && bqr.side === "black" && !bqr.hasMoved) rights.blackQueenSide = true;
    if (bkr.type === "rook" && bkr.side === "black" && !bkr.hasMoved) rights.blackKingSide = true;
  }

  return rights;
}

// Full (non-incremental) hash of a position.
// Pass sideToMove ("white"/"black") if you want the key to distinguish
// "white to move here" from "black to move here" - do this for a TT.
function computeZobristHash(board, sideToMove) {
  var hash = 0n;

  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      var piece = board[x][y];
      if (piece.type === "empty") continue;
      hash ^= zobristPieceKeys[pieceTypeIndex(piece.type)][sideIndex(piece.side)][x][y];
    }
  }

  if (sideToMove === "black") hash ^= zobristSideToMove;

  var rights = getCastlingRights(board);
  if (rights.whiteKingSide)  hash ^= zobristCastling.whiteKingSide;
  if (rights.whiteQueenSide) hash ^= zobristCastling.whiteQueenSide;
  if (rights.blackKingSide)  hash ^= zobristCastling.blackKingSide;
  if (rights.blackQueenSide) hash ^= zobristCastling.blackQueenSide;

  if (board.enPassantFile !== null && board.enPassantFile !== undefined) {
    hash ^= zobristEnPassantFile[board.enPassantFile];
  }

  return hash;
}

// BigInts can't be used directly as object keys, so stringify for a Map/object TT.
function zobristHashKey(board, sideToMove) {
  return computeZobristHash(board, sideToMove).toString(16);
}