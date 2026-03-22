#!/bin/sh
set -e

python - <<'PY'
from flask import Flask, request, send_file, jsonify, after_this_request
import subprocess
import tempfile
import os

MODEL = os.environ.get("PIPER_MODEL", "/voices/en_US-libritts_r-medium.onnx")
CONFIG = os.environ.get("PIPER_CONFIG", MODEL + ".json")
LENGTH_SCALE = os.environ.get("PIPER_LENGTH_SCALE", "1.15")

app = Flask(__name__)

@app.get("/")
def root():
    return {
        "ok": True,
        "service": "piper",
        "health": "/health",
        "tts_example": "/tts?text=Hello%20world"
    }

@app.get("/health")
def health():
    return {
        "ok": True,
        "model": MODEL,
        "config": CONFIG,
        "model_exists": os.path.exists(MODEL),
        "config_exists": os.path.exists(CONFIG),
    }

@app.get("/tts")
def tts():
    text = request.args.get("text", "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400

    fd, wav_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)

    @after_this_request
    def cleanup(response):
        try:
            if os.path.exists(wav_path):
                os.remove(wav_path)
        except Exception:
            pass
        return response

    proc = subprocess.run(
        [
            "python",
            "-m",
            "piper",
            "--model",
            MODEL,
            "--config",
            CONFIG,
            "--output_file",
            wav_path,
            "--length-scale",
            LENGTH_SCALE,
        ],
        input=text.encode("utf-8"),
        capture_output=True,
        check=False,
    )

    if proc.returncode != 0:
        return jsonify({
            "error": "piper failed",
            "returncode": proc.returncode,
            "stdout": proc.stdout.decode("utf-8", errors="ignore"),
            "stderr": proc.stderr.decode("utf-8", errors="ignore"),
        }), 500

    if not os.path.exists(wav_path) or os.path.getsize(wav_path) == 0:
        return jsonify({
            "error": "piper produced no audio file",
            "stdout": proc.stdout.decode("utf-8", errors="ignore"),
            "stderr": proc.stderr.decode("utf-8", errors="ignore"),
        }), 500

    return send_file(
        wav_path,
        mimetype="audio/wav",
        as_attachment=False,
        download_name="speech.wav",
        conditional=False,
    )

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
PY