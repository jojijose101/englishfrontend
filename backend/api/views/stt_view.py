import traceback
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from api.groq_client import get_groq_client

# Whisper hallucinates these phrases for silence/noise — filter them out
HALLUCINATIONS = {
    'thank you.', 'thank you', 'thanks.', 'thanks',
    'you', '.', '', 'bye.', 'bye', 'please subscribe.',
    'thank you for watching.', 'thank you for watching',
    'thank you for listening.', 'thank you for listening',
}


class STTView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        audio_file = request.FILES.get('audio')
        if not audio_file:
            return Response(
                {'error': 'No audio file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            audio_bytes = audio_file.read()
            file_size = len(audio_bytes)
            print(f'[STT] Received audio: {audio_file.content_type}, size={file_size} bytes')

            if file_size < 2000:
                return Response(
                    {'error': 'Audio too short. Please hold the button and speak for at least 2 seconds.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            content_type = (audio_file.content_type or '').split(';')[0].strip().lower()
            original_name = (getattr(audio_file, 'name', '') or '').lower()
            ext_map = {
                'audio/webm': 'audio.webm',
                'audio/ogg': 'audio.ogg',
                'audio/mp4': 'audio.mp4',
                'audio/mpeg': 'audio.mp3',
                'audio/wav': 'audio.wav',
                'audio/x-wav': 'audio.wav',
                'audio/wave': 'audio.wav',
            }
            filename = ext_map.get(content_type)
            if not filename:
                if original_name.endswith('.wav'):
                    filename, content_type = 'audio.wav', 'audio/wav'
                elif original_name.endswith('.mp3'):
                    filename, content_type = 'audio.mp3', 'audio/mpeg'
                elif original_name.endswith('.ogg'):
                    filename, content_type = 'audio.ogg', 'audio/ogg'
                elif original_name.endswith('.mp4') or original_name.endswith('.m4a'):
                    filename, content_type = 'audio.mp4', 'audio/mp4'
                else:
                    filename, content_type = 'audio.webm', 'audio/webm'

            client = get_groq_client()
            transcription = client.audio.transcriptions.create(
                model='whisper-large-v3-turbo',
                file=(filename, audio_bytes, content_type),
                language='en',
            )

            transcript = (transcription.text or '').strip()
            print(f'[STT] Raw transcript: [{transcript}]')

            if transcript.lower() in HALLUCINATIONS:
                print(f'[STT] Filtered hallucination: [{transcript}]')
                return Response(
                    {'error': 'No clear speech detected. Please speak louder and closer to the mic.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            return Response({'transcript': transcript})

        except Exception as e:
            traceback.print_exc()
            return Response(
                {'error': f'Whisper error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
