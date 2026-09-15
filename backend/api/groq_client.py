import os
from openai import OpenAI


def get_groq_client():
    api_key = os.getenv('GROQ_API_KEY', '').strip()
    if not api_key:
        raise RuntimeError('GROQ_API_KEY is missing. Add it to backend/.env')
    return OpenAI(
        api_key=api_key,
        base_url='https://api.groq.com/openai/v1',
    )
