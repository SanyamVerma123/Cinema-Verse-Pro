import fs from 'node:fs';
import path from 'node:path';
import Script from 'next/script';
import Head from 'next/head';

function getVaultMarkup() {
  const htmlPath = path.join(process.cwd(), 'private_vault', 'index.html');
  const fallbackPath = path.join(process.cwd(), 'public', 'index.html');
  const targetPath = fs.existsSync(htmlPath) ? htmlPath : fallbackPath;
  if (!fs.existsSync(targetPath)) {
    return '<div>Vault template not found</div>';
  }
  const document = fs.readFileSync(targetPath, 'utf8');
  const body = document.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];

  if (!body) return '<div>Invalid vault template</div>';

  return body
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, '')
    .trim();
}

export default function VaultPage({ vaultMarkup }) {
  return (
    <>
      <Head>
        <title>CinemaVerse Pro — Universal Multi-OTT Streaming (4K • Zero Ads)</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />
        <link rel="stylesheet" href="/styles.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </Head>
      <Script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" strategy="beforeInteractive" />
      <Script src="/supabase-client.js" strategy="beforeInteractive" />
      <Script src="/initial_catalog.js" strategy="beforeInteractive" />
      <Script src="/app.js" strategy="beforeInteractive" />
      <div dangerouslySetInnerHTML={{ __html: vaultMarkup }} />
    </>
  );
}

export async function getServerSideProps(context) {
  const security = require('../lib/security');
  const isAuth = security.isRequestAuthorized(context.req);

  // Stealth: If unauthenticated, return 404 so an outsider never knows this page exists
  if (!isAuth) {
    return {
      notFound: true
    };
  }

  const vaultMarkup = getVaultMarkup();
  return {
    props: {
      vaultMarkup
    }
  };
}
