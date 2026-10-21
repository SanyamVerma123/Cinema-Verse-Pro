import { Analytics } from '@vercel/analytics/next';
import '../public/styles.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
