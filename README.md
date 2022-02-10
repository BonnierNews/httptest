HTTP Test
=========

[![Built latest](https://github.com/BonnierNews/httptest/actions/workflows/build-latest.yaml/badge.svg)](https://github.com/BonnierNews/httptest/actions/workflows/build-latest.yaml)

HTTP testing library

# API

## `[new ]HttpTest(initiator[, options])`

Arguments:
- `ìnititator`: Optional argument defaults to `process.env.PORT`
    - Express App: will be used to create a http server, can actually be any function that will act as argument to `http.createServer`
    - port: port number to local http server (`process.env.PORT`)
- `options`: Optional object with options to pass to got

Returns verb functions:
- `get(path)`: http get
- `post(path[, body])`: http get
- `put(path[, body])`: http get
- `delete(path[, body])`: http delete
- `del(path[, body])`: http delete
- `head(path)`: http head
- `request(method, path, options)`: make http request with method

Example:
```js
const app = require("../app");
const request = require("@bonniernews/httptest");

describe("expect", () => {
  it("expect 200", async () => {
    await request(app)
      .get("/")
      .expect(200)
      .expect("content-type", "text/html; charset=utf-8");
  });
});
```

### Verbs

All http verb functions returns a promise and some utility functions

- `set(arg[, arg])`: set header
- `query(arg)`: set query
- `send(arg)`: send body
- `json([bool])`: set/unset expect json response
- `redirects(arg)`: set number of max redirects, defaults to 0
- `expect(arg[, arg])`: expect statusCode or header with value

## `HttpTest.agent(initiator, options)`

Returns HTTP tester with cookie jar exposed as property `jar`. Subsequent requests will forward cookies.
