import { RuntimeLoader } from '@rive-app/react-webgl2';

let done = false;

/**
 * Point the Rive runtime at a self-hosted .wasm file (call before the first load).
 * By default the runtime fetches its WASM from a public CDN; self-hosting keeps
 * TVs and offline builds working.
 */
export function useWasmUrl(url: string | undefined): void {
  if (url && !done) {
    RuntimeLoader.setWasmUrl(url);
    done = true;
  }
}
