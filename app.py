from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from kokoro_onnx import Kokoro
import soundfile as sf
import io
import uvicorn

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Load Brain
print("Loading M4 Voice Engine...")
kokoro = Kokoro("kokoro-v0_19.onnx", "voices.bin")
print("Engine Ready!")

class TTSRequest(BaseModel):
    text: str
    voice: str = "af_sarah"
    speed: float = 1.0

@app.post("/tts")
async def generate_audio(data: TTSRequest):
    try:
        # Generate at high speed on M4
        samples, sample_rate = kokoro.create(
            data.text, 
            voice=data.voice, 
            speed=data.speed, 
            lang="en-us"
        )
        byte_io = io.BytesIO()
        sf.write(byte_io, samples, sample_rate, format='WAV')
        byte_io.seek(0)
        return Response(content=byte_io.read(), media_type="audio/wav")
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)