import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/utils";
import * as api from "../api";
import DepartmentSelect from "./DepartmentSelect";

vi.mock("../api", async (importOriginal) => ({ ...(await importOriginal<typeof import("../api")>()), listDepartments: vi.fn() }));

const dept = (id: string, name: string) => ({ id, name }) as Awaited<ReturnType<typeof api.listDepartments>>[number];

beforeEach(() => {
  vi.mocked(api.listDepartments).mockResolvedValue([dept("1", "Science"), dept("2", "Mathematics")]);
});

describe("DepartmentSelect", () => {
  it("offers only the departments from the master and reports the choice", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<DepartmentSelect id="department" value="" onChange={onChange} />);

    await user.click(await screen.findByRole("combobox"));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Science", "Mathematics"]);
    await user.click(screen.getByRole("option", { name: "Mathematics" }));

    expect(onChange).toHaveBeenCalledWith("Mathematics");
  });

  it("keeps a department saved earlier that is no longer in the master", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DepartmentSelect id="department" value="Old Dept" onChange={() => {}} />);

    await user.click(await screen.findByRole("combobox"));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Old Dept", "Science", "Mathematics"]);
  });

  it("can offer 'No department' for optional forms, which clears the value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<DepartmentSelect id="department" value="Science" onChange={onChange} allowNone />);

    await user.click(await screen.findByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "No department" }));

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("with no departments set up, shows a disabled box and a way to add them instead of a free-text field", async () => {
    vi.mocked(api.listDepartments).mockResolvedValue([]);
    renderWithProviders(<DepartmentSelect id="department" value="" onChange={() => {}} />);

    await waitFor(() => expect(screen.getByText("No departments set up yet")).toBeInTheDocument());
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Academic setup" })).toHaveAttribute("href", "/academics");
  });
});
