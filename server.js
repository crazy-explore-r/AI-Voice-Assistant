require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Endpoint to proxy OpenAI API calls
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        // Check if API key is set
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        // Make request to OpenAI
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "You are a helpful voice assistant for website visitors." },
                    { role: "user", content: message }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Error proxying to OpenAI:', error.response?.data || error.message);

        res.status(error.response?.status || 500).json({
            error: error.response?.data || error.message
        });
    }
});

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
