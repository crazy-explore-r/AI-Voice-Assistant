require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

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

// Voice chat endpoint: audio upload -> STT -> LLM -> TTS -> return audio (streamed)
app.post('/api/voice-chat', upload.single('audio'), async (req, res) => {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }
        // 1. Speech-to-Text (STT)
        const audioPath = req.file.path;
        const audioStream = fs.createReadStream(audioPath);
        const sttResponse = await axios.post(
            'https://api.openai.com/v1/audio/transcriptions',
            (() => {
                const form = new require('form-data')();
                form.append('file', audioStream, req.file.originalname);
                form.append('model', 'whisper-1');
                return form;
            })(),
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    ...((() => {
                        const form = new require('form-data')();
                        form.append('file', audioStream, req.file.originalname);
                        form.append('model', 'whisper-1');
                        return form.getHeaders();
                    })())
                }
            }
        );
        const transcription = sttResponse.data.text;
        // 2. Chat Completion (GPT-4.1 mini)
        const chatResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4.1-mini',
                messages: [
                    { role: 'system', content: 'You are a helpful voice assistant for website visitors.' },
                    { role: 'user', content: transcription }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        const aiText = chatResponse.data.choices[0].message.content;
        // 3. Text-to-Speech (TTS) - stream response
        const ttsResponse = await axios.post(
            'https://api.openai.com/v1/audio/speech',
            {
                model: 'tts-1',
                input: aiText,
                voice: 'alloy'
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer'
            }
        );
        // Return audio as base64 (no file write/read)
        const audioBase64 = Buffer.from(ttsResponse.data).toString('base64');
        res.json({
            transcription,
            text: aiText,
            audioBase64,
            audioMime: 'audio/mpeg'
        });
        // Clean up uploaded file
        fs.unlink(audioPath, () => {});
    } catch (error) {
        console.error('Voice chat error:', error.response?.data || error.message);
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
