import { useEffect, useRef, useCallback } from 'react';
import { API_BASE } from '../api/client';

const useSSE = (onEvent) => {
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const onEventRef = useRef(onEvent);

  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const url = API_BASE.startsWith('http')
      ? new URL(`${API_BASE}/events`)
      : new URL(`${API_BASE}/events`, window.location.origin);
    url.searchParams.set('token', token);
    
    try {
      eventSourceRef.current = new EventSource(url.toString());
    } catch (err) {
      console.error('SSE EventSource creation failed:', err);
      return;
    }

    eventSourceRef.current.onopen = () => {
      console.log('SSE connected');
      reconnectAttempts.current = 0;
    };

    eventSourceRef.current.onerror = (error) => {
      console.error('SSE error:', error);
      eventSourceRef.current?.close();
      
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        console.log(`SSE reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    };

    const eventTypes = [
      'connected',
      'order_created',
      'order_updated',
      'order_deleted',
      'payment_submitted',
      'payment_approved',
      'payment_rejected',
      'deletion_requested',
      'deletion_cancelled',
      'deletion_approved',
    ];

    eventTypes.forEach((eventType) => {
      eventSourceRef.current.addEventListener(eventType, (e) => {
        try {
          const data = JSON.parse(e.data);
          onEventRef.current?.(eventType, data);
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      });
    });

    eventSourceRef.current.addEventListener('heartbeat', () => {
      // Keep alive, no action needed
    });
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return {
    disconnect: () => eventSourceRef.current?.close(),
    reconnect: connect,
  };
};

export default useSSE;
