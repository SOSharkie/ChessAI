// This is the js for the default/index.html view.

var board,
    game = new Chess();

var currentEval;
var positionCount;
var transpositionTable = new LRU(999999);
var hitCounter = 0;
var principleVariation = [];

var zobristTable = new Array(8);
for (var i = 0; i < 8; i++) {
    zobristTable[i] = new Array(8);
}
for (var i = 0; i < 8; i++) {
    for (var j = 0; j < 8; j++) {
        zobristTable[i][j] = new Array(12);
    }
}



// ----------------------------------------------------------------------------------------------------
// ---------------------------------------- Move search Section ---------------------------------------
// ----------------------------------------------------------------------------------------------------

/*
* The minimax root function which looks at all the current available moves (depth = 1)
*/
var minimaxRoot = function(depth, game, isMaximisingPlayer) {
    hitCounter = 0;
    console.log("--------------------------- New Turn ---------------------------");
    var newGameMoves = game.moves();
    var hashValue = zobristHash(game.board()); 
    var predictedBestMove;
    //console.log(game.ascii());
    if (transpositionTable.contains(hashValue)){
        predictedBestMove = transpositionTable.read(hashValue);
        console.log("predicted best move: ", predictedBestMove[1]);
    } else {
        predictedBestMove = ["not found", "not found", "not found"];
        console.log("predicted best move: ", predictedBestMove[1]);
    }
    newGameMoves = sortMoveArray(newGameMoves, game.history().length, predictedBestMove[1]);
    var bestMoveScore = -9999;
    var bestMoveFound;
    console.log("newGameMoves:", newGameMoves);

    for(var i = 0; i < newGameMoves.length; i++) {
        var value;
        var newGameMove = newGameMoves[i]
        var newMoveObj = game.move(newGameMove);
        hashValue = updateZobrist(hashValue, newMoveObj);
        value = minimax(depth - 1, game, -10000, 10000, !isMaximisingPlayer, hashValue);
        var moveHistory = game.history();
        transpositionTable.write(hashValue, value, moveHistory[moveHistory.length-1], depth);
        game.undo();
        if(value > bestMoveScore) {
            bestMoveScore = value;
            currentEval = bestMoveScore;
            console.log("new best move ", newGameMove, " value = ", value);
            setStats();
            bestMoveFound = newGameMove;
        } else {
            console.log("move ", newGameMove, " value = ", value);
        }
    }

    console.log("final hit count: ", hitCounter);
    console.log("current cache size: ", transpositionTable.size);
    console.log("----------------------------------------------------------------");
    //findPV(game, bestMoveFound);
    return bestMoveFound;
};

/*
* The minimax function which recursively looks at the move tree 
*/
var minimax = function (depth, game, alpha, beta, isMaximisingPlayer, hashValue) {
    positionCount++;
    if (depth === 0) {
        if (transpositionTable.contains(hashValue)){
            hitCounter++;
            return transpositionTable.read(hashValue)[0];
        } else {
            var evaluationScore = -evaluateBoard(game.board());
            if (isMaximisingPlayer){
                evaluationScore = quiesce(game, alpha, beta, isMaximisingPlayer, 5);
            } else {
                evaluationScore = -quiesce(game, -beta, -alpha, isMaximisingPlayer, 5);
            }
            var moveHistory = game.history();
            var currentMove;
            if (isMaximisingPlayer){
                currentMove = moveHistory[moveHistory.length-1];
            }
            if (game.in_threefold_repetition()){
                evaluationScore = 0;
            }
            transpositionTable.write(hashValue, evaluationScore, currentMove, 0);
            return evaluationScore;
        }
    }

    var newGameMoves = game.moves();
    var predictedBestMove;
    if (transpositionTable.contains(hashValue)){
        predictedBestMove = transpositionTable.read(hashValue);
    } else {
        predictedBestMove = ["not found", "not found", "not found"];
    }
    newGameMoves = sortMoveArray(newGameMoves, game.history().length, predictedBestMove[1]);

    if (isMaximisingPlayer) {
        var bestMoveScore = -9999;
        for (var i = 0; i < newGameMoves.length; i++) {
            var newMoveObj = game.move(newGameMoves[i]);
            var newHashValue = updateZobrist(hashValue, newMoveObj);

            if (transpositionTable.contains(newHashValue)){
                var positionData = transpositionTable.read(newHashValue);
                if (positionData[2] > depth){
                    hitCounter++;
                    bestMoveScore = transpositionTable.read(newHashValue)[0];
                } else {
                    bestMoveScore = Math.max(bestMoveScore, minimax(depth - 1, game, alpha, beta, !isMaximisingPlayer, newHashValue));
                    transpositionTable.write(newHashValue, bestMoveScore, newMoveObj.san, depth);
                }
            } else {
                bestMoveScore = Math.max(bestMoveScore, minimax(depth - 1, game, alpha, beta, !isMaximisingPlayer, newHashValue));
                transpositionTable.write(newHashValue, bestMoveScore, newMoveObj.san, depth);
            }

            game.undo();
            alpha = Math.max(alpha, bestMoveScore);
            if (beta <= alpha) {
                return bestMoveScore;
            }
        }
        return bestMoveScore;
    } else {
        var bestMoveScore = 9999;
        for (var i = 0; i < newGameMoves.length; i++) {
            var newMoveObj = game.move(newGameMoves[i]);
            var newHashValue = updateZobrist(hashValue, newMoveObj);

            if (transpositionTable.contains(newHashValue)){
                var positionData = transpositionTable.read(newHashValue);
                if (positionData[2] > depth){
                    hitCounter++;
                    bestMoveScore = transpositionTable.read(newHashValue)[0];
                } else {
                    bestMoveScore = Math.min(bestMoveScore, minimax(depth - 1, game, alpha, beta, !isMaximisingPlayer, newHashValue));
                    transpositionTable.write(newHashValue, bestMoveScore, "", depth);
                }
            } else {
                bestMoveScore = Math.min(bestMoveScore, minimax(depth - 1, game, alpha, beta, !isMaximisingPlayer, newHashValue));
                transpositionTable.write(newHashValue, bestMoveScore, "", depth);
            }

            game.undo();
            beta = Math.min(beta, bestMoveScore);
            if (beta <= alpha) {
                return bestMoveScore;
            }
        }
        return bestMoveScore;
    }
};

/*
* Sorts the move list by priority of move
*/
var sortMoveArray = function(moves, numMoves, predictedBestMove){
    return moves.sort(function(a, b){
    if (a === predictedBestMove){
        return -1;
    } else if ( b === predictedBestMove){
        return 1;
    } else if (b.includes("#") && !a.includes("#")){       //look at checkmates first
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
    }  else if (numMoves < 12){  //-------- if in the first 6 turns -------- 

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

/*
* After main search make sure there are no more captures that will significantly
* alter the evaluation
*/
var quiesce = function(game, alpha, beta, isMaximisingPlayer, depth){
    positionCount++;
    var standPat = isMaximisingPlayer ? -evaluateBoard(game.board()) : evaluateBoard(game.board());
    if (standPat >= beta){
        return beta;
    }
    if (alpha < standPat){
        alpha = standPat;
    }
    if (depth === 0){
        return alpha;
    }
    var newGameMoves = game.moves({verbose: true});
    var captures = findCaptures(newGameMoves);
    var score;

    for (var i = 0; i < captures.length; i++){
        var newMoveObj = game.move(captures[i]);
        score = -quiesce(game, -beta, -alpha, depth-1);
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

/*
* Takes in an array of moves and returns only the moves with captures or checks
* Then sorts them by Most Valuable Victim - Least Valuable Aggressor
*/
var findCaptures = function(moves){
    var captures = moves.filter(function(move){
        return (move.san.includes("x") || move.san.includes("+") || move.san.includes("#"));
    });

    for (var i = 0; i < captures.length; i++){
        if(captures[i].captured === 'q'){
            captures[i].orderingScore = 100;
        } else if (captures[i].captured === 'r'){
            captures[i].orderingScore = 50;
        } else if (captures[i].captured === 'b' || captures[i].captured === 'n'){
            captures[i].orderingScore = 30;
        } else if (captures[i].captured === 'p'){
            captures[i].orderingScore = 10;
        }
    }
    for (var i = 0; i < captures.length; i++){
        if(captures[i].piece === 'q'){
            captures[i].orderingScore += 10;
        } else if (captures[i].piece === 'r'){
            captures[i].orderingScore += 5;
        } else if (captures[i].piece === 'b' || captures[i].piece === 'n'){
            captures[i].orderingScore += 3;
        } else if (captures[i].piece === 'p'){
            captures[i].orderingScore += 1;
        }
    }

    captures.sort(function(a, b){
        return b.orderingScore - a.orderingScore;
    });
    return captures;
}


var empty_square = 0,
    white_pawn = 1,
    white_rook = 2,
    white_knight = 3,
    white_bishop = 4,
    white_queen = 5,
    white_king = 6,
    black_pawn = 7,
    black_rook = 8,
    black_knight = 9,
    black_bishop = 10,
    black_queen = 11,
    black_king = 12;


function random32BitNum() {
    return Math.floor(Math.random() * Math.floor(2147483646));
}

/*  
*fill a table of random numbers/bitstrings
*/
var initZobrist = function(){
    for (var i = 0; i < 8; i++){
        for (var j = 0; j < 8; j++){
            for (var k = 1; k <= 12; k++) {
                zobristTable[i][j][k] = random32BitNum();
            }
        }
    }
    console.log("zobrist table initialized");

    // var bestMove = minimaxRoot(3, game, false);
    // console.log("table size = ", transpositionTable.size);
}
   
var zobristHash = function(board){
    var hash = 0; 
    for (var i = 0; i < 8; i++) { 
        for (var j = 0;  j < 8; j++) { 
            if (board[i][j] !== null) { 
                var piece = board[i][j]; 
                var pieceNum;
                if (piece.type === 'p'){
                    pieceNum = 1;
                } else if (piece.type === 'r'){
                    pieceNum = 2;
                } else if (piece.type === 'n'){
                    pieceNum = 3;
                } else if (piece.type === 'b'){
                    pieceNum = 4;
                } else if (piece.type === 'q'){
                    pieceNum = 5;
                } else if (piece.type === 'k'){
                    pieceNum = 6;
                } 
                if (piece.color === 'b'){
                    pieceNum += 6;
                }
                hash ^= zobristTable[i][j][pieceNum]; 
            }  
        } 
    } 
    return hash;
}

var updateZobrist = function(hashValue, moveObj) {
    var fromX, fromY, toX, toY, movingPiece, capturedPiece;
    var capture = (moveObj.flags === 'c');
    // Get the type and color of moving piece
    switch (moveObj.piece) {
        case 'p': movingPiece = 1; break;
        case 'r': movingPiece = 2; break;
        case 'n': movingPiece = 3; break;
        case 'b': movingPiece = 4; break;
        case 'q': movingPiece = 5; break;
        case 'k': movingPiece = 6; break;
        default: console.log("unknown piece type: ", moveObj.piece);
    }
    if (moveObj.color === 'b'){
        movingPiece += 6;
    }
    // Get the x coordinate of square moved from
    switch(moveObj.from.charAt(1)) {
        case '1': fromX = 7; break;
        case '2': fromX = 6; break;
        case '3': fromX = 5; break;
        case '4': fromX = 4; break;
        case '5': fromX = 3; break;
        case '6': fromX = 2; break;
        case '7': fromX = 1; break;
        case '8': fromX = 0; break;
        default: console.log("out of bounds board number in 'from': ", moveObj.from);
    }
    // Get the y coordinate of square moved from
    switch(moveObj.from.charAt(0)) {
        case 'a': fromY = 0; break;
        case 'b': fromY = 1; break;
        case 'c': fromY = 2; break;
        case 'd': fromY = 3; break;
        case 'e': fromY = 4; break;
        case 'f': fromY = 5; break;
        case 'g': fromY = 6; break;
        case 'h': fromY = 7; break;
        default: console.log("unknown board letter in 'from': ", moveObj.from);
    }
    // Get the x coordinate of square moved to
    switch(moveObj.to.charAt(1)) {
        case '1': toX = 7; break;
        case '2': toX = 6; break;
        case '3': toX = 5; break;
        case '4': toX = 4; break;
        case '5': toX = 3; break;
        case '6': toX = 2; break;
        case '7': toX = 1; break;
        case '8': toX = 0; break;
        default: console.log("out of bounds board number in 'to': ", moveObj.to);
    }
    // Get the y coordinate of square moved to
    switch(moveObj.to.charAt(0)) {
        case 'a': toY = 0; break;
        case 'b': toY = 1; break;
        case 'c': toY = 2; break;
        case 'd': toY = 3; break;
        case 'e': toY = 4; break;
        case 'f': toY = 5; break;
        case 'g': toY = 6; break;
        case 'h': toY = 7; break;
        default: console.log("unknown board letter in 'to': ", moveObj.to);
    }
    //Get type and color of captured piece
    if(capture){
        switch (moveObj.captured) {
            case 'p': capturedPiece = 1; break;
            case 'r': capturedPiece = 2; break;
            case 'n': capturedPiece = 3; break;
            case 'b': capturedPiece = 4; break;
            case 'q': capturedPiece = 5; break;
            case 'k': capturedPiece = 6; break;
            default: console.log("unknown piece type: ", moveObj.captured);
        }
        if (moveObj.color === 'w'){
            capturedPiece += 6;
        }
    }

    var newHash = hashValue ^ zobristTable[fromX][fromY][movingPiece];
    if(capture){ newHash ^= zobristTable[toX][toY][capturedPiece]; }
    newHash ^= zobristTable[toX][toY][movingPiece];
    return newHash;

}

// ----------------------------------------------------------------------------------------------------
// -------------------------------------- Board Evaluation Section ------------------------------------
// ----------------------------------------------------------------------------------------------------

/*
* Give the current board an evaluation score based on pieces and piece positions
*/
var evaluateBoard = function (board) {
    var totalEvaluation = 0;
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            totalEvaluation = totalEvaluation + getPieceValue(board, board[i][j], i, j);
        }
    }

    return totalEvaluation;
};

/*
* Calculates the value for a piece on a specific square
*/
var getPieceValue = function (board, piece, x, y) {
    if (piece === null) {
        return 0;
    }
    var absoluteValue;
    var isWhite = (piece.color === 'w');
    if (piece.type === 'p') {
        absoluteValue = 10 + ( isWhite ? pawnEvalWhite[y][x] : pawnEvalBlack[y][x]);
    } else if (piece.type === 'r') {
        absoluteValue = 51 + ( isWhite ? rookEvalWhite[y][x] : rookEvalBlack[y][x] );
    } else if (piece.type === 'n') {
        absoluteValue = 32 + knightEval[y][x];
    } else if (piece.type === 'b') {
        absoluteValue = 33 + ( isWhite ? bishopEvalWhite[y][x] : bishopEvalBlack[y][x] );
    } else if (piece.type === 'q') {
        absoluteValue = 88 + evalQueen[y][x];
    } else if (piece.type === 'k') {
        absoluteValue = 999 + ( isWhite ? kingEvalWhite[y][x] : kingEvalBlack[y][x] );
    } else {
        throw "Unknown piece type: " + piece.type;
    }

    return isWhite ? absoluteValue : -absoluteValue;
};

var pawnEvaluation = function(board, x, y, isWhite) {

    //y is letters on board
    //x is numbers reversed

    const DOUBLED_PAWN_PENALTY = 20;
    const ISOLATED_PAWN_PENALTY = 10;
    const BACKWARD_PAWN_PENALTY = 8;
    const PASSED_PAWN_BONUS = 30;
    const PROTECTED_PAWN_BONUS = 10;

    var score = 0;
    //var pawnPosition = boardXYtoSquare(x, y);
    var pawnColor = isWhite ? 'w' : 'b';

    //Doubled pawns
    // if (!isWhite){
    //     for (var i = x+1; i <= 7; i++){
    //         if (board[i][y]){
    //             if (board[i][y].type === 'p' && board[i][y].color === 'b'){
    //                 score -= DOUBLED_PAWN_PENALTY;
    //                 //console.log("Doubled pawn at ", pawnPosition);
    //             }
    //         }
    //     } 
    // } else {
    //     for (var i = x-1; i >= 0; i--){
    //         if (board[i][y]){
    //             if (board[i][y].type === 'p' && board[i][y].color === 'w'){
    //                 score -= DOUBLED_PAWN_PENALTY;
    //                 //console.log("Doubled pawn at ", pawnPosition);
    //             }
    //         }
    //     }
    // }

    //Passed Pawns 
    if (game.history().length > 12){
        /*TODO: currently only looks at open file, not files on either side */
        // var notPassed = false;
        // if (!isWhite){
        //     for (var i = x+1; i <= 7; i++){
        //         if (board[i][y]){
        //             if (board[i][y].type === 'p' && board[i][y].color === 'w'){
        //                 notPassed = true;
        //                 break;
        //             }
        //         }
        //     }
        // } else {
        //     for (var i = x-1; i >= 0; i--){
        //         if (board[i][y]){
        //             if (board[i][y].type === 'p' && board[i][y].color === 'b'){
        //                 notPassed = true;
        //                 break;
        //             }
        //         }
        //     }
        // }
        // if (!notPassed){
        //     score += PASSED_PAWN_BONUS;
        //     console.log("Passed pawn at ", pawnPosition);
        // }
    }

    return score;
}

/*
* Reverses an array
*/
var reverseArray = function(array) {
    return array.slice().reverse();
};

var pawnEvalWhite = [
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

var knightEval = [
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
    var moveObj = game.move(bestMove);
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
    $('#current-evaluation').text(Math.round((currentEval * -.1)*100) / 100);
    return bestMove;
};

var setStats = function() {
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
    window.setTimeout(makeBestMove, 100);
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

var boardXYtoSquare = function(x, y){
    var rank, file;
    switch(x) {
        case 0: file = '8'; break;
        case 1: file = '7'; break;
        case 2: file = '6'; break;
        case 3: file = '5'; break;
        case 4: file = '4'; break;
        case 5: file = '3'; break;
        case 6: file = '2'; break;
        case 7: file = '1'; break;
        default: return 0;
    }
    switch(y) {
        case 0: rank = 'a'; break;
        case 1: rank = 'b'; break;
        case 2: rank = 'c'; break;
        case 3: rank = 'd'; break;
        case 4: rank = 'e'; break;
        case 5: rank = 'f'; break;
        case 6: rank = 'g'; break;
        case 7: rank = 'h'; break;
        default: return 0;
    }

    return rank + file;
}

var cfg = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    moveSpeed: 'fast',
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

$('#undoMove').on('click', function() {
    game.undo();
    board.position(game.fen());
});

// $('#testTable').on('click', function() {

//     var currentHash = zobristHash(game.board());
//     var currentGameMoves = game.moves();
//     var currentGameMoveObjs = game.moves({ verbose: true });

//     var testNum = 50000;
//     var d = new Date().getTime();
//     for (var i = 0; i < testNum; i++){
//         var moveObj = game.move(currentGameMoves[i%currentGameMoves.length]);
//         var evaluation = evaluateBoard(game.board());
//         var newHash = zobristHash(game.board());
//         transpositionTable.write(newHash, evaluation, 5);
//         game.undo();
//     }
//     var d2 = new Date().getTime();
//     var writeTime = (d2 - d)/1000;
//     console.log("hash time= " + writeTime + "s. ");
//     console.log("hash/sec= ", (testNum/ writeTime));
//     console.log("-------------------------------------------------------");
//     d = new Date().getTime();
//     var test;
//     for (var i = 0; i < testNum; i++){
//         var moveObj = currentGameMoveObjs[i%currentGameMoves.length];

//         //var evaluation = evaluateBoard(game.board());
//         var newHash = updateZobrist(currentHash, moveObj);
//         newHash = updateZobrist(currentHash, moveObj);
//         transpositionTable.write(newHash, 3.1, 5);
//         //game.undo();
//     }
//     d2 = new Date().getTime();
//     readTime = (d2 - d)/1000;
//     console.log("update time= " + readTime + "s. ");
//     console.log("updates/sec= ", (testNum/ readTime));
// });

initZobrist();


