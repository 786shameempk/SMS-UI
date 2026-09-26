export interface Author {
  id: string;
  tenantId: string;
  name: string;
  bio?: string;
}

export interface AuthorFormValues {
  name: string;
  bio?: string;
}

export interface Publisher {
  id: string;
  tenantId: string;
  name: string;
  address?: string;
}

export interface PublisherFormValues {
  name: string;
  address?: string;
}

export interface BookCategory {
  id: string;
  tenantId: string;
  name: string;
}

export interface BookCategoryFormValues {
  name: string;
}

export interface Book {
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
  shelfLocation?: string;
  coverNote?: string;
}

export interface BookFormValues {
  title: string;
  isbn: string;
  authorId: string;
  publisherId: string;
  categoryId: string;
  totalCopies: number;
  shelfLocation?: string;
  coverNote?: string;
}

export type LibraryPersonType = "student" | "staff";
export type LibraryMemberStatus = "active" | "suspended";

export interface LibraryMember {
  id: string;
  tenantId: string;
  branchId: string;
  personType: LibraryPersonType;
  personId: string;
  membershipId: string;
  joinedOn: string;
  status: LibraryMemberStatus;
}

export interface LibraryMemberFormValues {
  personType: LibraryPersonType;
  personId: string;
  status: LibraryMemberStatus;
}

export type BookLoanStatus = "issued" | "returned" | "overdue";

export interface BookLoan {
  id: string;
  tenantId: string;
  branchId: string;
  bookId: string;
  memberId: string;
  issuedOn: string;
  dueDate: string;
  returnedOn?: string;
  status: BookLoanStatus;
  fineAmount?: number;
  finePaid?: boolean;
  finePaidOn?: string;
}

export interface IssueBookFormValues {
  bookId: string;
  memberId: string;
  dueDate: string;
}

export type ReservationStatus = "pending" | "fulfilled" | "cancelled";

export interface BookReservation {
  id: string;
  tenantId: string;
  branchId: string;
  bookId: string;
  memberId: string;
  reservedOn: string;
  status: ReservationStatus;
}

export interface ReserveBookFormValues {
  bookId: string;
  memberId: string;
}
