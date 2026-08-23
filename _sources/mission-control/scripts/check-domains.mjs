#!/usr/bin/env node
/**
 * Domain Availability Checker
 * Run with: node scripts/check-domains.mjs
 *
 * Checks DNS records and attempts HTTP connections to determine
 * if domains are registered and active.
 */

import dns from 'dns';
import https from 'https';
import http from 'http';

const domains = [
  'brewster.com',
  'brewmind.com',
  'hopwise.com',
  'grainbrain.com',
  'fermenta.com',
  'alebrain.com',
  'maltmind.com',
  'brewgenius.com',
  'smartmash.com',
  'hopcraft.com',
  'brewiq.com',
  'grainwise.com',
  'mashlab.com',
  'brewpilot.com',
  'fermentai.com',
  'brewvault.com',
  'alesmith.com',
  'maltwerk.com',
  'brewnerdy.com',
  'brewhaven.com',
  'hearthbrew.com',
  'forgebrew.com',
];

function checkDNS(domain) {
  return new Promise((resolve) => {
    dns.resolve(domain, (err, addresses) => {
      if (err) {
        resolve({ hasDNS: false, error: err.code, addresses: [] });
      } else {
        resolve({ hasDNS: true, error: null, addresses });
      }
    });
  });
}

function checkHTTP(domain) {
  return new Promise((resolve) => {
    const req = https.get(`https://${domain}`, { timeout: 8000 }, (res) => {
      const title = [];
      let body = '';
      res.on('data', (chunk) => { body += chunk.toString(); });
      res.on('end', () => {
        const titleMatch = body.match(/<title[^>]*>(.*?)<\/title>/is);
        resolve({
          status: res.statusCode,
          redirectUrl: res.headers.location || null,
          title: titleMatch ? titleMatch[1].trim().substring(0, 100) : null,
          server: res.headers.server || null,
        });
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT', redirectUrl: null, title: null, server: null }); });
    req.on('error', (err) => {
      // Try HTTP fallback
      const req2 = http.get(`http://${domain}`, { timeout: 8000 }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk.toString(); });
        res.on('end', () => {
          const titleMatch = body.match(/<title[^>]*>(.*?)<\/title>/is);
          resolve({
            status: res.statusCode,
            redirectUrl: res.headers.location || null,
            title: titleMatch ? titleMatch[1].trim().substring(0, 100) : null,
            server: res.headers.server || null,
            note: 'HTTP only',
          });
        });
      });
      req2.on('timeout', () => { req2.destroy(); resolve({ status: 'TIMEOUT', redirectUrl: null, title: null, server: null }); });
      req2.on('error', () => resolve({ status: 'NO_RESPONSE', redirectUrl: null, title: null, server: null }));
    });
  });
}

async function main() {
  console.log('Domain Availability Check');
  console.log('='.repeat(80));
  console.log('');

  const results = [];

  for (const domain of domains) {
    process.stdout.write(`Checking ${domain}... `);
    const [dnsResult, httpResult] = await Promise.all([
      checkDNS(domain),
      checkHTTP(domain),
    ]);

    const result = { domain, ...dnsResult, ...httpResult };
    results.push(result);

    if (!dnsResult.hasDNS) {
      console.log('NO DNS RECORDS - Likely available or parked without hosting');
    } else if (httpResult.status === 'TIMEOUT' || httpResult.status === 'NO_RESPONSE') {
      console.log(`DNS exists (${dnsResult.addresses.join(', ')}) but no web server responding`);
    } else {
      console.log(`ACTIVE - HTTP ${httpResult.status}${httpResult.title ? ` - "${httpResult.title}"` : ''}${httpResult.server ? ` [${httpResult.server}]` : ''}`);
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log('');

  const noDNS = results.filter(r => !r.hasDNS);
  const active = results.filter(r => r.hasDNS && r.status !== 'TIMEOUT' && r.status !== 'NO_RESPONSE');
  const dnsOnly = results.filter(r => r.hasDNS && (r.status === 'TIMEOUT' || r.status === 'NO_RESPONSE'));

  console.log(`POTENTIALLY AVAILABLE (no DNS): ${noDNS.length}`);
  noDNS.forEach(r => console.log(`  - ${r.domain}`));
  console.log('');

  console.log(`REGISTERED BUT NO WEB SERVER: ${dnsOnly.length}`);
  dnsOnly.forEach(r => console.log(`  - ${r.domain} (${r.addresses.join(', ')})`));
  console.log('');

  console.log(`ACTIVE WEBSITES: ${active.length}`);
  active.forEach(r => console.log(`  - ${r.domain} (HTTP ${r.status}${r.title ? ` - "${r.title}"` : ''})`));

  console.log('');
  console.log('NOTE: DNS presence means the domain is registered (taken).');
  console.log('No DNS does NOT guarantee availability -- use a registrar (Namecheap, GoDaddy) to confirm.');
  console.log('Some parked domains have DNS but show registrar landing pages.');
}

main().catch(console.error);
