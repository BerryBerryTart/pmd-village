import { useContext, useEffect, useRef } from "react";
import "./index.css";
import { PlayerDirection, PlayerStatus } from "../../utils/enums";
import { GameContext, type GameContextType } from "../Providers/GameProvider";

const Canvas = () => {
  const gameContext = useContext(GameContext) as GameContextType;
  const keyDownListener = useRef((_: KeyboardEvent) => {});
  const keyUpListener = useRef((_: KeyboardEvent) => {});
  const loopRef = useRef(-1);
  const { inputFocus, thisPlayerData, entities, spriteMap, mapProvider } =
    gameContext.data;
  const { updatePlayerPosition } = gameContext.actions;

  useEffect(() => {
    initCanvas();
    return () => {
      window.removeEventListener("keydown", keyDownListener.current);
      window.removeEventListener("keyup", keyUpListener.current);
      window.cancelAnimationFrame(loopRef.current);
    };
  }, []);

  const initCanvas = async () => {
    const NPCs = entities.current;
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const SCALE = 2;
    const viewportWidth = Math.floor(canvas.width / SCALE);
    const viewportHeight = Math.floor(canvas.height / SCALE);
    const FPS = 60;
    const frame_time = 1000 / FPS;
    const keyDirs = { up: false, down: false, left: false, right: false };
    let lastTime = performance.now();

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    //char vars
    //home = 830, 250
    // const you = thisPlayerData.current.sprite;
    let charStatus = PlayerStatus.IDLE;
    const BASE_SPEED = 1;
    const buffer = 15;

    //load stuff
    const map = mapProvider;

    const mapCoordsToScreenCoords = (targetX: number, targetY: number) => {
      const yourPos = thisPlayerData.current.sprite.getPos();
      let trueZeroX = Math.floor(yourPos.x - viewportWidth / 2);
      let trueZeroY = Math.floor(yourPos.y - viewportHeight / 2);

      if (trueZeroX < 0) trueZeroX = 0;
      if (trueZeroY < 0) trueZeroY = 0;

      if (trueZeroX > map.width - viewportWidth)
        trueZeroX = map.width - viewportWidth;
      if (trueZeroY > map.height - viewportHeight)
        trueZeroY = map.height - viewportHeight;

      const resultX = Math.floor((targetX - trueZeroX) * SCALE);
      const resultY = Math.floor((targetY - trueZeroY) * SCALE);
      return { x: resultX, y: resultY };
    };

    const mapCentre = (targetX: number, targetY: number) => {
      let newX = Math.floor(targetX - viewportWidth / 2);
      let newY = Math.floor(targetY - viewportHeight / 2);
      let xBoundary = false;
      let yBoundary = false;

      if (newX < 0) {
        newX = 0;
        xBoundary = true;
      }
      if (newX > map.width - viewportWidth) {
        newX = map.width - viewportWidth;
        xBoundary = true;
      }

      if (newY < 0) {
        newY = 0;
        yBoundary = true;
      }
      if (newY > map.height - viewportHeight) {
        newY = map.height - viewportHeight;
        yBoundary = true;
      }

      return { x: newX, y: newY, xBoundary, yBoundary };
    };

    const centreSprite = (
      spriteWidth: number,
      spriteHeight: number,
      player = false,
    ) => {
      if (!player) {
        return {
          x: Math.floor(canvas.width / 2 - (spriteWidth * SCALE) / 2),
          y: Math.floor(canvas.height / 2 - (spriteHeight * SCALE) / 2),
        };
      }

      //boundary checks
      let playerXOffset = 0;
      let playerYOffset = 0;
      const yourPos = thisPlayerData.current.sprite.getPos();
      if (yourPos.x - viewportWidth / 2 < 0) {
        playerXOffset = yourPos.x * SCALE - viewportWidth;
      }
      if (yourPos.y - viewportHeight / 2 < 0) {
        playerYOffset = yourPos.y * SCALE - viewportHeight;
      }
      if (yourPos.x >= map.width - viewportWidth / 2) {
        playerXOffset = Math.abs(
          (map.width - yourPos.x) * SCALE - viewportWidth,
        );
      }
      if (yourPos.y >= map.height - viewportHeight / 2) {
        playerYOffset = Math.abs(
          (map.height - yourPos.y) * SCALE - viewportHeight,
        );
      }
      return {
        x:
          Math.floor(canvas.width / 2 - (spriteWidth * SCALE) / 2) +
          playerXOffset,
        y:
          Math.floor(canvas.height / 2 - (spriteHeight * SCALE) / 2) +
          playerYOffset,
      };
    };

    const isInView = (
      x: number,
      y: number,
      width: number,
      height: number,
      scale: number,
    ) => {
      //left
      if (x + width * scale < 0) return false;
      //top
      if (y + height * scale < 0) return false;
      //right
      if (x > canvas.width) return false;
      //bottom
      if (y > canvas.height) return false;
      return true;
    };

    const keyDownFunc = (event: KeyboardEvent) => {
      const key = event.key;
      switch (key) {
        case "ArrowLeft":
          keyDirs.left = true;
          if (!inputFocus.current) event.preventDefault();
          break;
        case "ArrowRight":
          keyDirs.right = true;
          if (!inputFocus.current) event.preventDefault();
          break;
        case "ArrowUp":
          keyDirs.up = true;
          if (!inputFocus.current) event.preventDefault();
          break;
        case "ArrowDown":
          keyDirs.down = true;
          if (!inputFocus.current) event.preventDefault();
          break;
      }
    };

    const keyUpFunc = (event: KeyboardEvent) => {
      const key = event.key;
      switch (key) {
        case "ArrowLeft":
          keyDirs.left = false;
          break;
        case "ArrowRight":
          keyDirs.right = false;
          break;
        case "ArrowUp":
          keyDirs.up = false;
          break;
        case "ArrowDown":
          keyDirs.down = false;
          break;
      }
    };

    const setupListeners = () => {
      window.addEventListener("keydown", keyDownFunc);
      window.addEventListener("keyup", keyUpFunc);
      keyDownListener.current = keyDownFunc;
      keyUpListener.current = keyUpFunc;
    };

    const handleMovement = () => {
      if (inputFocus.current) return;
      let nextStatus = PlayerStatus.IDLE;
      if (keyDirs.up || keyDirs.down || keyDirs.left || keyDirs.right) {
        thisPlayerData.current.sprite.setStatus(PlayerStatus.RUNNING);
        nextStatus = PlayerStatus.RUNNING;
      } else {
        thisPlayerData.current.sprite.setStatus(PlayerStatus.IDLE);
        nextStatus = PlayerStatus.IDLE;
      }

      let stopUp = false;
      let stopDown = false;
      let stopLeft = false;
      let stopRight = false;

      const yourPos = thisPlayerData.current.sprite.getPos();
      let charX = yourPos.x;
      let charY = yourPos.y;
      let charDir = yourPos.dir;

      if (charX < buffer) stopLeft = true;
      if (charX >= map.width - buffer) stopRight = true;
      if (charY < buffer) stopUp = true;
      if (charY >= map.height - buffer) stopDown = true;

      if (keyDirs.up) {
        if (!stopUp) charY -= BASE_SPEED;
        charDir = PlayerDirection.N;
      }
      if (keyDirs.down) {
        if (!stopDown) charY += BASE_SPEED;
        charDir = PlayerDirection.S;
      }
      if (keyDirs.left) {
        if (!stopLeft) charX -= BASE_SPEED;
        charDir = PlayerDirection.W;
      }
      if (keyDirs.right) {
        if (!stopRight) charX += BASE_SPEED;
        charDir = PlayerDirection.E;
      }

      //diags (fix later lol)
      if (keyDirs.up && keyDirs.right) {
        charDir = PlayerDirection.NE;
      }
      if (keyDirs.up && keyDirs.left) {
        charDir = PlayerDirection.NW;
      }
      if (keyDirs.down && keyDirs.right) {
        charDir = PlayerDirection.SE;
      }
      if (keyDirs.down && keyDirs.left) {
        charDir = PlayerDirection.SW;
      }

      //don't blast out packets if idle lol
      if (charStatus === PlayerStatus.IDLE && nextStatus === PlayerStatus.IDLE)
        return;
      thisPlayerData.current.sprite.updatePos(
        charX,
        charY,
        charDir,
        nextStatus,
      );
      updatePlayerPosition(
        thisPlayerData.current.sprite.userID,
        charX,
        charY,
        charDir,
        nextStatus,
      );
      charStatus = nextStatus;
    };

    loopRef.current = requestAnimationFrame(update);

    function update(t: number) {
      if (t - lastTime > frame_time) {
        lastTime = t;
        handleMovement();
        drawBG();
        drawNPCs();
        drawCharacter();
      }

      loopRef.current = requestAnimationFrame(update);
    }

    const drawBG = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!map.bitmap) return;

      const yourPos = thisPlayerData.current.sprite.getPos();
      const mapCoords = mapCentre(yourPos.x, yourPos.y);
      ctx.drawImage(
        map.bitmap,
        mapCoords.x,
        mapCoords.y,
        viewportWidth,
        viewportHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      //draw decor
      for (let entity of map.entities) {
        const sprite = entity.requestNextFrame(map.spriteMap);
        for (let pos of entity.positions) {
          const { x, y } = mapCoordsToScreenCoords(pos.x, pos.y);
          ctx.drawImage(
            sprite,
            x,
            y,
            entity.width * SCALE,
            entity.height * SCALE,
          );
        }
      }
    };

    const drawNPCs = () => {
      for (let i = 0; i < NPCs.length; i++) {
        const sprite = NPCs[i].requestNextFrame(spriteMap);
        if (!sprite) {
          console.log("Error: No Sprite Found");
          return;
        }

        const yourPos = thisPlayerData.current.sprite.getPos();
        let trueZeroX = Math.floor(yourPos.x - viewportWidth / 2);
        let trueZeroY = Math.floor(yourPos.y - viewportHeight / 2);

        if (trueZeroX < 0) trueZeroX = 0;
        if (trueZeroY < 0) trueZeroY = 0;

        if (trueZeroX > map.width - viewportWidth)
          trueZeroX = map.width - viewportWidth;
        if (trueZeroY > map.height - viewportHeight)
          trueZeroY = map.height - viewportHeight;

        const pos = NPCs[i].getPos();
        ctx.drawImage(
          sprite,
          Math.floor((pos.x - trueZeroX) * SCALE - (sprite.width * SCALE) / 2),
          Math.floor((pos.y - trueZeroY) * SCALE - (sprite.height * SCALE) / 2),
          sprite.width * SCALE,
          sprite.height * SCALE,
        );
      }
    };

    const drawCharacter = () => {
      const sprite = thisPlayerData.current.sprite.requestNextFrame(spriteMap);
      if (!sprite) return;
      const centre = centreSprite(sprite.width, sprite.height, true);
      ctx.drawImage(
        sprite,
        centre.x,
        centre.y,
        sprite.width * SCALE,
        sprite.height * SCALE,
      );

      // renderText(centre.x, centre.y, "zorua");
    };

    setupListeners();
  };

  return (
    <div id="canvas-container">
      <canvas id="canvas" width="500" height="500"></canvas>
    </div>
  );
};

export default Canvas;
