/* eslint-disable no-var */
"use strict";

const app = require("./app");
const http = require("http");
const request = require("..");

const PORT = process.env.PORT;

describe("httptest", () => {
  describe("initate", () => {
    it("works with port only", async () => {
      const server = http.createServer(app);
      try {
        server.listen(0);
        await request(server.address().port)
          .get("/")
          .expect(200);
      } finally {
        server.close();
      }
    });

    it("defaults to process.env.PORT", async () => {
      const server = http.createServer(app);
      try {
        process.env.PORT = server.listen(0).address().port;
        await request()
          .get("/")
          .expect(200);
      } finally {
        process.env.PORT = PORT;
        server.close();
      }
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

  describe("head", () => {
    it("head returns no body", async () => {
      const resp = await request(app)
        .head("/")
        .expect(200)
        .expect("content-length", "7");
      expect(resp.text).to.be.undefined;
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
        .set({
          Cookie: "channel=mobile; canShowFullpageAds=1; didomi_token=CONSENTDATA",
        })
        .expect(200);

      expect(resp.headers["in-cookie"]).to.equal("channel=mobile; canShowFullpageAds=1; didomi_token=CONSENTDATA");
    });
  });

  describe("query", () => {
    it("sets query", async () => {
      const resp = await request(app)
        .head("/")
        .query({ a: "b" })
        .expect(200);

      expect(resp.headers["in-url"]).to.equal("/?a=b");
    });
  });

  describe("send", () => {
    it("sends body", async () => {
      const resp = await request(app)
        .post("/api")
        .send({ a: "b" })
        .expect(200);

      expect(JSON.parse(resp.body)).to.deep.equal({ a: "b" });
    });
  });

  describe("json", () => {
    it("expects json body", async () => {
      const resp = await request(app)
        .post("/api")
        .send({ a: "b" })
        .json()
        .expect(200);

      expect(resp.body).to.deep.equal({ a: "b" });
    });
  });

  describe("redirects", () => {
    it("redirect 1 redirects request", async () => {
      const resp = await request(app)
        .post("/redirect")
        .redirects(1)
        .expect(200);

      expect(resp.headers["in-url"]).to.equal("/");
    });

    it("sets cookies", async () => {
      const agent = request.agent(app);

      const resp = await agent
        .post("/redirect")
        .redirects(1)
        .expect(200);

      expect(resp.headers["in-url"]).to.equal("/");
      expect(agent.jar.getCookies({ path: "/" }).toValueString()).to.equal("redirect=root; a=b");
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
        await request(app).get("/api/parse/204");
      } catch (e) {
        var err = e;
      }

      expect(err).to.have.property("code", "ECONNRESET");
    });
  });
});
