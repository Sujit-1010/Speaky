import Vapi from '@vapi-ai/web';
import { useCallback, useEffect, useRef, useState } from 'react';

const defaultPublicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
const defaultAssistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;

const useVapi = (options = {}) => {
  const { publicKey = defaultPublicKey, assistantId = defaultAssistantId } = options;

  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversation, setConversation] = useState([]);

  const vapiRef = useRef(null);

  const initializeVapi = useCallback(() => {
    if (!publicKey || !assistantId) {
      if (import.meta.env.DEV) {
        console.warn('useVapi: missing VITE_VAPI_PUBLIC_KEY or VITE_VAPI_ASSISTANT_ID');
      }
      return;
    }

    if (vapiRef.current) return;

    const vapiInstance = new Vapi(publicKey);
    vapiRef.current = vapiInstance;

    vapiInstance.on('call-start', () => {
      setIsSessionActive(true);
    });

    vapiInstance.on('call-end', () => {
      setIsSessionActive(false);
      setIsSpeaking(false);
      // NOTE: Do NOT clear conversation here.
      // endInterview() needs to read conversation after stopCall() resolves.
      // Use resetConversation() to clear it manually before a new interview.
    });

    vapiInstance.on('speech-start', () => {
      setIsSpeaking(true);
    });

    vapiInstance.on('speech-end', () => {
      setIsSpeaking(false);
    });

    vapiInstance.on('volume-level', (volume) => {
      setVolumeLevel(typeof volume === 'number' ? volume : 0);
    });

    vapiInstance.on('message', (message) => {
      if (
        message?.type === 'transcript' &&
        message?.transcriptType === 'final'
      ) {
        const role = message.role === 'assistant' ? 'ai' : 'user';
        const text = (message.transcript || '').trim();
        if (!text) return;

        setConversation((prev) => {
          // Merge consecutive messages from the same role
          if (prev.length > 0 && prev[prev.length - 1].role === role) {
            const last = prev[prev.length - 1];
            return [
              ...prev.slice(0, -1),
              { ...last, content: `${last.content} ${text}`.trim() },
            ];
          }
          return [...prev, { role, content: text }];
        });
      }
    });

    vapiInstance.on('error', (e) => {
      console.error('Vapi error:', e);
    });
  }, [publicKey, assistantId]);

  useEffect(() => {
    initializeVapi();

    return () => {
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch (e) {
          console.error('useVapi cleanup error:', e);
        }
        vapiRef.current = null;
      }
    };
  }, [initializeVapi]);

  const startCall = async (overrides = {}) => {
    if (!vapiRef.current || !assistantId) return;
    await vapiRef.current.start(assistantId, overrides);
  };

  const stopCall = async () => {
    if (!vapiRef.current) return;
    await vapiRef.current.stop();
  };

  const toggleCall = async (overrides = {}) => {
    try {
      if (isSessionActive) {
        await stopCall();
      } else {
        await startCall(overrides);
      }
    } catch (err) {
      console.error('useVapi toggleCall error:', err);
    }
  };

  const resetConversation = () => {
    setConversation([]);
  };

  return {
    volumeLevel,
    isSessionActive,
    isSpeaking,
    conversation,
    toggleCall,
    stopCall,
    resetConversation,
  };
};

export default useVapi;
