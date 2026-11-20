import { useEffect } from "react";
import { useT } from "../i18n/LanguageContext";
import { ChristmasSnow } from "./ChristmasSnow";
import { hideHtmlSplash } from "./SplashScreen";

interface Props {
  /** The line the admin writes. It replaces the default sentence. */
  message?: string;
}

/** The loading Game Boy, held on screen until maintenance is switched off. */
export function MaintenanceScreen({ message }: Props) {
  const { t } = useT();
  const note = (message || "").trim() || t("maint.default");

  useEffect(() => {
    hideHtmlSplash();
  }, []);

  return (
    <div
      className="zoom-splash-screen maint-frame"
      role="status"
      aria-live="polite"
      aria-label={t("maint.title")}
      style={{ zIndex: 2147483645, background: "#000" }}
    >
      <div className="gb-boot">
        <div className="gb-boot-top" aria-hidden="true"><i /><i /><i /></div>
        <div className="gb-boot-lcd">
          <div className="gb-boot-stage">
            <div className="maint-copy">
              <div className="maint-title">{t("maint.title")}</div>
              <div className="maint-note">{note}</div>
            </div>
            <div className="gb-load-track" aria-hidden="true"><i className="maint-meter" /></div>
          </div>
          <div className="gb-boot-nav" aria-hidden="true" />
        </div>
        <div className="gb-boot-console" aria-hidden="true">
          <div className="gb-boot-dpad"><i /><i /><b /></div>
          <div className="gb-boot-pills"><i /><i /></div>
          <div className="gb-boot-face"><b className="gb-boot-b" /><b className="gb-boot-a" /></div>
          <div className="gb-boot-speaker"><i /><i /><i /></div>
        </div>
        <ChristmasSnow />
      </div>
    </div>
  );
}
