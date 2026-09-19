import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AuthorsPublishersCategoriesTab from "../components/AuthorsPublishersCategoriesTab";
import BooksTab from "../components/BooksTab";
import FinesTab from "../components/FinesTab";
import IssueReturnTab from "../components/IssueReturnTab";
import MembersTab from "../components/MembersTab";
import ReservationsTab from "../components/ReservationsTab";

export default function LibraryManagementPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Library management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Maintain the book catalog, manage members, issue and return books, track fines, and handle reservations.
        </p>
      </div>

      <Tabs defaultValue="books">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="catalog">Authors & Publishers & Categories</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="issue-return">Issue / Return</TabsTrigger>
          <TabsTrigger value="fines">Fines</TabsTrigger>
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
        </TabsList>
        <TabsContent value="books">
          <BooksTab />
        </TabsContent>
        <TabsContent value="catalog">
          <AuthorsPublishersCategoriesTab />
        </TabsContent>
        <TabsContent value="members">
          <MembersTab />
        </TabsContent>
        <TabsContent value="issue-return">
          <IssueReturnTab />
        </TabsContent>
        <TabsContent value="fines">
          <FinesTab />
        </TabsContent>
        <TabsContent value="reservations">
          <ReservationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
