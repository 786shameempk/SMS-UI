import * as library from "./api";
import { campusHttpClient } from "@/lib/httpClient";
import { checkCrud } from "@/test/crud";
import { stubClient } from "@/test/utils";

const loan = (overrides: Record<string, unknown> = {}) => ({
  id: "ln1", tenantId: "t", branchId: "b", bookId: "bk1", memberId: "m1", issuedOn: "", dueDate: "2026-10-10", returnedOn: null, status: "Overdue",
  fineAmount: null, finePaid: null, finePaidOn: null, ...overrides,
});
const reservation = { id: "rs1", tenantId: "t", branchId: "b", bookId: "bk1", memberId: "m1", reservedOn: "", status: "Fulfilled" };

describe("library api", () => {
  it("authors trim the bio and send blanks as null", () =>
    checkCrud({
      client: campusHttpClient,
      base: "/api/authors",
      dto: { id: "a1", tenantId: "t", name: "R.K. Narayan", bio: null },
      values: { name: "R.K. Narayan", bio: "   " } as never,
      list: library.listAuthors,
      create: library.createAuthor,
      update: library.updateAuthor,
      remove: library.deleteAuthor,
      sent: { name: "R.K. Narayan", bio: null },
      mapped: { bio: undefined },
    }));

  it("publishers", () =>
    checkCrud({
      client: campusHttpClient,
      base: "/api/publishers",
      dto: { id: "p1", tenantId: "t", name: "DC Books", address: "Kottayam" },
      values: { name: "DC Books", address: " Kottayam " } as never,
      list: library.listPublishers,
      create: library.createPublisher,
      update: library.updatePublisher,
      remove: library.deletePublisher,
      sent: { name: "DC Books", address: "Kottayam" },
      mapped: { address: "Kottayam" },
    }));

  it("categories", () =>
    checkCrud({
      client: campusHttpClient,
      base: "/api/bookcategories",
      dto: { id: "c1", tenantId: "t", name: "Fiction" },
      values: { name: "Fiction" } as never,
      list: library.listCategories,
      create: library.createCategory,
      update: library.updateCategory,
      remove: library.deleteCategory,
      sent: { name: "Fiction" },
      mapped: { name: "Fiction" },
    }));

  it("books", () =>
    checkCrud({
      client: campusHttpClient,
      base: "/api/books",
      dto: { id: "bk1", tenantId: "t", branchId: "b", title: "Malgudi Days", isbn: "978", authorId: "a1", publisherId: "p1", categoryId: "c1", totalCopies: 3, availableCopies: 2, shelfLocation: null, coverNote: "Signed" },
      values: { title: "Malgudi Days", isbn: "978", authorId: "a1", publisherId: "p1", categoryId: "c1", totalCopies: 3, shelfLocation: " R2 ", coverNote: "" } as never,
      list: library.listBooks,
      create: library.createBook,
      update: library.updateBook,
      remove: library.deleteBook,
      sent: { title: "Malgudi Days", isbn: "978", authorId: "a1", publisherId: "p1", categoryId: "c1", totalCopies: 3, shelfLocation: "R2", coverNote: null },
      mapped: { shelfLocation: undefined, coverNote: "Signed", availableCopies: 2 },
    }));

  it("bulk add: sends everyone in one call and maps the result", async () => {
    const dto = { id: "m9", tenantId: "t", branchId: "b", personType: "Student", personId: "s1", membershipId: "LM-S-009", joinedOn: "", status: "Active" };
    const calls = stubClient(campusHttpClient, { "POST /api/librarymembers/bulk": { created: 1, alreadyMembers: 2, members: [dto] } });

    const result = await library.bulkCreateMembers([{ personType: "student", personId: "s1" }, { personType: "staff", personId: "t1" }]);

    expect(calls[0].body).toEqual({ people: [{ personType: "Student", personId: "s1" }, { personType: "Staff", personId: "t1" }], status: "Active" });
    expect(result).toMatchObject({ created: 1, alreadyMembers: 2 });
    expect(result.members[0]).toMatchObject({ personType: "student", membershipId: "LM-S-009", status: "active" });
  });

  it("members", () =>
    checkCrud({
      client: campusHttpClient,
      base: "/api/librarymembers",
      dto: { id: "m1", tenantId: "t", branchId: "b", personType: "Staff", personId: "sf1", membershipId: "LM-1", joinedOn: "", status: "Suspended" },
      values: { personType: "student", personId: "st1", status: "active" } as never,
      list: library.listMembers,
      create: library.createMember,
      update: library.updateMember,
      remove: library.deleteMember,
      sent: { personType: "Student", personId: "st1", status: "Active" },
      mapped: { personType: "staff", status: "suspended" },
      fallback: { dto: { id: "m2", tenantId: "t", branchId: "b", personType: "?", status: "?" }, mapped: { personType: "student", status: "active" } },
    }));

  it("circulation: issue, return and fines", async () => {
    const calls = stubClient(campusHttpClient, {
      "GET /api/bookloans": [loan(), loan({ id: "ln2", status: "?", fineAmount: 15, finePaid: false })],
      "POST /api/bookloans/issue": loan({ status: "Issued" }),
      "POST /api/bookloans/ln1/return": loan({ status: "Returned", returnedOn: "2026-10-12", fineAmount: 10 }),
      "POST /api/bookloans/ln1/mark-fine-paid": loan({ status: "Returned", fineAmount: 10, finePaid: true, finePaidOn: "2026-10-12" }),
    });

    const [overdue, odd] = await library.listLoans();
    await library.issueBook({ bookId: "bk1", memberId: "m1", dueDate: "2026-10-10" });
    const returned = await library.returnBook("ln1");
    const paid = await library.markFinePaid("ln1");

    expect(overdue).toMatchObject({ status: "overdue", returnedOn: undefined, fineAmount: undefined });
    expect(odd).toMatchObject({ status: "issued", fineAmount: 15, finePaid: false });
    expect(returned).toMatchObject({ status: "returned", fineAmount: 10 });
    expect(paid).toMatchObject({ finePaid: true, finePaidOn: "2026-10-12" });
    expect(calls[1].body).toEqual({ bookId: "bk1", memberId: "m1", dueDate: "2026-10-10" });
  });

  it("reservations: reserve, cancel and fulfil into a loan", async () => {
    const calls = stubClient(campusHttpClient, {
      "GET /api/bookreservations": [reservation, { ...reservation, id: "rs2", status: "?" }],
      "POST /api/bookreservations": { ...reservation, status: "Pending" },
      "POST /api/bookreservations/rs1/cancel": { ...reservation, status: "Cancelled" },
      "POST /api/bookreservations/rs1/fulfill": { reservation, loan: loan({ status: "Issued" }) },
    });

    expect((await library.listReservations()).map((r) => r.status)).toEqual(["fulfilled", "pending"]);
    expect((await library.reserveBook({ bookId: "bk1", memberId: "m1" })).status).toBe("pending");
    expect((await library.cancelReservation("rs1")).status).toBe("cancelled");
    const fulfilled = await library.fulfillReservation("rs1", "2026-10-20");

    expect([fulfilled.reservation.status, fulfilled.loan.status]).toEqual(["fulfilled", "issued"]);
    expect(calls.at(-1)?.body).toEqual({ dueDate: "2026-10-20" });
  });
});
