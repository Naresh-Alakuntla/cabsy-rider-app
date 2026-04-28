export interface PushBannerMessage {
  id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  receivedAt: number;
}

type Listener = (msg: PushBannerMessage) => void;

const listeners = new Set<Listener>();

export function publishPushMessage(input: {
  title: string;
  body: string;
  data?: Record<string, string>;
}): void {
  const msg: PushBannerMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    body: input.body,
    data: input.data,
    receivedAt: Date.now(),
  };
  for (const l of listeners) l(msg);
}

export function subscribePushBanner(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
