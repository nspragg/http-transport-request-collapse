'use strict';

const HttpTransport = require('@bbc/http-transport');
const Transport = HttpTransport.transport;

class RequestCollapsingTransport extends Transport {
  constructor(transport) {
    super();
    this.inflight = new Map();
    this.transport = transport;
  }

  toOptions(ctx) {
    return this.transport.toOptions(ctx);
  }

  toResponse(ctx, from) {
    return this.transport.toResponse(ctx, from);
  }

  makeRequest(ctx, opts) {
    const requestKey = createKey(ctx);
    if (this.inflight.has(requestKey)) {
      return this.inflight.get(requestKey);
    }
    const pending = this.transport.makeRequest(ctx, opts);
    this.inflight.set(requestKey, pending);

    return pending;
  }
}

function createKey(ctx) {
  return hashString(ctx.req.getUrl());
}

function hashString(str) {
  let hash = 0;
  if (str.length === 0) return hash;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return hash;
}

module.exports = (transport) => {
  return new RequestCollapsingTransport(transport);
};
