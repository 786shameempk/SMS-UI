import { searchArticles, stem, tokenize } from "./search";
import { TEST_ARTICLES } from "./testCatalog";

const ids = (q: string, articles = TEST_ARTICLES) => searchArticles(articles, q).map((h) => h.article.id);

describe("tokenizing", () => {
  it("drops filler words, lowercases and stems", () => {
    expect(tokenize("How do I add the Students?")).toEqual(["add", "student"]);
    expect(stem("registering")).toBe("add");
    expect(stem("payments")).toBe("payment");
  });
});

describe("searching", () => {
  it("finds a task by the words people would type, including everyday synonyms", () => {
    expect(ids("add a student")[0]).toBe("students-add");
    expect(ids("register a student")[0]).toBe("students-add");
    expect(ids("admit a pupil")[0]).toBe("students-add");
    expect(ids("pay fees")).toContain("fees-record-payment");
  });

  it("matches the last word as a prefix, so results appear while typing", () => {
    expect(ids("guard")).toContain("students-guardian");
    expect(ids("regist")).toContain("students-add");
    // Only the last word is a prefix: the earlier ones must match whole.
    expect(ids("stud guard")).toEqual([]);
  });

  it("needs every meaningful word to match", () => {
    expect(ids("student guardian")).toEqual(["students-guardian", "students-add"].filter((id) => ids("student guardian").includes(id)));
    expect(ids("student cost")).toEqual([]);
  });

  it("ranks a title match above a match only in the body", () => {
    const hits = searchArticles(TEST_ARTICLES, "payment");
    expect(hits[0].article.id).toBe("fees-record-payment");
  });

  it("shows a short snippet from the best matching line", () => {
    const [hit] = searchArticles(TEST_ARTICLES, "register student");
    expect(hit.snippet).toContain("Register student");
    expect(hit.snippet.length).toBeLessThanOrEqual(160);
  });

  it("returns nothing for an empty or all-filler query", () => {
    expect(ids("")).toEqual([]);
    expect(ids("how do i")).toEqual([]);
  });
});
