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
    logs: [],
    diceValue: { dice1: ["⚅", 0], dice2: ["⚅", 0] },
    ownedProps: {
      42: {
        id: "",
        color: "blue",
      },
    },
    openMarket: {},
  },
  players: {},
  turnInfo: {},
  loaded: true,
};

module.exports = state
