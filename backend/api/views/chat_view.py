import json
import re
import traceback
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from api.groq_client import get_groq_client

SYSTEM_PROMPT = '''You are Miss Nova, a friendly and encouraging AI English tutor for classroom students.
The student just spoke in English. You must do 4 things:
1) Check and correct any grammar or spelling mistakes.
2) Reply naturally to continue the conversation (max 60 words).
3) Give one short, helpful pronunciation or vocabulary tip.
4) Translate your English reply to Malayalam.

ALWAYS respond with ONLY this exact JSON object (no extra text, no markdown):
{"correction": "corrected version of what student said, or null if already correct", "reply": "your English reply here", "tip": "one helpful tip here", "score": "Excellent", "malayalam_hint": "Malayalam translation of your reply"}

For score field use exactly one of: Excellent, Good, Try Again'''

MODE_INSTRUCTIONS = {
    'grammar': 'Focus extra attention on grammar correction every sentence.',
    'roleplay': 'You are a friendly job interviewer. Stay in character as the interviewer while still filling the JSON fields.',
    'free': 'Have a natural free conversation on any topic the student chooses.',
}


def extract_json(raw: str) -> dict:
    text = (raw or '').strip()
    if text.startswith('```'):
        text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\s*```$', '', text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


def normalize_tutor(data: dict, fallback_reply: str = '') -> dict:
    score = str(data.get('score') or 'Good')
    if 'excellent' in score.lower():
        score = 'Excellent'
    elif 'try' in score.lower():
        score = 'Try Again'
    else:
        score = 'Good'

    correction = data.get('correction')
    if correction in ('', 'null', 'None'):
        correction = None

    return {
        'correction': correction,
        'reply': data.get('reply') or fallback_reply or 'Let us keep practicing. Tell me more!',
        'tip': data.get('tip') or 'Speak a little slower and stress the important words.',
        'score': score,
        'malayalam_hint': data.get('malayalam_hint') or '',
    }


class ChatView(APIView):
    def post(self, request):
        transcript = (request.data.get('transcript') or '').strip()
        mode = request.data.get('mode') or 'free'
        history = request.data.get('history') or []

        if not transcript:
            return Response({'error': 'No transcript provided'}, status=status.HTTP_400_BAD_REQUEST)

        mode_note = MODE_INSTRUCTIONS.get(mode, MODE_INSTRUCTIONS['free'])
        user_msg = f'{mode_note}\nStudent said: "{transcript}"'

        messages = [{'role': 'system', 'content': SYSTEM_PROMPT}]
        if isinstance(history, list):
            for turn in history[-8:]:
                if not isinstance(turn, dict):
                    continue
                text = (turn.get('text') or '').strip()
                if not text:
                    continue
                role = 'assistant' if turn.get('role') == 'ai' else 'user'
                messages.append({'role': role, 'content': text})
        messages.append({'role': 'user', 'content': user_msg})

        try:
            client = get_groq_client()
            common = {
                'model': 'openai/gpt-oss-20b',
                'messages': messages,
                'max_tokens': 1200,
                'temperature': 0.7,
                'extra_body': {'reasoning_effort': 'low'},
            }
            try:
                completion = client.chat.completions.create(
                    **common,
                    response_format={'type': 'json_object'},
                )
            except Exception:
                completion = client.chat.completions.create(**common)

            message = completion.choices[0].message
            raw = (message.content or '').strip()
            if not raw:
                raw = str(getattr(message, 'reasoning', '') or '')

            try:
                data = extract_json(raw)
            except (json.JSONDecodeError, ValueError):
                data = {
                    'correction': None,
                    'reply': raw or 'Nice try! Say that again a little more clearly.',
                    'tip': 'Keep practicing! You are doing great.',
                    'score': 'Good',
                    'malayalam_hint': '',
                }

            return Response(normalize_tutor(data, fallback_reply=raw))

        except Exception as e:
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
