import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { checkPhotoSharpness } from "../utils/photoQuality";
import "./PhotoQualityHint.css";

// Shows a friendly warning under a photo input when the photo looks blurry.
// Never blocks submitting.
export default function PhotoQualityHint({ file }) {
  const { lang } = useLanguage();
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    if (file) {
      checkPhotoSharpness(file).then((r) => {
        if (!cancelled) setResult(r);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [file]);

  if (!result) return null;

  if (result.blurry) {
    return (
      <p className="photo-hint photo-hint--warn" role="status">
        ⚠{" "}
        {lang === "ur"
          ? "یہ تصویر دھندلی لگ رہی ہے۔ صاف، سامنے سے لی گئی تصویر سے اے آئی بہتر میچ کرتا ہے۔ آپ پھر بھی جمع کر سکتے ہیں۔"
          : "This photo looks blurry. A clear, front-facing photo matches better — you can still submit it."}
      </p>
    );
  }

  return (
    <p className="photo-hint photo-hint--ok" role="status">
      ✓ {lang === "ur" ? "تصویر صاف ہے" : "Photo looks clear"}
    </p>
  );
}
