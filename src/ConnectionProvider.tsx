import { Connection, type ConnectionConfig } from "@solana/web3.js";
import { JSX, createContext, createMemo, useContext } from "solid-js";

export interface ConnectionContextState {
  connection: Connection;
}

export const ConnectionContext = createContext<ConnectionContextState>(
  {} as ConnectionContextState
);

export interface ConnectionProviderProps {
  children: JSX.Element;
  endpoint: string;
  config?: ConnectionConfig;
}

export const ConnectionProvider = ({
  children,
  endpoint,
  config = { commitment: "confirmed" },
}: ConnectionProviderProps) => {
  const connection = createMemo(
    () => new Connection(endpoint, config),
    [endpoint, config]
  );

  return (
    <ConnectionContext.Provider value={{ connection: connection() }}>
      {children}
    </ConnectionContext.Provider>
  );
};

export function useConnection(): ConnectionContextState {
  return useContext(ConnectionContext);
}
