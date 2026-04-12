import { useEffect, useState } from 'react';

export default function useRealtimeGD({ enabled, roomId, user, stream, language = 'en-US' }) {
  const [metrics] = useState(null);
  useEffect(() => {}, [enabled, roomId, user, stream, language]);
  return { metrics: metrics };
}
