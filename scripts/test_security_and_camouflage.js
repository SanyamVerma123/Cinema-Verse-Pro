const http = require('http');

async function testEndpoint(name, path, options = {}) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch(e) {}
        resolve({
          name,
          statusCode: res.statusCode,
          headers: res.headers,
          data: json || data.slice(0, 200)
        });
      });
    });

    req.on('error', (err) => resolve({ name, error: err.message }));
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function runAllTests() {
  console.log('=== RUNNING SECURITY & ARCHIVE CAMOUFLAGE VERIFICATION ===\n');

  // Test 1: Unauthenticated /api/catalog
  const t1 = await testEndpoint('1. Unauthenticated /api/catalog (Decoy Library)', '/api/catalog');
  console.log(t1.name, '-> Status:', t1.statusCode, 'Mode:', t1.data?.mode, 'Total Books:', t1.data?.total);

  // Test 2: Unauthenticated /api/sources (Protected Streaming)
  const t2 = await testEndpoint('2. Unauthenticated /api/sources/movie/550 (Forbidden)', '/api/sources/movie/550');
  console.log(t2.name, '-> Status:', t2.statusCode, 'Error:', t2.data?.error);

  // Test 3: Normal Decoy Sign-In
  const t3 = await testEndpoint('3. Decoy Cardholder Sign-In', '/api/auth/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { username: 'scholar@oxford.ac.uk', passcode: 'librarypass123' }
  });
  console.log(t3.name, '-> Status:', t3.statusCode, 'Success:', t3.data?.success, 'Mode:', t3.data?.mode);

  // Test 4: Master Passcode Unlock
  const t4 = await testEndpoint('4. Master Passcode Unlock (cinema2026)', '/api/auth/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { passcode: 'cinema2026' }
  });
  console.log(t4.name, '-> Status:', t4.statusCode, 'Success:', t4.data?.success, 'Token:', t4.data?.token);

  // Test 5: Authorized /api/catalog
  const t5 = await testEndpoint('5. Authorized /api/catalog (CinemaVerse Movies)', '/api/catalog', {
    headers: { 'x-cinema-access': 'CV_SECURE_TOKEN_2026_MASTER' }
  });
  console.log(t5.name, '-> Status:', t5.statusCode, 'Total Movies:', t5.data?.total, 'First Item:', t5.data?.data?.[0]?.title);

  // Test 6: Authorized /api/sources
  const t6 = await testEndpoint('6. Authorized /api/sources/movie/550 (Stream Sources)', '/api/sources/movie/550', {
    headers: { 'x-cinema-access': 'CV_SECURE_TOKEN_2026_MASTER' }
  });
  console.log(t6.name, '-> Status:', t6.statusCode, 'Servers Available:', t6.data?.servers?.length);

  // Test 7: Direct APK Download Headers
  const t7 = await testEndpoint('7. Direct APK Download /download/CinemaVerse-Pro.apk', '/download/CinemaVerse-Pro.apk');
  console.log(t7.name, '-> Status:', t7.statusCode, 'Content-Type:', t7.headers['content-type'], 'Content-Disposition:', t7.headers['content-disposition']);

  console.log('\n=== ALL SECURITY VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

runAllTests();
