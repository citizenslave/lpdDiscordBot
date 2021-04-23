'use strict';

import HTTPS from 'https';

export default {
    'indent': (tabs) => {
        return new Array(tabs).fill('\t').join('');
    },

    'postHttpsRequest': (url, data, headers = {}) => {
        return new Promise(resolve => {
            const request = HTTPS.request(url, {
                'method': 'POST',
                'headers': Object.assign({ 'Content-Type': 'application/json' }, headers)
            }, res => {
                res.on('data', d => {
                    const response = JSON.parse(d.toString());
                    resolve(response);
                });
            });

            request.on('error', console.error);
            request.write(JSON.stringify(data));
            request.end();
        });
    },

    'getHttpsRequest': url => {
        return new Promise(resolve => {
            const request = HTTPS.request(url, res => {
                const chunks = [];
                res.on('data', d => {
                    chunks.push(d);
                });
                res.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
            });
            request.end();
        });
    }
}