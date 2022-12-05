const tileState = require("./tileState");

function shouldBuyProperty(state, playerId, currentTile) {
  return state.players[playerId].accountBalance > tileState[currentTile].price;
}

function shouldAcceptOffer(state, AIId, buyerId, tileID, price, actualPrice) {
  return false;
}

module.exports = { shouldBuyProperty, shouldAcceptOffer };
