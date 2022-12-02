const state = {
  boardState: {
    gameStarted: false,
    gamePaused: false,
    pausedBy: null,
    players: [],
    finishedPlayers: {},
    currentPlayer: {
      id: "",
      hasMoved: false,
    },
    numberOfAI: 0,
    logs: [],
    diceValue: { dice1: ["⚅", 0], dice2: ["⚅", 0] },
    ownedProps: {},
    openMarket: {},
  },
  players: {},
  turnInfo: {},
  loaded: true,
};

module.exports = state
