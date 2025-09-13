const { google } = require('googleapis');

exports.handler = async function(event) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const client = await auth.getClient();
  const sheets = google.sheets({version: 'v4', auth: client});
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (event.httpMethod === 'POST') {
    const { nick, comment } = JSON.parse(event.body);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:B',
      valueInputOption: 'RAW',
      requestBody: { values: [[nick, comment]] },
    });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  if (event.httpMethod === 'GET') {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A:B',
    });
    const values = res.data.values || [];
    const comments = values.map(row => ({ nick: row[0], comment: row[1] }));
    return { statusCode: 200, body: JSON.stringify(comments) };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
