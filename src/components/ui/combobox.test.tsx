import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Combobox } from "./combobox";

const options = [
  { value: "a", label: "Asha Nair", hint: "asha@mail.test" },
  { value: "b", label: "Ravi Menon", hint: "ravi@mail.test · linked to 2 students" },
  { value: "c", label: "Meera Das", hint: "meera@mail.test" },
];

function Harness({ onPick }: { onPick?: (v: string) => void }) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <Combobox
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onPick?.(v);
      }}
      options={options}
      aria-label="Parent login"
      placeholder="Choose a login"
      searchPlaceholder="Search by name or email"
    />
  );
}

describe("Combobox", () => {
  it("filters by name or hint as you type, and picks with a click", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);

    await user.click(screen.getByRole("combobox", { name: "Parent login" }));
    expect(screen.getAllByRole("option")).toHaveLength(3);

    await user.type(screen.getByLabelText("Search by name or email"), "ravi@");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByText(/linked to 2 students/)).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: /Ravi Menon/ }));
    expect(onPick).toHaveBeenCalledWith("b");
    expect(screen.getByRole("combobox", { name: "Parent login" })).toHaveTextContent("Ravi Menon");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("works from the keyboard: arrows move, Enter picks", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);

    await user.click(screen.getByRole("combobox", { name: "Parent login" }));
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onPick).toHaveBeenCalledWith("c");
  });

  it("says so when nothing matches", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("combobox", { name: "Parent login" }));
    await user.type(screen.getByLabelText("Search by name or email"), "zzz");

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.getByText("No matches")).toBeInTheDocument();
  });
});
