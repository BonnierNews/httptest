/* eslint-disable no-var */
"use strict";

const app = require("./app");
const request = require("..");

const PORT = process.env.PORT;

describe("httptest", () => {
  describe("initate", () => {
    it("works with port only", async () => {
      const server = await request.startHttpServer(app);
      try {
        await request(server.address().port)
          .get("/")
          .expect(200);
      } finally {
        server.close();
      }
    });

    it("works with fully fledged origin", async () => {
      const server = await request.startHttpServer(app);
      try {
        await request(`http://127.0.0.1:${server.address().port}`)
          .get("/")
          .expect(200);
      } finally {
        server.close();
      }
    });

    it("defaults to process.env.PORT", async () => {
      const server = await request.startHttpServer(app);
      try {
        process.env.PORT = server.address().port;
        await request()
          .get("/")
          .expect(200);
      } finally {
        process.env.PORT = PORT;
        server.close();
      }
    });
  });

  describe("get", () => {
    it("returns text body", async () => {
      const resp = await request(app)
        .get("/")
        .expect(200)
        .expect("content-length", "7");
      expect(resp.text).to.be.ok;
    });
  });

  describe("put", () => {
    it("put stringified object body with content type header returns json object", async () => {
      const resp = await request(app)
        .put("/api", JSON.stringify({ foo: "bar" }))
        .set("content-type", "application/json")
        .json()
        .expect(200)
        .expect("content-type", "application/json; charset=utf-8");

      expect(resp.body).to.deep.equal({ foo: "bar" });
    });

    it("put object body returns 200", async () => {
      const resp = await request(app)
        .put("/api", { foo: "bar" })
        .expect(200);

      expect(resp.text).to.equal("{\"foo\":\"bar\"}");
    });

    it("put object body and json returns json object", async () => {
      const resp = await request(app)
        .put("/api", { foo: "bar" })
        .json()
        .expect(200)
        .expect("content-type", "application/json; charset=utf-8");

      expect(resp.body).to.deep.equal({ foo: "bar" });
    });

    it("put body as string with content-type is ok", async () => {
      const resp = await request(app)
        .put("/content", "<foo/>")
        .set("content-type", "text/plain")
        .expect(200)
        .expect("content-type", "text/html; charset=utf-8");

      expect(resp.text).to.equal("<foo/>");
    });

    it("put body as string without content-type is ok", async () => {
      const resp = await request(app)
        .put("/content", "<foo/>")
        .expect(200)
        .expect("content-type", "text/html; charset=utf-8");

      expect(resp.text).to.equal("<foo/>");
    });

    it("put body as string and then change to json is ok", async () => {
      const resp = await request(app)
        .put("/api", "<foo/>")
        .send({ foo: "bar" })
        .json()
        .expect(200)
        .expect("content-type", "application/json; charset=utf-8");

      expect(resp.body).to.deep.equal({ foo: "bar" });
    });

    it("put null is ok", async () => {
      const resp = await request(app)
        .put("/api", null)
        .json()
        .expect(200)
        .expect("content-type", "application/json; charset=utf-8");

      expect(resp.body).to.deep.equal({});
    });
  });

  describe("delete", () => {
    it("sends delete request", () => {
      return request(app)
        .delete("/")
        .expect(204);
    });

    it("del sends delete request", () => {
      return request(app)
        .del("/")
        .expect(204);
    });
  });

  describe("head", () => {
    it("head returns no body", async () => {
      const resp = await request(app)
        .head("/")
        .expect(200)
        .expect("content-length", "7");
      expect(resp.text).to.be.empty;
    });
  });

  describe("expect status code", () => {
    it("returns 200", async () => {
      const resp1 = await request(app)
        .get("/")
        .expect(200);

      expect(resp1.headers).to.have.property("content-type", "text/html; charset=utf-8");

      const resp2 = await request(app)
        .get("/")
        .expect(200);

      expect(resp2.headers).to.have.property("content-type", "text/html; charset=utf-8");
    });

    it("throws if unexpeted status code", async () => {
      try {
        await request(app)
          .get("/")
          .expect(201);
      } catch (e) {
        var err = e;
      }

      expect(err.message).to.equal("unexpected status code");
    });
  });

  describe("expect header", () => {
    it("ok if header match string", async () => {
      await request(app)
        .get("/")
        .expect(200)
        .expect("content-type", "text/html; charset=utf-8");
    });

    it("ok if header match regexp", async () => {
      await request(app)
        .get("/")
        .expect(200)
        .expect("content-type", /html/);
    });

    it("throws if mismatch string", async () => {
      try {
        await request(app)
          .get("/")
          .expect("Content-Length", "8");
      } catch (e) {
        var err = e;
      }

      expect(err.message).to.equal("unexpected header content-length");
    });

    it("throws if mismatch regexp", async () => {
      try {
        await request(app)
          .get("/")
          .expect("Content-type", /json/);
      } catch (e) {
        var err = e;
      }

      expect(err.message).to.equal("unexpected header content-type");
    });
  });

  describe("set", () => {
    it("sets header from string", async () => {
      const resp = await request(app)
        .head("/")
        .set("Cookie", "channel=mobile; canShowFullpageAds=1; didomi_token=CONSENTDATA")
        .expect(200);

      expect(resp.headers["in-cookie"]).to.equal("channel=mobile; canShowFullpageAds=1; didomi_token=CONSENTDATA");
    });

    it("sets headers from object", async () => {
      const resp = await request(app)
        .head("/")
        .set({ Cookie: "channel=mobile; canShowFullpageAds=1; didomi_token=CONSENTDATA" })
        .expect(200);

      expect(resp.headers["in-cookie"]).to.equal("channel=mobile; canShowFullpageAds=1; didomi_token=CONSENTDATA");
    });
  });

  describe("query", () => {
    it("sets query", async () => {
      const resp = await request(app)
        .get("/")
        .query({ a: "b" })
        .expect(200);

      expect(resp.headers["in-url"]).to.equal("/?a=b");
    });
  });

  describe("send", () => {
    it("sends json body", async () => {
      const resp = await request(app)
        .post("/api")
        .send({ a: "b" })
        .expect("content-type", "application/json; charset=utf-8")
        .expect(201);

      expect(JSON.parse(resp.text)).to.deep.equal({ a: "b" });
    });

    it("sends html body", async () => {
      const resp = await request(app)
        .post("/")
        .send("<html/>")
        .expect("content-type", "text/plain; charset=utf-8")
        .expect(200);

      expect(resp.text).to.equal("<html/>");
    });

    it("sends content type header", async () => {
      const resp = await request(app)
        .post("/")
        .set("content-type", "text/octet-stream")
        .send("88888888")
        .expect("content-type", "text/octet-stream; charset=utf-8")
        .expect(200);

      expect(resp.text).to.equal("88888888");
    });
  });

  describe("json", () => {
    it("returns body as json", async () => {
      const resp = await request(app)
        .post("/api")
        .send({ a: "b" })
        .json()
        .expect("content-type", "application/json; charset=utf-8")
        .expect(201);

      expect(resp.body).to.deep.equal({ a: "b" });
    });

    it("false responds with text", async () => {
      const resp = await request(app)
        .post("/api")
        .send({ a: "b" })
        .json(false)
        .expect("content-type", "application/json; charset=utf-8")
        .expect(201);

      expect(resp.body).to.equal(JSON.stringify({ a: "b" }));
    });
  });

  describe("redirects", () => {
    it("redirect 1 redirects request", async () => {
      const resp = await request(app)
        .post("/see-other")
        .redirects(1)
        .expect(200);

      expect(resp.headers["in-url"]).to.equal("/");
    });

    it("agent sets cookies on redirect", async () => {
      const agent = request.agent(app);

      const resp = await agent
        .post("/see-other")
        .redirects(1)
        .expect(200);

      expect(resp.headers["in-url"]).to.equal("/");
      expect(agent.jar.getCookies({ path: "/", domain: "127.0.0.1" }).toValueString()).to.equal("redirect=root");
    });

    it("307 preserves verb on redirect", async () => {
      const agent = request.agent(app);

      const resp = await agent
        .post("/redirectverb")
        .redirects(1)
        .expect(200);

      expect(resp.headers["in-url"]).to.equal("/");
      expect(agent.jar.getCookies({ path: "/", domain: "127.0.0.1" }).toValueString()).to.equal("redirect=root; a=b");
    });

    it("reaching max redirects throws", async () => {
      const agent = request.agent(app, {});

      const err = await agent
        .get("/redirectchain")
        .redirects(6)
        .catch((e) => e);

      expect(err.code).to.equal("ERR_TOO_MANY_REDIRECTS");
    });
  });

  describe("agent", () => {
    it("sets cookie on subsequent request", async () => {
      const agent = request.agent(app);

      await agent
        .post("/")
        .expect(200);

      const resp = await agent
        .get("/")
        .expect(200);

      expect(resp.headers["in-cookie"]).to.equal("a=b");
    });

    it("keeps existing cookies on subsequent request", async () => {
      const agent = request.agent(app);

      await agent
        .post("/")
        .set("cookie", "my=bar")
        .expect(200);

      const resp = await agent
        .get("/")
        .expect(200);

      expect(resp.headers["in-cookie"]).to.equal("my=bar; a=b");
    });
  });

  describe("error", () => {
    it("api throws is request is aborted", async () => {
      try {
        await request(app, { bodyTimeout: 50 }).get("/api/parse/204");
      } catch (e) {
        var err = e;
      }

      expect(err).to.have.property("code", "ECONNRESET");
    });
  });
});
