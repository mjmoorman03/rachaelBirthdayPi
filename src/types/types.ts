export type Message = {
  text?: string;
  decoration?: "italic" | "bold" | "underline" | null;
  size?: number;
  style?: "plain" | "centered" | "bubble" | null;
  animation?: "hearts" | "fireworks" | "stars" | null;
  // my goal here is to define arbitrary code that could show
  // on the lcd. we'll see if that's feasible.
  link?: string;
};
