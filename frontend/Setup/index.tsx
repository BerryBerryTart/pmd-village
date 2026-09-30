import { useContext, useState } from "react";
import "./index.css";
import { GameContext, type GameContextType } from "../Providers/GameProvider";
import { imgToBase64 } from "../../utils/utils";

const Setup = () => {
  const [username, setUsername] = useState("");
  const [spriteName, setSpriteName] = useState("");
  const [loading, setLoading] = useState(false);

  const gameContext = useContext(GameContext) as GameContextType;
  const { connect } = gameContext.actions;
  const { portraitMap } = gameContext.data;

  const handleConnect = () => {
    if (username.length > 1) {
      connect(username, spriteName);
      setLoading(true);
    }
  };

  const handleSelect = (char: string) => {
    setSpriteName(char);
  };

  const renderPortraits = () => {
    const elements = [];

    for (let [key, value] of portraitMap.entries()) {
      const bitmap = value.get("normal");
      elements.push(
        <img
          key={key}
          src={imgToBase64(bitmap)}
          onClick={() => handleSelect(key)}
          className={key === spriteName ? "selected" : ""}
        />,
      );
    }

    return elements;
  };

  return (
    <div id="setup-container">
      <div id="setup">
        <div>Select Your Guy</div>
        <div id="portraits">{renderPortraits()}</div>
        <div id="input-box">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button
            onClick={handleConnect}
            disabled={!(username && spriteName) || loading}
          >
            CONNECT!
          </button>
        </div>
        {loading && <div>Loading in. Hang tight!</div>}
      </div>
    </div>
  );
};

export default Setup;
