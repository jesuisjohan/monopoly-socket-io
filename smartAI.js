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

const relativeSaving = (state, playerId) => {
    const allOwned = Object.keys(state.boardState.ownedProps);
    let saving = 0;
    console.log(allOwned)
    for(let i = 0; i < allOwned.length; i++) {
        if(state.boardState.ownedProps[allOwned[i]].id === playerId){
            continue;
        }
        if(saving < tileState[allOwned[i]].rent) {
            saving = tileState[allOwned[i]].rent
        }
    }
    return saving;

} 

function shouldBuyProperty(state, playerId, currentTile) {
  return state.players[playerId].accountBalance - relativeSaving(state, playerId) > tileState[currentTile].price;
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
