'use strict';

const assert = require('chai').assert;
const nock = require('nock');

const HttpTransport = require('@bbc/http-transport');
const toError = require('@bbc/http-transport-to-error');
const collapseRequests = require('../lib/collapse');

const url = 'http://www.example.com/';
const host = 'http://www.example.com';
const api = nock(host);
const path = '/';

const simpleResponseBody = 'Illegitimi non carborundum';

function toUpperCase() {
  return (ctx, next) => {
    return next().then(() => {
      ctx.res.body = ctx.res.body.toUpperCase();
    });
  };
}

function toLowerCase() {
  return (ctx, next) => {
    return next().then(() => {
      ctx.res.body = ctx.res.body.toLowerCase();
    });
  };
}

describe('Request collasing', () => {
  beforeEach(() => {
    nock.disableNetConnect();
    nock.cleanAll();
    api.get(path).reply(200, simpleResponseBody).defaultReplyHeaders({
      'Content-Type': 'text/html'
    });
  });

  it('suppresses duplicated requests at a given time', () => {
    api.get(path)
      .times(1)
      .socketDelay(2000)
      .reply(200, simpleResponseBody);

    const transport = collapseRequests(new HttpTransport.defaultTransport);
    const client = HttpTransport.createClient(transport)
      .useGlobal(toError());

    const pending = [];
    for (let i = 0; i < 1000; ++i) {
      pending.push(client
        .get(url)
        .asResponse());
    }

    return Promise.all(pending)
      .then((results) => {
        assert.equal(results.length, pending.length);
        pending.forEach((result) => {
          result.then((res) => {
            assert.equal(res.body, 'Illegitimi non carborundum');
          });
        });
      });
  });

  it('does not affect the middleware stack', () => {
    api.get('/')
      .times(3)
      .socketDelay(2000)
      .reply(200, simpleResponseBody);

    const transport = collapseRequests(new HttpTransport.defaultTransport);
    const client = HttpTransport.createClient(transport)
      .useGlobal(toError());

    const pending1 = client
      .get(url)
      .asResponse();

    const pending2 = client
      .use(toUpperCase())
      .get(url)
      .asResponse();

    const pending3 = client
      .use(toUpperCase())
      .get(url)
      .asResponse();

    const pending4 = client
      .use(toLowerCase())
      .get(url)
      .asResponse();

    const pending5 = client
      .use(toLowerCase())
      .get(url)
      .asResponse();

    return Promise.all([pending1, pending2, pending3, pending4, pending5])
      .then((results) => {
        assert.equal(results.length, 5);
        assert.equal(results[0].body, 'Illegitimi non carborundum');
        assert.equal(results[1].body, 'ILLEGITIMI NON CARBORUNDUM');
        assert.equal(results[2].body, 'ILLEGITIMI NON CARBORUNDUM');
        assert.equal(results[3].body, 'illegitimi non carborundum');
        assert.equal(results[4].body, 'illegitimi non carborundum');
      });
  });

  it('delete ....');
  it('failure? ....');
});
