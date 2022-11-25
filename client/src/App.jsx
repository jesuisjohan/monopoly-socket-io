import React, {
  useEffect, useReducer, useState,
} from 'react';
import io from 'socket.io-client';
import Board from './components/Board';
import stateContext from './internal';
import EVENTS from './constants/events';

const url = window.location.hostname === 'localhost' ? 'http://localhost:8080' : window.location.origin;

const socket = io(url);
const socketFunctions = {
  makeMove: num => socket.emit(EVENTS.MAKE_MOVE, num),
  newPlayer: name => socket.emit(EVENTS.NEW_PLAYER, name),
  toggleHasMoved: bool => socket.emit(EVENTS.PLAYER_HAS_MOVED, bool),
  endTurn: () => socket.emit(EVENTS.END_TURN, ''),
  sendDice: dices => socket.emit(EVENTS.SEND_DICE, dices),
  inJail: dices => socket.emit(EVENTS.IN_JAIL, dices),
  buyProperty: () => socket.emit(EVENTS.BUY_PROPERTY, true),
  sendChat: message => socket.emit(EVENTS.SEND_CHAT, message),
  putOpenMarket: saleInfo => socket.emit(EVENTS.PUT_ON_OPEN_MARKET, saleInfo),
  makeOffer: saleInfo => socket.emit(EVENTS.MAKE_OFFER, saleInfo),
  acceptOffer: offer => socket.emit(EVENTS.ACCEPT_OFFER, offer),
  declineOffer: offer => socket.emit(EVENTS.DECLINE_OFFER, offer),
  makeSale: item => socket.emit(EVENTS.MAKE_SALE, item),
  startGame: () => socket.emit(EVENTS.START_GAME, ''),
  removeSale: item => socket.emit(EVENTS.REMOVE_SALE, item),
  pause: (item) => socket.emit(EVENTS.PAUSE, item),
  unpause: () => socket.emit(EVENTS.UNPAUSE, ''),
};

const initialState = {
  boardState: {
    gameStarted: false,
    currentPlayer: {
      id: false,
    },
    finishedPlayers: {},
  },
  players: {},
  loaded: false,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'updateGameState':
      return { ...action.payload };
    default:
      return state;
  }
};

// TODO: make into function and export it as function ??

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [playerId, setPlayerId] = useState(false);

  if (!playerId) {
    socket.on('connect', () => {
      // setPlayerId(1);
      setPlayerId(socket.id);
    });
  }
  useEffect(() => {
    socket.on('update', newState => dispatch({ type: 'updateGameState', payload: newState }));
  }, []);

  return (
    <stateContext.Provider value={{
      state, socketFunctions, playerId, socket,
    }}
    >
      <main className="App">
        {/* {JSON.stringify(state)} */}
        <Board />
      </main>
    </stateContext.Provider>
  );
}
