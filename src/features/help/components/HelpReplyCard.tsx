import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { ArrowUpRight, BookOpenText, Info, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAskAi } from "@/features/ai/askAi";
import type { HelpReply } from "../assistant";
import { articleHref } from "../links";
import { clearUnsavedEdits, hasUnsavedEdits, type ResolvedNavigation } from "../navigation";

type Ok = Extract<ResolvedNavigation, { status: "ok" }>;

/** Opens a screen through the app's own router, asking first when the page being left has unsaved edits. */
export function GoButton({ navigation, autoStart, children }: { navigation: Ok; autoStart?: boolean; children?: React.ReactNode }) {
  const navigate = useNavigate();
  const setOpen = useAskAi((s) => s.setOpen);
  const [confirming, setConfirming] = useState(false);
  const started = useRef(false);
  const { t } = useTranslation("help");

  const go = () => {
    clearUnsavedEdits();
    setOpen(false);
    navigate(navigation.path);
  };
  const request = () => (hasUnsavedEdits() ? setConfirming(true) : go());

  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      request();
    }
    // Runs once for an automatic opening; later clicks use the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (confirming) {
    return (
      <div role="alertdialog" aria-label={t("Leave this page?")} className="space-y-2 rounded-lg border border-warning/40 bg-warning-soft p-2.5 text-xs text-warning-strong">
        <p>{t("You have unsaved changes on this page. If you open {{screen}} now, they will be lost.", { screen: navigation.label })}</p>
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={go}>
            {t("Leave and open {{screen}}", { screen: navigation.label })}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(false)}>
            {t("Stay here")}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <Button type="button" size="sm" onClick={request}>
      {children ?? t("Open {{screen}}", { screen: navigation.label })}
      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Button>
  );
}

/**
 * How Ask School AI shows an answer that came from the documentation: numbered steps, the exact menu path, the guide it came
 * from, and a button to open the screen when this reader's account can. Nothing here was written by a model.
 */
export default function HelpReplyCard({ reply, onAsk }: { reply: HelpReply; onAsk: (text: string) => void }) {
  const { t } = useTranslation("help");
  if (reply.kind === "denied") {
    return (
      <div className="space-y-1.5" role="status">
        <p className="flex items-start gap-1.5 font-medium">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning-strong" aria-hidden="true" />
          {t("I can't open {{screen}} for you", { screen: reply.label })}
        </p>
        <p className="text-muted-foreground">{reply.message}</p>
      </div>
    );
  }

  if (reply.kind === "navigate") {
    return (
      <div className="space-y-2">
        <p>
          {reply.navigation.menuPath.length > 1 ? (
            <Trans
              t={t}
              i18nKey="Opening <0>{{screen}}</0> ({{menu}})."
              values={{ screen: reply.navigation.label, menu: reply.navigation.menuPath.join(" → ") }}
              components={[<strong key="0" />]}
            />
          ) : (
            <Trans t={t} i18nKey="Opening <0>{{screen}}</0>." values={{ screen: reply.navigation.label }} components={[<strong key="0" />]} />
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <GoButton navigation={reply.navigation} autoStart />
          {reply.article && (
            <Button asChild type="button" size="sm" variant="outline">
              <Link to={articleHref(reply.article.id)}>
                <BookOpenText className="h-3.5 w-3.5" aria-hidden="true" />
                {t("Read the guide")}
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (reply.kind === "choose") {
    return (
      <div className="space-y-2">
        <p>{t("Which of these do you mean?")}</p>
        <div className="flex flex-wrap gap-2">
          {reply.choices.map((c) => (
            <Button key={c.taskId} type="button" size="sm" variant="outline" onClick={() => onAsk(c.label)}>
              {c.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (reply.kind === "articles") {
    return (
      <div className="space-y-2">
        <p>{t("I found these guides that match. I can't give you exact steps for this question, so please read:")}</p>
        <ul className="space-y-1">
          {reply.articles.map((a) => (
            <li key={a.id}>
              <Link to={articleHref(a.id)} className="font-medium text-primary-text underline underline-offset-2">
                {a.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="font-medium">{reply.label}</p>
      {reply.menuPath && reply.menuPath.length > 0 && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{t("Menu:")} </span>
          {reply.menuPath.join(" → ")}
        </p>
      )}
      {reply.steps.length > 0 ? (
        <ol className="list-decimal space-y-1 ps-5">
          {reply.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      ) : (
        <p className="flex items-start gap-1.5 text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t("The guide describes this in detail; open it for the steps.")}
        </p>
      )}
      {reply.moreSteps && <p className="text-xs text-muted-foreground">{t("There are more steps in the full guide.")}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {reply.navigation?.status === "ok" && <GoButton navigation={reply.navigation} />}
        <Button asChild type="button" size="sm" variant="outline">
          <Link to={articleHref(reply.article.id)}>
            <BookOpenText className="h-3.5 w-3.5" aria-hidden="true" />
            {t("Read the full guide")}
          </Link>
        </Button>
      </div>
      {reply.related.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("Related:")}{" "}
          {reply.related.map((a, i) => (
            <span key={a.id}>
              {i > 0 && ", "}
              <Link to={articleHref(a.id)} className="underline underline-offset-2">
                {a.title}
              </Link>
            </span>
          ))}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {t("Source: the School Sphere guide, “{{title}}”.", { title: reply.article.title })}
      </p>
    </div>
  );
}
