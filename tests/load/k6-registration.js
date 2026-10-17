// FAME load test — registration surge (500 students / minute)
//
// Usage (requires a running stack + an ACTIVE campaign + seeded roster):
//   k6 run --vus 500 --duration 60s tests/load/k6-registration.js \
//     -e BASE_URL=http://localhost:8080 -e CAMPAIGN_ID=<uuid>
//
// This script simulates the PRD "500 students scanning the QR code in the same
// minute". It hits the public campaign info endpoint (registration landing) and
// the challenge endpoint, which are the first requests of the funnel. Assertion
// verification is not exercised here (requires signed identities); see
// tests/load/README.md for the full funnel variant.

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:8080';
const CAMPAIGN = __ENV.CAMPAIGN_ID;

export const options = {
  scenarios: {
    surge: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 },
        { duration: '50s', target: 500 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  if (!CAMPAIGN) throw new Error('CAMPAIGN_ID env required');

  const r1 = http.get(`${BASE}/api/v1/public/campaigns/${CAMPAIGN}`);
  check(r1, { 'campaign info 200': (r) => r.status === 200 });

  const r2 = http.post(`${BASE}/api/v1/auth/student/challenge`);
  check(r2, { 'challenge 200': (r) => r.status === 200 });

  sleep(1);
}
