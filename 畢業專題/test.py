import whisper
import sounddevice as sd
import numpy as np
import tempfile
import wave

model = whisper.load_model("small")

def record_audio(duration=5, samplerate=44100):
    print("開始錄音...")
    audio_data = sd.rec(int(samplerate * duration), samplerate=samplerate, channels=1, dtype=np.int16)
    sd.wait()
    print("錄音完成！")

    temp_wav = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    with wave.open(temp_wav.name, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(samplerate)
        wf.writeframes(audio_data.tobytes())

    return temp_wav.name

audio_path = record_audio(5)
result = model.transcribe(audio_path)
print("辨識結果:", result["text"])

