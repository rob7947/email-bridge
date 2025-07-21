const express = require("express");
const { simpleParser } = require("mailparser");
const Imap = require("imap");
const app = express();
const port = 8080;

let emails = [];

const imap = new Imap({
  user: process.env.IMAP_USER,
  password: process.env.IMAP_PASSWORD,
  host: process.env.IMAP_HOST,
  port: parseInt(process.env.IMAP_PORT),
  tls: process.env.IMAP_TLS === "true"
});

function openInbox(cb) {
  imap.openBox("INBOX", true, cb);
}

imap.once("ready", function () {
  openInbox(function (err, box) {
    if (err) throw err;
    const f = imap.seq.fetch("1:*", { bodies: "", struct: true });
    f.on("message", function (msg) {
      msg.on("body", function (stream) {
        simpleParser(stream, async (err, parsed) => {
          emails.push({
            from: parsed.from.text,
            subject: parsed.subject,
            date: parsed.date,
            text: parsed.text,
          });
        });
      });
    });
    f.once("end", function () {
      imap.end();
    });
  });
});

imap.connect();

app.get("/inbox", (req, res) => {
  res.json(emails);
});

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
const imap = new Imap({
  user: process.env.IMAP_USER,
  password: process.env.IMAP_PASSWORD,
  host: process.env.IMAP_HOST,
  port: parseInt(process.env.IMAP_PORT),
  tls: process.env.IMAP_TLS === "true"
});
