const { google } = require('googleapis');

exports.handler = async function(event) {
  try {
    // Wczytanie credentials: produkcja -> GOOGLE_SERVICE_ACCOUNT, lokalnie -> GOOGLE_SERVICE_ACCOUNT_PATH
    let credentials;
    if (process.env.GOOGLE_SERVICE_ACCOUNT) {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
      const fs = require('fs');
      credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_PATH, 'utf8'));
    } else {
      throw new Error('Brak danych konta serwisowego. Ustaw GOOGLE_SERVICE_ACCOUNT lub GOOGLE_SERVICE_ACCOUNT_PATH.');
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // POST - dodawanie komentarza
    if (event.httpMethod === 'POST') {
      const { nick, comment, postId } = JSON.parse(event.body);
      if (!nick || !comment || !postId) {
        return { statusCode: 400, body: 'Missing nick, comment, or postId' };
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A:C', // <-- zmień 'Sheet1' na nazwę swojego arkusza
        valueInputOption: 'RAW',
        requestBody: { values: [[nick, comment, postId]] },
      });

      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    // GET - pobieranie komentarzy dla danego wpisu
    if (event.httpMethod === 'GET') {
      const postId = event.queryStringParameters?.postId;
      if (!postId) {
        return { statusCode: 400, body: 'Missing postId query parameter' };
      }

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sheet1!A:C', // <-- zmień 'Sheet1' na nazwę swojego arkusza
      });

      const values = res.data.values || [];
      const comments = values
        .filter(row => row[2] === postId)
        .map(row => ({ nick: row[0], comment: row[1] }));

      return { statusCode: 200, body: JSON.stringify(comments) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error('Błąd funkcji comments:', err);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};
