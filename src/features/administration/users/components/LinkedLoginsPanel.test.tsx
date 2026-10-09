import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { academicHttpClient, authHttpClient } from "@/lib/httpClient";
import { renderWithProviders, stubClient } from "@/test/utils";
import LinkedLoginsPanel from "./LinkedLoginsPanel";

const student = {
  id: "st1",
  userId: null,
  guardians: [{ id: "g1", name: "Ravi Nair", relation: "Father", email: "someone-else@mail.test", userId: null }],
};

const users = [
  { id: "p1", name: "Ravi Parent", email: "ravi@mail.test", roleKey: "parent" },
  { id: "p2", name: "Meera Parent", email: "meera@mail.test", roleKey: "parent" },
  { id: "t1", name: "Tara Teacher", email: "tara@mail.test", roleKey: "teacher" },
  { id: "s1", name: "Sam Student", email: "sam@mail.test", roleKey: "student" },
  { id: "s2", name: "Linked Student", email: "linked@mail.test", roleKey: "student" },
];

// p1 already covers two other children; s2 is already some student's own login.
const linked = [
  { userId: "p1", personType: "Guardian", personId: "g-other-1" },
  { userId: "p1", personType: "Guardian", personId: "g-other-2" },
  { userId: "s2", personType: "Student", personId: "st-other" },
];

function setup() {
  stubClient(authHttpClient, { "GET /api/school-users": users });
  const calls = stubClient(academicHttpClient, {
    "GET api/students/st1": student,
    "GET api/people/linked-users": linked,
    "PUT api/people/Guardian/g1/user": {},
  });
  renderWithProviders(<LinkedLoginsPanel kind="student" personId="st1" />);
  return calls;
}

describe("LinkedLoginsPanel", () => {
  it("offers every parent login for a guardian, even one already linked to other students, and shows how many", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(await screen.findByRole("combobox", { name: /Login for Ravi Nair/ }));

    expect(screen.getByRole("option", { name: /Ravi Parent/ })).toHaveTextContent("linked to 2 students");
    expect(screen.getByRole("option", { name: /Meera Parent/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Tara Teacher/ })).not.toBeInTheDocument();
  });

  it("searches the parent logins by name or email, then links the chosen one", async () => {
    const user = userEvent.setup();
    const calls = setup();

    await user.click(await screen.findByRole("combobox", { name: /Login for Ravi Nair/ }));
    await user.type(screen.getByLabelText("Search by name or email"), "meera");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await user.click(screen.getByRole("option", { name: /Meera Parent/ }));
    await user.click(screen.getAllByRole("button", { name: /^Link$/ }).at(-1)!);

    expect(calls.find((c) => c.method === "PUT")).toMatchObject({ url: "api/people/Guardian/g1/user", body: { userId: "p2" } });
  });

  it("still hides logins already used as another student's own login", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(await screen.findByRole("combobox", { name: /Login for Student login/ }));

    expect(screen.getByRole("option", { name: /Sam Student/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Linked Student/ })).not.toBeInTheDocument();
  });
});
