import type { AppProps } from "next/app";
import { CssVarsProvider } from "@mui/joy/styles";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CssVarsProvider>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <Component {...pageProps} />
    </CssVarsProvider>
  );
}
