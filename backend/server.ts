import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import { GameManager } from "../utils/utils";
import { MessageType, PlayerDirection, SocketEvent } from "../utils/enums";
import {
  MessageInterface,
  PlayerMovementInterface,
  ServerPlayerInterface,
} from "../utils/interfaces";
import dayjs from "dayjs";

interface GameSocket extends Socket {
  userID?: string;
  username?: string;
  spriteName?: string;
}

interface AuthType {
  username: string;
  userID: string;
  spriteName: string;
}

const app = express();
const server = createServer(app); // http

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(express.json());
app.use(cors());

const game = new GameManager();

const broadcastMessage = (eventType: SocketEvent, msg: any) => {
  for (let [_, s] of io.of("/").sockets) {
    s.emit(eventType, msg);
  }
};

io.on(SocketEvent.NEW_CONNECTION, (socket: GameSocket) => {
  const auth = socket.handshake.auth as AuthType;

  if (!auth.userID || !auth.username || !auth.spriteName) {
    broadcastMessage(SocketEvent.ERROR, { error: "Invalid Setup" });
    return;
  }

  //set socket IDs for easy identification later
  socket.userID = auth.userID;
  socket.username = auth.username;
  socket.spriteName = auth.spriteName;
  console.log(`${auth.username} has joined`);
  game.addPlayer(auth.username!, auth.userID!, auth.spriteName);

  broadcastMessage(SocketEvent.BROADCAST_ALL_PLAYERS, {
    players: game.serialisePlayers(),
  });

  broadcastMessage(SocketEvent.BROADCAST_MESSAGE, {
    content: ` has joined`,
    type: MessageType.STATUS,
    time: dayjs().toISOString(),
    userID: socket.userID!,
    username: socket.username!,
    portrait: socket.spriteName!
  });

  broadcastMessage(SocketEvent.CLIENT_LOAD_IN, {
    userID: auth.userID,
    username: auth.username,
    spriteName: auth.spriteName,
    x: 800,
    y: 200,
    dir: PlayerDirection.S,
  } as ServerPlayerInterface);

  socket.on(SocketEvent.CLIENT_DISCONNECT, () => {
    console.log(`${socket.username} left`);
    broadcastMessage(SocketEvent.BROADCAST_MESSAGE, {
      content: " has left",
      type: MessageType.STATUS,
      time: dayjs().toISOString(),
      userID: socket.userID,
      username: socket.username,
      portrait: socket.spriteName!
    });
    game.removePlayer(socket.userID!);
    broadcastMessage(SocketEvent.CLIENT_LEAVES, { userID: socket.userID });
  });

  socket.on(SocketEvent.CLIENT_MESSAGE, (payload: MessageInterface) => {
    broadcastMessage(SocketEvent.BROADCAST_MESSAGE, {
      ...payload,
      time: dayjs().toISOString(),
      userID: socket.userID!,
      username: socket.username!,
    });
  });

  socket.on(SocketEvent.CLIENT_MOVES, (payload: PlayerMovementInterface) => {
    //update serverside game state before echo
    game.updatePlayer(
      payload.userID,
      payload.x!,
      payload.y!,
      payload.dir!,
      payload.status,
    );
    broadcastMessage(SocketEvent.BROADCAST_MOVE, payload);
  });
});

server.listen(4000, () => console.log("Server started on port 4000"));
