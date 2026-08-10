import { useEffect } from "react";

export function useJsonLd(schema: object) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "json-ld-product";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => { document.getElementById("json-ld-product")?.remove(); };
  }, [JSON.stringify(schema)]);
}
