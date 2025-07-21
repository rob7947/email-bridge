const express = require('express');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const app = express();
const PORT = process.env.PORT || 8080;

const imapConfig = {
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,
  host: process.env.IMAP_HOST || 'serwer2086597.home.pl',
  port: 993,
  tls: true
};

let cachedEmails = [];

function fetchEmails(cb) {
  const imap = new Imap(imapConfig);

  imap.once('ready', () => {
    imap.openBox('INBOX', true, (err, box) => {
      if (err) throw err;
      const fetch = imap.seq.fetch(`${box.messages.total - 49}:*`, {
        bodies: '',
        struct: true
      });

      const emails = [];

      fetch.on('message', (msg) => {
        msg.on('body', (stream) => {
          simpleParser(stream, (err, parsed) => {
            if (!err && parsed) {
              emails.push({
                from: parsed.from.text,
                subject: parsed.subject,
                date: parsed.date,
                text: parsed.text
              });
            }
          });
        });
      });

      fetch.once('end', () => {
        imap.end();
        cb(emails.reverse());
      });
    });
  });

  imap.once('error', (err) => {
    console.error('IMAP error:', err);
    cb([]);
  });

  imap.connect();
}

app.get('/', (req, res) => {
  res.send('Email Bridge Running');
});

app.get('/emails', (req, res) => {
  fetchEmails((emails) => {
    cachedEmails = emails;
    res.json(emails);
  });
});

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
