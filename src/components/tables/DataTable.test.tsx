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

  it("jumps straight to a numbered page and marks it current", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={students} pageSize={5} mobileLayout="scroll" />);

    await user.click(screen.getByRole("button", { name: "Page 3" }));
    expect(bodyRows()).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("asks the server for a new page size when rows-per-page is offered", () => {
    render(
      <DataTable
        columns={columns}
        data={students.slice(0, 5)}
        mobileLayout="scroll"
        serverPagination={{ pageIndex: 0, pageSize: 25, totalCount: 1248, onPageChange: vi.fn(), onPageSizeChange: vi.fn() }}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Rows per page" })).toBeInTheDocument();
    expect(screen.getByText("1,248")).toBeInTheDocument();
  });

  it("swaps the toolbar for a bulk bar while rows are selected", async () => {
    const user = userEvent.setup();
    const bulk = vi.fn((selected: Student[], clear: () => void) => (
      <button type="button" onClick={clear}>
        Archive {selected.length}
      </button>
    ));
    render(<DataTable columns={columns} data={students.slice(0, 3)} searchable bulkActions={bulk} getRowId={(s) => s.id} mobileLayout="scroll" />);

    const [, first, second] = within(table()).getAllByRole("checkbox", { name: /select/i });
    await user.click(first);
    await user.click(second);
    expect(screen.getByRole("toolbar", { name: "Bulk actions" })).toHaveTextContent("2 selected");
    // The normal toolbar keeps its space under the bar (so rows don't shift) but can't be reached.
    expect(screen.getByRole("searchbox").closest("[inert]")).not.toBeNull();
    expect(bodyRows()[0]).toHaveAttribute("data-state", "selected");

    await user.click(screen.getByRole("button", { name: "Archive 2" }));
    expect(screen.queryByRole("toolbar", { name: "Bulk actions" })).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox").closest("[inert]")).toBeNull();
  });

  it("select-all picks every row on the page", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={students} pageSize={5} selectable mobileLayout="scroll" />);

    await user.click(screen.getByRole("checkbox", { name: "Select all rows on this page" }));
    expect(screen.getByText("5 selected")).toBeInTheDocument();
  });

  it("shows active filters as chips and a filter-specific empty state", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const onClearFilters = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyMessage="No students yet"
        activeFilters={[
          { id: "status", label: "Status", value: "Active", onRemove },
          { id: "class", label: "Class", value: "8A", onRemove: vi.fn() },
        ]}
        onClearFilters={onClearFilters}
        mobileLayout="scroll"
      />,
    );

    expect(screen.queryByText("No students yet")).not.toBeInTheDocument();
    expect(screen.getByText("No results for these filters")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Status filter" }));
    expect(onRemove).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClearFilters).toHaveBeenCalledTimes(2);
  });

  it("hides a column from the Columns menu", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={students.slice(0, 2)} columnToggle mobileLayout="scroll" />);

    await user.click(screen.getByRole("button", { name: "Choose columns" }));
    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Grade" }));
    await user.keyboard("{Escape}");
    expect(within(table()).queryByRole("columnheader", { name: /Grade/ })).not.toBeInTheDocument();
  });

  it("opens clickable rows from the keyboard", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={students.slice(0, 2)} onRowClick={onRowClick} mobileLayout="scroll" />);

    bodyRows()[0].focus();
    await user.keyboard("{Enter}");
    expect(onRowClick).toHaveBeenCalledWith(students[0]);
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
