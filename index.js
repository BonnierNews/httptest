"use strict";

const http = require("http");
const got = require("got");
const assert = require("assert");
const { CookieJar } = require("cookiejar");

module.exports = HttpTest;

class HttpTestRequest extends Promise {
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
      contentType: null,
    };
  }

  get options() {
    const { query, redirects, headers, contentType, ...rest } = this._options;
    return {
      ...(query && { searchParams: query }),
      ...(redirects && {
        followRedirect: true,
        maxRedirects: redirects,
      }),
      headers: {
        ...(contentType && { "content-type": contentType }),
        ...headers,
      },
      ...rest,
    };
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

  send(body) {
    const type = typeof body;
    const options = this._options;
    switch (type) {
      case "string":
        options.contentType = "text/plain";
        options.body = body;
        break;
      case "object": {
        if (body) options.json = body;
        options.contentType = null;
        delete options.body;
        break;
      }
    }
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
        this._asserts.push({ fn: assertStatusCode, args });
        break;
      case "string":
        this._asserts.push({ fn: assertHeader, args });
        break;
    }
    return this;
  }

  async execute(makeRequest) {
    try {
      const res = await makeRequest();
      for (const test of this._asserts.splice(0)) {
        test.fn.call(this, res, ...test.args);
      }
      this.resolve(res);
    } catch (err) {
      this.reject(err);
    }
    return this;
  }
}

function assertStatusCode(res, statusCode) {
  assert.equal(res.statusCode, statusCode, "unexpected status code");
}

function assertHeader(res, name, expected) {
  const lname = name.toLowerCase();
  if (expected instanceof RegExp) {
    return assert.match(res.headers[lname], expected, `unexpected header ${lname}`);
  }

  assert.equal(res.headers[lname], expected, `unexpected header ${lname}`);
}

function HttpTest(initiator, options) {
  if (!(this instanceof HttpTest)) return new HttpTest(initiator, options);
  this._initiator = initiator;
  this._options = options;
  this.jar = options?.jar;
}

HttpTest.agent = function agent(initiator) {
  return new HttpTest(initiator, { jar: new CookieJar() });
};

HttpTest.prototype.get = function get(path) {
  return this.request("get", path);
};

HttpTest.prototype.head = function head(path) {
  return this.request("head", path);
};

HttpTest.prototype.post = function post(path, body) {
  return this.request("post", path, { body });
};

HttpTest.prototype.put = function put(path, body) {
  return this.request("put", path, { body });
};

HttpTest.prototype.delete = function del(path) {
  return this.request("delete", path);
};

HttpTest.prototype.del = HttpTest.prototype.delete;

HttpTest.prototype.request = function request(method, path, options = {}) {
  const deferred = new HttpTestRequest();

  const { body, ...opts } = options;
  if (body !== undefined) {
    deferred.send(body);
  }

  deferred.execute(() => {
    return new Promise((resolve, reject) => {
      process.nextTick(() => {
        return this._makeRequest(path, {
          method,
          ...deferred.options,
          ...opts,
        }).then(resolve).catch(reject);
      });
    });
  });
  return deferred;
};

HttpTest.prototype._makeRequest = function makeRequest(path, options) {
  let server, origin;
  const jar = this.jar;
  const type = typeof this._initiator;
  switch (type) {
    case "function": {
      server = http.createServer(this._initiator);
      const port = server.listen(0).address().port;
      origin = `http://127.0.0.1:${port}`;
      break;
    }
    case "number":
      origin = `http://127.0.0.1:${this._initiator}`;
      break;
    case "string":
      origin = this._initiator;
      break;
    default:
      origin = `http://127.0.0.1:${process.env.PORT}`;
  }

  const url = new URL(path, origin);
  if (jar) {
    if (options?.headers?.cookie) {
      jar.setCookies(options?.headers?.cookie, url.hostname, "/");
    }
    const cookie = jar.getCookies({ path, domain: url.hostname }).toValueString();
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

          if (jar) setCookies(jar, response.headers["set-cookie"]);
          Object.defineProperty(response, "text", {
            enumerable: false,
            get() {
              return response.rawBody.toString();
            },
          });

          return response;
        },
      ],
      beforeRedirect: [
        (_, response) => {
          if (jar) setCookies(jar, response.headers["set-cookie"]);
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

function setCookies(jar, setHeaders) {
  if (!setHeaders?.length) return;

  for (const c of setHeaders) {
    jar.setCookie(c);
  }
}
