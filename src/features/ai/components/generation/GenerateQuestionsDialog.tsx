import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QuestionGenerator, { type QuestionGeneratorDefaults } from "./QuestionGenerator";

/** The AI question generator opened from the Question Bank, starting from the page's current filters. */
export default function GenerateQuestionsDialog({
  open,
  onOpenChange,
  defaults,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: QuestionGeneratorDefaults;
  onPublished?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate questions with AI</DialogTitle>
          <DialogDescription>Review and edit the draft. Only the questions you approve are added to the bank.</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so each opening starts from the current filters. */}
        {open && <QuestionGenerator defaults={defaults} onPublished={onPublished} />}
      </DialogContent>
    </Dialog>
  );
}
