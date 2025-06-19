# Voice Agent Application

## Setup Instructions

1. Install dependencies:
   ```
   npm install
   ```

2. Create a .env file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   PORT=3000
   ```

3. Start the server:
   ```
   npm start
   ```

4. Open your browser to http://localhost:3000

## Security Notes

- The API key is now stored on the server-side and not exposed in the frontend code
- .env files should never be committed to source control
- Add .env to your .gitignore file if you're using git

## Browser Compatibility

For optimal performance, use Chrome or Edge as they have the best support for the Web Speech API.
