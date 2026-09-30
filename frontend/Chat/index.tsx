import { useCallback, useContext, useState } from "react";
import { GameContext, type GameContextType } from "../Providers/GameProvider";
import { getTime, imgToBase64 } from "../../utils/utils";
import "./index.css";
import normal from "/sprite/normal.png";
import { MessageType } from "../../utils/enums";

const Chat = () => {
  const [msgValue, setMsgValue] = useState<string>("");
  const gameContext = useContext(GameContext) as GameContextType;
  const { thisPlayerData, messages, inputFocus, portraitMap, playerList } =
    gameContext.data;
  const { sendMessage } = gameContext.actions;

  const handleSend = () => {
    sendMessage(msgValue, thisPlayerData.current.spriteName);
    setMsgValue("");
  };

  const getPortrait = useCallback((portraitName: string) => {
    const portrait = portraitMap.get(portraitName)?.get("normal");
    if (!portrait) return normal;
    return imgToBase64(portrait);
  }, []);

  //TODO: create virtual list later
  const renderMessages = () => {
    const elements = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      elements.push(
        <div className="chat-line-item" key={`${i}`}>
          <div className="icon">
            <img src={getPortrait(msg.portrait)} />
          </div>
          <div className="chat-box">
            <div className="msg-time">{getTime(msg.time)}:</div>
            <div
              className={
                msg.type === MessageType.STATUS ? "chat-status" : "chat-message"
              }
            >
              {`[${msg.username}] ${msg.content}`}
            </div>
          </div>
        </div>,
      );
    }
    return elements;
  };

  const handleFocus = () => {
    inputFocus.current = true;
  };

  const handleBlur = () => {
    inputFocus.current = false;
  };

  return (
    <div id="chat-container">
      <div>
        <div id="message-container">{renderMessages()}</div>
        <div id="input-box">
          <input
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={(e) => setMsgValue(e.target.value)}
            value={msgValue}
          ></input>
          <button onClick={handleSend}>Send</button>
        </div>
      </div>
      <div id="player-status">
        <div id="status-portrait">
          <img src={getPortrait(thisPlayerData.current.spriteName)} />
          <div>{thisPlayerData.current.spriteName}</div>
        </div>
        <div id="status-text">
          <div>Connected as {thisPlayerData.current.username}</div>
          <div>
            {playerList.size} Creature
            {playerList.size > 1 ? "s" : ""} Online
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
