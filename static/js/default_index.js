// This is the js for the default/index.html view.

var board,
    game = new Chess();

var currentEval;
var positionCount;
var transpositionTable = new LRU(999999);
var hitCounter = 0;
var principleVariation = [];


// ----------------------------------------------------------------------------------------------------
// ---------------------------------------- Move search Section ---------------------------------------
// ----------------------------------------------------------------------------------------------------

/*
* The minimax root function which looks at all the current available moves (depth = 1)
*/
var minimaxRoot = function(depth, game, isMaximisingPlayer) {

    var newGameMoves = game.moves();
    newGameMoves = sortMoveArray(newGameMoves, game);
    var bestMove = -9999;
    var bestMoveFound;
    console.log("newGameMoves", newGameMoves);

    for(var i = 0; i < newGameMoves.length; i++) {
        var value;
        var newGameMove = newGameMoves[i]
        game.move(newGameMove);
        value = minimax(depth - 1, game, -10000, 10000, !isMaximisingPlayer);
        game.undo();
        if(value >= bestMove) {
            bestMove = value;
            currentEval = bestMove;
            console.log("new best move ", newGameMove, " value = ", value);
            setStats();
            bestMoveFound = newGameMove;
        }
    }

    return bestMoveFound;
};

/*
* The minimax function which recursively looks at the move tree 
*/
var minimax = function (depth, game, alpha, beta, isMaximisingPlayer) {
    positionCount++;
    if (depth === 0) {
        return -evaluateBoard(game.board(), game.fen());
    }

    var newGameMoves = game.moves();
    newGameMoves = sortMoveArray(newGameMoves);

    if (isMaximisingPlayer) {
        var bestMove = -9999;
        for (var i = 0; i < newGameMoves.length; i++) {
            game.move(newGameMoves[i]);
            bestMove = Math.max(bestMove, minimax(depth - 1, game, alpha, beta, !isMaximisingPlayer));
            game.undo();
            alpha = Math.max(alpha, bestMove);
            if (beta <= alpha) {
                return bestMove;
            }
        }
        return bestMove;
    } else {
        var bestMove = 9999;
        for (var i = 0; i < newGameMoves.length; i++) {
            game.move(newGameMoves[i]);
            bestMove = Math.min(bestMove, minimax(depth - 1, game, alpha, beta, !isMaximisingPlayer));
            game.undo();
            beta = Math.min(beta, bestMove);
            if (beta <= alpha) {
                return bestMove;
            }
        }
        return bestMove;
    }
};

/*
* Sorts the move list by priority of move
*/
var sortMoveArray = function(moves, game){
    return moves.sort(function(a, b){
    if (b.includes("#") && !a.includes("#")){       //look at checkmates first
        return 1;
    } else if (!b.includes("#") && a.includes("#")){
        return -1;
    } else if (b.includes("+") && !a.includes("+")){ //look at checks second
        return 1;
    } else if (!b.includes("+") && a.includes("+")){ 
        return -1;
    } else if (b.includes("x") && !a.includes("x")){ //look at captures third
        return 1;
    } else if (!b.includes("x") && a.includes("x")){
        return -1;
    }  else if (b.includes("a") && !a.includes("a")){ //look at a file last
        return -1;
    } else if (!b.includes("a") && a.includes("a")){
        return 1;
    } else if (b.includes("h") && !a.includes("h")){ //look at h file last
        return -1;
    } else if (!b.includes("h") && a.includes("h")){
        return 1;
    }  else if (game && game.history().length < 12){  //-------- if in the first 6 moves -------- 

        if (b.includes("R") && !a.includes("R")){        //don't move Rooks 
            return -1;
        } else if (!b.includes("R") && a.includes("R")){
            return 1;
        } else if (!b.includes("K") && a.includes("K")){ //don't move king
            return 1;
        } else if (!b.includes("K") && a.includes("K")){
            return 1;
        }
    } else {
        return 0;
    }
  });
}

var quiesce = function(game, alpha, beta, isMaximisingPlayer){
    var standPat = minimaxRoot(0, game, isMaximisingPlayer);
    if (standPat >= beta){
        return beta;
    }
    if (aplha < standPat){
        alpha = standPat;
    }
    var newGameMoves = game.moves();
    var captures = findCaptures(newGameMoves);
    var score;

    for (var i = 0; i < captures.length; i++){
        game.move(captures[i]);
        score = quiesce(game, alpha, beta, !isMaximisingPlayer);
        game.undo();
        if ( score >= beta){
            return beta;
        }
        if (score > alpha){
            alpha = score;
        }
    }
    return alpha;
}

var findCaptures = function(moves){
    return moves.filter(function(move){
        return move.includes("x");
    })
}

// ----------------------------------------------------------------------------------------------------
// -------------------------------------- Board Evaluation Section ------------------------------------
// ----------------------------------------------------------------------------------------------------

/*
* Give the current board an evaluation score based on pieces and piece positions
*/
var evaluateBoard = function (board, fen) {
    var totalEvaluation = 0;
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            totalEvaluation = totalEvaluation + getPieceValue(board[i][j], i ,j);
        }
    }

    return totalEvaluation;
};

/*
* Reverses an array
*/
var reverseArray = function(array) {
    return array.slice().reverse();
};

var pawnEvalWhite =
    [
        [0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0],
        [1.0,  1.0,  2.0,  3.0,  3.0,  2.0,  1.0,  1.0],
        [0.5,  0.5,  1.0,  2.5,  2.5,  1.0,  0.5,  0.5],
        [0.0,  0.0,  0.0,  2.0,  2.0,  0.0,  0.0,  0.0],
        [0.5, -0.5, -1.0,  0.0,  0.0, -1.0, -0.5,  0.5],
        [0.5,  1.0, 1.0,  -2.0, -2.0,  1.0,  1.0,  0.5],
        [0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0]
    ];

var pawnEvalBlack = reverseArray(pawnEvalWhite);

var knightEval =
    [
        [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
        [-4.0, -2.0,  0.0,  0.0,  0.0,  0.0, -2.0, -4.0],
        [-3.0,  0.0,  1.0,  1.5,  1.5,  1.0,  0.0, -3.0],
        [-3.0,  0.5,  1.5,  2.0,  2.0,  1.5,  0.5, -3.0],
        [-3.0,  0.0,  1.5,  2.0,  2.0,  1.5,  0.0, -3.0],
        [-3.0,  0.5,  1.0,  1.5,  1.5,  1.0,  0.5, -3.0],
        [-4.0, -2.0,  0.0,  0.5,  0.5,  0.0, -2.0, -4.0],
        [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0]
    ];

var bishopEvalWhite = [
    [ -2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
    [ -1.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -1.0],
    [ -1.0,  0.0,  0.5,  1.0,  1.0,  0.5,  0.0, -1.0],
    [ -1.0,  0.5,  0.5,  1.0,  1.0,  0.5,  0.5, -1.0],
    [ -1.0,  0.0,  1.0,  1.0,  1.0,  1.0,  0.0, -1.0],
    [ -1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0, -1.0],
    [ -1.0,  0.5,  0.0,  0.0,  0.0,  0.0,  0.5, -1.0],
    [ -2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0]
];

var bishopEvalBlack = reverseArray(bishopEvalWhite);

var rookEvalWhite = [
    [  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
    [  0.5,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [  0.0,   0.0, 0.0,  0.5,  0.5,  0.0,  0.0,  0.0]
];

var rookEvalBlack = reverseArray(rookEvalWhite);

var evalQueen =
    [
    [ -2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
    [ -1.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -1.0],
    [ -1.0,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -1.0],
    [ -0.5,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -0.5],
    [  0.0,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -0.5],
    [ -1.0,  0.5,  0.5,  0.5,  0.5,  0.5,  0.0, -1.0],
    [ -1.0,  0.0,  0.5,  0.0,  0.0,  0.0,  0.0, -1.0],
    [ -2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0]
];

var kingEvalWhite = [

    [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [ -2.0, -3.0, -3.0, -4.0, -4.0, -3.0, -3.0, -2.0],
    [ -1.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -1.0],
    [  2.0,  2.0,  0.0,  0.0,  0.0,  0.0,  2.0,  2.0 ],
    [  2.0,  3.0,  1.0,  0.0,  0.0,  1.0,  3.0,  2.0 ]
];

var kingEvalBlack = reverseArray(kingEvalWhite);

/*
* Calculates the value for a piece on a specific square
*/
var getPieceValue = function (piece, x, y) {
    if (piece === null) {
        return 0;
    }
    var getAbsoluteValue = function (piece, isWhite, x ,y) {
        if (piece.type === 'p') {
            return 10 + ( isWhite ? pawnEvalWhite[y][x] : pawnEvalBlack[y][x] );
        } else if (piece.type === 'r') {
            return 51 + ( isWhite ? rookEvalWhite[y][x] : rookEvalBlack[y][x] );
        } else if (piece.type === 'n') {
            return 32 + knightEval[y][x];
        } else if (piece.type === 'b') {
            return 33 + ( isWhite ? bishopEvalWhite[y][x] : bishopEvalBlack[y][x] );
        } else if (piece.type === 'q') {
            return 88 + evalQueen[y][x];
        } else if (piece.type === 'k') {
            return 999 + ( isWhite ? kingEvalWhite[y][x] : kingEvalBlack[y][x] );
        }
        throw "Unknown piece type: " + piece.type;
    };

    var absoluteValue = getAbsoluteValue(piece, piece.color === 'w', x ,y);
    return piece.color === 'w' ? absoluteValue : -absoluteValue;
};

// ----------------------------------------------------------------------------------------------------
// --------------------------- Board visualization and Games States Section ---------------------------
// ----------------------------------------------------------------------------------------------------

var onDragStart = function (source, piece, position, orientation) {
    if (game.in_checkmate() === true || game.in_draw() === true ||
        piece.search(/^b/) !== -1) {
        return false;
    }
};

var makeBestMove = function () {
    var bestMove = getBestMove(game);
    game.move(bestMove);
    board.position(game.fen());
    renderMoveHistory(game.history());
    if (game.game_over()) {
        alert('Game over');
    }
};

var getBestMove = function (game) {
    if (game.game_over()) {
        alert('Game over');
    }

    positionCount = 0;
    var depth = parseInt($('#search-depth').find(':selected').text());

    var d = new Date().getTime();
    var bestMove = minimaxRoot(depth, game, true);
    var d2 = new Date().getTime();
    var moveTime = (d2 - d);
    var positionsPerS = Math.round((positionCount * 1000 / moveTime) * 100) / 100;

    $('#position-count').text(positionCount);
    $('#time').text(moveTime/1000 + 's');
    $('#positions-per-s').text(positionsPerS);
    $('#current-evaluation').text(currentEval*-1);
    return bestMove;
};

var setStats = function() {
    console.log("positionCount: ", positionCount);
    console.log("currentEval: ", currentEval);
    //console.log("hitCounter: ", hitCounter);
    $('#position-count').text(positionCount);
    $('#current-evaluation').text(currentEval);
}


var renderMoveHistory = function (moves) {
    var historyElement = $('#move-history').empty();
    historyElement.empty();
    for (var i = 0; i < moves.length; i = i + 2) {
        historyElement.append('<span>' + moves[i] + ' ' + ( moves[i + 1] ? moves[i + 1] : ' ') + '</span><br>')
    }
    historyElement.scrollTop(historyElement[0].scrollHeight);

};

var onDrop = function (source, target) {

    var move = game.move({
        from: source,
        to: target,
        promotion: 'q'
    });

    removeGreySquares();
    if (move === null) {
        return 'snapback';
    }

    renderMoveHistory(game.history());
    window.setTimeout(makeBestMove, 250);
};

var onSnapEnd = function () {
    board.position(game.fen());
};

var onMouseoverSquare = function(square, piece) {
    var moves = game.moves({
        square: square,
        verbose: true
    });

    if (moves.length === 0) return;

    greySquare(square);

    for (var i = 0; i < moves.length; i++) {
        greySquare(moves[i].to);
    }
};

var onMouseoutSquare = function(square, piece) {
    removeGreySquares();
};

var removeGreySquares = function() {
    $('#board .square-55d63').css('background', '');
};

var greySquare = function(square) {
    var squareEl = $('#board .square-' + square);

    var background = '#a9a9a9';
    if (squareEl.hasClass('black-3c85d') === true) {
        background = '#696969';
    }

    squareEl.css('background', background);
};

var cfg = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onMouseoutSquare: onMouseoutSquare,
    onMouseoverSquare: onMouseoverSquare,
    onSnapEnd: onSnapEnd
};
board = ChessBoard('board', cfg);

$('#setStartBtn').on('click', function() {
    board.start(false);
    var historyElement = $('#move-history').empty();
    historyElement.empty();
    game = new Chess();
});

