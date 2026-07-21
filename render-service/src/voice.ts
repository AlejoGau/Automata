/**
 * Voz con ElevenLabs (endpoint with-timestamps): devuelve el mp3 como data URL
 * y la duración real (para sincronizar la escena con la narración).
 * Si no hay API key o el texto está vacío, devuelve null (video sin voz).
 */
const API = 'https://api.elevenlabs.io/v1/text-to-speech';

export interface VoiceResult {
  audioDataUrl: string;
  durationSeconds: number;
}

export async function generateVoice(text: string): Promise<VoiceResult | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key || !text || !text.trim()) return null;

  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
  const url = `${API}/${voiceId}/with-timestamps?output_format=mp3_44100_128`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.trim(), model_id: modelId }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 300)}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  const ends: number[] = data?.alignment?.character_end_times_seconds || [];
  const durationSeconds = ends.length ? ends[ends.length - 1] : 0;
  const audioBase64: string = data?.audio_base64 || '';
  if (!audioBase64) throw new Error('ElevenLabs no devolvió audio.');

  return {
    audioDataUrl: `data:audio/mpeg;base64,${audioBase64}`,
    durationSeconds,
  };
}
