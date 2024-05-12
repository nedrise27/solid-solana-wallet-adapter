import {
  type Adapter,
  type MessageSignerWalletAdapterProps,
  type SignerWalletAdapterProps,
  type SignInMessageSignerWalletAdapterProps,
  type WalletAdapterProps,
  type WalletName,
  type WalletReadyState,
} from "@solana/wallet-adapter-base";
import { type PublicKey } from "@solana/web3.js";
import { Accessor, createContext, useContext } from "solid-js";

export interface Wallet {
  adapter: Adapter;
  readyState: WalletReadyState;
}

export interface WalletContextState {
  autoConnect: boolean;
  wallets: Accessor<Wallet[]>;
  wallet: Accessor<Wallet | null>;
  publicKey: Accessor<PublicKey | null>;
  connected: Accessor<boolean>;
  connecting: Accessor<boolean>;
  disconnecting: Accessor<boolean>;
  select(walletName: WalletName | null): void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendTransaction: WalletAdapterProps["sendTransaction"];
  signTransaction: SignerWalletAdapterProps["signTransaction"] | undefined;
  signAllTransactions:
    | SignerWalletAdapterProps["signAllTransactions"]
    | undefined;
  signMessage: MessageSignerWalletAdapterProps["signMessage"] | undefined;
  signIn: SignInMessageSignerWalletAdapterProps["signIn"] | undefined;
}

export const WalletContext = createContext<WalletContextState>();

export function useWallet(): WalletContextState {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error(
      "Make sure to render a WalletProvider as an ancestor of the component that uses WalletContext."
    );
  }

  return context;
}
