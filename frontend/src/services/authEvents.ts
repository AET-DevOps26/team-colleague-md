// Emitted when any service receives a 401 (session expired or token invalid).
// Subscribers: AuthContext (clears user state), ModalContext (opens login modal).
type Callback = () => void;

const subscribers = new Set<Callback>();

export function subscribe(cb: Callback): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

export function emit(): void {
  subscribers.forEach((cb) => cb());
}
