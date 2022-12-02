const express = require("express");
const app = express();
const server = require('http').createServer(app);
const path = require('path');
const socketIO = require('socket.io');
const tileState = require('./tileState');
const chestCards = require('./chestCards');
const initialState = require("./state")
const { getDice } = require("./shared/dice");
const EVENTS = require('./client/src/constants/events');
const COLORS = require('./client/src/constants/colors');
const TILE_TYPES = require('./client/src/constants/tileTypes');
const NUMBER_OF_PROPS = require('./client/src/constants/props');
const MOVE_TO_TILE = require('./client/src/constants/moveToTile');
const RAIL_ROADS = require('./client/src/constants/railRoads');
const RandomAI = require('./randomAI');

const PORT = 8080;

const io = socketIO(server, { cors: { origin: 'http://localhost:3000' } });
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client', 'build')));
  app.get('/', (req, res) => {
    res.sendFile(`${__dirname}client/build/index.html`);
  });
}

const state = { ...initialState };

////////// FUNCTIONS

// current date function for logs
const date = () =>
  new Date(Date.now()).toLocaleTimeString("en-GB", { hour12: false });

// Log a message
const sendToLog = (text) => {
  state.boardState.logs = [...state.boardState.logs, `${date()} - ${text}`];
};

// check balance if not below 0
const checkBalance = (noNextTurn) => {
  Object.keys(state.players).forEach((e) => {
    if (state.players[e].accountBalance < 1) {
      state.boardState.finishedPlayers[e] = {
        name: state.players[e].name,
        color: state.players[e].color,
      };
      sendToLog(
        `<span class="bankrupt-message">${state.players[e].name} went bankrupt and can no longer play the game, all his properties were put on sale again!</span>`
      );
      delete state.players[e];
      if (e === state.boardState.currentPlayer.id) {
        const currentPlayer = state.boardState.currentPlayer.id;
        const indexOfCurrentPlayer =
          state.boardState.players.indexOf(currentPlayer);
        if (indexOfCurrentPlayer > 0) {
          state.boardState.currentPlayer.id =
            state.boardState.players[indexOfCurrentPlayer - 1];
        } else {
          const playersLength = state.boardState.players;
          state.boardState.currentPlayer.id =
            state.boardState.players[playersLength.length - 1];
        }
        const { hasMoved } = state.boardState.currentPlayer;
        if (hasMoved) state.boardState.currentPlayer.hasMoved = false;
      }
      state.boardState.players = Object.keys(state.players);
      if (noNextTurn) nextTurn();
      for (let i = 0; i < NUMBER_OF_PROPS; i++) {
        if (
          state.boardState.ownedProps[i] &&
          state.boardState.ownedProps[i].id === e
        ) {
          delete state.boardState.ownedProps[i];
        }
        if (
          state.boardState.openMarket[i] &&
          state.boardState.openMarket[i].seller === e
        ) {
          delete state.boardState.openMarket[i];
        }
      }
    }
  });
};

const reset = () => {
  state.boardState = initialState.boardState;
  state.boardState.gameStarted = false;
  state.players = initialState.players;
  state.loaded = initialState.loaded;
  state.turnInfo = initialState.turnInfo;
  colors = Object.values({ ...COLORS });
};

const buyProperty = (playerId, currentTile) => {
  const { accountBalance } = state.players[playerId];
  state.players[playerId].accountBalance = accountBalance - tileState[currentTile].price;
  state.boardState.ownedProps[currentTile] = {
    id: playerId,
    color: state.players[playerId].color,
  };
  sendToLog(`${state.players[playerId].name} bought a property!`);
}

// player change // AI Hard Code
const nextTurn = () => {
  // remove player when less than 0 balance
  checkBalance();

  if (state.boardState.players.length === 1) {
    reset();
    sendToLog(`${state.players[state.boardState.players[0]].name} is the winner !`);
    return;
  }

  // next turn
  if (
    state.boardState.players.includes(state.boardState.currentPlayer.id) === -1
  ) {
    state.boardState.currentPlayer.id = state.boardState.players[0] || 0;
  }
  const numberOfPlayers = state.boardState.players.length;
  const currentPlayerIndex = state.boardState.players.indexOf(
    state.boardState.currentPlayer.id
  );
  if (currentPlayerIndex + 1 < numberOfPlayers) {
    state.boardState.currentPlayer.id = state.boardState.players[currentPlayerIndex + 1];
  } else {
    const firstPlayer = state.boardState.players[0];
    state.boardState.currentPlayer.id = firstPlayer;
  }
  state.turnInfo = {};
  if (state.players[state.boardState.currentPlayer.id].type === "random_ai") {
    AIMoveTurn(state, state.boardState.currentPlayer.id);
  }
};

// Check if property is owned and pay accordingly // AI Hard Code
const checkOwned = (playerId, currentTile, callback) => {
  if (
    !Object.prototype.hasOwnProperty.call(
      state.boardState.ownedProps,
      currentTile
    )
  ) {
    if (state.players[playerId].type !== "human") {
      if (state.players[playerId].type === "random_ai" && RandomAI.shouldBuyProperty(state, playerId, currentTile)) {
        buyProperty(playerId, currentTile);
      } 
      nextTurn();
    } else {
      state.turnInfo.canBuyProp = true;
    }
  } else if (state.boardState.ownedProps[currentTile].id !== playerId) {
    callback();
    nextTurn();
  } else {
    nextTurn();
  }
};

// color array for players
let colors = Object.values({ ...COLORS });

////////// AI

const AIMoveTurn = (state, id) => {
  let currentTile = state.players[id].currentTile;

  const marketPlaceList = Object.keys(state.boardState.openMarket);

  // AI Check the Open Market
  marketPlaceList.map((item) => {
    console.log(state.boardState.openMarket, item)
    const price = state.boardState.openMarket[item].price;
    if(RandomAI.shouldAcceptOffer(state, state.boardState.openMarket[item].seller, id, item, state.boardState.openMarket[item].price, tileState[item].price)){
      state.players[state.boardState.openMarket[item].seller].accountBalance += price;
      state.players[id].accountBalance -= price;
      state.boardState.ownedProps[item].id = id;
      state.boardState.ownedProps[item].color = state.players[id].color;
      delete state.boardState.openMarket[item];
      sendToLog(`${state.players[id].name} removed ${state.boardState.openMarket[item].tileName} from the open market.`);
    }
  })

  const dice1 = getDice(Math.floor(Math.random() * 5) + 1);
  const dice2 = getDice(Math.floor(Math.random() * 5) + 1);
  const num = dice1[1] + dice2[1];
  state.boardState.diceValue = { dice1, dice2 };
  sendToLog(`${state.players[id].name} rolled a ${num}`);

  if (currentTile + num < NUMBER_OF_PROPS) {
    state.players[id].currentTile = currentTile + num;
  } else {
    const left = NUMBER_OF_PROPS - currentTile;
    const more = num - left;
    state.players[id].currentTile = more;
    state.players[id].accountBalance += 200;
    sendToLog(`${state.players[id].name} has passed start and received $200M`);
  }

  currentTile = state.players[id].currentTile;
  const AIName = state.players[id].name;
  switch (tileState[currentTile].tileType) {
    case TILE_TYPES.NORMAL:
      checkOwned(id, currentTile, () => {
        const currentTileOwner = state.boardState.ownedProps[currentTile].id;
        state.players[id].accountBalance -= tileState[currentTile].rent;
        state.players[currentTileOwner].accountBalance +=
          tileState[currentTile].rent;
        sendToLog(
          `${AIName} have paid rent $${tileState[currentTile].rent}M to ${
            state.players[state.boardState.ownedProps[currentTile].id].name
          }`
        );
      });
      break;

    case TILE_TYPES.EXPENSE:
      state.players[id].accountBalance -= tileState[currentTile].rent;
      sendToLog(`${AIName} paid ${tileState[currentTile].rent} in taxes.`);
      nextTurn();
      break;

    case TILE_TYPES.RAIL_ROAD:
      checkOwned(id, currentTile, () => {
        let ownedRailroads = 0;
        RAIL_ROADS.forEach((tileNumb) => {
          if (
            state.boardState.ownedProps[tileNumb] &&
            state.boardState.ownedProps[tileNumb].id ===
              state.boardState.ownedProps[currentTile].id
          ) {
            ownedRailroads += 1;
          }
        });
        const priceToPay = 25 * 2 ** (ownedRailroads - 1);
        state.players[id].accountBalance -= priceToPay;
        state.players[
          state.boardState.ownedProps[currentTile].id
        ].accountBalance += priceToPay;
        if (ownedRailroads > 1) {
          sendToLog(
            `${AIName} have paid rent $${priceToPay}M for ${ownedRailroads} owned railroads to ${
              state.players[state.boardState.ownedProps[currentTile].id].name
            }`
          );
        } else {
          sendToLog(
            `${AIName} have paid rent $${priceToPay}M to ${
              state.players[state.boardState.ownedProps[currentTile].id].name
            }`
          );
        }
      });
      break;

    case TILE_TYPES.GO_JAIL:
      state.players[id].isJail = true;
      state.players[id].jailRounds = 0;
      state.players[id].currentTile = MOVE_TO_TILE.IN_JAIL;
      sendToLog(`${AIName} was sent to jail for tax fraud.`);
      nextTurn();
      break;

    case TILE_TYPES.JAIL:
      sendToLog(`${AIName}, don't worry! You're just visiting.`);
      nextTurn();
      break;

    case TILE_TYPES.COMPANY: {
      checkOwned(id, currentTile, () => {
        let priceToPay = 0;
        if (
          state.boardState.ownedProps[12] &&
          state.boardState.ownedProps[28] &&
          state.boardState.ownedProps[12].id ===
            state.boardState.ownedProps[currentTile].id &&
          state.boardState.ownedProps[28].id ===
            state.boardState.ownedProps[currentTile].id
        ) {
          priceToPay = diceResult * 10;
        } else {
          priceToPay = diceResult * 4;
        }
        state.players[socket.id].accountBalance -= priceToPay;
        state.players[
          state.boardState.ownedProps[currentTile].id
        ].accountBalance += priceToPay;
        sendToLog(
          `${playerName} have paid rent $${priceToPay}M to ${
            state.players[state.boardState.ownedProps[currentTile].id].name
          }`
        );
      });
      break;
    }

    case TILE_TYPES.CHANCE: {
      const randomNumber = Math.floor(Math.random() * chestCards.length);
      const chestCard = chestCards[randomNumber];
      state.players[id].accountBalance += chestCard.reward;
      state.players[id].accountBalance -= chestCard.penalty;
      if (chestCard.moveToTile > MOVE_TO_TILE.LOTTO)
        state.players[id].currentTile = chestCard.moveToTile;

      if (chestCard.moveToTile === MOVE_TO_TILE.IN_JAIL) {
        state.players[id].isJail = true;
      }
      sendToLog(`${AIName}: ${chestCard.message}`);
      nextTurn();
      break;
    }

    case TILE_TYPES.CHEST: {
      const randomNumber = Math.floor(Math.random() * chestCards.length);
      const chestCard = chestCards[randomNumber];
      state.players[id].accountBalance += chestCard.reward;
      state.players[id].accountBalance -= chestCard.penalty;
      if (chestCard.moveToTile > MOVE_TO_TILE.LOTTO)
        state.players[id].currentTile = chestCard.moveToTile;

      if (chestCard.moveToTile === MOVE_TO_TILE.IN_JAIL) {
        state.players[id].isJail = true;
      }
      sendToLog(`${AIName}: ${chestCard.message}`);
      nextTurn();
      break;
    }

    default: {
      nextTurn();
      break;
    }
  }
};

// SOCKET FUNCTION
io.on(EVENTS.CONNECTION, (socket) => {
  socket.emit(EVENTS.UPDATE, state);

  // when a new player joins
  socket.on(EVENTS.NEW_PLAYER, (newName) => {
    const { id } = socket;
    if (!state.boardState.gameStarted) {
      state.players[id] = {
        name: newName,
        type: "human",
        currentTile: 0,
        color: colors.pop(),
        accountBalance: 1500,
        isJail: false,
        jailRounds: 0,
      };
      sendToLog(
        `${newName} joined the game as ${state.players[socket.id].color}`
      );
      state.boardState.players = Object.keys(state.players);
    } else {
      sendToLog(
        `${newName}, game has already started, you are not able to join!`
      );
    }
    io.emit(EVENTS.UPDATE, state);
  });

  // when an AI join
  socket.on(EVENTS.NEW_AI, () => {
    const id = "AI" + Math.floor(Math.random() * 10000);
    const Color = colors.pop();
    if (!state.boardState.gameStarted && Color) {
      state.boardState.numberOfAI += 1;
      state.players[id] = {
        name: "Mr." + Color,
        type: "random_ai",
        currentTile: 0,
        color: Color,
        accountBalance: 1500,
        isJail: false,
        jailRounds: 0,
      };
      sendToLog(`AI joined the game as ${Color}`);
      state.boardState.players = Object.keys(state.players);
    } else {
      sendToLog(`Error ! This message should not appear !`);
    }
    io.emit(EVENTS.UPDATE, state);
  });

  // start game
  socket.on(EVENTS.START_GAME, () => {
    if (state.boardState.players.length < 2) {
      sendToLog("Must at least 2 player to play this !");
    } else {
      state.boardState.gameStarted = true;
      sendToLog("Monopoly Socket IO has started!!! Good luck to you!");
      nextTurn();
    }
    io.emit(EVENTS.UPDATE, state);
  });

  // move when dice is rolled
  socket.on(EVENTS.MAKE_MOVE, (num) => {
    const { id } = socket;
    const cTile = state.players[id].currentTile;
    if (cTile + num < NUMBER_OF_PROPS) {
      state.players[id].currentTile = cTile + num;
    } else {
      const left = NUMBER_OF_PROPS - cTile;
      const more = num - left;
      state.players[id].currentTile = more;
      state.players[id].accountBalance += 200;
      sendToLog(
        `${state.players[socket.id].name} has passed start and received $200M`
      );
    }
    io.emit(EVENTS.UPDATE, state);
  });

  // send chat
  socket.on(EVENTS.SEND_CHAT, (message) => {
    if (state.boardState.players.includes(socket.id)) {
      sendToLog(
        `<span style="color:${
          state.players[socket.id].color
        }" class="log-chat-name" >${
          state.players[socket.id].name
        }</span> says: ${message}`
      );
    } else if (state.boardState.finishedPlayers[socket.id]) {
      sendToLog(
        `<span style="color:${
          state.boardState.finishedPlayers[socket.id].color
        }" class="log-chat-name" >${
          state.boardState.finishedPlayers[socket.id].name
        }</span> says: ${message}`
      );
    } else {
      sendToLog(
        `<span style="color:grey" class="log-chat-name">Spectator</span> says: ${message}`
      );
    }
    io.emit(EVENTS.UPDATE, state);
  });

  // next turn
  socket.on(EVENTS.END_TURN, () => {
    nextTurn();
    state.boardState.currentPlayer.hasMoved = false;
    io.emit(EVENTS.UPDATE, state);
  });

  // hasMoved
  socket.on(EVENTS.PLAYER_HAS_MOVED, (bool) => {
    state.boardState.currentPlayer.hasMoved = bool;
    const { currentTile } = state.players[socket.id];
    const { dice1, dice2 } = state.boardState.diceValue;
    const diceResult = dice1[1] + dice2[1];
    const playerName = state.players[socket.id].name;

    switch (tileState[currentTile].tileType) {
      case TILE_TYPES.NORMAL:
        checkOwned(socket.id, currentTile, () => {
          const currentTileOwner = state.boardState.ownedProps[currentTile].id;
          state.players[socket.id].accountBalance -=
            tileState[currentTile].rent;
          state.players[currentTileOwner].accountBalance +=
            tileState[currentTile].rent;
          sendToLog(
            `${playerName} have paid rent $${tileState[currentTile].rent}M to ${
              state.players[state.boardState.ownedProps[currentTile].id].name
            }`
          );
        });
        break;
      case TILE_TYPES.EXPENSE:
        state.players[socket.id].accountBalance -= tileState[currentTile].rent;
        sendToLog(
          `${playerName} paid ${tileState[currentTile].rent} in taxes.`
        );
        nextTurn();
        break;
      case TILE_TYPES.RAIL_ROAD: {
        checkOwned(socket.id, currentTile, () => {
          let ownedRailroads = 0;
          RAIL_ROADS.forEach((tileNumb) => {
            if (
              state.boardState.ownedProps[tileNumb] &&
              state.boardState.ownedProps[tileNumb].id ===
                state.boardState.ownedProps[currentTile].id
            ) {
              ownedRailroads += 1;
            }
          });
          const priceToPay = 25 * 2 ** (ownedRailroads - 1);
          state.players[socket.id].accountBalance -= priceToPay;
          state.players[
            state.boardState.ownedProps[currentTile].id
          ].accountBalance += priceToPay;
          if (ownedRailroads > 1) {
            sendToLog(
              `${playerName} have paid rent $${priceToPay}M for ${ownedRailroads} owned railroads to ${
                state.players[state.boardState.ownedProps[currentTile].id].name
              }`
            );
          } else {
            sendToLog(
              `${playerName} have paid rent $${priceToPay}M to ${
                state.players[state.boardState.ownedProps[currentTile].id].name
              }`
            );
          }
        });
        break;
      }
      case TILE_TYPES.GO_JAIL:
        state.players[socket.id].isJail = true;
        state.players[socket.id].jailRounds = 0;
        state.players[socket.id].currentTile = MOVE_TO_TILE.IN_JAIL;
        sendToLog(`${playerName} was sent to jail for tax fraud.`);
        nextTurn();
        break;
      case TILE_TYPES.JAIL:
        sendToLog(`${playerName}, don't worry! You're just visiting.`);
        nextTurn();
        break;
      case TILE_TYPES.COMPANY: {
        checkOwned(socket.id, currentTile, () => {
          let priceToPay = 0;
          if (
            state.boardState.ownedProps[12] &&
            state.boardState.ownedProps[28] &&
            state.boardState.ownedProps[12].id ===
              state.boardState.ownedProps[currentTile].id &&
            state.boardState.ownedProps[28].id ===
              state.boardState.ownedProps[currentTile].id
          ) {
            priceToPay = diceResult * 10;
          } else {
            priceToPay = diceResult * 4;
          }
          state.players[socket.id].accountBalance -= priceToPay;
          state.players[
            state.boardState.ownedProps[currentTile].id
          ].accountBalance += priceToPay;
          sendToLog(
            `${playerName} have paid rent $${priceToPay}M to ${
              state.players[state.boardState.ownedProps[currentTile].id].name
            }`
          );
        });
        break;
      }
      case TILE_TYPES.CHANCE: {
        const randomNumber = Math.floor(Math.random() * chestCards.length);
        const chestCard = chestCards[randomNumber];
        state.players[socket.id].accountBalance += chestCard.reward;
        state.players[socket.id].accountBalance -= chestCard.penalty;
        if (chestCard.moveToTile > MOVE_TO_TILE.LOTTO)
          state.players[socket.id].currentTile = chestCard.moveToTile;

        if (chestCard.moveToTile === MOVE_TO_TILE.IN_JAIL) {
          state.players[socket.id].isJail = true;
        }
        sendToLog(`${playerName}: ${chestCard.message}`);
        nextTurn();
        break;
      }
      case TILE_TYPES.CHEST: {
        const randomNumber = Math.floor(Math.random() * chestCards.length);
        const chestCard = chestCards[randomNumber];
        state.players[socket.id].accountBalance += chestCard.reward;
        state.players[socket.id].accountBalance -= chestCard.penalty;
        if (chestCard.moveToTile > MOVE_TO_TILE.LOTTO)
          state.players[socket.id].currentTile = chestCard.moveToTile;

        if (chestCard.moveToTile === MOVE_TO_TILE.IN_JAIL) {
          state.players[socket.id].isJail = true;
        }
        sendToLog(`${playerName}: ${chestCard.message}`);
        nextTurn();
        break;
      }
      default:
        nextTurn();
        break;
    }
    io.emit(EVENTS.UPDATE, state);
  });

  // buy property
  socket.on(EVENTS.BUY_PROPERTY, () => {
    const { accountBalance } = state.players[socket.id];
    const { currentTile } = state.players[socket.id];
    const playerName = state.players[socket.id].name;
    state.players[socket.id].accountBalance =
      accountBalance - tileState[currentTile].price;
    state.boardState.ownedProps[currentTile] = {
      id: socket.id,
      color: state.players[socket.id].color,
    };
    sendToLog(`${playerName} bought a property!`);
    nextTurn();
    io.emit(EVENTS.UPDATE, state);
  });

  // update dice state
  socket.on(EVENTS.SEND_DICE, (dices) => {
    state.boardState.diceValue = dices;
    const diceResult = dices.dice1[1] + dices.dice2[1];
    const playerName = state.players[socket.id].name;
    sendToLog(`${playerName} rolled ${diceResult}!`);
    io.emit(EVENTS.UPDATE, state);
  });

  socket.on(EVENTS.IN_JAIL, (dices) => {
    const { jailRounds } = state.players[socket.id];
    const { currentTile } = state.players[socket.id];
    const playerName = state.players[socket.id].name;
    const diceResult = dices.dice1[1] + dices.dice2[1];
    if (jailRounds === 2) {
      state.players[socket.id].currentTile = currentTile + diceResult;
      state.players[socket.id].isJail = false;
      state.players[socket.id].jailRounds = 0;
      state.boardState.currentPlayer.hasMoved = true;
      sendToLog(`${playerName} waited patiently and got out of jail.`);
    } else if (dices.dice1[1] === dices.dice2[1]) {
      state.players[socket.id].currentTile = currentTile + diceResult;
      state.players[socket.id].isJail = false;
      state.players[socket.id].jailRounds = 0;
      sendToLog(`${playerName} got lucky and escaped jail!`);
    } else {
      state.players[socket.id].jailRounds += 1;
      sendToLog(`${playerName} has to stay in jail.`);
    }
    state.boardState.diceValue = dices;
    nextTurn();
    io.emit(EVENTS.UPDATE, state);
  });

  socket.on(EVENTS.PUT_ON_OPEN_MARKET, (saleInfo) => {
    const { tileID, playerId, price } = saleInfo;
    const tileName = tileState[tileID].streetName;
    const sellerName = state.players[playerId].name;
    state.boardState.openMarket[tileID] = {
      seller: playerId,
      price,
      sellerName,
      tileName,
    };
    io.emit(EVENTS.UPDATE, state);
  });

  socket.on(EVENTS.REMOVE_SALE, (item) => {
    const { tileName } = state.boardState.openMarket[item];
    delete state.boardState.openMarket[item];
    const playerName = state.players[socket.id].name;
    sendToLog(`${playerName} removed ${tileName} from the open market.`);
    io.emit(EVENTS.UPDATE, state);
  });

  socket.on(EVENTS.MAKE_SALE, (item) => {
    const { seller } = state.boardState.openMarket[item];
    const { price } = state.boardState.openMarket[item];
    const { sellerName } = state.boardState.openMarket[item];
    const { tileName } = state.boardState.openMarket[item];
    const buyerName = state.players[socket.id].name;
    state.players[seller].accountBalance += price;
    state.players[socket.id].accountBalance -= price;
    state.boardState.ownedProps[item].id = socket.id;
    state.boardState.ownedProps[item].color = state.players[socket.id].color;
    delete state.boardState.openMarket[item];
    sendToLog(`${buyerName} has bought ${tileName} from ${sellerName}`);
    checkBalance(true);
    io.emit(EVENTS.UPDATE, state);
  });

  // AI Hard Code
  socket.on(EVENTS.MAKE_OFFER, (item) => {
    const { playerId, tileID, price } = item;
    const buyerName = state.players[playerId].name;
    const tileOwner = state.boardState.ownedProps[item.tileID].id;
    const tileName = tileState[tileID].streetName;
    const ownerName = state.players[tileOwner].name;
    if(state.players[tileOwner].type === "random_ai"){
      if(RandomAI.shouldAcceptOffer(state, tileOwner, playerId, tileID, price, tileState[tileID].price)) {
        state.players[tileOwner].accountBalance += price;
        state.players[playerId].accountBalance -= price;
        state.boardState.ownedProps[tileID].id = playerId;
        state.boardState.ownedProps[tileID].color = state.players[playerId].color;
        sendToLog(`${buyerName} has privately bought ${tileName} from ${ownerName} from $${price}M`);
        io.sockets.to(playerId).emit(EVENTS.OFFER_ACCEPTED, { tileName, price, ownerName });
        if (state.boardState.openMarket[tileID]) delete state.boardState.openMarket[tileID];
        checkBalance(true);
      } else {
        io.sockets.to(playerId).emit(EVENTS.OFFER_DECLINED, { tileName, price, ownerName });
      }
      io.emit(EVENTS.UPDATE, state);
    } else {
      io.sockets
      .to(tileOwner)
      .emit(EVENTS.OFFER_ON_PROP, { ...item, buyerName, tileName });
    }
  });

  socket.on(EVENTS.DECLINE_OFFER, (offer) => {
    const { playerId, tileID, price, tileName } = offer;
    const ownerID = state.boardState.ownedProps[tileID].id;
    const ownerName = state.players[ownerID].name;
    io.sockets
      .to(playerId)
      .emit(EVENTS.OFFER_DECLINED, { tileName, price, ownerName });
  });

  socket.on(EVENTS.ACCEPT_OFFER, (offer) => {
    const { playerId, tileID, price, tileName } = offer;
    const ownerID = state.boardState.ownedProps[tileID].id;
    const ownerName = state.players[ownerID].name;
    state.players[ownerID].accountBalance += price;
    state.players[playerId].accountBalance -= price;
    state.boardState.ownedProps[tileID].id = playerId;
    state.boardState.ownedProps[tileID].color = state.players[playerId].color;
    sendToLog(
      `${ownerName} has privately bought ${tileName} from ${ownerName} from $${price}M`
    );
    io.sockets
      .to(playerId)
      .emit(EVENTS.OFFER_ACCEPTED, { tileName, price, ownerName });

    if (state.boardState.openMarket[tileID])
      delete state.boardState.openMarket[tileID];
    checkBalance(true);
    io.emit(EVENTS.UPDATE, state);
  });

  // when player disconnects
  socket.on(EVENTS.DISCONNECT, () => {
    if (state.players[socket.id]) {
      const playerName = state.players[socket.id].name;
      colors.push(state.players[socket.id].color);
      sendToLog(`${playerName} left the game.`);
      delete state.players[socket.id];
      for (let i = 0; i < NUMBER_OF_PROPS; i++) {
        if (
          state.boardState.ownedProps[i] &&
          state.boardState.ownedProps[i].id === socket.id
        ) {
          delete state.boardState.ownedProps[i];
        }
        if (
          state.boardState.openMarket[i] &&
          state.boardState.openMarket[i].seller === socket.id
        ) {
          delete state.boardState.openMarket[i];
        }
      }
    }
    if (state.boardState.finishedPlayers[socket.id]) {
      colors.push(state.boardState.finishedPlayers[socket.id].color);
      delete state.boardState.finishedPlayers[socket.id];
    }
    state.boardState.players = Object.keys(state.players);

    // remove stuff when no players present
    if (state.boardState.players.length < 2 && state.gameStarted) {
      state.boardState = initialState.boardState;
      state.players = initialState.players;
      state.loaded = initialState.loaded;
      state.turnInfo = initialState.turnInfo;
      colors = Object.values({ ...COLORS });
      sendToLog("The Game is ended due to no other player");
    }
    if (state.boardState.players.length <= state.boardState.numberOfAI) {
      state.boardState = {
        ...initialState.boardState,
        players: [],
        numberOfAI: 0,
      };
      state.players = {};
      state.loaded = initialState.loaded;
      state.turnInfo = initialState.turnInfo;
      colors = Object.values({ ...COLORS });
      sendToLog("The Game is ended due to no other player");
    }

    if (state.boardState.gamePaused) {
      if (state.boardState.pausedBy.id === socket.id) {
        state.boardState.gamePaused = false;
        state.boardState.pausedBy = null;
      }
    }

    io.emit(EVENTS.UPDATE, state);
  });

  //when 1 player pause
  socket.on(EVENTS.PAUSE, (item) => {
    const { playerId } = item;
    const playerName = state.players[socket.id].name;
    state.boardState.pausedBy = {
      name: state.players[playerId].name,
      id: playerId,
    };
    state.boardState.gamePaused = true;
    sendToLog(`${playerName} has paused the game`);
    io.emit(EVENTS.UPDATE, state);
  });

  //when player unpause
  socket.on(EVENTS.UNPAUSE, () => {
    const playerName = state.players[socket.id].name;
    state.boardState.pausedBy = null;
    state.boardState.gamePaused = false;
    sendToLog(`${playerName} has unpaused the game`);
    io.emit(EVENTS.UPDATE, state);
  });
});

server.listen(PORT, () => console.log(`Server is running on ${PORT}`));
