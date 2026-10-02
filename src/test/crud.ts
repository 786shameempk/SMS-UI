import type { AxiosInstance } from "axios";
import { expect } from "vitest";
import { stubClient } from "./utils";

interface CrudCase<TValues> {
  client: AxiosInstance;
  /** e.g. "/api/terms". Update/delete go to `${base}/{id}`. */
  base: string;
  dto: Record<string, unknown>;
  values: TValues;
  list?: () => Promise<unknown[]>;
  create?: (values: TValues) => Promise<unknown>;
  update?: (id: string, values: TValues) => Promise<unknown>;
  remove?: (id: string) => Promise<unknown>;
  /** What create/update must send. */
  sent?: Record<string, unknown>;
  /** Fields every mapped result must have. */
  mapped?: Record<string, unknown>;
  /** A DTO with unknown enum values / nulls and the fallbacks it must map to. */
  fallback?: { dto: Record<string, unknown>; mapped: Record<string, unknown> };
}

/** Exercises a standard list/create/update/delete adapter against a stubbed client. */
export async function checkCrud<TValues>(c: CrudCase<TValues>) {
  const id = String(c.dto.id ?? "id-1");
  const calls = stubClient(c.client, {
    [`GET ${c.base}`]: c.fallback ? [c.dto, c.fallback.dto] : [c.dto],
    [`POST ${c.base}`]: c.dto,
    [`PUT ${c.base}/${id}`]: c.dto,
    [`DELETE ${c.base}/${id}`]: null,
  });

  if (c.list) {
    const rows = (await c.list()) as Record<string, unknown>[];
    if (c.mapped) expect(rows[0]).toMatchObject(c.mapped);
    if (c.fallback) expect(rows[1]).toMatchObject(c.fallback.mapped);
  }
  if (c.create) {
    const created = await c.create(c.values);
    if (c.mapped) expect(created).toMatchObject(c.mapped);
    if (c.sent) expect(calls.at(-1)?.body).toEqual(c.sent);
  }
  if (c.update) {
    const updated = await c.update(id, c.values);
    if (c.mapped) expect(updated).toMatchObject(c.mapped);
    if (c.sent) expect(calls.at(-1)?.body).toEqual(c.sent);
  }
  if (c.remove) {
    await c.remove(id);
    expect(calls.at(-1)).toMatchObject({ method: "DELETE", url: `${c.base}/${id}` });
  }
  return calls;
}
