import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { formatRelativeDay } from "@/utils/format";
import type { LibraryDueItem } from "../types";

export default function LibraryDueBooksCard({ books }: { books: LibraryDueItem[] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Library books due</CardTitle>
        <CardDescription>Issued copies due back soon or overdue.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {books.length === 0 && <EmptyState bare size="sm" icon={BookOpen} title="No books due" description="Nothing is due back at the library." className="h-full py-6" />}
        {books.map((book) => (
          <div key={book.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{book.bookTitle}</p>
              <p className="text-xs text-muted-foreground truncate">{book.borrowerName}</p>
            </div>
            <Badge variant={book.overdue ? "danger" : "warning"} className="shrink-0">
              {formatRelativeDay(book.dueDate)}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
