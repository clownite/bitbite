import { useEffect, useState } from "react";
import { TelegramAvatar } from "./TelegramAvatar";

type TgUser = { name: string; photoUrl: string | null; id: string };

function readUser(): TgUser {
  try {
    const user = (window as unknown as {
      Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number; first_name?: string; username?: string; photo_url?: string } } } };
    }).Telegram?.WebApp?.initDataUnsafe?.user;
    const name = (user?.first_name || user?.username || "").trim();
    return {
      name: name || "You",
      photoUrl: user?.photo_url || null,
      id: user?.id != null ? String(user.id) : "",
    };
  } catch {
    return { name: "You", photoUrl: null, id: "" };
  }
}

/** Current Telegram name and photo, top left. */
export function TelegramIdentity() {
  const [user, setUser] = useState<TgUser>(readUser);

  useEffect(() => {
    const pull = () => setUser(readUser());
    pull();
    const id = window.setInterval(pull, 4000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: 180, pointerEvents: "none" }}>
      <TelegramAvatar photoUrl={user.photoUrl} name={user.name} seed={user.id || user.name} size={34} />
      <div style={{ fontSize: 13, fontWeight: 800, color: "#1c2414", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {user.name}
      </div>
    </div>
  );
}
