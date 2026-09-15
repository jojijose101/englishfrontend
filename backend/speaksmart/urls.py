from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings


def health_check(request):
    return JsonResponse({
        'status': 'ok',
        'app': 'SpeakSmart Django API',
        'groq_configured': bool(getattr(settings, 'GROQ_API_KEY', '')),
        'elevenlabs_configured': bool(getattr(settings, 'ELEVENLABS_API_KEY', '')),
    })


urlpatterns = [
    path('', health_check),
    path('api/', include('api.urls')),
]
