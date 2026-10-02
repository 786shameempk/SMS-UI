import { act, render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./DataTable";
import { usePageIndex } from "./usePageIndex";

interface Student {
  id: string;
  name: string;
  grade: number;
  guardian: { name: string };
}

const columns: ColumnDef<Student, unknown>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "grade", header: "Grade" },
];

const students: Student[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i),
  name: `Student ${String.fromCharCode(76 - i)}`,
  grade: (i % 5) + 1,
  guardian: { name: i === 3 ? "Ravi Kumar" : `Parent ${i}` },
}));

const table = () => screen.getByRole("table");
const bodyRows = () => within(table()).getAllByRole("row").slice(1);

describe("DataTable", () => {
  it("renders a page of rows with a footer count", () => {
    render(<DataTable columns={columns} data={students} pageSize={5} mobileLayout="scroll" />);

    expect(bodyRows()).toHaveLength(5);
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  });

  it("pages forwards and back", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={students} pageSize={5} mobileLayout="scroll" />);

    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  });

  it("sorts by a column header", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={students.slice(0, 3)} mobileLayout="scroll" />);

    await user.click(within(table()).getByText("Name"));
    expect(within(bodyRows()[0]).getByText("Student J")).toBeInTheDocument();
    expect(within(table()).getByRole("columnheader", { name: /Name/ })).toHaveAttribute("aria-sort", "ascending");
  });

  it("searches nested row data and offers to clear a search with no hits", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={students} searchable searchPlaceholder="Search students" mobileLayout="scroll" />);

    await user.type(screen.getByPlaceholderText("Search students"), "ravi");
    expect(bodyRows()).toHaveLength(1);

    await user.clear(screen.getByPlaceholderText("Search students"));
    await user.type(screen.getByPlaceholderText("Search students"), "nobody");
    expect(screen.getByText("No matching results")).toBeInTheDocument();
    // The search box has its own ✕ (also "Clear search"); use the one in the empty state.
    await user.click(screen.getAllByRole("button", { name: "Clear search" }).at(-1)!);
    expect(screen.queryByText("No matching results")).not.toBeInTheDocument();
  });

  it("calls onRowClick with the row", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={students.slice(0, 2)} onRowClick={onRowClick} mobileLayout="scroll" />);

    await user.click(within(table()).getByText(students[1].name));

    expect(onRowClick).toHaveBeenCalledWith(students[1]);
  });

  it("shows empty, loading and error states", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(<DataTable columns={columns} data={[]} emptyMessage="No students yet" mobileLayout="scroll" />);
    expect(screen.getByText("No students yet")).toBeInTheDocument();

    rerender(<DataTable columns={columns} data={[]} isLoading mobileLayout="scroll" />);
    expect(screen.queryByText("No students yet")).not.toBeInTheDocument();

    rerender(<DataTable columns={columns} data={[]} isError onRetry={onRetry} />);
    expect(screen.getByText("We couldn't load this")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("server paging asks for the next page instead of slicing locally", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={students.slice(0, 5)}
        mobileLayout="scroll"
        serverPagination={{ pageIndex: 0, pageSize: 5, totalCount: 42, onPageChange }}
      />,
    );

    expect(screen.getByText("Page 1 of 9")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("renders cards for phones as well as the table", () => {
    render(<DataTable columns={columns} data={students.slice(0, 1)} />);

    expect(screen.getAllByText(students[0].name).length).toBeGreaterThanOrEqual(2);
  });
});

describe("usePageIndex", () => {
  it("keeps the page until the filter changes, then returns to the first page", () => {
    const { result, rerender } = renderHook(({ key }) => usePageIndex(key), { initialProps: { key: "all" } });

    act(() => result.current[1](3));
    expect(result.current[0]).toBe(3);

    rerender({ key: "grade-5" });
    expect(result.current[0]).toBe(0);
  });
});
