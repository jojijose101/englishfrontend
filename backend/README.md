# SpeakSmart Django Backend

## Setup

1. Install Python 3.10+
2. Create virtual environment:
   ```
   python -m venv venv
   venv\Scripts\activate  (Windows)
   source venv/bin/activate  (Mac/Linux)
   ```
3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
4. Copy .env.example to .env and fill in your API keys:
   ```
   copy .env.example .env
   ```
5. Run migrations:
   ```
   python manage.py migrate
   ```
6. Start server:
   ```
   python manage.py runserver 0.0.0.0:5000
   ```

## API Endpoints

| Method | Endpoint    | Description                                          |
|--------|-------------|------------------------------------------------------|
| POST   | /api/stt/   | Speech to Text (accepts multipart audio file)        |
| POST   | /api/chat/  | AI Tutor response (accepts JSON {transcript, mode})  |
| POST   | /api/tts/   | Text to Speech (accepts JSON {text}, returns audio/mpeg) |
| GET    | /           | Health check                                         |

## API Keys needed

- **OPENAI_API_KEY** — get yours at [platform.openai.com](https://platform.openai.com)
- **ELEVENLABS_API_KEY** — get yours at [elevenlabs.io](https://elevenlabs.io)

## Practice Modes (for /api/chat/)

Send `mode` field in your JSON body:
- `free` (default) — Free conversation practice
- `grammar` — Focused grammar correction
- `roleplay` — Job interview roleplay scenario

## Response format from /api/chat/

```json
{
  "correction": "Corrected sentence, or null if already correct",
  "reply": "Miss Nova's English reply",
  "tip": "One helpful pronunciation or vocabulary tip",
  "score": "Excellent | Good | Try Again",
  "hindi_hint": "Hindi translation of the reply"
}
```
