import {
  Adapter,
  WalletName,
  isWalletAdapterCompatibleStandardWallet,
} from "@solana/wallet-adapter-base";
import { getWallets } from "@wallet-standard/app";
import { createEffect, createSignal } from "solid-js";
import { Wallet } from "@wallet-standard/base";
import { StandardWalletAdapter } from "@solana/wallet-standard-wallet-adapter-base";

export function useStandardWalletAdapters(adapters: Adapter[]): Adapter[] {
  const warnings = new Set<WalletName>();
  const { get, on } = getWallets();
  const [standardAdapters, setStandardAdapters] = createSignal(
    wrapWalletsWithAdapters(get() as Wallet[])
  );

  createEffect(() => {
    const listeners = [
      on("register", (...wallets) => {
        setStandardAdapters((standardAdapters) => [
          ...standardAdapters,
          ...wrapWalletsWithAdapters(wallets),
        ]);
      }),
      on("unregister", (...wallets) =>
        setStandardAdapters((standardAdapters) =>
          standardAdapters.filter((standardAdapter) =>
            wallets.some((wallet) => wallet === standardAdapter.wallet)
          )
        )
      ),
    ];
    return () => listeners.forEach((off) => off());
  });

  const prevStandardAdapters = standardAdapters();

  createEffect(() => {
    if (!prevStandardAdapters) return;

    const currentAdapters = new Set(standardAdapters());
    const removedAdapters = new Set(
      prevStandardAdapters.filter(
        (previousAdapter) => !currentAdapters.has(previousAdapter)
      )
    );
    removedAdapters.forEach((adapter) => adapter.destroy());
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  createEffect(
    () => () => standardAdapters().forEach((adapter) => adapter.destroy())
  );

  return [
    ...standardAdapters(),
    ...adapters.filter(({ name }) => {
      if (
        standardAdapters().some(
          (standardAdapter) => standardAdapter.name === name
        )
      ) {
        if (!warnings.has(name)) {
          warnings.add(name);
          console.warn(
            `${name} was registered as a Standard Wallet. The Wallet Adapter for ${name} can be removed from your app.`
          );
        }
        return false;
      }
      return true;
    }),
  ] as Adapter[];
}

function wrapWalletsWithAdapters(
  wallets: readonly Wallet[]
): StandardWalletAdapter[] {
  return wallets
    .filter((w) => isWalletAdapterCompatibleStandardWallet(w))
    .map((wallet) => new StandardWalletAdapter({ wallet: wallet as any }));
}
