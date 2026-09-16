const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const VAPI_SECRET = process.env.VAPI_SECRET;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = 'Leads';

app.post('/vapi/webhook', async (req, res) => {
  const secret = req.headers['x-vapi-secret'];
  if (VAPI_SECRET && secret !== VAPI_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = req.body;
  const type = payload?.message?.type;
  console.log(`[Vapi] Event: ${type}`);

  if (type === 'end-of-call-report') {
    const call = payload.message;
    const transcript = call.transcript || '';
    const callerPhone = call.customer?.number || 'Unknown';
    const callDuration = call.durationSeconds || 0;
    const endedReason = call.endedReason || '';

    const logEntry = { timestamp: new Date().toISOString(), callerPhone, callDuration, endedReason, transcript: transcript.substring(0, 500) };
    fs.appendFileSync('calls.log', JSON.stringify(logEntry) + '\n');
    console.log('[Vapi] Call logged:', callerPhone);

    let callerName = 'Unknown Caller';
    const nameMatch = transcript.match(/(?:my name is|I'm|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (nameMatch) callerName = nameMatch[1];

    if (AIRTABLE_TOKEN && AIRTABLE_BASE_ID) {
      try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { 'Lead Name': callerName, 'Phone': callerPhone, 'Lead Source': 'AI Voice Agent', 'Status': 'New', 'Inquiry Date': new Date().toISOString().split('T')[0] } })
        });
        if (response.ok) { console.log('[Airtable] Lead created:', callerName); }
        else { const err = await response.text(); console.error('[Airtable] Error:', err); }
      } catch (e) { console.error('[Airtable] Failed:', e.message); }
    }
  }

  res.status(200).json({ received: true });
});

app.get('/', (req, res) => res.json({ status: 'Vapi webhook running' }));
app.listen(PORT, () => console.log(`Vapi webhook listening on port ${PORT}`));
