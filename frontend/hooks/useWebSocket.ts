import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

interface WebSocketMessage {
  type: string;
  poll_id: string;
  [key: string]: any;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  reconnect: () => void;
}

export function useWebSocket(pollId: string | null): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);

  const disconnect = useCallback(() => {
    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    // Close WebSocket if it exists
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent onclose from firing
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      
      wsRef.current = null;
    }
    
    isConnectingRef.current = false;
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!pollId) {
      console.log('useWebSocket: No pollId provided, skipping connection');
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)) {
      console.log('useWebSocket: Already connected or connecting, skipping...');
      return;
    }

    // Check if WebSocket URL is available
    if (!WS_URL || WS_URL === 'ws://localhost:8000') {
      console.warn('useWebSocket: WebSocket URL not configured, skipping connection');
      return;
    }

    isConnectingRef.current = true;
    const wsUrl = `${WS_URL}/ws/${pollId}`;
    console.log('useWebSocket: Attempting to connect to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setIsConnected(true);
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0;
        
        // Send ping every 30 seconds to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnectingRef.current = false;
        setIsConnected(false);
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket disconnected. Code:', event.code);
        isConnectingRef.current = false;
        setIsConnected(false);
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Only attempt reconnection if this is an unexpected closure
        // Code 1000 = normal closure, 1001 = going away (page unload)
        if (event.code !== 1000 && event.code !== 1001 && reconnectAttemptsRef.current < 3) {
          const delay = Math.min(2000 * Math.pow(2, reconnectAttemptsRef.current), 15000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/3)...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= 3) {
          console.warn('Max reconnection attempts reached. WebSocket will not auto-reconnect.');
          // Reset attempts after 30 seconds to allow manual reconnection
          setTimeout(() => {
            reconnectAttemptsRef.current = 0;
          }, 30000);
        }
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      isConnectingRef.current = false;
    }
  }, [pollId]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(() => connect(), 100);
  }, [connect, disconnect]);

  useEffect(() => {
    if (pollId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [pollId]);

  return { isConnected, lastMessage, reconnect };
}

