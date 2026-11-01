import * as React from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

/** Joined text of an <option>'s children, e.g. {name} · {designation}. */
function labelOf(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(labelOf).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return labelOf(node.props.children);
  return "";
}

/** Flattens <option> children (fragments, arrays, conditionals) into list entries. */
function optionsOf(children: React.ReactNode): ComboboxOption[] {
  const found: ComboboxOption[] = [];
  const walk = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement<{ value?: string | number; disabled?: boolean; children?: React.ReactNode }>(child)) return;
      if (child.type === "option") {
        const label = labelOf(child.props.children);
        found.push({ value: String(child.props.value ?? label), label, disabled: child.props.disabled });
      } else if (child.type === React.Fragment || child.props.children) {
        walk(child.props.children);
      }
    });
  };
  walk(children);
  return found;
}

type NativeSelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> & {
  value?: string | number | null;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
};

/**
 * Drop-in for a native <select>: same <option> children, value and onChange, but the list opens with a search box.
 * The change handler gets an event-shaped object carrying the picked value, which is all a select handler reads.
 */
export function NativeSelect({ value, onChange, children, className, disabled, id, ...rest }: NativeSelectProps) {
  const options = React.useMemo(() => optionsOf(children), [children]);
  const label = rest["aria-label"] ?? options.find((o) => o.value === "")?.label ?? "Select";
  return (
    <Combobox
      id={id}
      aria-label={label}
      value={value == null ? "" : String(value)}
      options={options}
      disabled={disabled}
      className={className}
      onValueChange={(next) => onChange?.({ target: { value: next, name: rest.name }, currentTarget: { value: next, name: rest.name } } as React.ChangeEvent<HTMLSelectElement>)}
    />
  );
}
