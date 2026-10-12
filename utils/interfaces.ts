import type { MessageType, PlayerDirection, PlayerStatus } from "./enums";
import type { Sprite } from "./utils";

export interface AnimDataInterface {
  AnimData: {
    Anims: {
      Anim: AnimDataEntry[];
    };
  };
}

interface AnimDataEntry {
  Name: string;
  Index: string;
  FrameWidth: string;
  FrameHeight: string;
  Durations: {
    Duration: string[];
  };
}

export interface MessageInterface {
  content: string;
  type: MessageType;
  userID: string;
  time: string;
  username: string;
  portrait?: string;
}

interface BasePlayerInterface {
  userID: string;
  x?: number;
  y?: number;
  dir?: PlayerDirection;
  locale?: string;
}

export interface PlayerMovementInterface extends BasePlayerInterface {
  status: PlayerStatus;
  locale?: string;
}

export interface ServerPlayerInterface extends BasePlayerInterface {
  username: string;
  spriteName: string;
  sprite?: Sprite;
}

export interface SpriteMap {
  sprite: ImageBitmap[][];
  timings: number[];
}

export interface SpriteEntityMap {
  sprite: ImageBitmap[];
  timings: number[];
}

export interface PositionInterface {
  x: number;
  y: number;
}

export interface PositionBox extends PositionInterface {
  w: number;
  h: number;
}

export interface MapLink {
  name: string;
  entryBox: PositionBox;
  loadInPos: { x: number; y: number };
}

export interface MapDataInterface {
  name: string;
  filename: string;
  startX: number;
  startY: number;
  width: number;
  height: number;
  spawnX: number;
  spawnY: number;
  links: MapLink[];
  boundingBoxes: PositionBox[];
  decorSprites: {
    name: string;
    startX: number;
    startY: number;
    width: number;
    height: number;
    widthPadding: number;
    frames: number;
    framesPerRow: number;
    rows: number;
    rowOffset: number;
    timings: number[];
    positions: [{ x: number; y: number }];
  }[];
}
