import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { GameContext, type GameContextType } from "../Providers/GameProvider";
import { getTime, imgToBase64 } from "../../utils/utils";
import "./index.css";
import normal from "/sprite/normal.png";
import { MessageType } from "../../utils/enums";

const Chat = () => {
  const [msgValue, setMsgValue] = useState<string>("");
  const gameContext = useContext(GameContext) as GameContextType;
  const messageRef = useRef<null | HTMLDivElement>(null);
  const containerRef = useRef<boolean>(false);
  const { thisPlayerData, messages, inputFocus, portraitMap, playerList } =
    gameContext.data;
  const { sendMessage } = gameContext.actions;
  const [selectedPortrait, setSelectedPortrait] = useState("normal");
  const [portraitSelectorOpen, setPortraitSelectorOpen] = useState(false);

  useEffect(() => {
    if (
      messages[messages.length - 1]?.userID === thisPlayerData.current.userID ||
      containerRef.current
    ) {
      scrollIntoView();
    }
  }, [messages]);

  const scrollIntoView = () => {
    messageRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
  };

  const handleSend = () => {
    if (msgValue.length > 0 || msgValue.length <= 200) {
      sendMessage(
        msgValue,
        `${thisPlayerData.current.spriteName}|${selectedPortrait}`,
      );
      setMsgValue("");
    }
  };

  const getPortrait = useCallback(
    (portraitName: string, emotion = "normal") => {
      const portrait = portraitMap.get(portraitName)?.get(emotion);
      if (!portrait) return normal;
      return imgToBase64(portrait);
    },
    [],
  );

  //TODO: create virtual list later
  const renderMessages = () => {
    const elements = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const portraitName = msg.portrait.split("|")[0];
      const mood = msg.portrait.split("|")[1] ?? "normal";
      elements.push(
        <div className="chat-line-item" key={`${i}`}>
          <div className="icon">
            <img src={getPortrait(portraitName, mood)} />
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
    elements.push(<div key="ref" ref={messageRef} />);
    return elements;
  };

  const handleFocus = () => {
    inputFocus.current = true;
  };

  const handleBlur = () => {
    inputFocus.current = false;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  };

  const handleScroll = (event) => {
    const target = event.target;
    if (target.scrollHeight - target.scrollTop === target.clientHeight) {
      containerRef.current = true;
    }
  };

  const renderAllPortraits = () => {
    const elements = [];
    const selectionMap = portraitMap.get(thisPlayerData.current.spriteName);
    if (!selectionMap) return elements;

    for (let [k, v] of selectionMap) {
      elements.push(
        <button
          className="portrait-button"
          style={{ backgroundImage: `url(${imgToBase64(v)})` }}
          key={k}
          onClick={() => {
            setSelectedPortrait(k);
            setPortraitSelectorOpen(false);
          }}
        ></button>,
      );
    }

    return elements;
  };

  return (
    <div id="chat-container">
      <div id="message-container" onScroll={handleScroll}>
        {renderMessages()}
      </div>
      <div id="input-box">
        <input
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={(e) => setMsgValue(e.target.value)}
          onKeyDown={handleKeyDown}
          value={msgValue}
          maxLength={200}
        ></input>
        <button onClick={handleSend}>Send</button>
      </div>

      <div id="player-status">
        <div id="status-portrait">
          <button
            id="popover-start"
            onClick={() => setPortraitSelectorOpen(!portraitSelectorOpen)}
            className="portrait-button"
            style={{
              backgroundImage: `url(${getPortrait(thisPlayerData.current.spriteName, selectedPortrait)})`,
            }}
          ></button>
          {portraitSelectorOpen && (
            <div id="popover-portrait">{renderAllPortraits()}</div>
          )}
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
