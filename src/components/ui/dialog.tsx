import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-slate-950/40 dark:bg-black/60",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * Renders as a full-height panel sliding in from the right edge rather than a centred popup — every
 * dialog in the app (forms, add/edit flows, confirmations) shares this one layout. Callers' width
 * classes (max-w-sm … max-w-2xl) still size the panel; their old popup-era height caps
 * (max-h-[85vh], overflow-y-auto) are dropped because the panel is always viewport-tall and scrolls
 * its own body, with DialogHeader pinned to the top and DialogFooter pinned to the bottom.
 */
const POPUP_ONLY_CLASS = /^(max-h-\S+|overflow-y-auto|overflow-auto)$/;

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-lg flex-col border-l border-border bg-card shadow-lg outline-none sm:rounded-l-xl",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
        "data-[state=open]:duration-300 data-[state=closed]:duration-200 ease-out",
        className
          ?.split(/\s+/)
          .filter((c) => !POPUP_ONLY_CLASS.test(c))
          .join(" "),
      )}
      {...props}
    >
      {/* A direct <form> child is stretched to fill the body so its DialogFooter's mt-auto can reach the
          bottom edge even when the form is short. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pb-6 flex flex-col gap-4 [&>form]:flex [&>form]:flex-1 [&>form]:flex-col">
        {children}
      </div>
      <DialogPrimitive.Close className="absolute right-3 top-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none cursor-pointer">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

/** Pinned to the top of the panel's scroll area, full-bleed under the close button. */
const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "sticky top-0 z-10 -mx-6 flex flex-col gap-1 border-b border-border bg-card px-6 pt-5 pb-4 pr-14 text-left",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

/** Pinned to the bottom of the panel: mt-auto pushes it down when the content is short, sticky keeps it
 *  there when the content scrolls. Sticky offsets are measured inside the scroll body's padding, so
 *  -bottom-6/-mb-6 cancel its pb-6 to sit flush with the panel's bottom edge. */
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "sticky -bottom-6 z-10 -mx-6 -mb-6 mt-auto flex flex-col-reverse gap-2 border-t border-border bg-card/95 px-6 py-3.5 backdrop-blur-sm pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-base font-semibold leading-6 tracking-tight text-foreground", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
