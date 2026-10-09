import { screen } from "@testing-library/react";
import { academicHttpClient } from "@/lib/httpClient";
import { renderWithProviders, stubClient } from "@/test/utils";
import UserStudentsTab from "./UserStudentsTab";

describe("UserStudentsTab", () => {
  it("lists every student mapped to the login with class, relation and status", async () => {
    stubClient(academicHttpClient, {
      "GET api/people/users/p1/students": [
        { studentId: "st1", name: "Anu Nair", classLabel: "Class 5 · A", status: "Active", relation: "Father", guardianId: "g1" },
        { studentId: "st2", name: "Ben Nair", classLabel: "Class 8 · B", status: "Graduated", relation: "Father", guardianId: "g2" },
      ],
    });
    renderWithProviders(<UserStudentsTab userId="p1" isParent />);

    expect(await screen.findByRole("link", { name: "Anu Nair" })).toHaveAttribute("href", "/students/st1");
    expect(screen.getByText("Class 5 · A")).toBeInTheDocument();
    expect(screen.getByText("Graduated")).toBeInTheDocument();
    expect(screen.getByText("2 students mapped to this login. Change a link from the student's profile.")).toBeInTheDocument();
  });

  it("tells an admin how to map a parent when there are none", async () => {
    stubClient(academicHttpClient, { "GET api/people/users/p9/students": [] });
    renderWithProviders(<UserStudentsTab userId="p9" isParent />);

    expect(await screen.findByText("No students mapped")).toBeInTheDocument();
    expect(screen.getByText(/guardian row/)).toBeInTheDocument();
  });
});
