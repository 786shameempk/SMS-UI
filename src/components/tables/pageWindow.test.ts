import { pageWindow } from "./pageWindow";

describe("pageWindow", () => {
  it("lists every page when there are few", () => {
    expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses the far side near either end", () => {
    expect(pageWindow(2, 50)).toEqual([1, 2, 3, 4, 5, "gap", 50]);
    expect(pageWindow(49, 50)).toEqual([1, "gap", 46, 47, 48, 49, 50]);
  });

  it("keeps the current page's neighbours in the middle", () => {
    expect(pageWindow(20, 50)).toEqual([1, "gap", 19, 20, 21, "gap", 50]);
  });
});
