import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import type { DefaultEventsMap } from "socket.io";

import { io, Socket } from "socket.io-client";
import {
  MessageType,
  PlayerDirection,
  PlayerStatus,
  SocketEvent,
} from "../../utils/enums";
import type {
  AnimDataInterface,
  MessageInterface,
  PlayerMovementInterface,
  ServerPlayerInterface,
} from "../../utils/interfaces";
import { v6 } from "uuid";
import { loadImage, ServerPlayer, Sprite } from "../../utils/utils";

export const GameContext = createContext({});

export interface GameContextType {
  data: {
    messages: MessageInterface[];
    inputFocus: React.RefObject<boolean>;
    connected: boolean;
    thisPlayerData: React.RefObject<ServerPlayerInterface>;
    entities: React.RefObject<Sprite[]>;
    spriteMap: Map<string, SpriteMap>;
    portraitMap: Map<string, Map<string, ImageBitmap>>;
    playerList: Map<string, ServerPlayerInterface>;
  };
  actions: {
    sendMessage: (msg: string, portrait: string) => void;
    connect: (username: string, spriteName: string) => void;
    disconnect: () => void;
    updatePlayerPosition: (
      userID: string,
      x: number,
      y: number,
      dir: PlayerDirection,
      status: PlayerStatus,
    ) => void;
  };
}

interface SpriteMap {
  sprite: ImageBitmap[][];
  timings: number[];
}

export const GameProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const sock = useRef<Socket<DefaultEventsMap, DefaultEventsMap> | null>(null);
  const [messages, setMessages] = useState<MessageInterface[]>([]);
  const inputFocus = useRef(false);
  const [connected, setConnected] = useState(false);
  const thisPlayerData = useRef<ServerPlayerInterface>({
    username: "",
    userID: v6(),
    spriteName: "",
    sprite: undefined,
  });
  const entities = useRef<Sprite[]>([]);
  //TODO: setup default substitute sprite sheet in public folder
  const spriteMap = useRef<Map<string, SpriteMap>>(new Map());
  const [portraitMap, setPortraitMap] = useState<
    Map<string, Map<string, ImageBitmap>>
  >(new Map());
  // const mapAsset = useRef<ImageBitmap>(undefined);
  const [playerList, setPlayerList] = useState<
    Map<string, ServerPlayerInterface>
  >(new Map());

  useEffect(() => {
    loadSubstituteSprite();
    if (thisPlayerData.current.username && thisPlayerData.current.spriteName) {
      handleConnect(
        thisPlayerData.current.username,
        thisPlayerData.current.spriteName,
      );
    }
    loadAssets();
    console.log("Connected");
    return () => {
      disconnect();
    };
  }, []);

  const loadSubstituteSprite = async () => {
    await loadSprites("substitute");
    thisPlayerData.current.sprite = new Sprite(
      "substitute",
      0,
      0,
      thisPlayerData.current.userID,
    );
  };

  const loadAssets = useCallback(async () => {
    const data: { characters: string[] } = await fetch(
      `./characters.json`,
    ).then((res) => res.json());

    const { characters } = data;
    const portraitMapBuffer = new Map();

    for (let character of characters) {
      const img = await loadImage(`./sprite/${character}/portrait.png`);
      const mapBuffer = new Map();

      //loopify this later lol
      const portraitBuffer = await createImageBitmap(img, 0, 0, 40, 40);
      mapBuffer.set("normal", portraitBuffer);
      portraitMapBuffer.set(character, mapBuffer);
    }
    setPortraitMap(portraitMapBuffer);
  }, []);

  const loadSprites = async (name: string) => {
    const walkImg = await loadImage(`./sprite/${name}/Walk-Anim.png`);
    const idleImg = await loadImage(`./sprite/${name}/Idle-Anim.png`);
    const animData: AnimDataInterface = await fetch(
      `./sprite/${name}/AnimData.json`,
    ).then((res) => res.json());

    const process = async (
      spriteName: string,
      img: HTMLImageElement,
      state: PlayerStatus,
    ) => {
      let spriteArr = [];
      const data = animData.AnimData.Anims.Anim.find(
        (el) => el.Name === spriteName,
      );

      if (!data) throw new Error("Bro??? How???");

      const frameWidth = parseInt(data.FrameWidth);
      const frameHeight = parseInt(data.FrameHeight);
      const durations = data.Durations.Duration.map((el) => parseInt(el));

      for (let height = 0; height < 8; height++) {
        const rowBuffer = [];
        for (let width = 0; width < durations.length; width++) {
          rowBuffer.push(
            await createImageBitmap(
              img,
              width * frameWidth,
              height * frameHeight,
              frameWidth,
              frameHeight,
            ),
          );
        }
        spriteArr.push(rowBuffer);
      }

      spriteMap.current.set(`${name}|${state}`, {
        sprite: spriteArr,
        timings: durations,
      });
    };

    await process("Walk", walkImg, PlayerStatus.RUNNING);
    await process("Idle", idleImg, PlayerStatus.IDLE);
  };

  const connect = async (username: string, spriteName: string) => {
    await loadSprites(spriteName);
    return handleConnect(username, spriteName);
  };

  const handleConnect = (username: string, spriteName: string) => {
    if (sock.current) return;

    const socket = io(import.meta.env.VITE_WEBSOCKET_URL, {
      auth: {
        userID: thisPlayerData.current.userID,
        username,
        spriteName,
      },
    });

    setPlayerList(
      new Map([
        ...playerList,
        [
          thisPlayerData.current.userID,
          { userID: thisPlayerData.current.userID, username, spriteName },
        ],
      ]),
    );

    sock.current = socket;
    socket.on(SocketEvent.BROADCAST_MESSAGE, (payload: MessageInterface) => {
      setMessages((prev) => [...prev, payload]);
    });

    socket.on(SocketEvent.CLIENT_LOAD_IN, (payload: ServerPlayerInterface) => {
      buildNPCs(payload);
    });

    socket.on(SocketEvent.CLIENT_DISCONNECT, () => {
      disconnect();
    });

    socket.on(
      SocketEvent.BROADCAST_MOVE,
      (payload: PlayerMovementInterface) => {
        const found = entities.current.find(
          (el) => el.userID === payload.userID,
        );
        if (!found) return;
        found.updatePos(payload.x, payload.y, payload.dir, payload.status);
      },
    );

    socket.on(
      SocketEvent.BROADCAST_ALL_PLAYERS,
      async (payload: { players: ServerPlayer[] }) => {
        const { players } = payload;
        const playerMapBuffer: Map<string, ServerPlayerInterface> = new Map();
        for (let player of players) {
          await loadSprites(player.spriteName);
          buildNPCs({ ...player });

          if (!playerList.get(player.userID)) {
            playerMapBuffer.set(player.userID, {
              userID: player.userID,
              username: player.username,
              spriteName: player.spriteName,
            });
          }
        }

        if (playerMapBuffer.size > 0) {
          setPlayerList(new Map([...playerList, ...playerMapBuffer]));
        }
      },
    );

    socket.on(SocketEvent.CLIENT_LEAVES, (payload: { userID: string }) => {
      const { userID } = payload;

      const foundIndex = entities.current.findIndex(
        (el) => el.userID === userID,
      );
      if (foundIndex >= 0) {
        entities.current.splice(foundIndex, 1);
      }

      const mapBuffer = new Map([...playerList]);
      mapBuffer.delete(userID);
      setPlayerList(new Map([...mapBuffer]));
    });

    socket.on(SocketEvent.CLIENT_CONNECT, async () => {
      sock.current = socket;
      await loadSprites(spriteName);
    });

    setConnected(true);
    thisPlayerData.current.username = username;
    thisPlayerData.current.spriteName = spriteName;
  };

  const disconnect = () => {
    sock.current?.disconnect();
    sock.current = null;
    thisPlayerData.current.username = "";
    thisPlayerData.current.spriteName = "";
    //reset dummy sprite
    const dummy = spriteMap.current.get("substitute");
    if (dummy) {
      thisPlayerData.current.sprite = new Sprite(
        "substitute",
        0,
        0,
        thisPlayerData.current.userID,
      );
    }
    setPlayerList(new Map());
    setMessages([]);
    setConnected(false);
  };

  const sendMessage = (msg: string, portrait: string) => {
    sock.current.emit(SocketEvent.CLIENT_MESSAGE, {
      content: msg,
      type: MessageType.TEXT,
      portrait,
    } as MessageInterface);
  };

  const updatePlayerPosition = (
    userID: string,
    x: number,
    y: number,
    dir: PlayerDirection,
    status: PlayerStatus,
  ) => {
    const payload: PlayerMovementInterface = { userID, x, y, dir, status };
    sock.current.emit(SocketEvent.CLIENT_MOVES, payload);
  };

  const buildNPCs = (newPlayer: ServerPlayerInterface) => {
    //already in
    const search = entities.current.find(
      (el) => el.userID === newPlayer.userID,
    );
    if (search) return;
    const nextEntity = new Sprite(
      newPlayer.spriteName,
      newPlayer.x,
      newPlayer.y,
      newPlayer.userID,
      newPlayer.username,
      newPlayer.dir,
    );

    //set set NPC sprites
    if (newPlayer.userID !== thisPlayerData.current.userID) {
      entities.current.push(nextEntity);
    } else {
      if (thisPlayerData.current.sprite.spriteName === "substitute") {
        thisPlayerData.current.sprite = nextEntity;
      }
    }
  };

  const value = {
    data: {
      messages,
      inputFocus,
      connected: connected,
      thisPlayerData,
      entities,
      spriteMap: spriteMap.current,
      portraitMap,
      playerList,
    },
    actions: { sendMessage, connect, disconnect, updatePlayerPosition },
  } as GameContextType;

  return <GameContext value={value}>{children}</GameContext>;
};
