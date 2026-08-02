import { describe, it, expect } from "vitest";
import { parsePagination, paginate, paginatedResponse } from "../backend/pagination";

describe("parsePagination", () => {
  it("returns defaults when no query params", () => {
    const p = parsePagination({});
    expect(p.page).toBe(1);
    expect(p.limit).toBe(20);
    expect(p.order).toBe("desc");
  });

  it("parses page and limit from query", () => {
    const p = parsePagination({ page: "3", limit: "10" });
    expect(p.page).toBe(3);
    expect(p.limit).toBe(10);
  });

  it("caps limit at 100", () => {
    const p = parsePagination({ limit: "999" });
    expect(p.limit).toBe(100);
  });

  it("coerces invalid page to 1 and negative limit to 1", () => {
    const p = parsePagination({ page: "abc", limit: "-5" });
    expect(p.page).toBe(1);
    expect(p.limit).toBe(1);
  });
});

describe("paginate", () => {
  const items = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];

  it("returns first page by default", () => {
    const r = paginate(items, { page: 1, limit: 5 });
    expect(r.data.length).toBe(5);
    expect(r.pagination.total).toBe(11);
    expect(r.pagination.totalPages).toBe(3);
    expect(r.pagination.hasNext).toBe(true);
    expect(r.pagination.hasPrev).toBe(false);
  });

  it("returns second page", () => {
    const r = paginate(items, { page: 2, limit: 5 });
    expect(r.data.length).toBe(5);
    expect(r.pagination.hasNext).toBe(true);
    expect(r.pagination.hasPrev).toBe(true);
  });

  it("returns last (partial) page", () => {
    const r = paginate(items, { page: 3, limit: 5 });
    expect(r.data.length).toBe(1);
    expect(r.pagination.hasNext).toBe(false);
  });

  it("supports search filtering", () => {
    const r = paginate(
      [{ name: "Alice" }, { name: "Bob" }, { name: "Alison" }],
      { page: 1, limit: 10, search: "ali" },
      { searchFn: (item, q) => item.name.toLowerCase().includes(q) },
    );
    expect(r.data.length).toBe(2);
    expect(r.data[0].name).toBe("Alice");
    expect(r.data[1].name).toBe("Alison");
  });

  it("supports custom sorting", () => {
    const r = paginate(
      [{ v: 3 }, { v: 1 }, { v: 2 }],
      { page: 1, limit: 10, sort: "v", order: "asc" },
      { sortFn: (a, b) => a.v - b.v },
    );
    expect(r.data.map((x) => x.v)).toEqual([1, 2, 3]);
  });
});

describe("paginatedResponse", () => {
  it("uses parsed query and returns PaginatedResult (desc default)", () => {
    const r = paginatedResponse([1, 2, 3], { page: "1", limit: "2" });
    expect(r.data).toEqual([3, 2]);
    expect(r.pagination.total).toBe(3);
  });
});
