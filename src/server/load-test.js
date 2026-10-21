import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const serverErrors = new Rate('server_errors');

const MODE = __ENV.MODE || 'normal';
const isStress = MODE === 'stress';

export const options = {
  stages: isStress
    ? [
        { duration: '3s', target: 50 },  
        { duration: '12s', target: 120 },
        { duration: '3s', target: 0 },
      ]
    : [
        { duration: '3s', target: 5 },   
        { duration: '10s', target: 10 },  
        { duration: '3s', target: 0 },
      ],


  thresholds: {
    http_req_duration: ['p(95)<50'],
    server_errors: ['rate<0.01'],
  },
};

export default function () {
  const url = 'http://localhost:3001/login';
  const payload = JSON.stringify({
    email: 'test@example.com',
    password: 'password123',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  const isFailed = res.status >= 500 || res.status === 0;
  serverErrors.add(isFailed);

  check(res, {
    'status is not 500': (r) => r.status !== 500,
  });

  sleep(0.05);
}