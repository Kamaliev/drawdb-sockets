import { useEffect, useRef } from 'react';

type WebSocketOptions = {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (e: Event) => void;
};

export const useDiagramWebSocket = (
  diagramId: string | undefined,
  options?: WebSocketOptions
) => {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {

    const ws = new WebSocket(`ws://localhost:8000/api/v1/diagram/ws/6b32de00-6ca1-4743-873b-4d5a1da01e54`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'update') {
          console.log('Received update', data);
        }
      } catch (e) {
        console.error('Invalid WebSocket message:', event.data);
      }
    };

    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      options?.onError?.(event);
    };

    ws.onclose = () => {
      options?.onClose?.();
    };

    return () => {
      ws.close();
    };
  }, [diagramId, options]);
};
