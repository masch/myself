import type { IGongPlaybackStrategy } from "./types";
import { WebGongPlaybackStrategy } from "./web-strategy";

export const GongPlaybackService: IGongPlaybackStrategy =
  new WebGongPlaybackStrategy();

export * from "./types";
export { WebGongPlaybackStrategy } from "./web-strategy";
