import { useContext } from "react";
import "./App.css";
import Canvas from "./Canvas";
import Chat from "./Chat";
import { GameContext, type GameContextType } from "./Providers/GameProvider";
import Setup from "./Setup";
import PlayerList from "./PlayerList";

function App() {
  const gameContext = useContext(GameContext) as GameContextType;
  const { connected } = gameContext.data;
  const { disconnect } = gameContext.actions;

  return (
    <div>
      {connected && <div id="leave-button">
        <button onClick={disconnect}>DISCONNECT</button>
      </div>}
      {(!connected) && <Setup />}
      {connected && (
        <div id="game-screen">
          <div id="game-container">
            <PlayerList />
            <Canvas />
            <Chat />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
