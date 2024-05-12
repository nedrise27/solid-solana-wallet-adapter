import {
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletReadyState,
  type Adapter,
  type WalletError,
  type WalletName,
} from "@solana/wallet-adapter-base";
import { PublicKey } from "@solana/web3.js";
// import React, { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { JSX, createEffect, createMemo, createSignal } from "solid-js";
import { WalletNotSelectedError } from "./errors";
import { Wallet, WalletContext, WalletContextState } from "./useWallet";

export interface WalletProviderBaseProps {
  children: JSX.Element;
  wallets: Adapter[];
  adapter: Adapter | undefined;
  isUnloadingRef: boolean;
  // NOTE: The presence/absence of this handler implies that auto-connect is enabled/disabled.
  onAutoConnectRequest?: () => Promise<void>;
  onConnectError: () => void;
  onError?: (error: WalletError, adapter?: Adapter) => void;
  onSelectWallet: (walletName: WalletName | null) => void;
}

export function WalletProviderBase(props: WalletProviderBaseProps) {
  const [isConnectingRef, setIsConnectingRef] = createSignal(false);
  const [connecting, setConnecting] = createSignal(false);
  const [isDisconnectingRef, setIsDisconnectingRef] = createSignal(false);
  const [disconnecting, setDisconnecting] = createSignal(false);
  const [publicKey, setPublicKey] = createSignal<PublicKey | null>(
    props.adapter?.publicKey ?? null
  );
  const [connected, setConnected] = createSignal(
    props.adapter?.connected ?? false
  );

  /**
   * Store the error handlers as refs so that a change in the
   * custom error handler does not recompute other dependencies.
   */

  function handleErrorRef(error: WalletError, adapter?: Adapter) {
    if (!props.isUnloadingRef) {
      if (props.onError) {
        props.onError(error, adapter);
      } else {
        console.error(error, adapter);
        if (
          error instanceof WalletNotReadyError &&
          typeof window !== "undefined" &&
          adapter
        ) {
          window.open(adapter.url, "_blank");
        }
      }
    }
    return error;
  }

  // Wrap adapters to conform to the `Wallet` interface
  const [wallets, setWallets] = createSignal<Wallet[]>(
    props.wallets
      .map((adapter) => ({
        adapter,
        readyState: adapter.readyState,
      }))
      .filter(({ readyState }) => readyState !== WalletReadyState.Unsupported)
  );

  // When the adapters change, start to listen for changes to their `readyState`
  createEffect(() => {
    // When the adapters change, wrap them to conform to the `Wallet` interface
    setWallets((wallets) =>
      props.wallets
        .map((adapter, index) => {
          const wallet = wallets[index];
          // If the wallet hasn't changed, return the same instance
          return wallet &&
            wallet.adapter === adapter &&
            wallet.readyState === adapter.readyState
            ? wallet
            : {
                adapter: adapter,
                readyState: adapter.readyState,
              };
        })
        .filter(({ readyState }) => readyState !== WalletReadyState.Unsupported)
    );

    function handleReadyStateChange(
      this: Adapter,
      readyState: WalletReadyState
    ) {
      setWallets((prevWallets) => {
        const index = prevWallets.findIndex(({ adapter }) => adapter === this);
        if (index === -1) return prevWallets;

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const { adapter } = prevWallets[index]!;
        return [
          ...prevWallets.slice(0, index),
          { adapter, readyState },
          ...prevWallets.slice(index + 1),
        ].filter(
          ({ readyState }) => readyState !== WalletReadyState.Unsupported
        );
      });
    }

    props.wallets.forEach((adapter) =>
      adapter.on("readyStateChange", handleReadyStateChange, adapter)
    );

    return () => {
      props.wallets.forEach((adapter) =>
        adapter.off("readyStateChange", handleReadyStateChange, adapter)
      );
    };
  });

  const wallet = createMemo(
    () => wallets().find((wallet) => wallet.adapter === props.adapter) ?? null
  );

  createEffect(() => {
    if (!props.adapter) return;

    const handleConnect = (publicKey: PublicKey) => {
      setPublicKey(publicKey);
      setIsConnectingRef(false);
      setConnecting(false);
      setConnected(true);
      setIsDisconnectingRef(false);
      setDisconnecting(false);
    };

    const handleDisconnect = () => {
      if (props.isUnloadingRef) return;

      setPublicKey(null);
      setIsConnectingRef(false);
      setConnecting(false);
      setConnected(false);
      setIsDisconnectingRef(false);
      setDisconnecting(false);
    };

    const handleError = (error: WalletError) => {
      handleErrorRef(error, props.adapter);
    };

    props.adapter.on("connect", handleConnect);
    props.adapter.on("disconnect", handleDisconnect);
    props.adapter.on("error", handleError);

    return () => {
      props.adapter?.off("connect", handleConnect);
      props.adapter?.off("disconnect", handleDisconnect);
      props.adapter?.off("error", handleError);

      handleDisconnect();
    };
  });

  // When the adapter changes, clear the `autoConnect` tracking flag
  const [didAttemptAutoConnectRef, setDidAttemptAutoConnectRef] =
    createSignal(false);

  createEffect(() => {
    return () => {
      if (props.adapter) {
        setDidAttemptAutoConnectRef(false);
      }
    };
  });

  // If auto-connect is enabled, request to connect when the adapter changes and is ready
  createEffect(() => {
    if (
      didAttemptAutoConnectRef() ||
      isConnectingRef() ||
      connected() ||
      !props.onAutoConnectRequest ||
      !(
        wallet()?.readyState === WalletReadyState.Installed ||
        wallet()?.readyState === WalletReadyState.Loadable
      )
    )
      return;

    setIsConnectingRef(true);
    setConnecting(true);
    setDidAttemptAutoConnectRef(true);

    (async function () {
      try {
        await props.onAutoConnectRequest?.();
      } catch {
        props.onConnectError();
        // Drop the error. It will be caught by `handleError` anyway.
      } finally {
        setConnecting(false);
        setIsConnectingRef(false);
      }
    })();
  });

  // Send a transaction using the provided connection

  async function sendTransaction(
    transaction: any,
    connection: any,
    options: any
  ) {
    if (!props.adapter) throw handleErrorRef(new WalletNotSelectedError());
    if (!connected())
      throw handleErrorRef(new WalletNotConnectedError(), props.adapter);
    return await props.adapter.sendTransaction(
      transaction,
      connection,
      options
    );
  }

  // Sign a transaction if the wallet supports it
  async function signTransaction(transaction: any) {
    if (props.adapter && "signTransaction" in props.adapter) {
      if (!connected())
        throw handleErrorRef(new WalletNotConnectedError(), props.adapter);
      return await props.adapter.signTransaction(transaction);
    }
  }

  // Sign multiple transactions if the wallet supports it
  async function signAllTransactions(transactions: any[]) {
    if (props.adapter && "signAllTransactions" in props.adapter) {
      if (!connected()) {
        throw handleErrorRef(new WalletNotConnectedError(), props.adapter);
      }
      return await props.adapter.signAllTransactions(transactions);
    }
  }

  // Sign an arbitrary message if the wallet supports it
  async function signMessage(message: any) {
    if (props.adapter && "signMessage" in props.adapter) {
      if (!connected())
        throw handleErrorRef(new WalletNotConnectedError(), props.adapter);
      return await props.adapter.signMessage(message);
    }
  }

  // Sign in if the wallet supports it
  async function signIn(input: any) {
    if (props.adapter && "signIn" in props.adapter) {
      return await props.adapter.signIn(input);
    }
  }

  async function handleConnect() {
    const _wallet = wallet();
    if (isConnectingRef() || isDisconnectingRef() || _wallet?.adapter.connected)
      return;
    if (!_wallet) throw handleErrorRef(new WalletNotSelectedError());
    const { adapter, readyState } = _wallet;
    if (
      !(
        readyState === WalletReadyState.Installed ||
        readyState === WalletReadyState.Loadable
      )
    )
      throw handleErrorRef(new WalletNotReadyError(), adapter);
    setIsConnectingRef(true);
    setConnecting(true);
    try {
      await adapter.connect();
    } catch (e) {
      props.onConnectError();
      throw e;
    } finally {
      setConnecting(false);
      setIsConnectingRef(false);
    }
  }

  async function handleDisconnect() {
    if (isDisconnectingRef()) return;
    if (!props.adapter) return;

    setIsDisconnectingRef(true);
    setDisconnecting(true);
    try {
      await props.adapter.disconnect();
    } finally {
      setDisconnecting(false);
      setIsDisconnectingRef(false);
    }
  }

  const context: WalletContextState = {
    autoConnect: !!props.onAutoConnectRequest,
    wallets,
    wallet,
    publicKey,
    connected,
    connecting,
    disconnecting,
    select: props.onSelectWallet,
    connect: handleConnect,
    disconnect: handleDisconnect,
    sendTransaction,
    signTransaction,
    signAllTransactions: signAllTransactions as any,
    signMessage: signMessage as any,
    signIn: signIn as any,
  };

  return (
    <WalletContext.Provider value={context}>
      {props.children}
    </WalletContext.Provider>
  );
}
