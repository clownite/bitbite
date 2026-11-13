import { memo, useEffect, useState } from "react";
import { LANGS, useT } from "../i18n/LanguageContext";
import { clicksEnabled, setClicksEnabled } from "../audio/sfx";
import { runTap } from "../utils/tap";

interface SettingsMenuProps {
  muted: boolean;
  setMuted: (next: boolean | ((prev: boolean) => boolean)) => void;
  /** The three lights in the bezel. */
  headerButton?: boolean;
  /** Bumps when Select should open the menu. */
  openToken?: number;
}

/** Language, music and sounds, drawn as a Game Boy screen. */
export const SettingsMenu = memo(function SettingsMenu({ muted, setMuted, headerButton = false, openToken = 0 }: SettingsMenuProps) {
  const { lang, setLang, t } = useT();
  const [open, setOpen] = useState(false);
  const [clicks, setClicks] = useState(clicksEnabled);

  useEffect(() => {
    if (!openToken) return;
    setOpen(true);
  }, [openToken]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={t("common.settings")}
        data-testid="settings-button"
        onPointerDown={(event) => runTap(event, () => setOpen(true))}
        onTouchStart={(event) => runTap(event, () => setOpen(true))}
        className={headerButton ? "gb-settings-open" : "glass-neon rounded-full flex items-center justify-center"}
        style={headerButton ? undefined : {
          width: 32,
          height: 32,
          padding: 0,
          border: "none",
          color: "rgba(255,255,255,0.85)",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {headerButton ? <span className="gb-dots" aria-hidden="true"><i /><i /><i /></span> : (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        )}
      </button>

      {open && (
        <div
          className="gb-settings"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="gb-settings-card" data-testid="settings-modal">
            <h2>{t("common.settings")}</h2>

            <div className="gb-settings-block">
              <div className="gb-settings-kicker">{t("common.language")}</div>
              <div className="gb-settings-langs">
                {LANGS.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    className={item.code === lang ? "is-on" : ""}
                    data-testid={`settings-lang-${item.code}`}
                    onPointerDown={(event) => runTap(event, () => setLang(item.code))}
                    onTouchStart={(event) => runTap(event, () => setLang(item.code))}
                  >
                    <span>{item.flag}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="gb-settings-block">
              <div className="gb-settings-kicker">{t("common.audio")}</div>
              <button
                type="button"
                className="gb-settings-row"
                data-testid="settings-audio-toggle"
                onPointerDown={(event) => runTap(event, () => setMuted((value) => !value))}
                onTouchStart={(event) => runTap(event, () => setMuted((value) => !value))}
              >
                <span>{t("common.audio")}</span>
                <b className={muted ? "" : "is-on"}>{muted ? "OFF" : "ON"}</b>
              </button>
              <button
                type="button"
                className="gb-settings-row"
                data-testid="settings-sfx-toggle"
                onPointerDown={(event) => runTap(event, () => {
                  const next = !clicks;
                  setClicksEnabled(next);
                  setClicks(next);
                })}
                onTouchStart={(event) => runTap(event, () => {
                  const next = !clicks;
                  setClicksEnabled(next);
                  setClicks(next);
                })}
              >
                <span>{t("pet.sfx")}</span>
                <b className={clicks ? "is-on" : ""}>{clicks ? "ON" : "OFF"}</b>
              </button>
            </div>

            <button
              type="button"
              className="gb-settings-close"
              onPointerDown={(event) => runTap(event, () => setOpen(false))}
              onTouchStart={(event) => runTap(event, () => setOpen(false))}
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}
    </>
  );
});
