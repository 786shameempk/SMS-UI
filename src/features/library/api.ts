import { mockDelay } from "@/utils/mockDelay";
import {
  DEFAULT_TENANT_ID,
  defaultBranchIdForTenant,
  getCurrentBranchId,
  getCurrentTenantId,
  migrateLegacyRecordsToDefaultBranch,
  migrateLegacyRecordsToDefaultTenant,
  scopedToCurrentTenant,
  scopedToCurrentTenantAndBranch,
} from "@/utils/tenant";
import { listStudents } from "@/features/students/api";
import { listStaff } from "@/features/staff/api";
import { FINE_PER_DAY } from "./constants";
import { buildSeedLibraryData, SEED_AUTHORS, SEED_BOOKS, SEED_CATEGORIES, SEED_PUBLISHERS } from "./mock";
import type {
  Author,
  AuthorFormValues,
  Book,
  BookCategory,
  BookCategoryFormValues,
  BookFormValues,
  BookLoan,
  BookReservation,
  IssueBookFormValues,
  LibraryMember,
  LibraryMemberFormValues,
  Publisher,
  PublisherFormValues,
  ReserveBookFormValues,
} from "./types";

const AUTHORS_KEY = "sms-mock-library-authors";
const PUBLISHERS_KEY = "sms-mock-library-publishers";
const CATEGORIES_KEY = "sms-mock-library-categories";
const BOOKS_KEY = "sms-mock-library-books";
const MEMBERS_KEY = "sms-mock-library-members";
const LOANS_KEY = "sms-mock-library-loans";
const RESERVATIONS_KEY = "sms-mock-library-reservations";
const SEEDED_KEY = "sms-mock-library-seeded";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to fallback
  }
  return fallback;
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort only
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

let authors = migrateLegacyRecordsToDefaultTenant(loadJson<Author[]>(AUTHORS_KEY, []));
let publishers = migrateLegacyRecordsToDefaultTenant(loadJson<Publisher[]>(PUBLISHERS_KEY, []));
let categories = migrateLegacyRecordsToDefaultTenant(loadJson<BookCategory[]>(CATEGORIES_KEY, []));
let books = migrateLegacyRecordsToDefaultBranch(migrateLegacyRecordsToDefaultTenant(loadJson<Book[]>(BOOKS_KEY, [])));
let members = migrateLegacyRecordsToDefaultBranch(migrateLegacyRecordsToDefaultTenant(loadJson<LibraryMember[]>(MEMBERS_KEY, [])));
let loans = migrateLegacyRecordsToDefaultBranch(migrateLegacyRecordsToDefaultTenant(loadJson<BookLoan[]>(LOANS_KEY, [])));
let reservations = migrateLegacyRecordsToDefaultBranch(migrateLegacyRecordsToDefaultTenant(loadJson<BookReservation[]>(RESERVATIONS_KEY, [])));

const persistAuthors = () => saveJson(AUTHORS_KEY, authors);
const persistPublishers = () => saveJson(PUBLISHERS_KEY, publishers);
const persistCategories = () => saveJson(CATEGORIES_KEY, categories);
const persistBooks = () => saveJson(BOOKS_KEY, books);
const persistMembers = () => saveJson(MEMBERS_KEY, members);
const persistLoans = () => saveJson(LOANS_KEY, loans);
const persistReservations = () => saveJson(RESERVATIONS_KEY, reservations);

function requireEntity<T extends { id: string; tenantId: string }>(list: T[], id: string, label: string): T {
  const found = list.find((item) => item.id === id && item.tenantId === getCurrentTenantId());
  if (!found) throw new Error(`${label} not found`);
  return found;
}

function requireBranchEntity<T extends { id: string; tenantId: string; branchId: string }>(list: T[], id: string, label: string): T {
  const found = list.find((item) => item.id === id && item.tenantId === getCurrentTenantId() && item.branchId === getCurrentBranchId());
  if (!found) throw new Error(`${label} not found`);
  return found;
}

async function performSeed(): Promise<void> {
  if (loadJson(SEEDED_KEY, false)) return;

  if (authors.length === 0) {
    authors = SEED_AUTHORS.map((a) => ({ ...a, tenantId: DEFAULT_TENANT_ID }));
    persistAuthors();
  }
  if (publishers.length === 0) {
    publishers = SEED_PUBLISHERS.map((p) => ({ ...p, tenantId: DEFAULT_TENANT_ID }));
    persistPublishers();
  }
  if (categories.length === 0) {
    categories = SEED_CATEGORIES.map((c) => ({ ...c, tenantId: DEFAULT_TENANT_ID }));
    persistCategories();
  }
  const defaultBranchId = defaultBranchIdForTenant(DEFAULT_TENANT_ID);

  if (books.length === 0) {
    books = SEED_BOOKS.map((b) => ({ ...b, tenantId: DEFAULT_TENANT_ID, branchId: defaultBranchId }));
    persistBooks();
  }
  if (members.length === 0) {
    const [students, staff] = await Promise.all([listStudents(), listStaff()]);
    const seeded = buildSeedLibraryData(students, staff, books);
    members = seeded.members.map((m) => ({ ...m, tenantId: DEFAULT_TENANT_ID, branchId: defaultBranchId }));
    loans = seeded.loans.map((l) => ({ ...l, tenantId: DEFAULT_TENANT_ID, branchId: defaultBranchId }));
    reservations = seeded.reservations.map((r) => ({ ...r, tenantId: DEFAULT_TENANT_ID, branchId: defaultBranchId }));
    persistMembers();
    persistLoans();
    persistReservations();
  }

  saveJson(SEEDED_KEY, true);
}

const seedPromise: Promise<void> = performSeed().catch((err) => {
  console.error("Failed to seed library mock data", err);
});

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function deriveLoan(loan: BookLoan): BookLoan {
  if (loan.status !== "issued") return loan;
  const daysLate = daysBetween(new Date(loan.dueDate), new Date());
  if (daysLate <= 0) return loan;
  return { ...loan, status: "overdue" };
}

function deriveAndPersistAllLoans(): BookLoan[] {
  let changed = false;
  const next = loans.map((l) => {
    const derived = deriveLoan(l);
    if (derived !== l) changed = true;
    return derived;
  });
  if (changed) {
    loans = next;
    persistLoans();
  }
  return loans;
}

// ── Authors ──────────────────────────────────────────────────────────────

export async function listAuthors(): Promise<Author[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenant(authors), 300);
}

export async function createAuthor(values: AuthorFormValues): Promise<Author> {
  await seedPromise;
  const author: Author = { id: genId("auth"), tenantId: getCurrentTenantId(), ...values };
  authors = [author, ...authors];
  persistAuthors();
  return mockDelay(author, 350);
}

export async function updateAuthor(id: string, values: AuthorFormValues): Promise<Author> {
  await seedPromise;
  requireEntity(authors, id, "Author");
  authors = authors.map((a) => (a.id === id ? { ...a, ...values } : a));
  persistAuthors();
  return mockDelay(requireEntity(authors, id, "Author"), 350);
}

export async function deleteAuthor(id: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  requireEntity(authors, id, "Author");
  if (books.some((b) => b.tenantId === tenantId && b.authorId === id)) {
    await mockDelay(null, 300);
    throw new Error("Cannot delete an author who still has books in the catalog");
  }
  authors = authors.filter((a) => !(a.id === id && a.tenantId === tenantId));
  persistAuthors();
  return mockDelay(undefined, 300);
}

// ── Publishers ───────────────────────────────────────────────────────────

export async function listPublishers(): Promise<Publisher[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenant(publishers), 300);
}

export async function createPublisher(values: PublisherFormValues): Promise<Publisher> {
  await seedPromise;
  const publisher: Publisher = { id: genId("pub"), tenantId: getCurrentTenantId(), ...values };
  publishers = [publisher, ...publishers];
  persistPublishers();
  return mockDelay(publisher, 350);
}

export async function updatePublisher(id: string, values: PublisherFormValues): Promise<Publisher> {
  await seedPromise;
  requireEntity(publishers, id, "Publisher");
  publishers = publishers.map((p) => (p.id === id ? { ...p, ...values } : p));
  persistPublishers();
  return mockDelay(requireEntity(publishers, id, "Publisher"), 350);
}

export async function deletePublisher(id: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  requireEntity(publishers, id, "Publisher");
  if (books.some((b) => b.tenantId === tenantId && b.publisherId === id)) {
    await mockDelay(null, 300);
    throw new Error("Cannot delete a publisher who still has books in the catalog");
  }
  publishers = publishers.filter((p) => !(p.id === id && p.tenantId === tenantId));
  persistPublishers();
  return mockDelay(undefined, 300);
}

// ── Categories ───────────────────────────────────────────────────────────

export async function listCategories(): Promise<BookCategory[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenant(categories), 300);
}

export async function createCategory(values: BookCategoryFormValues): Promise<BookCategory> {
  await seedPromise;
  const category: BookCategory = { id: genId("cat"), tenantId: getCurrentTenantId(), ...values };
  categories = [category, ...categories];
  persistCategories();
  return mockDelay(category, 350);
}

export async function updateCategory(id: string, values: BookCategoryFormValues): Promise<BookCategory> {
  await seedPromise;
  requireEntity(categories, id, "Category");
  categories = categories.map((c) => (c.id === id ? { ...c, ...values } : c));
  persistCategories();
  return mockDelay(requireEntity(categories, id, "Category"), 350);
}

export async function deleteCategory(id: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  requireEntity(categories, id, "Category");
  if (books.some((b) => b.tenantId === tenantId && b.categoryId === id)) {
    await mockDelay(null, 300);
    throw new Error("Cannot delete a category that still has books in the catalog");
  }
  categories = categories.filter((c) => !(c.id === id && c.tenantId === tenantId));
  persistCategories();
  return mockDelay(undefined, 300);
}

// ── Books ────────────────────────────────────────────────────────────────

export async function listBooks(): Promise<Book[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenantAndBranch(books), 350);
}

export async function createBook(values: BookFormValues): Promise<Book> {
  await seedPromise;
  const book: Book = {
    id: genId("bk"),
    tenantId: getCurrentTenantId(),
    branchId: getCurrentBranchId(),
    ...values,
    availableCopies: values.totalCopies,
  };
  books = [book, ...books];
  persistBooks();
  return mockDelay(book, 400);
}

export async function updateBook(id: string, values: BookFormValues): Promise<Book> {
  await seedPromise;
  const existing = requireBranchEntity(books, id, "Book");
  const issuedCount = existing.totalCopies - existing.availableCopies;
  const availableCopies = Math.max(0, values.totalCopies - issuedCount);
  const updated: Book = { ...existing, ...values, availableCopies };
  books = books.map((b) => (b.id === id ? updated : b));
  persistBooks();
  return mockDelay(updated, 400);
}

export async function deleteBook(id: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  requireBranchEntity(books, id, "Book");
  if (loans.some((l) => l.tenantId === tenantId && l.branchId === branchId && l.bookId === id && l.status !== "returned")) {
    await mockDelay(null, 300);
    throw new Error("Cannot delete a book that has copies currently on loan");
  }
  books = books.filter((b) => !(b.id === id && b.tenantId === tenantId && b.branchId === branchId));
  reservations = reservations.filter((r) => !(r.tenantId === tenantId && r.branchId === branchId && r.bookId === id));
  persistBooks();
  persistReservations();
  return mockDelay(undefined, 300);
}

// ── Members ──────────────────────────────────────────────────────────────

function nextMembershipId(personType: LibraryMemberFormValues["personType"]): string {
  const prefix = personType === "student" ? "LM-S-" : "LM-T-";
  const max = scopedToCurrentTenant(members)
    .filter((m) => m.membershipId.startsWith(prefix))
    .reduce((acc, m) => Math.max(acc, Number(m.membershipId.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export async function listMembers(): Promise<LibraryMember[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenantAndBranch(members), 350);
}

export async function createMember(values: LibraryMemberFormValues): Promise<LibraryMember> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  if (
    members.some(
      (m) => m.tenantId === tenantId && m.branchId === branchId && m.personType === values.personType && m.personId === values.personId,
    )
  ) {
    await mockDelay(null, 300);
    throw new Error("This person is already a library member");
  }
  const member: LibraryMember = {
    id: genId("libmem"),
    tenantId,
    branchId,
    ...values,
    membershipId: nextMembershipId(values.personType),
    joinedOn: new Date().toISOString(),
  };
  members = [member, ...members];
  persistMembers();
  return mockDelay(member, 400);
}

export async function updateMember(id: string, values: LibraryMemberFormValues): Promise<LibraryMember> {
  await seedPromise;
  requireBranchEntity(members, id, "Member");
  members = members.map((m) => (m.id === id ? { ...m, ...values } : m));
  persistMembers();
  return mockDelay(requireBranchEntity(members, id, "Member"), 350);
}

export async function deleteMember(id: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  requireBranchEntity(members, id, "Member");
  if (loans.some((l) => l.tenantId === tenantId && l.branchId === branchId && l.memberId === id && l.status !== "returned")) {
    await mockDelay(null, 300);
    throw new Error("Cannot remove a member with books currently on loan");
  }
  members = members.filter((m) => !(m.id === id && m.tenantId === tenantId && m.branchId === branchId));
  reservations = reservations.filter((r) => !(r.tenantId === tenantId && r.branchId === branchId && r.memberId === id));
  persistMembers();
  persistReservations();
  return mockDelay(undefined, 300);
}

// ── Issue / return / fines ───────────────────────────────────────────────

export async function listLoans(): Promise<BookLoan[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenantAndBranch(deriveAndPersistAllLoans()), 350);
}

export async function issueBook(values: IssueBookFormValues): Promise<BookLoan> {
  await seedPromise;
  const book = requireBranchEntity(books, values.bookId, "Book");
  if (book.availableCopies <= 0) {
    await mockDelay(null, 300);
    throw new Error("No copies of this book are currently available to issue");
  }
  const member = requireBranchEntity(members, values.memberId, "Member");
  if (member.status !== "active") {
    await mockDelay(null, 300);
    throw new Error("This member is suspended and cannot borrow books");
  }

  books = books.map((b) => (b.id === book.id ? { ...b, availableCopies: b.availableCopies - 1 } : b));
  persistBooks();

  const loan: BookLoan = {
    id: genId("loan"),
    tenantId: book.tenantId,
    branchId: book.branchId,
    bookId: values.bookId,
    memberId: values.memberId,
    issuedOn: new Date().toISOString(),
    dueDate: values.dueDate,
    status: "issued",
  };
  loans = [loan, ...loans];
  persistLoans();
  return mockDelay(loan, 450);
}

export async function returnBook(loanId: string): Promise<BookLoan> {
  await seedPromise;
  const loan = requireBranchEntity(deriveAndPersistAllLoans(), loanId, "Loan");
  if (loan.status === "returned") {
    await mockDelay(null, 300);
    throw new Error("This loan has already been returned");
  }

  const book = books.find((b) => b.id === loan.bookId && b.tenantId === loan.tenantId && b.branchId === loan.branchId);
  if (book) {
    books = books.map((b) => (b.id === book.id ? { ...b, availableCopies: Math.min(b.totalCopies, b.availableCopies + 1) } : b));
    persistBooks();
  }

  const now = new Date();
  const daysLate = daysBetween(new Date(loan.dueDate), now);
  const fineAmount = daysLate > 0 ? daysLate * FINE_PER_DAY : 0;

  const updated: BookLoan = {
    ...loan,
    returnedOn: now.toISOString(),
    status: "returned",
    fineAmount: fineAmount > 0 ? fineAmount : undefined,
    finePaid: fineAmount > 0 ? false : undefined,
  };
  loans = loans.map((l) => (l.id === loanId ? updated : l));
  persistLoans();
  return mockDelay(updated, 450);
}

export async function markFinePaid(loanId: string): Promise<BookLoan> {
  await seedPromise;
  const loan = requireBranchEntity(loans, loanId, "Loan");
  if (!loan.fineAmount) {
    await mockDelay(null, 300);
    throw new Error("This loan has no outstanding fine");
  }
  const updated: BookLoan = { ...loan, finePaid: true, finePaidOn: new Date().toISOString() };
  loans = loans.map((l) => (l.id === loanId ? updated : l));
  persistLoans();
  return mockDelay(updated, 350);
}

// ── Reservations ─────────────────────────────────────────────────────────

export async function listReservations(): Promise<BookReservation[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenantAndBranch(reservations), 300);
}

export async function reserveBook(values: ReserveBookFormValues): Promise<BookReservation> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  const book = requireBranchEntity(books, values.bookId, "Book");
  if (book.availableCopies > 0) {
    await mockDelay(null, 300);
    throw new Error("Copies are available — issue the book directly instead of reserving it");
  }
  const member = requireBranchEntity(members, values.memberId, "Member");
  if (member.status !== "active") {
    await mockDelay(null, 300);
    throw new Error("This member is suspended and cannot place reservations");
  }
  if (
    reservations.some(
      (r) =>
        r.tenantId === tenantId &&
        r.branchId === branchId &&
        r.bookId === values.bookId &&
        r.memberId === values.memberId &&
        r.status === "pending",
    )
  ) {
    await mockDelay(null, 300);
    throw new Error("This member already has a pending reservation for this book");
  }

  const reservation: BookReservation = {
    id: genId("resv"),
    tenantId,
    branchId,
    bookId: values.bookId,
    memberId: values.memberId,
    reservedOn: new Date().toISOString(),
    status: "pending",
  };
  reservations = [reservation, ...reservations];
  persistReservations();
  return mockDelay(reservation, 400);
}

export async function cancelReservation(id: string): Promise<BookReservation> {
  await seedPromise;
  const reservation = requireBranchEntity(reservations, id, "Reservation");
  const updated: BookReservation = { ...reservation, status: "cancelled" };
  reservations = reservations.map((r) => (r.id === id ? updated : r));
  persistReservations();
  return mockDelay(updated, 300);
}

export async function fulfillReservation(id: string, dueDate: string): Promise<{ reservation: BookReservation; loan: BookLoan }> {
  await seedPromise;
  const reservation = requireBranchEntity(reservations, id, "Reservation");
  if (reservation.status !== "pending") {
    await mockDelay(null, 300);
    throw new Error("Only pending reservations can be fulfilled");
  }
  const book = requireBranchEntity(books, reservation.bookId, "Book");
  if (book.availableCopies <= 0) {
    await mockDelay(null, 300);
    throw new Error("No copies are available yet — wait for a copy to be returned first");
  }

  const loan = await issueBook({ bookId: reservation.bookId, memberId: reservation.memberId, dueDate });

  const updatedReservation: BookReservation = { ...reservation, status: "fulfilled" };
  reservations = reservations.map((r) => (r.id === id ? updatedReservation : r));
  persistReservations();

  return mockDelay({ reservation: updatedReservation, loan }, 200);
}
