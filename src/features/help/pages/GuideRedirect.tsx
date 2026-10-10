import { Navigate, useLocation } from "react-router-dom";

/** /guide is the same Help Center as /help: /guide, /guide/a/some-article and ?q=search all keep their tail. */
export default function GuideRedirect() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={`/help${pathname.replace(/^\/guide/, "")}${search}${hash}`} replace />;
}
