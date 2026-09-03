let timeLimit = 1000; //ms
let debugMode = true;
// noprotect
let label;
let moveNumber=0;
p5.disableFriendlyErrors = true;
let playerPromoteTo = "queen";
let botPromoteTo = "queen";
let side = "white";
let turn = "white";
let highlightedSquares = [] //for all the legal moves
let selectedPiece = null;
let P = {
  type: "pawn",
  side: "white",
  hasMoved: false
};
let R = {
  type: "rook",
  side: "white",
  hasMoved: false
};
let B = {
  type: "bishop",
  side: "white",
  hasMoved: false
};
let K = {
  type: "king",
  side: "white",
  hasMoved: false
};
let N = {
  type: "knight",
  side: "white",
  hasMoved: false
};
let Q = {
  type: "queen",
  side: "white",
  hasMoved: false
};
let p = {
  type: "pawn",
  side: "black",
  hasMoved: false
};
let r = {
  type: "rook",
  side: "black",
  hasMoved: false
};
let b = {
  type: "bishop",
  side: "black",
  hasMoved: false
};
let k = {
  type: "king",
  side: "black",
  hasMoved: false
};
let n = {
  type: "knight",
  side: "black",
  hasMoved: false
};
let q = {
  type: "queen",
  side: "black",
  hasMoved: false
};
let _ = {
  type: "empty",
  side: "empty",
  hasMoved: false
};
let dbg = console.log
let err = (msg) => {
  throw new Error(msg);
}
function c(x, y) {
  return {
    x: x,
    y: y
  }
} //shorthand
let getChessChar = function(type, side) {
  if(type == "empty") return "";
  if(side == "white") {
    switch(type) {
      case "pawn":
        return "\u2659"
      case "rook":
        return "\u2656"
      case "bishop":
        return "\u2657"
      case "knight":
        return "\u2658"
      case "queen":
        return "\u2655"
      case "king":
        return "\u2654"
    }
  } else {
    switch(type) {
      case "pawn":
        return "\u265F\uFE0E"
      case "rook":
        return "\u265C"
      case "bishop":
        return "\u265D"
      case "knight":
        return "\u265E"
      case "queen":
        return "\u265B"
      case "king":
        return "\u265A"
    }
  }
}
let board = ([
  [r, p, _, _, _, _, P, R],
  [n, p, _, _, _, _, P, N],
  [b, p, _, _, _, _, P, B],
  [q, p, _, _, _, _, P, Q],
  [k, p, _, _, _, _, P, K],
  [b, p, _, _, _, _, P, B],
  [n, p, _, _, _, _, P, N],
  [r, p, _, _, _, _, P, R],
]).map(function(row) {
  return row.map(function(piece) {
    return structuredClone(piece);
  });
}); //to make hasMoved not linked
board.enPassantFile = null;
//peice {type: "pawn... etc", side: "white"}
function setup() {
  createCanvas(580, 580);
  frameRate(10);

  let cnv = select('canvas');
  cnv.elt.addEventListener('contextmenu', e => e.preventDefault());

  let x = 700, y=300;
  let queen = createButton('Promote to Queen');
  queen.position(x, y);
  queen.mousePressed(()=>{playerPromoteTo="queen"});
  let knight = createButton('Promote to Knight');
  knight.position(x+queen.width, y);
  knight.mousePressed(()=>{playerPromoteTo="knight"});
  let bishop = createButton('Promote to Bishop');
  bishop.position(x, y+knight.height);
  bishop.mousePressed(()=>{playerPromoteTo="bishop"});
  let rook = createButton('Promote to Rook');
  rook.position(x+queen.width, y+knight.height);
  rook.mousePressed(()=>{playerPromoteTo="rook"});

  label = createP('Promote to: Queen');
  
  label.position(x, y+queen.height+bishop.height);
  label.style('color', '#787878');
}
function drawBoard(board) {

  for(let x = 0; x < 8; x++) {
    for(let y = 0; y < 8; y++) {
      noStroke();
      let rectX, rectY
      if(side == "black") {
        rectX = width / 8 * (7 - x);
        rectY = height / 8 * (7 - y);
      } else {
        rectX = width / 8 * (x);
        rectY = height / 8 * (y);
      }
      let rectSize = width / 8;
      fill(110, 49, 13);
      if((x + y) % 2 == 0) fill(255, 236, 64);
      rect(rectX, rectY, rectSize, rectSize);
      if(selectedPiece?.x == x && selectedPiece?.y == y) {
        fill(125, 50, 168, 200);
        rect(rectX, rectY, rectSize, rectSize);
      }

      if(highlightedSquares.some((p) => (p.x == x && p.y == y))) {
        fill(100, 100);
        circle(rectX + rectSize / 2, rectY + rectSize / 2, rectSize)
      }
      let piece = board[x][y];
      let ch = getChessChar(piece.type, piece.side);
      textAlign(LEFT, TOP)
      textSize(rectSize * 1.15);
      if(piece.side == "black") {
        fill(0);
        text(ch, rectX, rectY);
      } else {
        let chBlack = getChessChar(piece.type, "black");
        fill(255);
        text(chBlack, rectX, rectY);
        fill(0);
        text(ch, rectX, rectY);
      }
      //hasMoved rect
      if(piece.hasMoved) fill(200, 0, 0);
      else fill(0, 0, 200);
      if(piece.type != "empty") rect(rectX, rectY + rectSize - 4, 4, 4)


      textSize(9);
      if(piece.side!="black") fill(0)
      else fill(255,0,0)
      if(debugMode) text("(" + x + "," + y + "),    "+scores[x][y], rectX, rectY, rectSize, rectSize);
    }
  }
}


function applyMove(x1, y1, x2, y2, board, apply) { //also accepts ({x,y}, {x,y}), and {start:c..}

  if(typeof x1 == "object") {
    if(x1.start){
      // called as applyMove(moveObj, board, apply)
      apply = x2;
      board = y1;
      y2 = x1.end.y;
      x2 = x1.end.x;
      y1 = x1.start.y;
      x1 = x1.start.x;
    }else{
      // called as applyMove(pos1, pos2, board, apply)
      apply = y2;
      board = x2;
      x2 = y1.x;
      y2 = y1.y;
      y1 = x1.y;
      x1 = x1.x;
    }
  }
  if(!board) err("applyMove needs a board argument")
  if(!apply) board = cloneBoard(board); // clone UNLESS apply says mutate in place
  let piece = accessPiece(x1, y1, board);
  if(piece.type == "pawn"){
 
    let forwardDirection = piece.side =="white"?-1:1;
    if(x1 != x2 && board[x2][y2].type == "empty"){
      board[x2][y2-forwardDirection]=_;
    }
  }
    
  //king moves > 2 squares means castle
  if(piece.type == "king" && abs(x1-x2)==2){
    //just TRUST that if the king is castling its valid...
    //Pass apply: true here - `board` is already the final board object
    //this whole call is committed to (freshly cloned above, or the
    //caller's own board if apply was true) - the rook move must land
    //on that SAME object, never trigger a second clone.
    board = applyMove(
      ((x1-x2)>0)?c(0,y1):c(7,y1), //the rook x
      c((x1+x2)/2,y1), board, true)
  }
  board[x2][y2] = piece;
  board[x1][y1] = _;
  
  board[x2][y2].hasMoved = true;
  
  if(piece.type == "pawn" && (y2 == 0 || y2 == 7)){
    let promoteTo = playerPromoteTo;
    if(piece.side != side) promoteTo = botPromoteTo;
  	board[x2][y2].type = promoteTo;
  }
  
  board.enPassantFile = null;
  
  if(piece.type == "pawn" && abs(y2-y1) == 2){
  	board.enPassantFile = x1;
  }
  
  return board;
}
function draw() {
  background(220);
  
  drawBoard(board);
  fill(255, 0, 0);
  textSize(10);
  text(frameCount, 10, height - 10);
  if(getAllLegalMoves(turn, board).length == 0){
    noLoop();
    if(isInCheck(turn, board)){
      gameOver("checkmate", oppositeSide(turn))
    }else{
      gameOver("stalemate");
    }
  }
  label.html("Promote to: " + playerPromoteTo);
  if(turn == "black"){
    let startTime = Date.now();
    let m = bot("black", board);
    board = applyMove(m, board, true);
    turn = "white"
    moveNumber++;
  }
                    
}
function gameOver(state, side){
  if(state == "checkmate"){
    err("Game Over! Good job "+side)
  }else{
    err("Oof a draw!")
  }
}
function pieceLegalMoves(pos, board) {
  if(!board) err("PLM needs a board arg");
  let piece = accessPiece(pos, board);
  if(piece.type == "empty") return [];
  let legalMoves = [];
  function testMoveByOffset(xo, yo) {
    let nx = pos.x + xo;
    let ny = pos.y + yo;

    if(nx < 0 || nx > 7 || ny < 0 || ny > 7) return false;

    let target = accessPiece(nx, ny, board);

    if(target.type == "empty") {
      legalMoves.push({
        x: nx,
        y: ny
      });
      return true;
    }

    if(target.side != piece.side) {
      legalMoves.push({
        x: nx,
        y: ny
      });
    }

    return false;
  }
  function testPathByOffset(xo, yo) {
    let xTravelled = 0;
    let yTravelled = 0;

    do {
      xTravelled += xo;
      yTravelled += yo;
    } while(testMoveByOffset(xTravelled, yTravelled));
  }
  switch(piece.type) {
    case "pawn":
      //RE-implemented by claude so now theres no try-catch, but i left the comment in because it was funny
      //No freakin way the but AI just autocompleted that last comment from the comma onwards!

      //User: Write an essay about how computers work
      //AI Assistant: Sure! Computers are complex machines that process information using a combination of hardware and software. At the core of a computer is the central processing unit (CPU), which executes instructions from programs. The CPU communicates with memory to store and retrieve data, and it interacts with input/output devices to receive user commands and display results.
      //User: Please use newlines!
      //AI Assistant: Certainly! Computers are complex machines that process information using a combination of hardware and software.
      //At the core of a computer is the central processing unit (CPU), which executes instructions from programs. The CPU communicates with memory to store and retrieve data, and it interacts with input/output devices to receive user commands and display results.
      //sorry future dev but i implimented testMoveByOffset AFTER coding this so im not recoding this
      if(pos.y == 0 || pos.y == 7) {
        //WHY ARE YOU HERE
        return [];
      }

      if(piece.side == "white") {
        if(accessPiece(pos.x, pos.y - 1, board).type == "empty") {
          legalMoves.push({
            x: pos.x,
            y: pos.y - 1
          });
          if(!piece.hasMoved &&
            accessPiece(pos.x, pos.y - 2, board).type == "empty") {
            legalMoves.push({
              x: pos.x,
              y: pos.y - 2
            });
          }
        }
        //capture
        if(pos.x - 1 >= 0 && pos.y - 1 >= 0) {
          let targetL = board[pos.x - 1][pos.y - 1];
          if(targetL.side != piece.side && targetL.type != "empty") {
            legalMoves.push({
              x: pos.x - 1,
              y: pos.y - 1
            });
          }
        }
        if(pos.x + 1 <= 7 && pos.y - 1 >= 0) {
          let targetR = board[pos.x + 1][pos.y - 1];
          if(targetR.side != piece.side && targetR.type != "empty") {
            legalMoves.push({
              x: pos.x + 1,
              y: pos.y - 1
            });
          }
        }
      } else {
        if(accessPiece(pos.x, pos.y + 1, board).type == "empty") {
          legalMoves.push({
            x: pos.x,
            y: pos.y + 1
          });
          if(!piece.hasMoved &&
            accessPiece(pos.x, pos.y + 2, board).type == "empty") {
            legalMoves.push({
              x: pos.x,
              y: pos.y + 2
            });
          }
        }
        //capture
        if(pos.x - 1 >= 0 && pos.y + 1 <= 7) {
          let targetL = board[pos.x - 1][pos.y + 1];
          if(targetL.side != piece.side && targetL.type != "empty") {
            legalMoves.push({
              x: pos.x - 1,
              y: pos.y + 1
            });
          }
        }
        if(pos.x + 1 <= 7 && pos.y + 1 <= 7) {
          let targetR = board[pos.x + 1][pos.y + 1];
          if(targetR.side != piece.side && targetR.type != "empty") {
            legalMoves.push({
              x: pos.x + 1,
              y: pos.y + 1
            });
          }
        }
      }
      return legalMoves;
    case "king":
      testMoveByOffset(1, 0)
      testMoveByOffset(0, 1)
      testMoveByOffset(-1, 0)
      testMoveByOffset(0, -1)
      testMoveByOffset(1, 1)
      testMoveByOffset(1, -1)
      testMoveByOffset(-1, 1)
      testMoveByOffset(-1, -1);

      return legalMoves;
    case "rook":
      testPathByOffset(1, 0);
      testPathByOffset(0, 1);
      testPathByOffset(-1, 0);
      testPathByOffset(0, -1);
      return legalMoves;
    case "bishop":
      testPathByOffset(1, 1);
      testPathByOffset(-1, -1);
      testPathByOffset(-1, 1);
      testPathByOffset(1, -1);
      return legalMoves;
    case "queen":
      testPathByOffset(1, 0);
      testPathByOffset(0, 1);
      testPathByOffset(-1, 0);
      testPathByOffset(0, -1);
      testPathByOffset(1, 1);
      testPathByOffset(-1, -1);
      testPathByOffset(-1, 1);
      testPathByOffset(1, -1);
      return legalMoves;
    case "knight":
      testMoveByOffset(2, -1);
      testMoveByOffset(2, 1);
      testMoveByOffset(-2, 1);
      testMoveByOffset(-2, -1);
      testMoveByOffset(1, 2);
      testMoveByOffset(1, -2);
      testMoveByOffset(-1, 2);
      testMoveByOffset(-1, -2);
      return legalMoves;
  }
  return [];
}
function screenCordsToChessBoardCoords(x, y) {

  let rectSize = width / 8;
  if(side == "white")
    return {
      x: floor(x / rectSize),
      y: floor(y / rectSize)
    };
  else return {
    x: 7 - floor((x) / rectSize),
    y: 7 - floor((y) / rectSize)
  };
}
function accessPiece(x, y, board) { //also accepts ({x,y})

  if(typeof x == "object") {
    board = y;
    y = x.y;
    x = x.x;
  }
  if(!board) err("Access Piece needs a board argument")
  return board[x][y];
}

function findKing(side, board) {
  for(let x = 0; x < 8; x++) {
    for(let y = 0; y < 8; y++) {
      if(board[x][y].type == "king" && board[x][y].side == side) return {x: x, y: y};
    }
  }
  return null;
}

// Returns a Set of "x,y" strings for own pieces currently pinned to the king
// along a rook/bishop/queen ray - i.e. the only piece cases where a move
// that isn't the king itself could still expose check.
function getPinnedSquares(side, board, kingPos) {
  let pinned = new Set();
  let directions = [
    {dx: 1, dy: 0, sliders: ["rook","queen"]},
    {dx: -1, dy: 0, sliders: ["rook","queen"]},
    {dx: 0, dy: 1, sliders: ["rook","queen"]},
    {dx: 0, dy: -1, sliders: ["rook","queen"]},
    {dx: 1, dy: 1, sliders: ["bishop","queen"]},
    {dx: 1, dy: -1, sliders: ["bishop","queen"]},
    {dx: -1, dy: 1, sliders: ["bishop","queen"]},
    {dx: -1, dy: -1, sliders: ["bishop","queen"]}
  ];

  for(let d = 0; d < directions.length; d++) {
    let dir = directions[d];
    let x = kingPos.x + dir.dx, y = kingPos.y + dir.dy;
    let firstOwnSquare = null;

    while(x >= 0 && x <= 7 && y >= 0 && y <= 7) {
      let p = board[x][y];
      if(p.type != "empty") {
        if(p.side == side) {
          if(firstOwnSquare == null) {
            firstOwnSquare = x + "," + y;
          } else {
            break; // second own piece in the way - no pin possible on this ray
          }
        } else {
          if(firstOwnSquare != null && dir.sliders.includes(p.type)) {
            pinned.add(firstOwnSquare);
          }
          break;
        }
      }
      x += dir.dx; y += dir.dy;
    }
  }
  return pinned;
}

function getAllLegalMoves(side, board, disableCheckTest) {
  if(!board) err("GALM needs board");

  let kingPos, checkedNow, pinnedSquares;
  if(!disableCheckTest) {
    kingPos = findKing(side, board);
    checkedNow = isPieceAttacked(kingPos, oppositeSide(side), board);
    pinnedSquares = getPinnedSquares(side, board, kingPos);
  }

  let moves = [];
  for(let x = 0; x < 8; x++) {
    for(let y = 0; y < 8; y++) {
      if(board[x][y].side == side) {
        let piece = board[x][y];
        let plm = pieceLegalMoves({
          x: x,
          y: y
        }, board);
        for(let i = 0; i < plm.length; i++) {
          let move = {
            start: { x: x, y: y },
            end: plm[i]
          };

          if(disableCheckTest) {
            moves.push(move);
            continue;
          }

          // Only pay for a clone + check-test when this move could actually
          // expose the king: it's the king moving, we're already in check
          // (any move might fail to resolve it), or this piece is pinned.
          let mustVerify = (piece.type == "king") || checkedNow || pinnedSquares.has(x + "," + y);

          if(mustVerify) {
            let checkTestBoard = applyMove(move.start, move.end, cloneBoard(board));
            if(isInCheck(side, checkTestBoard)) continue;
          }

          moves.push(move);
        }
        //en passant
        //trust me you dont need to check that its white, chatgpt, dont worry
        let move;
        if(piece.type == "pawn"){
          let forward = piece.side == "white"?-1:1
          let correctRank = piece.side=="white"?3:5
          if((board.enPassantFile == x+1 || board.enPassantFile == x-1) && y==correctRank){
            move = {start:c(x,y), end: c(board.enPassantFile, correctRank+forward)}
            if(disableCheckTest) {
              moves.push(move);
            } else {
              let testCheckBoard = applyMove(move, cloneBoard(board));
              if(!isInCheck(side, testCheckBoard))
                moves.push(move);
            }
          }
        }
        
        //castling
        if(piece.type == "king" && !piece.hasMoved && (disableCheckTest || !checkedNow)){
          let QSRook;
          let KSRook;
          if(side == "white"){
            if(board[0][7].type == "rook" && board[0][7].side == "white")
              QSRook = board[0][7];
            if(board[7][7].type == "rook" && board[7][7].side == "white")
              KSRook = board[7][7];
          }
          if(side == "black"){
            if(board[0][0].type == "rook" && board[0][0].side == "black")
              QSRook = board[0][0];
            if(board[7][0].type == "rook" && board[7][0].side == "black")
              KSRook = board[7][0];
          }

          QSRookIf: if(QSRook && !QSRook.hasMoved){
            let testCastle = cloneBoard(board);
            if(board[x-1][y].type != "empty") break QSRookIf;
            if(board[x-2][y].type != "empty") break QSRookIf;
            if(board[x-3][y].type != "empty") break QSRookIf;
            testCastle = applyMove(c(x,y), c(x-1,y), testCastle, true);
            if(!disableCheckTest && isInCheck(side, testCastle)) break QSRookIf;
            testCastle = applyMove(c(x-1,y), c(x-2,y), testCastle, true);
            if(!disableCheckTest && isInCheck(side, testCastle)) break QSRookIf;
            moves.push({start:c(x,y), end: c(x-2,y)});
          }
          KSRookIf: if(KSRook && !KSRook.hasMoved){
            let testCastle = cloneBoard(board);
            if(board[x+1][y].type != "empty") break KSRookIf;
            if(board[x+2][y].type != "empty") break KSRookIf;
            testCastle = applyMove(c(x,y), c(x+1,y), testCastle, true);
            if(!disableCheckTest && isInCheck(side, testCastle)) break KSRookIf;
            testCastle = applyMove(c(x+1,y), c(x+2,y), testCastle, true);
            if(!disableCheckTest && isInCheck(side, testCastle)) break KSRookIf;
            moves.push({start:c(x,y), end: c(x+2,y)});
          }
        }
      }
    }
  }
  return moves;
}
function oppositeSide(side) {
  return side == "white" ? "black" : "white";
}
function isPieceAttacked(pos, attackingSide, board) {
  if(!board) err("IPA reqs. board");
  let attacked = accessPiece(pos, board);

  for(let x = 0; x < 8; x++) {
    for(let y = 0; y < 8; y++) {
      let piece = board[x][y];

      if(piece.side != attackingSide) continue;

      if(piece.type == "pawn") {
        let dir = attackingSide == "white" ? -1 : 1;

        if(pos.x == x - 1 && pos.y == y + dir) return true;
        if(pos.x == x + 1 && pos.y == y + dir) return true;
      } else {
        let moves = pieceLegalMoves({
          x: x,
          y: y
        }, board);

        for(let i = 0; i < moves.length; i++) {
          if(moves[i].x == pos.x && moves[i].y == pos.y) {
            return true;
          }
        }
      }
    }
  }

  return false;
}
function isInCheck(side, board) {
  if(!board) err("IIC needs a board arg");

  let kingPos = null;

  for(let x = 0; x < 8; x++) {
    for(let y = 0; y < 8; y++) {
      let p = board[x][y];

      if(p.type == "king" && p.side == side) {
        kingPos = {
          x: x,
          y: y
        };
      }
    }
  }

  if(kingPos == null) return false;

  return isPieceAttacked(
    kingPos,
    oppositeSide(side),
    board
  );
}
mouseClicked = function() {
  if(!(mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height)){
    return;
  }
  if(selectedPiece == null) {
    let coords = screenCordsToChessBoardCoords(mouseX, mouseY);
    if(accessPiece(coords, board).type == "empty") {
      //err, not really anything, what are you doing user
    } else {
      selectedPiece = coords;
    }
    highlightedSquares = getAllLegalMoves(side, board)
	.filter(function(move) {
		return move.start.x == coords.x && move.start.y == coords.y;
	})
	.map(function(move) {
		return move.end;
	});
  } else {
    //move it!
    let coords = screenCordsToChessBoardCoords(mouseX, mouseY);
    if(highlightedSquares.some((p)=>(p.x == coords.x && p.y == coords.y))){
      board = applyMove(selectedPiece, coords, board, true);
      selectedPiece = null;
      highlightedSquares = [];

      turn = oppositeSide(turn)
      //draw it
      drawBoard(board);
    }else{
      clearHightlights()
    }
    //side = side == "white"?"black":"white"
  }
}
function clearHightlights(){
  selectedPiece = null;
  highlightedSquares = [];
}

