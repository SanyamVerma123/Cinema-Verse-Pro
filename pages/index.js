import fs from 'node:fs';
import path from 'node:path';
import Script from 'next/script';
import Head from 'next/head';

export default function Home({ pageMarkup }) {
  return (
    <>
      <Head>
        <title>CinemaVerse — Universal Multi-OTT Streaming</title>
      </Head>
      <div dangerouslySetInnerHTML={{ __html: pageMarkup }} />
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}

export function getStaticProps() {
  const htmlPath = path.join(process.cwd(), 'public', 'index.html');
  const document = fs.readFileSync(htmlPath, 'utf8');
  const body = document.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];

  if (!body) throw new Error('The legacy page markup is missing its body element.');

  const pageMarkup = body
    .replace(/<script\b[^>]*src=["']app\.js["'][^>]*><\/script>/i, '')
    .trim();

  return { props: { pageMarkup } };
}
