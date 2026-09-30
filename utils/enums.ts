export enum PlayerDirection {
  N = "N",
  NE = "NE",
  E = "E",
  SE = "SE",
  S = "S",
  SW = "SW",
  W = "W",
  NW = "NW",
}

export enum PlayerStatus {
  RUNNING = "RUNNING",
  IDLE = "IDLE",
}

export enum SocketEvent {
  NEW_CONNECTION = "connection",
  CLIENT_CONNECT = "connect",
  CLIENT_DISCONNECT = "disconnect",
  CLIENT_LOAD_IN = "client_load_in",
  CLIENT_MESSAGE = "client_message",
  CLIENT_MOVES = "client_move",
  CLIENT_LEAVES = "client_leaves",
  BROADCAST_MESSAGE = "broadcast_message",
  BROADCAST_MOVE = "braodcast_move",
  BROADCAST_ALL_PLAYERS = "broadcast_all_players",
  ERROR = "error_message",
}

export enum MessageType {
  STATUS = "STATUS",
  TEXT = "TEXT",
}
