const express = require('express');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const app = express();
const port = 3000;

// Enable form parsing
app.use(express.urlencoded({ extended: true }));

// Paths
const dataDir = path.join(__dirname, 'data');
const dataFilePath = path.join(dataDir, 'urls.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Load or initialize URL data
let urls = [];
if (fs.existsSync(dataFilePath)) {
    urls = JSON.parse(fs.readFileSync(dataFilePath));
}

// Save function
function saveData() {
    fs.writeFileSync(dataFilePath, JSON.stringify(urls, null, 2));
}

// Password protection middleware
const PASSWORD = "123456789"; // <-- رمز عبور خودتو اینجا میتونی تغییر بدی

function authenticate(req, res, next) {
    const password = req.query.password;
    if (!password || password !== PASSWORD) {
        return res.status(401).send('Unauthorized: Incorrect or missing password.');
    }
    next();
}

// Homepage
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Pay $1</title>
            <style>
                body {
                    background-color: #f9f9f9;
                    font-family: 'Courier New', Courier, monospace;
                    font-style: italic;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                h1 {
                    font-size: 2em;
                    color: #333;
                    margin-bottom: 30px;
                }
                button {
                    background-color: #0070f3;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 12px 24px;
                    font-size: 18px;
                    cursor: pointer;
                    transition: background-color 0.3s ease;
                    font-family: 'Courier New', Courier, monospace;
                    font-style: italic;
                }
                button:hover {
                    background-color: #005bb5;
                }
            </style>
        </head>
        <body>
            <h1>Pay $1 to find out how many people have paid.</h1>
            <form action="/pay" method="POST">
                <button type="submit">Pay $1</button>
            </form>
        </body>
        </html>
    `);
});

// Handle payment
app.post('/pay', (req, res) => {
    const randomString = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(randomString).digest('hex');

    urls.push({
        id: hash,
        timestamp: Date.now(),
        valid: true,
        firstVisit: true
    });

    saveData();

    res.redirect(`/thankyou/${hash}`);
});

// Thank you page
app.get('/thankyou/:id', (req, res) => {
    const user = urls.find(u => u.id === req.params.id);

    if (!user) {
        return res.status(404).send('Invalid link.');
    }

    const fullUrl = `http://localhost:3000/thankyou/${req.params.id}`;

    if (user.firstVisit) {
        user.firstVisit = false;
        saveData();

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Thank you</title>
                <style>
                    body {
                        background-color: #f9f9f9;
                        font-family: 'Courier New', Courier, monospace;
                        font-style: italic;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                    }
                    h1 {
                        font-size: 2em;
                        color: #333;
                        margin-bottom: 20px;
                    }
                    .url-box {
                        margin-top: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                    }
                    input {
                        padding: 8px;
                        font-size: 14px;
                        width: 300px;
                        border: 1px solid #ccc;
                        border-radius: 6px;
                        text-align: center;
                        font-family: 'Courier New', Courier, monospace;
                        font-style: italic;
                    }
                    button.copy-btn {
                        padding: 8px 12px;
                        font-size: 14px;
                        background-color: #0070f3;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-family: 'Courier New', Courier, monospace;
                        font-style: italic;
                    }
                    button.copy-btn:hover {
                        background-color: #005bb5;
                    }
                </style>
            </head>
            <body>
                <h1>Number of contributors: ${urls.length}</h1>
                <div class="url-box">
                    <input type="text" id="urlInput" value="${fullUrl}" readonly />
                    <button class="copy-btn" onclick="copyURL()">Copy</button>
                </div>
			<p style="margin-top: 20px; font-size: 14px; color: #666;">Save this link in a safe place. You will need it 				later.</p>


                <script>
                    function copyURL() {
                        var copyText = document.getElementById("urlInput");
                        copyText.select();
                        copyText.setSelectionRange(0, 99999);
                        document.execCommand("copy");
                        alert("URL copied to clipboard!");
                    }
                </script>
            </body>
            </html>
        `);
    } else {
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Information</title>
                <style>
                    body {
                        background-color: #f9f9f9;
                        font-family: 'Courier New', Courier, monospace;
                        font-style: italic;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        text-align: center;
                    }
                    p {
                        font-size: 18px;
                        color: #555;
                    }
                </style>
            </head>
            <body>
                <p>Soon, this URL will be worth one dollar and will be transferable.</p>
            </body>
            </html>
        `);
    }
});

// API to fetch all URLs (Protected)
app.get('/api/urls', authenticate, (req, res) => {
    res.json(urls);
});

// API to fetch only the count (Protected)
app.get('/api/count', authenticate, (req, res) => {
    res.json({ count: urls.length });
});

// Start server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
