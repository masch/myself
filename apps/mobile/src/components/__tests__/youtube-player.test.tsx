import { describe, expect, it } from "bun:test";
import { extractYouTubeVideoId } from "../youtube-player";

describe("YouTubePlayer & extractYouTubeVideoId", () => {
  it("extracts ID from shortened youtu.be link with query params", () => {
    const url = "https://youtu.be/6jolZrkdsOw?si=JttIr2THqvgmWE0X";
    expect(extractYouTubeVideoId(url)).toBe("6jolZrkdsOw");
  });

  it("extracts ID from standard watch URL", () => {
    const url = "https://www.youtube.com/watch?v=6jolZrkdsOw";
    expect(extractYouTubeVideoId(url)).toBe("6jolZrkdsOw");
  });

  it("extracts ID from watch URL with extra query params", () => {
    const url =
      "https://www.youtube.com/watch?feature=shared&v=6jolZrkdsOw&t=10s";
    expect(extractYouTubeVideoId(url)).toBe("6jolZrkdsOw");
  });

  it("extracts ID from embed URL", () => {
    const url = "https://www.youtube.com/embed/6jolZrkdsOw";
    expect(extractYouTubeVideoId(url)).toBe("6jolZrkdsOw");
  });

  it("extracts ID from shorts URL", () => {
    const url = "https://youtube.com/shorts/6jolZrkdsOw";
    expect(extractYouTubeVideoId(url)).toBe("6jolZrkdsOw");
  });

  it("returns null for non-youtube URLs or invalid input", () => {
    expect(extractYouTubeVideoId("https://vimeo.com/12345678")).toBeNull();
    expect(extractYouTubeVideoId("")).toBeNull();
    expect(extractYouTubeVideoId("not-a-url")).toBeNull();
    expect(
      extractYouTubeVideoId(
        "https://example.com/?next=https://youtube.com/watch?v=6jolZrkdsOw",
      ),
    ).toBeNull();
    expect(
      extractYouTubeVideoId("https://youtube.com/watch?v=6jolZrkdsOwEXTRA"),
    ).toBeNull();
  });
});
