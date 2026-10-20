import {
  createContext,
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
  MapLink,
  MessageInterface,
  PlayerMovementInterface,
  ServerPlayerInterface,
} from "../../utils/interfaces";
import { nanoid } from "nanoid";
import {
  isBlankImage,
  loadImage,
  MapSprite,
  portraitNameMap,
  ServerPlayer,
  Sprite,
} from "../../utils/utils";

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
    mapProvider: React.RefObject<MapSprite>;
    fontMap: Map<string, ImageBitmap>;
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
    loadMap: (mapName?: string, link?: MapLink) => Promise<void>;
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
    userID: nanoid(),
    spriteName: "",
    sprite: undefined,
    locale: "default",
  });
  const entities = useRef<Sprite[]>([]);
  //TODO: setup default substitute sprite sheet in public folder
  const spriteMap = useRef<Map<string, SpriteMap>>(new Map());
  const [portraitMap, setPortraitMap] = useState<
    Map<string, Map<string, ImageBitmap>>
  >(new Map());
  const [playerList, setPlayerList] = useState<
    Map<string, ServerPlayerInterface>
  >(new Map());
  const mapProvider = useRef(undefined);
  const fontMap = useRef<Map<string, ImageBitmap>>(new Map());

  useEffect(() => {    
    if (thisPlayerData.current.username && thisPlayerData.current.spriteName) {
      handleConnect(
        thisPlayerData.current.username,
        thisPlayerData.current.spriteName,
      );
    }
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

  //TODO: set this up to selectively load assets instead of all at once
  const loadPortraits = async (character: string) => {
    const portraitMapBuffer: Map<string, Map<string, ImageBitmap>> = new Map();

    const img = await loadImage(
      `/pmd-village/sprite/${character}/portrait.png`,
    );
    const mapBuffer: Map<string, ImageBitmap> = new Map();

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const portraitBuffer = await createImageBitmap(
          img,
          col * 40,
          row * 40,
          40,
          40,
        );
        if (!isBlankImage(portraitBuffer)) {
          const portraitName = portraitNameMap.get(`${row}-${col}`);
          mapBuffer.set(portraitName, portraitBuffer);
        }
      }
    }
    portraitMapBuffer.set(character, mapBuffer);

    setPortraitMap((prev) => new Map([...prev, ...portraitMapBuffer]));
  };

  const loadSprites = async (name: string) => {
    const walkImg = await loadImage(
      `/pmd-village/sprite/${name}/Walk-Anim.png`,
    );
    const idleImg = await loadImage(
      `/pmd-village/sprite/${name}/Idle-Anim.png`,
    );
    const animData: AnimDataInterface = await fetch(
      `/pmd-village/sprite/${name}/AnimData.json`,
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

  const loadMap = async (mapName = "default", link?: MapLink) => {
    const mapEntity = new MapSprite(mapName);
    await mapEntity.setup();
    mapProvider.current = mapEntity;
    if (link) {
      thisPlayerData.current.sprite.x = link.loadInPos.x;
      thisPlayerData.current.sprite.y = link.loadInPos.y;
      thisPlayerData.current.locale = link.name;
      updatePlayerPosition(
        thisPlayerData.current.userID,
        link.loadInPos.x,
        link.loadInPos.y,
        thisPlayerData.current.dir,
        PlayerStatus.IDLE,
      );
      updatePlayerLocale(thisPlayerData.current.userID, link.name);
    }
  };

  const loadFonts = async () => {
    const img = await loadImage("/pmd-village/font.png");
    const fontMapBuffer = new Map();
    for (let i = 0; i < 10; i++) {
      const bitmap = await createImageBitmap(img, i * 8, 0, 8, 8);
      fontMapBuffer.set(`${i}`, bitmap);
    }
    let counter = 0;
    //load letters
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 13; col++) {
        const letter = String.fromCharCode(97 + counter);
        const bitmap = await createImageBitmap(
          img,
          col * 8,
          row * 8 + 18,
          8,
          8,
        );
        fontMapBuffer.set(letter, bitmap);
        counter++;
      }
    }
    fontMap.current = fontMapBuffer;
  };

  const connect = async (username: string, spriteName: string) => {
    await loadSubstituteSprite();
    await loadSprites(spriteName);
    await loadPortraits(spriteName);
    await loadMap();
    await loadFonts();
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
      (map) =>
        new Map([
          ...map,
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

    socket.on(
      SocketEvent.CLIENT_LOAD_IN,
      async (payload: ServerPlayerInterface) => {
        await buildNPCs(payload);
      },
    );

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
          await buildNPCs({ ...player });

          if (!playerList.get(player.userID)) {
            playerMapBuffer.set(player.userID, {
              userID: player.userID,
              username: player.username,
              spriteName: player.spriteName,
            });
          }
        }

        if (playerMapBuffer.size > 0) {
          setPlayerList((map) => new Map([...map, ...playerMapBuffer]));
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

      setPlayerList((map) => {
        const mapBuffer = new Map([...map]);
        mapBuffer.delete(payload.userID);
        return new Map([...mapBuffer]);
      });
    });

    socket.on(SocketEvent.CLIENT_CONNECT, async () => {
      sock.current = socket;
      await loadSprites(spriteName);
    });

    socket.on(
      SocketEvent.BROADCAST_LOCALE_CHANGE,
      (payload: { userID: string; locale: string }) => {
        const player = entities.current.find(
          (el) => el.userID === payload.userID,
        );
        if (!player) return;
        player.updateLocale(payload.locale);
      },
    );

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
    thisPlayerData.current.sprite = new Sprite(
      "substitute",
      0,
      0,
      thisPlayerData.current.userID,
    );
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
    const payload: PlayerMovementInterface = {
      userID,
      x,
      y,
      dir,
      status,
      locale: thisPlayerData.current.locale,
    };
    sock.current.emit(SocketEvent.CLIENT_MOVES, payload);
  };

  const updatePlayerLocale = (userID: string, locale: string) => {
    sock.current.emit(SocketEvent.CLIENT_CHANGE_LOCALE, { userID, locale });
  };

  const buildNPCs = async (newPlayer: ServerPlayerInterface) => {
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

    //load portraits
    if (!portraitMap.get(newPlayer.spriteName)) {
      console.log("loading in " + newPlayer.spriteName);
      await loadPortraits(newPlayer.spriteName);
    }

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
      mapProvider,
      fontMap: fontMap.current,
    },
    actions: {
      sendMessage,
      connect,
      disconnect,
      updatePlayerPosition,
      loadMap,
    },
  } as GameContextType;

  return <GameContext value={value}>{children}</GameContext>;
};
