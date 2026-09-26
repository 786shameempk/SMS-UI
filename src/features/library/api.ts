import { campusHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type {
  Author,
  AuthorFormValues,
  Book,
  BookCategory,
  BookCategoryFormValues,
  BookFormValues,
  BookLoan,
  BookLoanStatus,
  BookReservation,
  IssueBookFormValues,
  LibraryMember,
  LibraryMemberFormValues,
  LibraryMemberStatus,
  LibraryPersonType,
  Publisher,
  PublisherFormValues,
  ReservationStatus,
  ReserveBookFormValues,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// CampusService's enums serialize as PascalCase (C# convention); SMS UI's types use
// lowercase unions - see docs/MICROSERVICES_PLAN.md's enum-translation note.

const PERSON_TYPE_TO_API: Record<LibraryPersonType, string> = { student: "Student", staff: "Staff" };
const PERSON_TYPE_FROM_API: Record<string, LibraryPersonType> = { Student: "student", Staff: "staff" };

const MEMBER_STATUS_TO_API: Record<LibraryMemberStatus, string> = { active: "Active", suspended: "Suspended" };
const MEMBER_STATUS_FROM_API: Record<string, LibraryMemberStatus> = { Active: "active", Suspended: "suspended" };

const LOAN_STATUS_FROM_API: Record<string, BookLoanStatus> = { Issued: "issued", Returned: "returned", Overdue: "overdue" };

const RESERVATION_STATUS_FROM_API: Record<string, ReservationStatus> = {
  Pending: "pending",
  Fulfilled: "fulfilled",
  Cancelled: "cancelled",
};

// ── API response shapes (CampusService DTOs) ────────────────────────────────

interface ApiAuthor {
  id: string;
  tenantId: string;
  name: string;
  bio: string | null;
}

interface ApiPublisher {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
}

interface ApiBookCategory {
  id: string;
  tenantId: string;
  name: string;
}

interface ApiBook {
  id: string;
  tenantId: string;
  branchId: string;
  title: string;
  isbn: string;
  authorId: string;
  publisherId: string;
  categoryId: string;
  totalCopies: number;
  availableCopies: number;
  shelfLocation: string | null;
  coverNote: string | null;
}

interface ApiLibraryMember {
  id: string;
  tenantId: string;
  branchId: string;
  personType: string;
  personId: string;
  membershipId: string;
  joinedOn: string;
  status: string;
}

interface ApiBookLoan {
  id: string;
  tenantId: string;
  branchId: string;
  bookId: string;
  memberId: string;
  issuedOn: string;
  dueDate: string;
  returnedOn: string | null;
  status: string;
  fineAmount: number | null;
  finePaid: boolean | null;
  finePaidOn: string | null;
}

interface ApiBookReservation {
  id: string;
  tenantId: string;
  branchId: string;
  bookId: string;
  memberId: string;
  reservedOn: string;
  status: string;
}

interface ApiFulfillReservationResult {
  reservation: ApiBookReservation;
  loan: ApiBookLoan;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapAuthor(dto: ApiAuthor): Author {
  return { id: dto.id, tenantId: dto.tenantId, name: dto.name, bio: dto.bio ?? undefined };
}

function mapPublisher(dto: ApiPublisher): Publisher {
  return { id: dto.id, tenantId: dto.tenantId, name: dto.name, address: dto.address ?? undefined };
}

function mapCategory(dto: ApiBookCategory): BookCategory {
  return { id: dto.id, tenantId: dto.tenantId, name: dto.name };
}

function mapBook(dto: ApiBook): Book {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    title: dto.title,
    isbn: dto.isbn,
    authorId: dto.authorId,
    publisherId: dto.publisherId,
    categoryId: dto.categoryId,
    totalCopies: dto.totalCopies,
    availableCopies: dto.availableCopies,
    shelfLocation: dto.shelfLocation ?? undefined,
    coverNote: dto.coverNote ?? undefined,
  };
}

function mapMember(dto: ApiLibraryMember): LibraryMember {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    personType: PERSON_TYPE_FROM_API[dto.personType] ?? "student",
    personId: dto.personId,
    membershipId: dto.membershipId,
    joinedOn: dto.joinedOn,
    status: MEMBER_STATUS_FROM_API[dto.status] ?? "active",
  };
}

function mapLoan(dto: ApiBookLoan): BookLoan {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    bookId: dto.bookId,
    memberId: dto.memberId,
    issuedOn: dto.issuedOn,
    dueDate: dto.dueDate,
    returnedOn: dto.returnedOn ?? undefined,
    status: LOAN_STATUS_FROM_API[dto.status] ?? "issued",
    fineAmount: dto.fineAmount ?? undefined,
    finePaid: dto.finePaid ?? undefined,
    finePaidOn: dto.finePaidOn ?? undefined,
  };
}

function mapReservation(dto: ApiBookReservation): BookReservation {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    bookId: dto.bookId,
    memberId: dto.memberId,
    reservedOn: dto.reservedOn,
    status: RESERVATION_STATUS_FROM_API[dto.status] ?? "pending",
  };
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

// ── Authors ──────────────────────────────────────────────────────────────

export async function listAuthors(): Promise<Author[]> {
  const authors = await unwrap(campusHttpClient.get<ApiAuthor[]>("/api/authors"));
  return authors.map(mapAuthor);
}

export async function createAuthor(values: AuthorFormValues): Promise<Author> {
  const dto = await unwrap(
    campusHttpClient.post<ApiAuthor>("/api/authors", { name: values.name, bio: values.bio?.trim() || null }),
  );
  return mapAuthor(dto);
}

export async function updateAuthor(id: string, values: AuthorFormValues): Promise<Author> {
  const dto = await unwrap(
    campusHttpClient.put<ApiAuthor>(`/api/authors/${id}`, { name: values.name, bio: values.bio?.trim() || null }),
  );
  return mapAuthor(dto);
}

export async function deleteAuthor(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/authors/${id}`));
}

// ── Publishers ───────────────────────────────────────────────────────────

export async function listPublishers(): Promise<Publisher[]> {
  const publishers = await unwrap(campusHttpClient.get<ApiPublisher[]>("/api/publishers"));
  return publishers.map(mapPublisher);
}

export async function createPublisher(values: PublisherFormValues): Promise<Publisher> {
  const dto = await unwrap(
    campusHttpClient.post<ApiPublisher>("/api/publishers", { name: values.name, address: values.address?.trim() || null }),
  );
  return mapPublisher(dto);
}

export async function updatePublisher(id: string, values: PublisherFormValues): Promise<Publisher> {
  const dto = await unwrap(
    campusHttpClient.put<ApiPublisher>(`/api/publishers/${id}`, { name: values.name, address: values.address?.trim() || null }),
  );
  return mapPublisher(dto);
}

export async function deletePublisher(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/publishers/${id}`));
}

// ── Categories ───────────────────────────────────────────────────────────

export async function listCategories(): Promise<BookCategory[]> {
  const categories = await unwrap(campusHttpClient.get<ApiBookCategory[]>("/api/bookcategories"));
  return categories.map(mapCategory);
}

export async function createCategory(values: BookCategoryFormValues): Promise<BookCategory> {
  const dto = await unwrap(campusHttpClient.post<ApiBookCategory>("/api/bookcategories", { name: values.name }));
  return mapCategory(dto);
}

export async function updateCategory(id: string, values: BookCategoryFormValues): Promise<BookCategory> {
  const dto = await unwrap(campusHttpClient.put<ApiBookCategory>(`/api/bookcategories/${id}`, { name: values.name }));
  return mapCategory(dto);
}

export async function deleteCategory(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/bookcategories/${id}`));
}

// ── Books ────────────────────────────────────────────────────────────────

export async function listBooks(): Promise<Book[]> {
  const books = await unwrap(campusHttpClient.get<ApiBook[]>("/api/books"));
  return books.map(mapBook);
}

export async function createBook(values: BookFormValues): Promise<Book> {
  const dto = await unwrap(
    campusHttpClient.post<ApiBook>("/api/books", {
      title: values.title,
      isbn: values.isbn,
      authorId: values.authorId,
      publisherId: values.publisherId,
      categoryId: values.categoryId,
      totalCopies: values.totalCopies,
      shelfLocation: values.shelfLocation?.trim() || null,
      coverNote: values.coverNote?.trim() || null,
    }),
  );
  return mapBook(dto);
}

export async function updateBook(id: string, values: BookFormValues): Promise<Book> {
  const dto = await unwrap(
    campusHttpClient.put<ApiBook>(`/api/books/${id}`, {
      title: values.title,
      isbn: values.isbn,
      authorId: values.authorId,
      publisherId: values.publisherId,
      categoryId: values.categoryId,
      totalCopies: values.totalCopies,
      shelfLocation: values.shelfLocation?.trim() || null,
      coverNote: values.coverNote?.trim() || null,
    }),
  );
  return mapBook(dto);
}

export async function deleteBook(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/books/${id}`));
}

// ── Members ──────────────────────────────────────────────────────────────

export async function listMembers(): Promise<LibraryMember[]> {
  const members = await unwrap(campusHttpClient.get<ApiLibraryMember[]>("/api/librarymembers"));
  return members.map(mapMember);
}

export async function createMember(values: LibraryMemberFormValues): Promise<LibraryMember> {
  const dto = await unwrap(
    campusHttpClient.post<ApiLibraryMember>("/api/librarymembers", {
      personType: PERSON_TYPE_TO_API[values.personType],
      personId: values.personId,
      status: MEMBER_STATUS_TO_API[values.status],
    }),
  );
  return mapMember(dto);
}

export async function updateMember(id: string, values: LibraryMemberFormValues): Promise<LibraryMember> {
  const dto = await unwrap(
    campusHttpClient.put<ApiLibraryMember>(`/api/librarymembers/${id}`, {
      personType: PERSON_TYPE_TO_API[values.personType],
      personId: values.personId,
      status: MEMBER_STATUS_TO_API[values.status],
    }),
  );
  return mapMember(dto);
}

export async function deleteMember(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/librarymembers/${id}`));
}

// ── Issue / return / fines ───────────────────────────────────────────────

export async function listLoans(): Promise<BookLoan[]> {
  const loans = await unwrap(campusHttpClient.get<ApiBookLoan[]>("/api/bookloans"));
  return loans.map(mapLoan);
}

export async function issueBook(values: IssueBookFormValues): Promise<BookLoan> {
  const dto = await unwrap(
    campusHttpClient.post<ApiBookLoan>("/api/bookloans/issue", {
      bookId: values.bookId,
      memberId: values.memberId,
      dueDate: values.dueDate,
    }),
  );
  return mapLoan(dto);
}

export async function returnBook(loanId: string): Promise<BookLoan> {
  const dto = await unwrap(campusHttpClient.post<ApiBookLoan>(`/api/bookloans/${loanId}/return`));
  return mapLoan(dto);
}

export async function markFinePaid(loanId: string): Promise<BookLoan> {
  const dto = await unwrap(campusHttpClient.post<ApiBookLoan>(`/api/bookloans/${loanId}/mark-fine-paid`));
  return mapLoan(dto);
}

// ── Reservations ─────────────────────────────────────────────────────────

export async function listReservations(): Promise<BookReservation[]> {
  const reservations = await unwrap(campusHttpClient.get<ApiBookReservation[]>("/api/bookreservations"));
  return reservations.map(mapReservation);
}

export async function reserveBook(values: ReserveBookFormValues): Promise<BookReservation> {
  const dto = await unwrap(
    campusHttpClient.post<ApiBookReservation>("/api/bookreservations", { bookId: values.bookId, memberId: values.memberId }),
  );
  return mapReservation(dto);
}

export async function cancelReservation(id: string): Promise<BookReservation> {
  const dto = await unwrap(campusHttpClient.post<ApiBookReservation>(`/api/bookreservations/${id}/cancel`));
  return mapReservation(dto);
}

export async function fulfillReservation(id: string, dueDate: string): Promise<{ reservation: BookReservation; loan: BookLoan }> {
  const dto = await unwrap(
    campusHttpClient.post<ApiFulfillReservationResult>(`/api/bookreservations/${id}/fulfill`, { dueDate }),
  );
  return { reservation: mapReservation(dto.reservation), loan: mapLoan(dto.loan) };
}
