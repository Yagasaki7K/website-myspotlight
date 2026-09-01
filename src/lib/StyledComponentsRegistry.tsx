"use client";
import { useState } from "react";
import { ServerStyleSheet, StyleSheetManager, createGlobalStyle } from "styled-components";
import { useServerInsertedHTML } from "next/navigation";

const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; background: #191414; }
  button, input { font: inherit; }
`;

export default function StyledComponentsRegistry({ children }: { children: React.ReactNode }) {
  const [sheet] = useState(() => new ServerStyleSheet());
  useServerInsertedHTML(() => { const styles = sheet.getStyleElement(); sheet.instance.clearTag(); return <>{styles}</>; });
  if (typeof window !== "undefined") return <><GlobalStyle />{children}</>;
  return <StyleSheetManager sheet={sheet.instance}><GlobalStyle />{children}</StyleSheetManager>;
}
