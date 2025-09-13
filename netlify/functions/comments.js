const fs = require('fs');
const { google } = require('googleapis');

exports.handler = async function(event) {
  try {
    // wczytanie credentials z pliku
    const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_PATH, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (event.httpMethod === 'POST') {
      const { nick, comment, postId } = JSON.parse(event.body);
      if (!nick || !comment || !postId) {
        return { statusCode: 400, body: 'Missing nick, comment, or postId' };
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Arkusz1!A:C', // kolumny: nick, comment, postId
        valueInputOption: 'RAW',
        requestBody: { values: [[nick, comment, postId]] },
      });

      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    if (event.httpMethod === 'GET') {
      const postId = event.queryStringParameters?.postId;
      if (!postId) {
        return { statusCode: 400, body: 'Missing postId query parameter' };
      }

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Arkusz1!A:C',
      });

      const values = res.data.values || [];
      const comments = values
        .filter(row => row[2] === postId) // tylko komentarze dla danego wpisu
        .map(row => ({ nick: row[0], comment: row[1] }));

      return { statusCode: 200, body: JSON.stringify(comments) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};
