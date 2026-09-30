import { type PropsWithChildren } from "react";
import { GameProvider } from "./GameProvider";

export const BaseProvider: React.FC<PropsWithChildren> = ({ children }) => {
  return <GameProvider>{children}</GameProvider>;
};
