import { describe, expect, it } from "vitest";
import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

// jsdom applies no CSS, so "hidden" shows up as the data-filtered mark the item carries.
const visibleOptions = () => [...document.querySelectorAll("[role=option]:not([data-filtered])")].map((o) => o.textContent);

function Demo() {
  const [value, setValue] = useState("b");
  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger aria-label="Fruit">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Apple</SelectItem>
        <SelectItem value="b">Banana</SelectItem>
        <SelectItem value="c">Cherry</SelectItem>
      </SelectContent>
    </Select>
  );
}

describe("Select search", () => {
  it("narrows the options as you type, keeps the chosen value shown, and says when nothing matches", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));

    const box = await screen.findByRole("searchbox");
    await user.type(box, "che");
    expect(visibleOptions()).toEqual(["Cherry"]);
    expect(screen.getByRole("combobox", { name: "Fruit", hidden: true })).toHaveTextContent("Banana");

    await user.clear(box);
    await user.type(box, "zzz");
    expect(visibleOptions()).toEqual([]);
    expect(screen.getByText("No matches")).toBeInTheDocument();

    await user.clear(box);
    await user.type(box, "ap");
    expect(visibleOptions()).toEqual(["Apple"]);
    await user.click(within(screen.getByRole("listbox")).getByRole("option", { name: "Apple" }));
    expect(screen.getByRole("combobox", { name: "Fruit", hidden: true })).toHaveTextContent("Apple");
  });
});
