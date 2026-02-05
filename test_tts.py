import sounddevice as sd
from kokoro_onnx import Kokoro

# Initialize the model
kokoro = Kokoro("kokoro-v0_19.onnx", "voices.bin")

# Generate audio
print("Generating audio on M4 chip...")
samples, sample_rate = kokoro.create(
    "System check complete. Your Mac Mini is ready to speak.", 
    voice="af_sarah", 
    speed=1.0, 
    lang="en-us"
)

# Play audio
print("Playing...")
sd.play(samples, sample_rate)
sd.wait()
print("Done!")
