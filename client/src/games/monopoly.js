const state = require('../../../state')
MCTS = require('./client/src/MCTS.js')

class TyPhu {
    constructor(){
        this.state = state
    }

    getState(){
        return this.state
    }
    setState(state){
        this.state = state;
    }

    cloneState(){
        return  {...this.state}
    }

    playerTurn(){
        return this.state.currentPlayer["id"]
    } 

    moves(){
        let moves = [
        document.getElementsByClassName("dice__button")[0].click(), 
        document.getElementsByClassName("tile-back__button")[0].click(), 
        document.getElementsByClassName("tile-back__button")[1].click(), 
        document.getElementsByClassName("button__purchase--yes").click(), 
        document.getElementsByClassName("open-market__sell-toast__button--yes")[0].click(), 
        document.getElementsByClassName("open-market__sell-toast__button--no")[0].click() 


        ];
        return moves
    }
}

game = new TyPhu()

let iterations = 10 //more iterations -> stronger AI, more computation
let exploration = 1.41 //exploration vs. explotation parameter, sqrt(2) is reasonable default (c constant in UBC forumula)

let player1 = new MCTS(game, 1 , iterations, exploration)
let player2 = new MCTS(game, 2 , iterations, exploration)

while (true){
    let p1_move = player1.selectMove()
    game.playMove(p1_move)

    if (game.gameOver()) {break}

    let p2_move = player2.selectMove()
    game.playMove(p2_move)

    if (game.gameOver()) {break}
}

modules.export = TyPhu