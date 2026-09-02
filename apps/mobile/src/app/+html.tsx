import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

/**
 * Custom root HTML for Expo Router on web.
 * Injects CSS variables for instantaneous, zero-flash dark/light mode rendering.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const themeStyles = `
:root {
  --system-background: #ffffff;
  --secondary-system-background: #f2f2f7;
  --label: #000000;
  --secondary-label: #8e8e93;
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root {
    --system-background: #000000;
    --secondary-system-background: #1c1c1e;
    --label: #ffffff;
    --secondary-label: #8e8e93;
    color-scheme: dark;
  }
}

html, body, #root, #root > div {
  background-color: var(--system-background) !important;
  color: var(--label);
  min-height: 100%;
}
`;
