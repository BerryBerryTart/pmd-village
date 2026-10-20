import { useContext } from "react";
import { GameContext, type GameContextType } from "../Providers/GameProvider";
import { imgToBase64 } from "../../utils/utils";
import normal from "/normal.png";
import "./index.css";

const PlayerList = () => {
  const gameContext = useContext(GameContext) as GameContextType;
  const { portraitMap, playerList } = gameContext.data;

  const getPortrait = (portraitName: string) => {
    const portrait = portraitMap.get(portraitName)?.get("Normal");
    if (!portrait) return normal;
    return imgToBase64(portrait);
  };

  const renderList = () => {
    const elements = [];
    let counter = 0;
    let size = playerList.size;

    for (let [k, v] of playerList) {
      const element = (
        <div key={k} className="player-list-container">
          <div className="player">
            <div className="icon">
              <img src={getPortrait(v.spriteName)} />
            </div>
            <div className="username">{v.username}</div>
          </div>

          {counter < size - 1 && <div className="divider"></div>}
        </div>
      );
      elements.push(element);
      counter++;
    }

    return elements;
  };

  return (
    <div id="player-list-container">
      <div>Connected Players</div>
      <div id="player-list">{renderList()}</div>
    </div>
  );
};

export default PlayerList;
