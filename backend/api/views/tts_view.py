import asyncio
import os
import traceback
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from elevenlabs import ElevenLabs, VoiceSettings
from api.groq_client import get_groq_client

# Official premade Rachel (calm American female). Library IDs like
# U1me6X0sIhQz6nAjDuVU only work after that voice is added to the account.
VOICE_ID = os.getenv('ELEVENLABS_VOICE_ID', '21m00Tcm4TlvDq8ikWAM')
NATURAL_MODEL = 'eleven_multilingual_v2'
FLASH_MODEL = 'eleven_flash_v2_5'
GROQ_TTS_MODEL = 'canopylabs/orpheus-v1-english'
GROQ_TTS_VOICE = 'austin'
EDGE_VOICE = os.getenv('EDGE_TTS_VOICE', 'en-US-JennyNeural')

NATURAL_SETTINGS = VoiceSettings(
    stability=0.42,
    similarity_boost=0.82,
    style=0.28,
    use_speaker_boost=True,
    speed=0.92,
)


def _chunks_to_bytes(audio) -> bytes:
    parts = []
    for chunk in audio:
        if not chunk:
            continue
        parts.append(chunk if isinstance(chunk, (bytes, bytearray)) else bytes(chunk))
    return b''.join(parts)


def _elevenlabs_error_message(err: Exception) -> str:
    body = getattr(err, 'body', None)
    detail = body.get('detail') if isinstance(body, dict) else None
    if isinstance(detail, dict):
        code = detail.get('status') or detail.get('code') or ''
        message = detail.get('message') or str(err)
        if code == 'missing_permissions' or 'text_to_speech' in message:
            return (
                'ElevenLabs API key is missing the Text to Speech permission. '
                'Create a new key at elevenlabs.io/app/settings/api-keys with '
                'Text to Speech enabled, then put it in backend/.env as ELEVENLABS_API_KEY.'
            )
        if 'quota' in message.lower() or code in ('quota_exceeded', 'too_many_concurrent_requests'):
            return f'ElevenLabs quota issue: {message}'
        if code == 'voice_not_found':
            return 'ElevenLabs voice not found. Use premade Rachel voice id 21m00Tcm4TlvDq8ikWAM.'
        return message
    return str(err)


def _elevenlabs_tts(text: str):
    api_key = os.getenv('ELEVENLABS_API_KEY', '').strip()
    if not api_key:
        return None, 'ELEVENLABS_API_KEY is missing'

    client = ElevenLabs(api_key=api_key)
    last_error = None
    for model_id in (NATURAL_MODEL, FLASH_MODEL):
        try:
            audio = client.text_to_speech.convert(
                voice_id=VOICE_ID,
                model_id=model_id,
                text=text,
                output_format='mp3_44100_128',
                voice_settings=NATURAL_SETTINGS,
            )
            audio_bytes = _chunks_to_bytes(audio)
            if audio_bytes:
                return audio_bytes, None
            last_error = 'ElevenLabs returned empty audio'
        except Exception as e:
            last_error = _elevenlabs_error_message(e)
            print(f'[TTS] ElevenLabs {model_id} failed: {last_error}')
            if 'permission' in last_error.lower() or 'ELEVENLABS_API_KEY' in last_error:
                break
    return None, last_error or 'ElevenLabs TTS failed'


async def _edge_tts_async(text: str) -> bytes:
    import edge_tts

    communicate = edge_tts.Communicate(text, EDGE_VOICE, rate='-8%', pitch='+2Hz')
    parts = []
    async for chunk in communicate.stream():
        if chunk.get('type') == 'audio' and chunk.get('data'):
            parts.append(chunk['data'])
    audio_bytes = b''.join(parts)
    if not audio_bytes:
        raise RuntimeError('Edge neural TTS returned empty audio')
    return audio_bytes


def _edge_tts(text: str) -> bytes:
    try:
        return asyncio.run(_edge_tts_async(text))
    except RuntimeError as e:
        if 'asyncio.run() cannot be called from a running event loop' not in str(e):
            raise
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(_edge_tts_async(text))
        finally:
            loop.close()


def _groq_tts(text: str):
    client = get_groq_client()
    speech = client.audio.speech.create(
        model=GROQ_TTS_MODEL,
        voice=GROQ_TTS_VOICE,
        input=text,
        response_format='mp3',
    )
    audio_bytes = speech.content if hasattr(speech, 'content') else speech.read()
    if not audio_bytes:
        raise RuntimeError('Groq TTS returned empty audio')
    return audio_bytes


class TTSView(APIView):
    def post(self, request):
        text = (request.data.get('text') or '').strip()
        if not text:
            return Response({'error': 'No text provided'}, status=status.HTTP_400_BAD_REQUEST)

        safe_text = text[:300]
        errors = []

        try:
            audio, err = _elevenlabs_tts(safe_text)
            if audio:
                return HttpResponse(audio, content_type='audio/mpeg', status=200)
            if err:
                errors.append(err)
        except Exception as e:
            traceback.print_exc()
            errors.append(_elevenlabs_error_message(e))

        try:
            audio = _edge_tts(safe_text)
            print(f'[TTS] Using Edge neural voice {EDGE_VOICE}, bytes={len(audio)}')
            return HttpResponse(audio, content_type='audio/mpeg', status=200)
        except Exception as e:
            traceback.print_exc()
            errors.append(f'Edge TTS exception: {e}')

        try:
            audio = _groq_tts(safe_text)
            return HttpResponse(audio, content_type='audio/mpeg', status=200)
        except Exception as e:
            traceback.print_exc()
            errors.append(f'Groq TTS exception: {e}')

        return Response(
            {
                'error': 'Voice synthesis unavailable',
                'detail': errors,
                'fallback': 'browser',
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
