import React, { useContext, useRef, useEffect, useState } from "react";
import "./style/Log.css";
import { v4 as uuid } from "uuid";
import stateContext from "../internal";

export default function Log() {
  const { state, socketFunctions, playerId } = useContext(stateContext);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [state.boardState.logs]);

  return (
    <section className="center__room">
      <section className="center__dashboard--current-player">
        <div style={{display: "flex"}}>
          <h2 className="center__dashboard__player-info">Current player:</h2>
          <h2 className="center__dashboard__player-info__current">
            {state.loaded
              ? state.players[state.boardState.currentPlayer.id]
                ? `${state.players[state.boardState.currentPlayer.id].name}`
                : "None"
              : "Loading..."}
          </h2>
        </div>
        {!state.boardState.gamePaused && state.boardState.gameStarted && (
          <button
            className="pause-button"
            onClick={() => {
              socketFunctions.pause({ playerId: playerId });
            }}
          >
            Pause
          </button>
        )}
      </section>
      <section ref={scrollRef} className="center__log">
        {state.loaded ? (
          state.boardState.logs.map((e) => (
            <p key={uuid()} dangerouslySetInnerHTML={{ __html: e }} />
          ))
        ) : (
          <p>Loading...</p>
        )}
      </section>
    </section>
  );
}
