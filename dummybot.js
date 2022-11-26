// // import pkg1 from './client/src/games/index.js';
// // const {TyPhu} = pkg1;
// // import pkg from './client/src/MCTS.js';
// // const {MCTS} = pkg;

// RandomAI = require('./client/src/games/random-ai.js')

// MCTS = require('./client/src/MCTS.js')
// TyPhu = require('./client/src/games/monopoly.js');
// let game = new TyPhu()

// let iterations = 10 //more iterations -> stronger AI, more computation
// let exploration = 1.41 //exploration vs. explotation parameter, sqrt(2) is reasonable default (c constant in UBC forumula)

// let player1 = new MCTS(game, 1 , iterations, exploration)
// let player2 = new MCTS(game, 2 , iterations, exploration)

// while (true){
//     let p1_move = player1.selectMove()
//     game.playMove(p1_move)

//     if (game.gameOver()) {break}

//     let p2_move = player2.selectMove()
//     game.playMove(p2_move)

//     if (game.gameOver()) {break}
// }