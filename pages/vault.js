export async function getServerSideProps({ req, res }) {
  const security = require('../lib/security');
  const isAuth = security.isRequestAuthorized(req);

  // Stealth: If unauthenticated, return 404 so an outsider never knows this page exists
  if (!isAuth) {
    return {
      notFound: true
    };
  }

  const fs = require('fs');
  const path = require('path');
  const htmlPath = path.join(process.cwd(), 'private_vault', 'index.html');
  const fallbackPath = path.join(process.cwd(), 'public', 'index.html');
  const targetPath = fs.existsSync(htmlPath) ? htmlPath : fallbackPath;

  if (fs.existsSync(targetPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.write(fs.readFileSync(targetPath, 'utf8'));
    res.end();
  }

  return {
    props: {}
  };
}

export default function VaultPage() {
  return null;
}
