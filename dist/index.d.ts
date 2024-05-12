import * as solid_js from 'solid-js';
import { JSX, Accessor } from 'solid-js';
import { Connection, ConnectionConfig, PublicKey } from '@solana/web3.js';
import { Adapter, WalletError, WalletReadyState, WalletName, WalletAdapterProps, SignerWalletAdapterProps, MessageSignerWalletAdapterProps, SignInMessageSignerWalletAdapterProps } from '@solana/wallet-adapter-base';
export { WalletName } from '@solana/wallet-adapter-base';

interface ConnectionContextState {
    connection: Connection;
}
declare const ConnectionContext: solid_js.Context<ConnectionContextState>;
interface ConnectionProviderProps {
    children: JSX.Element;
    endpoint: string;
    config?: ConnectionConfig;
}
declare const ConnectionProvider: ({ children, endpoint, config, }: ConnectionProviderProps) => JSX.Element;
declare function useConnection(): ConnectionContextState;

interface WalletProviderProps {
    children: JSX.Element;
    wallets: Accessor<Adapter[]>;
    autoConnect?: boolean | ((adapter: Adapter) => Promise<boolean>);
    localStorageKey?: string;
    onError?: (error: WalletError, adapter?: Adapter) => void;
}
declare function WalletProvider(props: WalletProviderProps): JSX.Element;

declare class WalletNotSelectedError extends WalletError {
    name: string;
}

interface Wallet {
    adapter: Adapter;
    readyState: WalletReadyState;
}
interface WalletContextState {
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
    signAllTransactions: SignerWalletAdapterProps["signAllTransactions"] | undefined;
    signMessage: MessageSignerWalletAdapterProps["signMessage"] | undefined;
    signIn: SignInMessageSignerWalletAdapterProps["signIn"] | undefined;
}
declare const WalletContext: solid_js.Context<WalletContextState | undefined>;
declare function useWallet(): WalletContextState;

export { ConnectionContext, type ConnectionContextState, ConnectionProvider, type ConnectionProviderProps, type Wallet, WalletContext, type WalletContextState, WalletNotSelectedError, WalletProvider, type WalletProviderProps, useConnection, useWallet };
