const express = require('express');
const Imap = require('imap');
const bodyParser = require('body-parser');
const inspect = require('util').inspect;
const app = express();

let userConfig = null;

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/setup', (req, res) => {
  res.send(`
    <form method="POST" action="/setup">
      <label>Email: <input name="user" required /></label><br>
      <label>Password: <input name="password" type="password" required /></label><br>
      <label>IMAP Host: <input name="host" value="imap.home.pl" required /></label><br>
      <label>Port: <input name="port" type="number" value="993" required /></label><br>
      <button type="submit">Connect</button>
    </form>
  `);
});

app.post('/setup', (req, res) => {
  userConfig = {
    user: req.body.user,
    password: req.body.password,
    host: req.body.host,
    port: parseInt(req.body.port),
    tls: true
  };
  res.send('✅ IMAP settings saved. Go to /emails to see your inbox.');
});

app.get('/emails', (req, res) => {
  if (!userConfig) {
    return res.send('⚠️ Please set up your email first at <a href="/setup">/setup</a>.');
  }

  const imap = new Imap(userConfig);

  function openInbox(cb) {
    imap.openBox('INBOX', true, cb);
  }

  imap.once('ready', function () {
    openInbox(function (err, box) {
      if (err) throw err;
      const f = imap.seq.fetch('1:10', {
        bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)', 'TEXT'],
        struct: true
      });

      let messages = [];

      f.on('message', function (msg) {
        let message = {};
        msg.on('body', function (stream) {
          let buffer = '';
          stream.on('data', function (chunk) {
            buffer += chunk.toString('utf8');
          });
          stream.on('end', function () {
            message.body = buffer;
          });
        });

        msg.once('attributes', function (attrs) {
          message.attrs = attrs;
        });

        msg.once('end', function () {
          messages.push(message);
        });
      });

      f.once('end', function () {
        imap.end();
        res.send(`<pre>${inspect(messages, false, Infinity)}</pre>`);
      });
    });
  });

  imap.once('error', function (err) {
    res.send('❌ Error: ' + err.message);
  });

  imap.connect();
});

app.listen(8080, () => console.log('Listening on http://localhost:8080'));
