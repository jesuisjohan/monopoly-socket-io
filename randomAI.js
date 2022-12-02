const tileState = require("./tileState");

const plotHeuritic = (
  currentBalance,
  opponentBalance,
  actualPrice,
  offeredPrice
) => {
  if (currentBalance < offeredPrice) return false;
  if (offeredPrice < actualPrice) return true;
  return (Math.random() > (currentBalance - offeredPrice * 1.0) / (currentBalance * 1.0)) && (Math.random() > (opponentBalance - currentBalance * 1.0) / (opponentBalance * 1.0))
};

function shouldBuyProperty(state, playerId, currentTile) {
  return state.players[playerId].accountBalance > tileState[currentTile].price;
}

function shouldAcceptOffer(state, AIId, buyerId, tileID, price, actualPrice) {
  return plotHeuritic(
    state.players[AIId].accountBalance,
    state.players[buyerId].accountBalance,
    price,
    actualPrice
  );
}

module.exports = { shouldBuyProperty, shouldAcceptOffer };
