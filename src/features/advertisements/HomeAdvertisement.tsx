import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import AdvertisementBanner from "./AdvertisementBanner";
import { getCurrentAdvertisement } from "./api";

const seenKey = (userId: string, adId: string) => `sms-ad-seen:${userId}:${adId}`;

function wasSeen(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markSeen(key: string) {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Private mode and the like: the advertisement may show again on the next visit, which is harmless.
  }
}

/**
 * The advertisement for the school's web home page. It renders nothing unless the server returned an advertisement for this school, and shows each
 * advertisement once per browser session, so going back to the home page does not show it again. Mount it on the home page only.
 */
export default function HomeAdvertisement() {
  const userId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.user?.role);
  const [closed, setClosed] = useState(false);
  const [show, setShow] = useState(false);
  // No platform account has a school, so none has an advertisement; the request is not even made.
  const query = useQuery({
    queryKey: ["advertisement", "web", userId],
    queryFn: () => getCurrentAdvertisement("web"),
    enabled: Boolean(userId) && role !== "superAdmin",
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const ad = query.data;

  useEffect(() => {
    if (!ad || !userId) return;
    const key = seenKey(userId, ad.id);
    if (wasSeen(key)) return;
    markSeen(key);
    setShow(true);
  }, [ad, userId]);

  if (!ad || !show || closed) return null;
  return (
    <AdvertisementBanner
      imageUrl={ad.imageUrl}
      redirectUrl={ad.redirectUrl}
      autoCloseSeconds={ad.autoCloseSeconds}
      showCloseButton={ad.showCloseButton}
      onClose={() => setClosed(true)}
      onImageError={() => setClosed(true)}
    />
  );
}
