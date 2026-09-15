from django.urls import path
from .views.stt_view import STTView
from .views.chat_view import ChatView
from .views.tts_view import TTSView

urlpatterns = [
    path('stt/', STTView.as_view(), name='stt'),
    path('chat/', ChatView.as_view(), name='chat'),
    path('tts/', TTSView.as_view(), name='tts'),
]
