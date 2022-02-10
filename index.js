"use strict";

const http = require("http");
const got = require("got");
const assert = require("assert");
const { CookieJar } = require("cookiejar");

module.exports = Supertest;

class SuperRequest extends Promise {
  constructor(def = () => {}) {
    let res, rej;
    super((resolve, reject) => {
      def(resolve, reject);
      res = resolve;
      rej = reject;
    });
    this.resolve = res;
    this.reject = rej;
    this._asserts = [];

    this._options = {
      headers: {},
      query: null,
      redirects: null,
    };
  }

  get options() {
    const { query, redirects, ...rest } = this._options;
    return {
      ...(query ? {
        searchParams: query,
      } : undefined),
      ...(redirects ? {
        followRedirect: true,
        maxRedirects: redirects,
      } : undefined),
      ...rest,
    };
  }

  defer(task) {
    this.task = task;
    return this;
  }

  set(nameOrObj, value) {
    if (nameOrObj && typeof nameOrObj === "object") {
      for (const [ k, v ] of Object.entries(nameOrObj)) {
        this.set(k, v);
      }
      return this;
    }
    this._options.headers[nameOrObj.toLowerCase()] = value;
    return this;
  }

  send(obj) {
    this._options.json = obj;
    return this;
  }

  json(value = true) {
    if (value) this._options.responseType = "json";
    else delete this._options.responseType;
    return this;
  }

  query(obj) {
    this._options.query = obj;
    return this;
  }

  redirects(times) {
    this._options.redirects = times;
    return this;
  }

  expect(...args) {
    const first = typeof args[0];
    switch (first) {
      case "number":
        this._asserts.push({ fn: this._assertStatusCode, args });
        break;
      case "string":
        this._asserts.push({ fn: this._assertHeader, args });
        break;
    }
    return this;
  }

  _assertStatusCode(res, statusCode) {
    assert.equal(res.statusCode, statusCode, "unexpected status code");
  }

  _assertHeader(res, name, expected) {
    const lname = name.toLowerCase();
    if (expected instanceof RegExp) {
      return assert.match(res.headers[lname], expected, `unexpected header ${lname}`);
    }

    assert.equal(res.headers[lname], expected, `unexpected header ${lname}`);
  }

  async execute(...args) {
    if (!this.task) {
      return this.reject(new Error("No task defined in deferred promise."));
    }
    try {
      args.push(this);
      const res = await this.task.call(this, ...args);
      for (const test of this._asserts.splice(0)) {
        test.fn.call(this, res, ...test.args);
      }
      this.resolve(this._result || res);
    } catch (err) {
      this.reject(err);
    }
    return this;
  }
}

function Supertest(initiator, options) {
  if (!(this instanceof Supertest)) return new Supertest(initiator, options);
  this._initiator = initiator;
  this._options = options;
  this.jar = options?.jar;
}

Supertest.agent = function agent(expressApp) {
  return new Supertest(expressApp, { jar: new CookieJar() });
};

Supertest.prototype._makeRequest = function makeRequest(path, options) {
  let server, origin;
  const type = typeof this._initiator;
  switch (type) {
    case "function": {
      server = this.server = http.createServer(this._initiator);
      const port = server.listen(0).address().port;
      origin = `http://127.0.0.1:${port}`;
      break;
    }
    case "number":
      origin = `http://127.0.0.1:${this._initiator}`;
      break;
    default:
      origin = `http://127.0.0.1:${process.env.PORT}`;
  }

  const url = new URL(path, origin);
  if (this.jar) {
    if (options?.headers?.cookie) {
      this.jar.setCookies(options?.headers?.cookie, url.hostname, "/");
    }
    const cookie = this.jar.getCookies({ path, domain: url.hostname }).toValueString();
    options.headers = options.headers || {};
    options.headers.cookie = cookie;
  }

  return got(url.toString(), {
    throwHttpErrors: false,
    followRedirect: false,
    ...options,
    retry: 0,
    hooks: {
      afterResponse: [
        (response) => {
          if (server) server.close();

          if (response.req.method !== "HEAD") {
            Object.defineProperty(response, "text", {
              enumerable: false,
              get() {
                if (!this.rawBody) return undefined;
                return response.rawBody.toString();
              },
            });
          }

          if (this.jar && response.headers["set-cookie"]) {
            for (const c of response.headers["set-cookie"]) {
              this.jar.setCookie(c);
            }
          }

          return response;
        },
      ],
      beforeRedirect: [
        (_, response) => {
          if (this.jar && response.headers["set-cookie"]) {
            for (const c of response.headers["set-cookie"]) {
              this.jar.setCookie(c);
            }
          }
        },
      ],
      beforeError: [
        (err) => {
          if (server) server = server.close();
          return err;
        },
      ],
    },
  });
};

Supertest.prototype.get = function get(path) {
  return this.request("get", path);
};

Supertest.prototype.head = function head(path) {
  return this.request("head", path);
};

Supertest.prototype.post = function post(path, body) {
  return this.request("post", path, { body });
};

Supertest.prototype.put = function put(path, body) {
  return this.request("put", path, { body });
};

Supertest.prototype.delete = function del(path) {
  return this.request("delete", path);
};

Supertest.prototype.del = Supertest.prototype.delete;

Supertest.prototype.request = function request(method, path, options) {
  const deferred = new SuperRequest();
  deferred.defer(() => {
    return new Promise((resolve, reject) => {
      process.nextTick(() => {
        return this._makeRequest(path, {
          method,
          ...deferred.options,
          ...options,
        }).then(resolve).catch(reject);
      });
    });
  });
  deferred.execute();
  return deferred;
};