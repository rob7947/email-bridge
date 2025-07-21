// server.js
const express = require("express");
const Imap = require("imap");
const { simpleParser } = require("mailparser");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();
app.use(cors());

const imapConfig = {
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,
  host: "serwer2086597.home.pl",
  port: 993,
  tls: true,
};

function openInbox(imap) {
  return new Promise((resolve, reject) => {
    imap.openBox("INBOX", true, (err, box) => {
      if (err) reject(err);
      else resolve(box);
    });
  });
}

app.get("/emails", async (req, res) => {
  const imap = new Imap(imapConfig);

  function fetchEmails() {
    return new Promise((resolve, reject) => {
      let emails = [];

      imap.once("ready", async () => {
        try {
          await openInbox(imap);

          const sinceDate = new Date();
          sinceDate.setDate(sinceDate.getDate() - 90);

          imap.search(["ALL", ["SINCE", sinceDate.toDateString()]], (err, results) => {
            if (err || !results || results.length === 0) {
              imap.end();
              return resolve([]);
            }

            const f = imap.fetch(results.slice(-50), { bodies: "" });

            f.on("message", (msg) => {
              msg.on("body", (stream) => {
                simpleParser(stream, (err, parsed) => {
                  if (!err && parsed) {
                    emails.push({
                      from: parsed.from.text,
                      subject: parsed.subject,
                      date: parsed.date,
                      text: parsed.text,
                    });
                  }
                });
              });
            });

            f.once("end", () => {
              imap.end();
              resolve(emails);
            });
          });
        } catch (e) {
          reject(e);
        }
      });

      imap.once("error", (err) => {
        reject(err);
      });

      imap.connect();
    });
  }

  try {
    const emails = await fetchEmails();
    res.json(emails);
  } catch (err) {
    res.status(500).send("Failed to fetch emails: " + err.message);
  }
});

app.listen(8080, () => {
  console.log("Listening on http://localhost:8080");
});
