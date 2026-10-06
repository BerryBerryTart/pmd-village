import dayjs from "dayjs";
import { PlayerDirection, PlayerStatus } from "../utils/enums";
import type { MapDataInterface, SpriteMap } from './interfaces';

type SpriteMapType = Map<
  string,
  { sprite: ImageBitmap[][]; timings: number[] }
>;

const getSpriteDirectionIndex = (charDir: PlayerDirection): number => {
  switch (charDir) {
    case PlayerDirection.N:
      return 4;
    case PlayerDirection.S:
      return 0;
    case PlayerDirection.E:
      return 2;
    case PlayerDirection.W:
      return 6;
    //diags
    case PlayerDirection.NE:
      return 3;
    case PlayerDirection.NW:
      return 5;
    case PlayerDirection.SE:
      return 1;
    case PlayerDirection.SW:
      return 7;
    default:
      return 0;
  }
};

export async function loadImage(url: string) {
  var img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((res, rej) => {
    img.src = url;
    img.onload = (_) => res(img);
    img.onerror = rej;
  });
  return img;
}

export class Sprite {
  frameTimeCounter = 0;
  frameCounter = 0;
  status: PlayerStatus = PlayerStatus.IDLE;
  spriteName = "";
  username = "";
  userID = "";
  x = 0;
  y = 0;
  dir = PlayerDirection.S;

  constructor(
    spriteName: string,
    x = 0,
    y = 0,
    userID = "",
    username = "",
    dir = PlayerDirection.S,
  ) {
    this.spriteName = spriteName;
    this.x = x;
    this.y = y;
    this.userID = userID;
    this.username = username;
    this.dir = dir;
  }

  requestNextFrame(spriteMap: SpriteMapType) {
    const result = spriteMap.get(`${this.spriteName}|${this.status}`);

    if (!result) return;

    this.frameTimeCounter += 1;

    if (this.frameTimeCounter >= result.timings[this.frameCounter]) {
      this.frameCounter = (this.frameCounter + 1) % result.timings.length;
      this.frameTimeCounter = 0;
    }

    const sprite =
      result.sprite[getSpriteDirectionIndex(this.dir)][this.frameCounter];

    if (!sprite) {
      console.log({
        frameTime: this.frameTimeCounter,
        counter: this.frameCounter,
        timings: result.timings,
        status: this.status,
      });
    }

    return sprite;
  }

  getPos() {
    return { x: this.x, y: this.y, dir: this.dir };
  }

  updatePos(x: number, y: number, dir: PlayerDirection, status: PlayerStatus) {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.setStatus(status);
  }

  setStatus(nextStatus: PlayerStatus) {
    if (nextStatus === this.status) return;
    this.frameCounter = 0;
    this.frameTimeCounter = 0;
    this.status = nextStatus;
  }
}

export const getTime = (timeStr: string): string => {
  const date = dayjs(timeStr);

  return date.format("HH:mm:ss");
};

export class ServerPlayer {
  spriteName = "";
  username = "";
  userID = "";
  x = 0;
  y = 0;
  dir = PlayerDirection.S;
  status = PlayerStatus.IDLE;

  constructor(
    spriteName: string,
    username: string,
    userID: string,
    x: number,
    y: number,
  ) {
    this.spriteName = spriteName;
    this.username = username;
    this.userID = userID;
    this.x = x;
    this.y = y;
  }
}

export class GameManager {
  players: ServerPlayer[] = [];

  addPlayer(username: string, userID: string, spriteName: string) {
    const p = new ServerPlayer(spriteName, username, userID, 800, 200);
    this.players.push(p);
  }

  updatePlayer(
    userID: string,
    x: number,
    y: number,
    dir: PlayerDirection,
    status: PlayerStatus,
  ) {
    const player = this.players.find((el) => el.userID === userID);
    if (!player) throw new Error("Error: Cannot Update Player");
    player.x = x;
    player.y = y;
    player.dir = dir;
    player.status = status;
  }

  removePlayer(userID: string) {
    const playerIndex = this.players.findIndex((el) => el.userID === userID);
    if (playerIndex < 0) throw new Error("Error: Cannot Remove Player");

    this.players.splice(playerIndex, 1);
  }

  serialisePlayers() {
    return this.players;
  }
}

export function imgToBase64(img: ImageBitmap) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = img.width;
  canvas.height = img.height;

  if (ctx) ctx.drawImage(img, 0, 0);
  else throw new Error("Error: Canvas Not Supported!");

  return canvas.toDataURL();
}

export class MapEntity {
  width = 0;
  height = 0;
  frameTimeCounter = 0;
  frameCounter = 0;
  spriteName = "";
  positions = [];

  constructor(width, height, spriteName, positions) {
    this.width = width;
    this.height = height;
    this.spriteName = spriteName;
    this.positions = positions;
  }

  advance(timings: number[]) {
    this.frameTimeCounter += 1;

    if (this.frameTimeCounter === timings[this.frameCounter]) {
      this.frameCounter = (this.frameCounter + 1) % timings.length;
      this.frameTimeCounter = 0;
    }
  }

  requestNextFrame(spriteMap: Map<string, SpriteMap>) {
    const result = spriteMap.get(this.spriteName);
    if (!result) return;

    this.advance(result.timings);
    return result.sprite[this.frameCounter];
  }
}

//main map class
export class MapSprite {
  name = "default";
  width = 500;
  height = 500;
  bitmap = undefined;
  spriteMap = new Map();
  entities = [];
  boundingBoxes = [];

  constructor(name: string) {
    this.name = name;
  }

  async setup() {
    const data: MapDataInterface = await fetch("/pmd-village/map/default.json").then((res) =>
      res.json(),
    );

    const img = await loadImage(`/pmd-village/map/${data.filename}`);
    this.bitmap = await createImageBitmap(
      img,
      data.startX,
      data.startY,
      data.width,
      data.height,
    );
    this.width = data.width;
    this.height = data.height;

    //load decor assets
    for (let decorSprite of data.decorSprites) {
      const spriteArr = [];

      for (let i = 0; i < decorSprite.frames; i++) {
        spriteArr.push(
          await createImageBitmap(
            img,
            decorSprite.startX +
              (decorSprite.width + decorSprite.widthPadding) * i,
            decorSprite.startY,
            decorSprite.width,
            decorSprite.height,
          ),
        );
      }

      this.spriteMap.set(decorSprite.name, {
        sprite: spriteArr,
        timings: decorSprite.timings,
      });

      this.entities.push(
        new MapEntity(
          decorSprite.width,
          decorSprite.height,
          decorSprite.name,
          decorSprite.positions,
        ),
      );
    }
  }
}
