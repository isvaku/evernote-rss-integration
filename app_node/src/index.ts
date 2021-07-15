import express from "express";
import Parser from "rss-parser";
import htmlParser from 'node-html-parser';

const app = express();

app.get("/", async (req, res) => {
  res.send("Well done!");
});
app.listen(3000, () => {
  console.log("The application is listening on port 3000!");
});
