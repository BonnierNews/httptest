"use strict";

const bodyParser = require("body-parser");
const express = require("express");

const app = express();

app.disable("x-powered-by");

app.get("/", (req, res) => {
  res.set("in-url", req.url);
  res.set("in-cookie", req.get("cookie"));
  return res.send("<html/>");
});

app.head("/", (req, res) => {
  res.set("content-length", "<html/>".length);
  res.set("content-type", "text/html; charset=utf-8");
  res.writeHead(200);
  res.end();
});

app.post("/", (req, res) => {
  res.set("in-url", req.url);
  res.set("set-cookie", [ "a=b" ]);
  res.set("content-type", req.get("content-type"));
  return req.pipe(res);
});

app.delete("/", (req, res) => {
  return res.status(204).send();
});

app.post("/api", bodyParser.json(), (req, res) => {
  return res.status(201).send(req.body);
});

app.put("/content", bodyParser.text({ type: "*/*" }), (req, res) => {
  return res.status(200).send(req.body);
});

app.put("/api", bodyParser.json(), (req, res) => {
  return res.status(200).send(req.body);
});

app.post("/see-other", (req, res) => {
  res.set("set-cookie", [ "redirect=root; path=/" ]);
  return res.redirect(303, "/");
});

app.post("/redirectverb", (req, res) => {
  res.set("set-cookie", [ "redirect=root; path=/" ]);
  return res.redirect(307, "/");
});

app.get("/redirectchain", (req, res) => {
  return res.redirect("/redirectchain");
});

app.get("/parse/:statusCode", (req, res, next) => {
  const statusCode = parseInt(req.params.statusCode);
  try {
    res.setHeader("content-length", 0);
    res.setHeader("content-type", "text/html");

    res.status(statusCode);
    if (statusCode === 204) return res.end();
    return res.end("<html/>");
  } catch (err) {
    next(err);
  }
});

app.get("/api/parse/:statusCode", (req, res, next) => {
  try {
    res.set("content-length", 0);
    res.set("content-type", "application/json");
    const statusCode = parseInt(req.params.statusCode);
    if (statusCode === 204) {
      return res.socket.destroy();
    }
    res.status(statusCode).send({});
  } catch (err) {
    next(err);
  }
});

app.get("/econnreset", (req, res) => {
  return res.socket.destroy();
});

app.use((req, res) => {
  res.status(404).send(new Error(`Not found ${req.path}`));
});

app.use((err, req, res) => {
  return res.status(500).send(err);
});

module.exports = app;
