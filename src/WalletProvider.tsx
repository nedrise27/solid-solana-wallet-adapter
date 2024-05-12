import {
  type Adapter,
  type WalletError,
  type WalletName,
} from "@solana/wallet-adapter-base";
import {
  Accessor,
  JSX,
  createEffect,
  createMemo,
  createSignal,
} from "solid-js";
import { WalletProviderBase } from "./WalletProviderBase";
import { useLocalStorage } from "./useLocalStorage";
import { useStandardWalletAdapters } from "./util";

const DEFAULT_LOCAL_STORAGE_KEY = "solana-wallet-adapter";

export interface WalletProviderProps {
  children: JSX.Element;
  wallets: Accessor<Adapter[]>;
  autoConnect?: boolean | ((adapter: Adapter) => Promise<boolean>);
  localStorageKey?: string;
  onError?: (error: WalletError, adapter?: Adapter) => void;
}

export function WalletProvider(props: WalletProviderProps) {
  const adapters = props.wallets();
  const adaptersWithStandardAdapters = useStandardWalletAdapters(adapters);

  const adaptersWithMobileWalletAdapter = createMemo(() => {
    return adaptersWithStandardAdapters;
  });

  const [walletName, setWalletName] = useLocalStorage<WalletName | null>(
    props.localStorageKey || DEFAULT_LOCAL_STORAGE_KEY,
    null
  );

  const adapter = createMemo(
    () =>
      adaptersWithStandardAdapters.find((a) => a.name === walletName()) ??
      undefined
  );

  function changeWallet(nextWalletName: WalletName | null) {
    if (walletName() == nextWalletName) return;
    if (adapter()) {
      adapter()!.disconnect();
    }
    setWalletName(nextWalletName);
  }

  createEffect(() => {
    if (!adapter()) return;

    function handleDisconnect() {
      if (isUnloadingRef()) return;

      setWalletName(null);
    }

    adapter()?.on("disconnect", handleDisconnect);

    return () => {
      adapter()?.off("disconnect", handleDisconnect);
    };
  });

  const [hasUserSelectedAWallet, setHasUserSelectedAWallet] =
    createSignal(false);

  const handleAutoConnectRequest = createMemo(() => {
    if (!props.autoConnect || !adapter()) return;
    return async () => {
      // If autoConnect is true or returns true, use the default autoConnect behavior.
      if (
        props.autoConnect === true ||
        (typeof props.autoConnect !== "boolean" &&
          props.autoConnect &&
          (await props.autoConnect(adapter()!)))
      ) {
        if (hasUserSelectedAWallet()) {
          await adapter()?.connect();
        } else {
          await adapter()?.autoConnect();
        }
      }
    };
  });

  const [isUnloadingRef, setIsUnloadingRef] = createSignal(false);
  createEffect(() => {
    function handleBeforeUnload() {
      setIsUnloadingRef(true);
    }
    /**
     * Some wallets fire disconnection events when the window unloads. Since there's no way to
     * distinguish between a disconnection event received because a user initiated it, and one
     * that was received because they've closed the window, we have to track window unload
     * events themselves. Downstream components use this information to decide whether to act
     * upon or drop wallet events and errors.
     */
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  });

  function handleConnectError() {
    changeWallet(null);
  }

  function selectWallet(walletName: WalletName | null) {
    setHasUserSelectedAWallet(true);
    changeWallet(walletName);
  }

  return (
    <WalletProviderBase
      wallets={adaptersWithMobileWalletAdapter()}
      adapter={adapter()}
      isUnloadingRef={isUnloadingRef()}
      onAutoConnectRequest={handleAutoConnectRequest()}
      onConnectError={handleConnectError}
      onError={props.onError}
      onSelectWallet={selectWallet}
    >
      {props.children}
    </WalletProviderBase>
  );
}
