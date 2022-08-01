import https from 'https';
import {URL} from 'url';

export default async (
    url: string | https.RequestOptions | URL,
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const req = https.request(url, (res) => {
      let body = '';
      res.setEncoding('binary');
      res.on('data', (chunk) => (body += chunk));
      res.on('error', reject);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode <= 299) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.from(body, 'binary'),
          });
        } else {
          reject({
            statusCode: res.statusCode,
            headers: res.headers,
            body: 'Request failed. status: ' + res.statusCode,
          });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
};
