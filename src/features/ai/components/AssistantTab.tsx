import { Card, CardContent } from "@/components/ui/card";
import AssistantChat from "./AssistantChat";

/** The "Ask School AI" tab of the AI page. */
export default function AssistantTab() {
  return (
    <Card className="max-w-3xl">
      <CardContent className="pt-6">
        <AssistantChat />
      </CardContent>
    </Card>
  );
}
