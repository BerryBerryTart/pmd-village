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
}

export interface PlayerMovementInterface extends BasePlayerInterface {
  status: PlayerStatus;
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

export interface MapDataInterface {
  name: string;
  filename: string;
  startX: number;
  startY: number;
  width: number;
  height: number;
  decorSprites: {
    name: string;
    startX: number;
    startY: number;
    width: number;
    height: number;
    widthPadding: number;
    frames: number;
    timings: number[];
    positions: [{ x: number; y: number }];
  }[];
}
