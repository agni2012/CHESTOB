//bot.js
let moveScores = [];

let searchDeadline = 0;
let quit;
let scores = [];
for(let i=0;i<8;i++){
  scores.push(["","","","","","","",""]);
}
function resetScores(){
  scores=[];
  for(let i=0;i<8;i++){
    scores.push(["","","","","","","",""]);
  }
}
let depth = 5; //actually searches this + 1.

let searches = 0;
let values = {
  "pawn":  1,
  "rook":  5,
  "queen": 9,
  "bishop":3,
  "knight":3,
  "king": 9007199254740, //really high number but 100x below highest integer with precision
  "empty":0
}

function orderMoves(moves, board, ttMove) {
  return moves
    .map(function(m) {
      let attacker = accessPiece(m.start, board);
      let target = accessPiece(m.end, board);
      let score;

      // TT move gets absolute priority - search it first.
      if (ttMove && m.start.x === ttMove.start.x && m.start.y === ttMove.start.y &&
          m.end.x === ttMove.end.x && m.end.y === ttMove.end.y) {
        score = 1_000_000;
      } else if (target.type != "empty") {
        score = 1000 + values[target.type] * 10 - values[attacker.type];
      } else {
        score = interestingness(m, board);
      }
      return { move: m, score: score };
    })
    .sort(function(a, b) { return b.score - a.score; })
    .map(function(x) { return x.move; });
}
function cloneBoard(board) {
  let nb = new Array(8);
  for (let x = 0; x < 8; x++) {
    nb[x] = new Array(8);
    for (let y = 0; y < 8; y++) {
      let p = board[x][y];
      nb[x][y] = { type: p.type, side: p.side, hasMoved: p.hasMoved };
    }
  }
  nb.enPassantFile = board.enPassantFile;
  return nb;
}

function applyUndoableMove(m, board) {
	let p = accessPiece(m.start, board);

	let undoData = {
		start: { ...m.start },
		end: { ...m.end },
		enPassantFileBefore: board.enPassantFile,

		// Every square that may be modified is saved here.
		squares: []
	};

	function saveSquare(x, y) {
		undoData.squares.push({
			x: x,
			y: y,
			piece: { ...board[x][y] }
		});
	}

	function alreadySaved(x, y) {
		for (let i = 0; i < undoData.squares.length; i++) {
			if (undoData.squares[i].x == x &&
				undoData.squares[i].y == y) {
				return true;
			}
		}
		return false;
	}

	function saveSquareOnce(x, y) {
		if (!alreadySaved(x, y)) {
			saveSquare(x, y);
		}
	}

	// Start and destination are always affected.
	saveSquareOnce(m.start.x, m.start.y);
	saveSquareOnce(m.end.x, m.end.y);

	// En passant capture:
	// The captured pawn is beside the destination, not on it.
	if (
		p.type == "pawn" &&
		m.start.x != m.end.x &&
		board[m.end.x][m.end.y].type == "empty"
	) {
		let forwardDirection = p.side == "white" ? -1 : 1;
		let capturedY = m.end.y - forwardDirection;

		saveSquareOnce(m.end.x, capturedY);
	}

	// Castling:
	// Save the rook's starting and ending squares.
	if (p.type == "king" && abs(m.start.x - m.end.x) == 2) {
		let rookX = m.end.x > m.start.x ? 7 : 0;
		let rookEndX = (m.start.x + m.end.x) / 2;

		saveSquareOnce(rookX, m.start.y);
		saveSquareOnce(rookEndX, m.start.y);
	}

	// Apply the actual move.
	board = applyMove(m, board, true);

	return undoData;
}


function undoMove(undoData, board) {
	// Restore every square that applyMove could have changed.
	for (let i = 0; i < undoData.squares.length; i++) {
		let square = undoData.squares[i];

		board[square.x][square.y] = { ...square.piece };
	}

	// Restore the en passant state.
	board.enPassantFile = undoData.enPassantFileBefore;

	return board;
}



let idCounter = 10;
function getNextAsciiId() {
    // 1. Convert current counter number to a Base-36 string
    // 2. Convert to uppercase to match A-Z requirements
    let id = idCounter.toString(36).toUpperCase();
    
    // Increment counter for the next function call
    idCounter++;
    
    return id;
}
function bot(side, board) {
  let startTime = millis();
  let timeLimit = 10000;
  searchDeadline = startTime + timeLimit;
  quit = false;
	let m = getAllLegalMoves(side, board);

	if(moveNumber == 0){
		if(board[3][4].type == "pawn")
			return {start:{x:3,y:1},end:{x:3,y:3}};
		if(board[4][4].type == "pawn")
			return {start:{x:4,y:1},end:{x:4,y:3}};
	}

	// Each iteration will reorder this array based on the
	// scores from the previous iteration.
	let orderedMoves = m.slice();

	let bestMoveIndexes = [];
	let bestMoveScore = -Infinity;

	let currentDepth = 1;

	while(true){

		// Only check the timer BEFORE starting a new depth.
		// Once a depth starts, let it finish.
		if(millis() - startTime >= timeLimit)
			break;

		dbg("Starting depth "+currentDepth+"...");

		let depthScores = new Array(orderedMoves.length);
		let depthBestScore = -Infinity;
		let depthBestIndexes = [];
    let depthFinished = true;

    for(let i = 0; i < orderedMoves.length; i++){
      let move = orderedMoves[i];

      let undoData = applyUndoableMove(move, board);

      let score;

      try {
        score = -search(
          oppositeSide(side),
          board,
          currentDepth
        );
      } catch(e) {
        undoMove(undoData, board);

        if(e.message == "kwit"){
          depthFinished = false;
          break;
        }

        throw e;
      }

      undoMove(undoData, board);

      depthScores[i] = score;

      let id = getNextAsciiId();
      scores[move.start.x][move.start.y] += id+": "+score+", ";
      scores[move.end.x][move.end.y] += id+": "+score+", ";

      if(score > depthBestScore){
        depthBestScore = score;
        depthBestIndexes = [i];
      }else if(score == depthBestScore){
        depthBestIndexes.push(i);
      }

      dbg(i+" out of "+orderedMoves.length+" done");
      if(!depthFinished){
        break;
      }
    }

		// This depth completed, so its results are now valid.
		bestMoveScore = depthBestScore;

		// Convert indexes from orderedMoves into actual moves.
		bestMoveIndexes = [];

		for(let i = 0; i < depthBestIndexes.length; i++){
			bestMoveIndexes.push(depthBestIndexes[i]);
		}

		/*
		 * Reorder moves for the NEXT depth.
		 *
		 * Highest-scoring moves from this depth go first.
		 * This gives alpha-beta a much better chance of finding
		 * cutoffs early at the next depth.
		 */
		let scoredMoves = [];

		for(let i = 0; i < orderedMoves.length; i++){
			scoredMoves.push({
				move: orderedMoves[i],
				score: depthScores[i]
			});
		}

		scoredMoves.sort(function(a, b){
			return b.score - a.score;
		});

		orderedMoves = scoredMoves.map(function(x){
			return x.move;
		});

		dbg(
			"Finished depth "+currentDepth+
			", score "+bestMoveScore+
			", time "+(millis()-startTime)+"ms"
		);

		currentDepth++;
	}

	dbg(
		"Searching Done at depth "+(currentDepth-1)+
		", rating "+bestMoveIndexes.length+
		" tied move(s)"
	);

	/*
	 * bestMoveIndexes refers to orderedMoves from the LAST
	 * completed depth.
	 */
	let highestRate = -Infinity;
	let highestRateIndexes = [];

	for(let i = 0; i < bestMoveIndexes.length; i++){
		let index = bestMoveIndexes[i];
		let rate = rateMove(orderedMoves[index], board);

		if(rate > highestRate){
			highestRate = rate;
			highestRateIndexes = [index];
		}else if(rate == highestRate){
			highestRateIndexes.push(index);
		}

		dbg(
			"("+i+"/"+bestMoveIndexes.length+
			") Rated move from ("+
			orderedMoves[index].start.x+","+
			orderedMoves[index].start.y+
			") to ("+
			orderedMoves[index].end.x+","+
			orderedMoves[index].end.y+
			") as "+rate
		);
	}

	let r = floor(random(0, highestRateIndexes.length));
	let index = highestRateIndexes[r];

	print("Searched: "+searches);
	dbg("Took "+(millis()-startTime)+"ms");

	return orderedMoves[index];
}
function getSliderMobility(side, type, board) {
  let total = 0;
  for(let x = 0; x < 8; x++) {
    for(let y = 0; y < 8; y++) {
      let piece = board[x][y];
      if(piece.side == side && piece.type == type) {
        total += pieceLegalMoves({x: x, y: y}, board).length;
      }
    }
  }
  return total;
}

function rateMove(m, board){
  let p = accessPiece(m.start, board);
  let score = 0;
  // Castling
  if(p.type == "king" && abs(m.start.x - m.end.x) == 2){
    score += 100;
  }

  // Developing unmoved pieces
  if(p.type != "pawn" && p.type != "king" && p.type !== "queen" && !p.hasMoved){
    score += 19;

    let developmentDist = dist(m.end.x, m.end.y, 3.5, 3.5);
    score += 5 - developmentDist;

    if(p.type == "knight" || p.type == "bishop"){
     score += 7;
    }
  }

  // Capturing
  let target = accessPiece(m.end, board);
  if(target.type != "empty"){
    score += values[target.type] * 10;
  }

  // Look at the position after the move.
  let testBoard = applyMove(m, board);
  let enemy = oppositeSide(p.side);

  // Reward pawn moves that free up trapped bishops/queen along a diagonal.
  // Measured as: did our bishops (and queen, which also moves diagonally)
  // gain legal moves as a result of this pawn shifting out of the way?
  if(p.type == "pawn"){
    let bishopMobilityBefore = getSliderMobility(p.side, "bishop", board);
    let bishopMobilityAfter = getSliderMobility(p.side, "bishop", testBoard);
    let mobilityGain = bishopMobilityAfter - bishopMobilityBefore;

    if(mobilityGain > 0){
      score += mobilityGain * 3; // TUNE
    }

    // Extra bonus specifically for freeing a bishop that was nearly stuck -
    // a bishop going from 0-1 moves to several is a bigger deal than one
    // that already had options gaining a couple more.
    let trappedBefore = 0;
    for(let x = 0; x < 8; x++) {
      for(let y = 0; y < 8; y++) {
        let piece = board[x][y];
        if(piece.side == p.side && piece.type == "bishop") {
          if(pieceLegalMoves({x: x, y: y}, board).length <= 1) trappedBefore++;
        }
      }
    }
    let trappedAfter = 0;
    for(let x = 0; x < 8; x++) {
      for(let y = 0; y < 8; y++) {
        let piece = testBoard[x][y];
        if(piece.side == p.side && piece.type == "bishop") {
          if(pieceLegalMoves({x: x, y: y}, testBoard).length <= 1) trappedAfter++;
        }
      }
    }
    if(trappedAfter < trappedBefore){
      score += (trappedBefore - trappedAfter) * 8;
    }
  }

  // Find all moves we can make from the new position.
  let myMoves = getAllLegalMoves(p.side, testBoard);

  // Reward threatening enemy pieces.
  for(let i = 0; i < myMoves.length; i++){
    let threat = accessPiece(myMoves[i].end, testBoard);

    if(threat.type != "empty" && threat.side == enemy){
      score += values[threat.type] * 10;

      if(threat.type == "queen"){
        score += 30;
      }else if(threat.type == "rook"){
        score += 15;
      }else if(threat.type == "bishop" || threat.type == "knight"){
        score += 8;
      }
    }
  }

  // Reward controlling the center.
  let centerDist = dist(m.end.x, m.end.y, 3.5, 3.5);

  if(p.type == "pawn"){
    score += 7 - centerDist;
  }

  if(["bishop", "knight", "queen", "rook"].includes(p.type)){
    score += 5 - centerDist;
  }

  // Encourage pawn promotion.
  if(p.type == "pawn"){
    if(p.side == "white" && m.end.y == 7){
      score += 50;
    }
    if(p.side == "black" && m.end.y == 0){
      score += 50;
    }
  }
  return score;
}

function interestingness(m, board){
  let p = accessPiece(m.start, board);
  let target = accessPiece(m.end, board);
  let score = 0;

  // Captures are highly interesting.
  if(target.type != "empty"){
    score += values[target.type] / 9;
  }

  // Castling is strategically useful.
  if(p.type == "king" && abs(m.start.x - m.end.x) == 2){
    score += 0.7;
  }

  // Pawn moves toward the center are somewhat interesting.
  if(p.type == "pawn"){
    let centerDist = dist(m.end.x, m.end.y, 3.5, 3.5);
    score += (3.5 - centerDist) / 7;
  }

  // Minor/major pieces moving toward the center.
  if(["bishop", "knight", "queen", "rook"].includes(p.type)){
    let centerDist = dist(m.end.x, m.end.y, 3.5, 3.5);
    score += (3.5 - centerDist) / 7;
  }

  // Normalize.
  return constrain(score, 0, 1);
}
function search(side, board, n, a, b) {
  if (a === undefined) a = -Infinity;
  if (b === undefined) b = Infinity;
  searches++;

  let alphaOrig = a;
  let key = zobristHashKey(board, side);
  let ttEntry = ttLookup(key);
  let ttMove = null;

  if (ttEntry) {
    ttMove = ttEntry.bestMove;
    if (ttEntry.depth >= n) {
      if (ttEntry.flag === TT_FLAG_EXACT) {
        return ttEntry.score;
      } else if (ttEntry.flag === TT_FLAG_LOWER) {
        if (ttEntry.score > a) a = ttEntry.score;
      } else if (ttEntry.flag === TT_FLAG_UPPER) {
        if (ttEntry.score < b) b = ttEntry.score;
      }
      if (a >= b) {
        return ttEntry.score;
      }
    }
  }

  let rawMoves = getAllLegalMoves(side, board); //test
  if (rawMoves.length == 0) {
    if (isInCheck(side, board)) {
      return -Infinity;
    }
    return 0;
  }

  if (n <= 1) {
    // Quiescence search results are volatile (depth isn't a clean concept there),
    // so we don't store them in the TT here - keep it simple and correct.
    return quiescenceSearch(side, board, a, b, rawMoves);
  }

  let m = orderMoves(rawMoves, board, ttMove);
  let best = -Infinity;
  let bestMoveThisNode = null;

  for (let i = 0; i < m.length; i++) {
    if (quit) throw new Error("kwit");
    let testBoard = applyMove(m[i], board);
    let val = -search(oppositeSide(side), testBoard, n - 1, -b, -a);
    if (val > best) {
      best = val;
      bestMoveThisNode = m[i];
    }
    a = Math.max(a, val);
    if (a >= b) break;
  }

  let flag;
  if (best <= alphaOrig) flag = TT_FLAG_UPPER;
  else if (best >= b) flag = TT_FLAG_LOWER;
  else flag = TT_FLAG_EXACT;

  ttStore(key, n, best, flag, bestMoveThisNode);

  return best;
}
function getCaptureMoves(side, board) {
  let kingPos = findKing(side, board);
  let checkedNow = isPieceAttacked(kingPos, oppositeSide(side), board);
  let pinnedSquares = getPinnedSquares(side, board, kingPos);

  let moves = [];
  for(let x = 0; x < 8; x++) {
    for(let y = 0; y < 8; y++) {
      if(board[x][y].side == side) {
        let piece = board[x][y];
        let plm = pieceLegalMoves({x: x, y: y}, board);
        for(let i = 0; i < plm.length; i++) {
          let dest = plm[i];
          if(board[dest.x][dest.y].type == "empty") continue; // skip quiet moves before any expensive work

          let move = { start: {x: x, y: y}, end: dest };
          let mustVerify = (piece.type == "king") || checkedNow || pinnedSquares.has(x + "," + y);
          if(mustVerify) {
            let checkTestBoard = applyMove(move.start, move.end, cloneBoard(board));
            if(isInCheck(side, checkTestBoard)) continue;
          }
          moves.push(move);
        }
      }
    }
  }
  moves.sort(function(m1, m2) {
    return values[board[m2.end.x][m2.end.y].type] - values[board[m1.end.x][m1.end.y].type];
  });
  return moves;
}

function quiescenceSearch(side, board, a, b) {
  searches++;
  let standPat = evalBoard(side, board);
  if (standPat >= b) return b;
  if (standPat > a) a = standPat;
  let captures = getCaptureMoves(side, board);
  for (let i = 0; i < captures.length; i++) {
    let testBoard = applyMove(captures[i], board);
    let val = -quiescenceSearch(oppositeSide(side), testBoard, -b, -a);
    a = Math.max(a, val);
    if (a >= b) break;
  }
  return a;
}

function getOnlyCaptures(side, board, allMoves) {
  allMoves = allMoves || getAllLegalMoves(side, board);
  let captures = [];

  for (let i = 0; i < allMoves.length; i++) {
    let move = allMoves[i];
    
    // Check if the move lands on a square that contains a piece.
    if (accessPiece(move.end, board).type != "empty") {
      captures.push(move);
    }
  }

  // MVV: try captures of the most valuable victims first, so alpha-beta
  // cutoffs in quiescenceSearch trigger sooner. Doesn't change which
  // move is ultimately chosen, just the order they're tried in.
  captures.sort(function(m1, m2) {
    return values[accessPiece(m2.end, board).type] - values[accessPiece(m1.end, board).type];
  });

  return captures;
}


function findInterestingMoves(side, board) {
  let m = getAllLegalMoves(side, board);
  let captures = [];

  for(let i = 0; i < m.length; i++) {
    if(board[m[i].end.x][m[i].end.y].side == oppositeSide(side)) {
      captures.push(m[i]);
    }
  }

  if(captures.length > 0)
    return captures;

  return [];
}

function evalBoard(side, board){
  let pts = 0;
  for(let x = 0; x < 8; x++) {
    for(let y = 0; y < 8; y++) {
      if(board[x][y].side == side){
        pts+=values[board[x][y].type];
      }else{
        pts-=values[board[x][y].type];
      }
    }
  }
  return pts;
}