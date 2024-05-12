import { Signal } from "solid-js";
import { createEffect, createSignal } from "solid-js";

export function useLocalStorage<T>(key: string, defaultState: T): Signal<T> {
  const [state, setState] = createSignal(defaultState);

  createEffect(() => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        setState(() => JSON.parse(value) as T);
      }
    } catch (error: any) {
      if (typeof window !== "undefined") {
        console.error(error);
      }
    }
    setState(() => defaultState);
  });

  const s = state() as any[];
  const value = s && s.length > 0 ? s[0] : null;

  const [isFirstRenderRef, setIsFirstRenderRef] = createSignal(true);

  createEffect(() => {
    if (isFirstRenderRef()) {
      setIsFirstRenderRef(false);
      return;
    }
    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error: any) {
      if (typeof window !== "undefined") {
        console.error(error);
      }
    }
  });

  return [state, setState];
}
