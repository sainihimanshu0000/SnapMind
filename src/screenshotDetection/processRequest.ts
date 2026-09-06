type Handler = () => Promise<void>;
type PrefListener = () => void;

let handler: Handler | null = null;
const prefListeners = new Set<PrefListener>();

export function registerProcessNewScreenshots(next: Handler | null): void {
  handler = next;
}

export async function requestProcessNewScreenshots(): Promise<void> {
  if (!handler) {
    return;
  }
  await handler();
}

export function notifyQuickActionsPrefChanged(): void {
  prefListeners.forEach(listener => listener());
}

export function onQuickActionsPrefChanged(listener: PrefListener): () => void {
  prefListeners.add(listener);
  return () => {
    prefListeners.delete(listener);
  };
}
