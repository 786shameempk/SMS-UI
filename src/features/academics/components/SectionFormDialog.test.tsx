import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SectionFormDialog from "./SectionFormDialog";
import type { SchoolClass } from "../types";

const classes = [{ id: "c1", name: "Class 1" }] as SchoolClass[];

function setup() {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(
    <SectionFormDialog open onOpenChange={() => {}} classes={classes} defaultClassId="c1" onSubmit={onSubmit} submitting={false} />,
  );
  return onSubmit;
}

describe("SectionFormDialog - several divisions at once", () => {
  it("previews one section per comma separated name and submits the raw text", async () => {
    const onSubmit = setup();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/division names/i), "a, b, c");

    expect(await screen.findByText("Class 1 a")).toBeInTheDocument();
    expect(screen.getByText("Class 1 b")).toBeInTheDocument();
    expect(screen.getByText("Class 1 c")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /create 3 divisions/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: "a, b, c", classId: "c1" });
  });

  it("keeps the single-division button for one name", async () => {
    setup();
    await userEvent.setup().type(screen.getByLabelText(/division names/i), "A");

    expect(screen.getByRole("button", { name: /^create division$/i })).toBeInTheDocument();
    expect(screen.queryByText(/will create/i)).not.toBeInTheDocument();
  });
});
