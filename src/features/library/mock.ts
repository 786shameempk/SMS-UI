import type { Student } from "@/features/students/types";
import type { StaffMember } from "@/features/staff/types";
import { FINE_PER_DAY } from "./constants";
import type { Author, Book, BookCategory, BookLoan, BookReservation, LibraryMember, Publisher } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY_MS).toISOString();

export const SEED_AUTHORS: Omit<Author, "tenantId">[] = [
  { id: "auth-1", name: "R.K. Narayan", bio: "Celebrated Indian author known for the fictional town of Malgudi." },
  { id: "auth-2", name: "Stephen Hawking", bio: "Theoretical physicist and author of popular-science works." },
  { id: "auth-3", name: "Ruskin Bond", bio: "Prolific Indian author of stories set in the Himalayan foothills." },
  { id: "auth-4", name: "Yuval Noah Harari", bio: "Historian and author of works on human history and the future." },
  { id: "auth-5", name: "J.K. Rowling", bio: "British author best known for a seven-part fantasy series." },
  { id: "auth-6", name: "Sudha Murty", bio: "Author and philanthropist writing on values and everyday wisdom." },
  { id: "auth-7", name: "Bill Bryson", bio: "Writer of accessible science and travel non-fiction." },
  { id: "auth-8", name: "APJ Abdul Kalam", bio: "Aerospace scientist, former President of India, and author." },
];

export const SEED_PUBLISHERS: Omit<Publisher, "tenantId">[] = [
  { id: "pub-1", name: "Penguin Random House India", address: "7th Floor, Infinity Tower C, Gurugram" },
  { id: "pub-2", name: "HarperCollins Publishers India", address: "A-75, Sector 57, Noida" },
  { id: "pub-3", name: "Scholastic India", address: "A-27, Ground Floor, Sector 16, Noida" },
  { id: "pub-4", name: "Oxford University Press", address: "YMCA Library Building, New Delhi" },
  { id: "pub-5", name: "National Book Trust", address: "Nehru Bhavan, 5 Institutional Area, New Delhi" },
];

export const SEED_CATEGORIES: Omit<BookCategory, "tenantId">[] = [
  { id: "cat-fiction", name: "Fiction" },
  { id: "cat-science", name: "Science" },
  { id: "cat-mathematics", name: "Mathematics" },
  { id: "cat-history", name: "History" },
  { id: "cat-biography", name: "Biography" },
  { id: "cat-reference", name: "Reference" },
];

export const SEED_BOOKS: Omit<Book, "tenantId" | "branchId">[] = [
  { id: "bk-1", title: "Malgudi Days", isbn: "9780143039655", authorId: "auth-1", publisherId: "pub-1", categoryId: "cat-fiction", totalCopies: 5, availableCopies: 3, shelfLocation: "F-12" },
  { id: "bk-2", title: "Swami and Friends", isbn: "9780143031507", authorId: "auth-1", publisherId: "pub-1", categoryId: "cat-fiction", totalCopies: 3, availableCopies: 3, shelfLocation: "F-12" },
  { id: "bk-3", title: "A Brief History of Time", isbn: "9780553380163", authorId: "auth-2", publisherId: "pub-2", categoryId: "cat-science", totalCopies: 4, availableCopies: 2, shelfLocation: "S-04" },
  { id: "bk-4", title: "The Universe in a Nutshell", isbn: "9780553802023", authorId: "auth-2", publisherId: "pub-2", categoryId: "cat-science", totalCopies: 3, availableCopies: 1, shelfLocation: "S-04" },
  { id: "bk-5", title: "The Blue Umbrella", isbn: "9780143335473", authorId: "auth-3", publisherId: "pub-1", categoryId: "cat-fiction", totalCopies: 4, availableCopies: 4, shelfLocation: "F-08" },
  { id: "bk-6", title: "Our Trees Still Grow in Dehra", isbn: "9780143331889", authorId: "auth-3", publisherId: "pub-1", categoryId: "cat-fiction", totalCopies: 2, availableCopies: 2, shelfLocation: "F-08" },
  { id: "bk-7", title: "Sapiens: A Brief History of Humankind", isbn: "9780062316097", authorId: "auth-4", publisherId: "pub-2", categoryId: "cat-history", totalCopies: 6, availableCopies: 0, shelfLocation: "H-01", coverNote: "High-demand title; keep a reservation queue open." },
  { id: "bk-8", title: "Homo Deus: A Brief History of Tomorrow", isbn: "9781784703936", authorId: "auth-4", publisherId: "pub-2", categoryId: "cat-history", totalCopies: 4, availableCopies: 2, shelfLocation: "H-01" },
  { id: "bk-9", title: "Harry Potter and the Sorcerer's Stone", isbn: "9780590353427", authorId: "auth-5", publisherId: "pub-3", categoryId: "cat-fiction", totalCopies: 8, availableCopies: 5, shelfLocation: "F-01" },
  { id: "bk-10", title: "Harry Potter and the Chamber of Secrets", isbn: "9780439064873", authorId: "auth-5", publisherId: "pub-3", categoryId: "cat-fiction", totalCopies: 6, availableCopies: 4, shelfLocation: "F-01" },
  { id: "bk-11", title: "Wise and Otherwise", isbn: "9780141032165", authorId: "auth-6", publisherId: "pub-1", categoryId: "cat-biography", totalCopies: 3, availableCopies: 2, shelfLocation: "B-05" },
  { id: "bk-12", title: "How I Taught My Grandmother to Read", isbn: "9788172242952", authorId: "auth-6", publisherId: "pub-5", categoryId: "cat-fiction", totalCopies: 3, availableCopies: 3, shelfLocation: "F-14" },
  { id: "bk-13", title: "A Short History of Nearly Everything", isbn: "9780552997041", authorId: "auth-7", publisherId: "pub-2", categoryId: "cat-science", totalCopies: 4, availableCopies: 3, shelfLocation: "S-09" },
  { id: "bk-14", title: "Wings of Fire", isbn: "9788173711466", authorId: "auth-8", publisherId: "pub-5", categoryId: "cat-biography", totalCopies: 5, availableCopies: 2, shelfLocation: "B-02" },
  { id: "bk-15", title: "Ignited Minds", isbn: "9780143331445", authorId: "auth-8", publisherId: "pub-1", categoryId: "cat-biography", totalCopies: 3, availableCopies: 3, shelfLocation: "B-02" },
  { id: "bk-16", title: "NCERT Mathematics — Class 10", isbn: "9788174507154", authorId: "auth-2", publisherId: "pub-4", categoryId: "cat-mathematics", totalCopies: 10, availableCopies: 7, shelfLocation: "M-01" },
  { id: "bk-17", title: "Elementary Number Theory", isbn: "9780123724878", authorId: "auth-2", publisherId: "pub-4", categoryId: "cat-mathematics", totalCopies: 3, availableCopies: 1, shelfLocation: "M-06" },
  { id: "bk-18", title: "Oxford School Atlas", isbn: "9780190129849", authorId: "auth-7", publisherId: "pub-4", categoryId: "cat-reference", totalCopies: 6, availableCopies: 4, shelfLocation: "R-02" },
  { id: "bk-19", title: "The Oxford English Dictionary for Schools", isbn: "9780199127918", authorId: "auth-7", publisherId: "pub-4", categoryId: "cat-reference", totalCopies: 5, availableCopies: 5, shelfLocation: "R-01" },
  { id: "bk-20", title: "India: A History", isbn: "9780330425396", authorId: "auth-4", publisherId: "pub-1", categoryId: "cat-history", totalCopies: 3, availableCopies: 1, shelfLocation: "H-05" },
];

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Deterministic demo data layered over the real students/staff directories: a dozen members
 * (mix of students and staff), a spread of issued/returned/overdue loans (with a few fines
 * already computed), and a couple of pending reservations against a zero-availability book.
 */
export function buildSeedLibraryData(
  students: Student[],
  staff: StaffMember[],
  books: Book[],
): { members: Omit<LibraryMember, "tenantId" | "branchId">[]; loans: Omit<BookLoan, "tenantId" | "branchId">[]; reservations: Omit<BookReservation, "tenantId" | "branchId">[] } {
  const members: Omit<LibraryMember, "tenantId" | "branchId">[] = [
    ...students.map((student, index) => ({
      id: `libmem-stu-${index + 1}`,
      personType: "student" as const,
      personId: student.id,
      membershipId: `LM-S-${String(index + 1).padStart(3, "0")}`,
      joinedOn: daysAgo(200 - index * 5),
      status: "active" as const,
    })),
    ...staff.map((member, index) => ({
      id: `libmem-stf-${index + 1}`,
      personType: "staff" as const,
      personId: member.id,
      membershipId: `LM-T-${String(index + 1).padStart(3, "0")}`,
      joinedOn: daysAgo(260 - index * 7),
      status: index === staff.length - 1 ? ("suspended" as const) : ("active" as const),
    })),
  ];

  const bookById = new Map(books.map((b) => [b.id, b] as const));
  const loans: Omit<BookLoan, "tenantId" | "branchId">[] = [];

  const addLoan = (loan: Omit<BookLoan, "id" | "tenantId" | "branchId">) => {
    loans.push({ id: genId("loan"), ...loan });
  };

  members.forEach((member, index) => {
    const rotation = index % 5;
    const book = books[index % books.length];
    if (!book) return;

    if (rotation === 0) {
      addLoan({ bookId: book.id, memberId: member.id, issuedOn: daysAgo(6), dueDate: daysFromNow(8), status: "issued" });
    } else if (rotation === 1) {
      const issuedOn = daysAgo(40);
      const dueDate = daysAgo(26);
      const returnedOn = daysAgo(24);
      addLoan({
        bookId: book.id,
        memberId: member.id,
        issuedOn,
        dueDate,
        returnedOn,
        status: "returned",
        fineAmount: 2 * FINE_PER_DAY,
        finePaid: true,
        finePaidOn: daysAgo(23),
      });
    } else if (rotation === 2) {
      const issuedOn = daysAgo(20);
      const dueDate = daysAgo(6);
      addLoan({ bookId: book.id, memberId: member.id, issuedOn, dueDate, status: "overdue" });
    } else if (rotation === 3) {
      const issuedOn = daysAgo(30);
      const dueDate = daysAgo(16);
      const returnedOn = daysAgo(10);
      addLoan({
        bookId: book.id,
        memberId: member.id,
        issuedOn,
        dueDate,
        returnedOn,
        status: "returned",
        fineAmount: 6 * FINE_PER_DAY,
        finePaid: false,
      });
    } else {
      const issuedOn = daysAgo(12);
      const dueDate = daysFromNow(2);
      addLoan({ bookId: book.id, memberId: member.id, issuedOn, dueDate, status: "issued" });
    }
  });

  const reservationTarget = books.find((b) => b.availableCopies === 0) ?? books[0];
  const reservationMembers = members.filter((m) => m.status === "active").slice(0, 2);
  const reservations: Omit<BookReservation, "tenantId" | "branchId">[] = reservationMembers.map((member, index) => ({
    id: genId("resv"),
    bookId: reservationTarget?.id ?? bookById.values().next().value!.id,
    memberId: member.id,
    reservedOn: daysAgo(4 - index),
    status: "pending" as const,
  }));

  return { members, loans, reservations };
}
