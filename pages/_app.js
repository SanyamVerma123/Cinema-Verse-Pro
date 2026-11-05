import Head from 'next/head';
import { Analytics } from '@vercel/analytics/next';
import '../public/styles.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />
      </Head>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
