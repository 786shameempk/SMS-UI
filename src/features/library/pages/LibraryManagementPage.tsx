import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AuthorsPublishersCategoriesTab from "../components/AuthorsPublishersCategoriesTab";
import BooksTab from "../components/BooksTab";
import FinesTab from "../components/FinesTab";
import IssueReturnTab from "../components/IssueReturnTab";
import MembersTab from "../components/MembersTab";
import ReservationsTab from "../components/ReservationsTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function LibraryManagementPage() {
  const { t } = useTranslation("library");
  return (
    <PageContainer>
      <PageHeader
        title={t("Library management")}
        description={t("Maintain the book catalog, manage members, issue and return books, track fines, and handle reservations.")}
      />

      <Tabs defaultValue="books">
        <TabsList variant="line">
          <TabsTrigger value="books">{t("Books")}</TabsTrigger>
          <TabsTrigger value="catalog">{t("Authors & Publishers & Categories")}</TabsTrigger>
          <TabsTrigger value="members">{t("Members")}</TabsTrigger>
          <TabsTrigger value="issue-return">{t("Issue / Return")}</TabsTrigger>
          <TabsTrigger value="fines">{t("Fines")}</TabsTrigger>
          <TabsTrigger value="reservations">{t("Reservations")}</TabsTrigger>
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
    </PageContainer>
  );
}
