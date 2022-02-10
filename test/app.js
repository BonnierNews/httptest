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

app.post("/", (req, res) => {
  res.set("in-url", req.url);
  res.set("set-cookie", [ "a=b" ]);
  return res.send("<html/>");
});

app.post("/api", bodyParser.json(), (req, res) => {
  return res.send(req.body);
});

app.post("/redirect", (req, res) => {
  res.set("set-cookie", [ "redirect=root; path=/" ]);
  return res.redirect("/");
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
    res.status(req.params.statusCode).send({});
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res) => {
  res.status(500).send(err);
});

module.exports = app;
