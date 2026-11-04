import { describe, it, expect } from "vitest";
import { classify, median, regionSeries, VIIRS_START } from "./fire-data";

describe("fire-data rules", () => {
  it("median handles even and odd lengths", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it("classifies deviation bands", () => {
    expect(classify(-30)).toBe("below");
    expect(classify(10)).toBe("normal");
    expect(classify(50)).toBe("elevated");
    expect(classify(120)).toBe("extreme");
  });
  it("VIIRS absent before its launch year", () => {
    const s = regionSeries("amazon");
    expect(s.find((r) => r.year === VIIRS_START - 1)!.viirs).toBeNull();
    expect(s.find((r) => r.year === VIIRS_START)!.viirs).not.toBeNull();
  });
});
