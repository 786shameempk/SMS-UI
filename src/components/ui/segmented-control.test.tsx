import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SegmentedControl } from "./segmented-control";
import { ToggleChip } from "./toggle-chip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

type Status = "published" | "draft" | "archived";

function StatusSwitch({ onChange }: { onChange?: (v: Status) => void }) {
  const [value, setValue] = useState<Status>("published");
  return (
    <SegmentedControl
      aria-label="Status"
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
      options={[
        { value: "published", label: "Published", count: 1248 },
        { value: "draft", label: "Drafts", disabled: true },
        { value: "archived", label: "Archived" },
      ]}
    />
  );
}

describe("SegmentedControl", () => {
  it("is a radiogroup with one tab stop and a formatted count", () => {
    render(<StatusSwitch />);

    expect(screen.getByRole("radiogroup", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Published/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Published/ })).toHaveTextContent("1,248");
    expect(screen.getByRole("radio", { name: "Archived" })).toHaveAttribute("tabindex", "-1");
  });

  it("selects with arrow keys and skips disabled options", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatusSwitch onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: /Published/ }));
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("archived");
    expect(screen.getByRole("radio", { name: "Archived" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("published");
  });
});

describe("ToggleChip", () => {
  it("exposes its state as aria-pressed", async () => {
    const user = userEvent.setup();
    function Chip() {
      const [on, setOn] = useState(false);
      return (
        <ToggleChip pressed={on} onClick={() => setOn(!on)}>
          Classes
        </ToggleChip>
      );
    }
    render(<Chip />);

    const chip = screen.getByRole("button", { name: "Classes" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
  });
});

describe("Table primitives", () => {
  it("render an accessible table with column and row headers", () => {
    render(
      <Table stickyHeader>
        <TableHeader>
          <TableRow>
            <TableHead>Day</TableHead>
            <TableHead>Lunch</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableHead scope="row">Monday</TableHead>
            <TableCell>Rice</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole("columnheader", { name: "Lunch" })).toHaveAttribute("scope", "col");
    expect(screen.getByRole("rowheader", { name: "Monday" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Rice" })).toBeInTheDocument();
  });
});
