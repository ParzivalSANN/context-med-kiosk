/**
 * Voice.js - TTS ve Lip Sync Yöneticisi v2.0
 * PRIMARY: Web Speech API (browser built-in, güvenilir)
 * LIP SYNC: Konuşma süresi boyunca simulated audio level (0.0-1.0)
 * OPTIONAL: ElevenLabs (API bağlıysa daha doğal ses için)
 */

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || "";
const VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
const USE_ELEVENLABS = false; // ElevenLabs WebSocket stabil olmadığı için şimdilik kapalı

class MedicalVoice {
  constructor() {
    this.isPlaying = false;
    this._simulatedLevel = 0;
    this._lipSyncInterval = null;
    this._currentUtterance = null;
  }

  /**
   * Ana konuşma metodu - hem sesli çalar hem lip sync başlatır
   */
  async speak(text) {
    if (!text || text.trim() === '') return;

    // Önceki konuşmayı durdur
    this.stop();

    if (USE_ELEVENLABS && ELEVENLABS_API_KEY) {
      await this._speakElevenLabs(text);
    } else {
      this._speakWebSpeech(text);
    }
  }

  /**
   * Web Speech API ile sesli okuma + simulated lip sync
   */
  _speakWebSpeech(text) {
    if (!window.speechSynthesis) {
      console.warn('❌ Bu tarayıcı Web Speech API desteklemiyor!');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;

    // Türkçe ses seç (varsa)
    const voices = window.speechSynthesis.getVoices();
    const turkishVoice = voices.find(v => v.lang.startsWith('tr'));
    if (turkishVoice) {
      utterance.voice = turkishVoice;
      console.log('🎙️ Türkçe ses bulundu:', turkishVoice.name);
    } else {
      console.log('🎙️ Türkçe ses bulunamadı, default kullanılıyor. Mevcut sesler:', voices.map(v => v.lang).slice(0, 5));
    }

    utterance.onstart = () => {
      console.log('🔊 Web Speech başladı:', text.substring(0, 30) + '...');
      this.isPlaying = true;
      this._startLipSync();
    };

    utterance.onend = () => {
      console.log('🔊 Web Speech bitti.');
      this.isPlaying = false;
      this._stopLipSync();
    };

    utterance.onerror = (e) => {
      console.error('❌ Web Speech hatası:', e.error);
      this.isPlaying = false;
      this._stopLipSync();
    };

    this._currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Lip Sync için simulated audio level - konuşurken wave pattern üretir
   */
  _startLipSync() {
    this._stopLipSync(); // Öncekini temizle

    let t = 0;
    this._lipSyncInterval = setInterval(() => {
      if (this.isPlaying) {
        // Doğal konuşma dalgası: sinüs + rastgele gürültü
        t += 0.15;
        const base = 0.3 + Math.sin(t * 3) * 0.2 + Math.sin(t * 7) * 0.1;
        const noise = (Math.random() - 0.5) * 0.15;
        this._simulatedLevel = Math.max(0, Math.min(1, base + noise));
      } else {
        // Konuşma bitti, level'i yumuşakça 0'a indirgeliyoruz
        this._simulatedLevel = Math.max(0, this._simulatedLevel - 0.08);
        if (this._simulatedLevel <= 0) {
          this._stopLipSync();
        }
      }
    }, 50); // 20fps lip sync
  }

  _stopLipSync() {
    if (this._lipSyncInterval) {
      clearInterval(this._lipSyncInterval);
      this._lipSyncInterval = null;
    }
    this._simulatedLevel = 0;
  }

  /**
   * Konuşmayı durdur
   */
  stop() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.isPlaying = false;
    this._stopLipSync();
  }

  /**
   * Avatar'ın useFrame hook'u tarafından her frame'de çağrılır
   * returns: 0.0 - 1.0 arası ses seviyesi
   */
  getAudioLevel() {
    return this._simulatedLevel;
  }

  /**
   * ElevenLabs WebSocket (opsiyonel, yüksek kalite)
   */
  async _speakElevenLabs(text) {
    console.log('🎙️ ElevenLabs deneniyor...');
    try {
      const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream-input?xi-api-key=${ELEVENLABS_API_KEY}`;
      const socket = new WebSocket(wsUrl);

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.connect(audioCtx.destination);

      socket.onopen = () => {
        socket.send(JSON.stringify({
          text: " ",
          voice_settings: { stability: 0.5, similarity_boost: 0.8 },
          xi_api_key: ELEVENLABS_API_KEY,
        }));
        socket.send(JSON.stringify({ text: text, try_trigger_generation: true }));
        socket.send(JSON.stringify({ text: "" }));
      };

      socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        if (data.audio) {
          const bytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
          const decoded = await audioCtx.decodeAudioData(bytes.buffer);
          const src = audioCtx.createBufferSource();
          src.buffer = decoded;
          src.connect(analyser);
          src.start();
          this.isPlaying = true;
          this._startLipSync();
          src.onended = () => { this.isPlaying = false; };
        }
      };

      socket.onerror = (e) => {
        console.warn('⚠️ ElevenLabs WebSocket hatası, Web Speech fallback yapılıyor...');
        this._speakWebSpeech(text);
      };

      // 3 saniye içinde bağlanamazsa fallback
      setTimeout(() => {
        if (!this.isPlaying && socket.readyState !== WebSocket.OPEN) {
          console.warn('⚠️ ElevenLabs timeout, Web Speech fallback yapılıyor...');
          socket.close();
          this._speakWebSpeech(text);
        }
      }, 3000);

    } catch (e) {
      console.error('ElevenLabs hatası:', e);
      this._speakWebSpeech(text);
    }
  }
}

// Singleton export
export default new MedicalVoice();
