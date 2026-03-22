FROM python:3.12-slim

ENV PIP_BREAK_SYSTEM_PACKAGES=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir "piper-tts==1.4.1" "flask>=3,<4" "pathvalidate"

COPY voices /voices
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 5000
ENTRYPOINT ["/entrypoint.sh"]