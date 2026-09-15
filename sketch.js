//set bots time limit in boardTools.js


side = "white"; //the side the player is playing as
turn = "white";


document.getElementById("time-limit").value = timeLimit / 1000 || 30;
let thinking = false;
let debugMode = false;
// noprotect
let label;
let moveNumber=0;
p5.disableFriendlyErrors = true;
//1st declared in boardTools.js
playerPromoteTo = "queen";
botPromoteTo = "queen";
let highlightedSquares = [] //for all the legal moves
let selectedPiece = null;

let botWorker = new Worker("bot.js");

let err = (msg) => {
  throw new Error(msg);
}
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
  createCanvas(450, 450);
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
  if(turn == oppositeSide(side) && !thinking){
    let timeLimit = document.getElementById("time-limit").value * 1000 || 30000;
    let m = botWorker.postMessage({turn: turn, board: board, moveNumber: moveNumber, promoteTo: botPromoteTo, timeLimit: timeLimit});
    thinking = true;
    
  }
  document.getElementById("info").innerHTML = "Turn: "+turn+", Move: "+moveNumber;         
}
botWorker.onmessage = function(e) {
  if(e.data.type == "status"){
    document.getElementById("bot-status").innerHTML = e.data.status;
    return;
  }
  let m = e.data;
  
  board = applyMove(m.start, m.end, board, true);
  thinking = false;
  turn = oppositeSide(turn);
  document.getElementById("bot-status").innerHTML = "Idle";
  moveNumber++;
}
function gameOver(state, side){
  if(state == "checkmate"){
    err("Game Over! Good job "+side)
  }else{
    err("Oof a draw!")
  }
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

mouseClicked = function() {
  if(turn != side) return;
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

