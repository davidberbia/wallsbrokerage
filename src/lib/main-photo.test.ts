import { describe, it, expect } from "vitest";
import { pickMainPhoto } from "./main-photo";
describe("pickMainPhoto", () => {
  it("préfère une photo paysage à une verticale plus grande", () => {
    expect(pickMainPhoto([{ w: 3000, h: 4000 }, { w: 1600, h: 900 }])).toBe(1);
  });
  it("entre deux paysages, prend la meilleure résolution", () => {
    expect(pickMainPhoto([{ w: 1600, h: 900 }, { w: 4000, h: 3000 }])).toBe(1);
  });
});
