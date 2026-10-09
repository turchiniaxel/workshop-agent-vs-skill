import { readFileSync } from "node:fs";
import type { Book } from "./types.js";
import { addBook } from "./store.js";
import { CATALOG_PATH } from "./config.js";

export function loadCatalog(path: string = CATALOG_PATH): number {
  const raw = readFileSync(path, "utf8");
  const items = JSON.parse(raw) as Book[];
  for (const item of items) {
    addBook(item);
  }
  return items.length;
}
