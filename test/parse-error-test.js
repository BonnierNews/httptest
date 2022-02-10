/* eslint-disable no-var */
"use strict";

const app = require("./app");
const request = require("..");

describe("Parse Error", () => {
  it("throws parse error if 204 sends body", async () => {
    const resp = await request(app)
      .get("/parse/204")
      .expect(204);

    expect(resp.headers).to.have.property("content-length", "0");
    expect(resp.headers).to.have.property("content-type", "text/html");
  });

  [ 200, 301, 302, 307, 308 ].forEach((statusCode) => {
    it(`throws parse error if ${statusCode} sends body and content length 0`, async () => {
      try {
        await request(app)
          .get(`/parse/${statusCode}`)
          .expect(statusCode);
      } catch (e) {
        var err = e;
      }

      expect(err.message).to.equal("Parse Error: Expected HTTP/");
      expect(err.code).to.equal("HPE_INVALID_CONSTANT");
    });

    it(`throws api parse error if ${statusCode} sends body`, async () => {
      const resp = await request(app)
        .get(`/api/parse/${statusCode}`)
        .expect(statusCode);

      expect(resp.headers).to.have.property("content-length", "2");
      expect(resp.headers).to.have.property("content-type", "application/json; charset=utf-8");
    });
  });

  it("api throws parse error if 302 sends body", async () => {
    const resp = await request(app)
      .get("/api/parse/302")
      .expect(302);

    expect(resp.headers).to.have.property("content-length", "2");
    expect(resp.headers).to.have.property("content-type", "application/json; charset=utf-8");
  });
});
