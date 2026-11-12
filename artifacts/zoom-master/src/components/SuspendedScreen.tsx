import { useEffect } from "react";
import { useT } from "../i18n/LanguageContext";
import { hideHtmlSplash } from "./SplashScreen";

export function SuspendedScreen({ until, message }: { until: number; message: string }) {
  const { t, lang } = useT();
  const date = new Date(until).toLocaleDateString(lang, { day: "numeric", month: "long" });
  const note = (message || "").trim() || t("gate.default");

  useEffect(() => {
    hideHtmlSplash();
  }, []);

  return (
    <div className="zoom-splash-screen" role="status" aria-live="polite" style={{ zIndex: 2147483645 }}>
      <div className="zoom-splash-inner">
        <div className="zoom-splash-title">{t("gate.title")}</div>
        <div className="zoom-splash-sub zoom-splash-sub-maint">{note}</div>
        <div className="zoom-splash-sub">{t("gate.until", { date })}</div>
      </div>
    </div>
  );
}
