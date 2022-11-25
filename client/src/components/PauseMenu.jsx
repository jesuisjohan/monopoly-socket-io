import React, { useState, useEffect, useContext, useRef } from "react";
import { v4 as uuid } from "uuid";
import "./style/PauseMenu.css";
import stateContext from "../internal";

function PauseMenu() {
  const { socketFunctions, playerId, state } = useContext(stateContext);
  const [chat, setChat] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [state.boardState.logs]);

  const sendChat = e => {
    e.preventDefault();
    if (chat) socketFunctions.sendChat(chat);
    setChat('');
    e.target.reset();
  };
  return (
    <div id="myModal" className="modal">
      <div className="modal-content">
        {state.boardState.pausedBy.id === playerId && (
          <span
            class="close"
            onClick={() => {
              socketFunctions.unpause();
            }}
          >
            &times;
          </span>
        )}
        <button className="esc" onClick={() => window.close()}>Exit</button>
        {state.boardState.pausedBy.id === playerId && (
          <h1>The Game is Paused</h1>
        )}
        {state.boardState.pausedBy.id !== playerId && (
          <h1>{state.boardState.pausedBy.name} Paused The Game</h1>
        )}
        <div ref={scrollRef} className="modal__log">
          {state.loaded ? (
            state.boardState.logs.map((e) => (
              <p key={uuid()} dangerouslySetInnerHTML={{ __html: e }} />
            ))
          ) : (
            <p>Loading...</p>
          )}
        </div>
        <div className="modal__chat">
          <form className="modal__chat--form" onSubmit={(e) => sendChat(e)}>
            <input
              className="modal__chat--input"
              onChange={(e) => setChat(e.target.value)}
              type="text"
              name="chat"
              id="chat"
              autoComplete="off"
              placeholder="Write message..."
            />
            <button className="modal__chat--button" type="submit">
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PauseMenu;
