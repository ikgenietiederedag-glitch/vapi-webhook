require('dotenv').config();

const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
const vapiSecret = process.env.VAPI_SECRET;

if (!vapiSecret) {
  throw new Error('VAPI_SECRET must be set');
}

app.use(express.json());

app.post('/vapi/webhook', (req, res) => {
  if (req.get('x-vapi-secret') !== vapiSecret) {
    return res.status(401).send('Unauthorized');
  }

  console.log('Vapi transcript:', req.body.transcript || req.body);
  return res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`Vapi webhook listening on port ${port}`);
});