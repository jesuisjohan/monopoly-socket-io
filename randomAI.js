const tileState = require("./tileState");

function shouldBuyProperty (state, playerId, currentTile) {
    return state.players[playerId].accountBalance > tileState[currentTile].price;
}

module.exports = { shouldBuyProperty };