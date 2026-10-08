import { screen, within } from "@testing-library/react";
import SectionSubNav from "./SectionSubNav";
import { findActiveSection } from "./navMatch";
import { NAV_SECTIONS } from "@/constants/nav";
import { renderWithProviders, signIn } from "@/test/utils";

describe("findActiveSection", () => {
  it("finds the section a route belongs to, preferring the most specific page", () => {
    expect(findActiveSection(NAV_SECTIONS, "/students/42")?.title).toBe("Academics");
    expect(findActiveSection(NAV_SECTIONS, "/fees")?.title).toBe("Finance");
    expect(findActiveSection(NAV_SECTIONS, "/online-exams/my/upcoming")?.title).toBe("Online Exams");
    expect(findActiveSection(NAV_SECTIONS, "/calendar")).toBeUndefined();
  });
});

describe("SectionSubNav", () => {
  it("lists the pages of the current section and marks the open one", () => {
    signIn("admin");
    renderWithProviders(<SectionSubNav />, { route: "/attendance" });

    const menu = screen.getByRole("navigation", { name: "Academics menu" });
    expect(within(menu).getByRole("link", { name: "Students" })).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Attendance" })).toHaveAttribute("aria-current", "page");
    expect(within(menu).getByRole("link", { name: "Teachers" })).not.toHaveAttribute("aria-current");
  });

  it("is absent on pages outside any section, like the dashboard", () => {
    signIn("admin");
    renderWithProviders(<SectionSubNav />, { route: "/dashboard" });

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("is absent for a section with a single page", () => {
    signIn("admin");
    renderWithProviders(<SectionSubNav />, { route: "/platform" });

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
