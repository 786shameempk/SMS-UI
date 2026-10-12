import { useRef } from "react";
import BulkImportDialog, { type ImportColumn, type ParsedRow } from "@/components/dialogs/BulkImportDialog";
import { createAuthor, createBook, createCategory, createPublisher, listAuthors, listCategories, listPublishers } from "../api";

const COLUMNS: ImportColumn[] = [
  { key: "title", label: "Title", required: true, example: "Wings of Fire" },
  { key: "isbn", label: "ISBN", required: true, example: "9788173711466" },
  { key: "author", label: "Author", required: true, example: "A. P. J. Abdul Kalam" },
  { key: "publisher", label: "Publisher", required: true, example: "Universities Press" },
  { key: "category", label: "Category", required: true, example: "Biography" },
  { key: "totalCopies", label: "Copies", required: true, example: "3" },
  { key: "shelfLocation", label: "Shelf location", example: "B-2" },
  { key: "coverNote", label: "Note", example: "" },
];

interface BookRow {
  title: string;
  isbn: string;
  author: string;
  publisher: string;
  category: string;
  totalCopies: number;
  shelfLocation?: string;
  coverNote?: string;
}

function parseBookRow(r: Record<string, string>): ParsedRow<BookRow> {
  const missing = COLUMNS.filter((c) => c.required && !r[c.key]).map((c) => c.label);
  if (missing.length) return { ok: false, error: `Missing ${missing.join(", ")}` };
  const totalCopies = Number(r.totalCopies);
  if (!Number.isInteger(totalCopies) || totalCopies < 1) return { ok: false, error: `Copies "${r.totalCopies}" must be a whole number of 1 or more` };
  return {
    ok: true,
    value: {
      title: r.title,
      isbn: r.isbn,
      author: r.author,
      publisher: r.publisher,
      category: r.category,
      totalCopies,
      shelfLocation: r.shelfLocation || undefined,
      coverNote: r.coverNote || undefined,
    },
  };
}

type NameIndex = Map<string, string>;
const keyOf = (name: string) => name.trim().toLowerCase();

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinished: () => void;
}

/** Authors, publishers and categories are matched by name; any that do not exist yet are created on the way. */
export default function BulkBooksImportDialog({ open, onOpenChange, onFinished }: Props) {
  const indexes = useRef<{ author: NameIndex; publisher: NameIndex; category: NameIndex } | null>(null);
  // Rows import one at a time, so a name seen for the first time is created once and reused by later rows.
  const pending = useRef(new Map<string, Promise<string>>());

  const resolve = async (kind: "author" | "publisher" | "category", name: string): Promise<string> => {
    if (!indexes.current) {
      const [authors, publishers, categories] = await Promise.all([listAuthors(), listPublishers(), listCategories()]);
      const index = (items: { id: string; name: string }[]) => new Map(items.map((i) => [keyOf(i.name), i.id] as const));
      indexes.current = { author: index(authors), publisher: index(publishers), category: index(categories) };
    }
    const map = indexes.current[kind];
    const existing = map.get(keyOf(name));
    if (existing) return existing;
    const cacheKey = `${kind}:${keyOf(name)}`;
    let creating = pending.current.get(cacheKey);
    if (!creating) {
      creating = (kind === "author" ? createAuthor({ name }) : kind === "publisher" ? createPublisher({ name }) : createCategory({ name })).then((c) => c.id);
      pending.current.set(cacheKey, creating);
    }
    try {
      const id = await creating;
      map.set(keyOf(name), id);
      return id;
    } finally {
      pending.current.delete(cacheKey);
    }
  };

  const importRow = async (b: BookRow) => {
    const [authorId, publisherId, categoryId] = await Promise.all([resolve("author", b.author), resolve("publisher", b.publisher), resolve("category", b.category)]);
    await createBook({ title: b.title, isbn: b.isbn, authorId, publisherId, categoryId, totalCopies: b.totalCopies, shelfLocation: b.shelfLocation, coverNote: b.coverNote });
  };

  return (
    <BulkImportDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) indexes.current = null;
        onOpenChange(next);
      }}
      title="Import books"
      description="Add many books from a CSV file. Authors, publishers and categories are matched by name and created if they are new."
      templateFileName="books-import-template"
      columns={COLUMNS}
      parseRow={parseBookRow}
      importRow={importRow}
      onFinished={onFinished}
    />
  );
}
