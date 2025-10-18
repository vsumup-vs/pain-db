import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';

/**
 * Custom hook for real-time alert updates via Server-Sent Events (SSE)
 *
 * Features:
 * - Establishes EventSource connection to SSE endpoint
 * - Automatic reconnection with exponential backoff
 * - Heartbeat detection and connection health monitoring
 * - Cleanup on unmount
 * - Returns connection status and real-time alert updates
 *
 * @returns {Object} { alerts, connectionStatus, error, reconnect }
 */
export function useRealTimeAlerts() {
  // Get authentication from localStorage (only once on mount to prevent re-renders)
  const [token] = useState(() => localStorage.getItem('authToken'));
  const [user] = useState(() => {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
  });
  const [alerts, setAlerts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, error
  const [error, setError] = useState(null);

  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // 1 second
  const maxReconnectDelay = 30000; // 30 seconds

  /**
   * Calculate exponential backoff delay
   */
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      baseReconnectDelay * Math.pow(2, reconnectAttempts.current),
      maxReconnectDelay
    );
    return delay + Math.random() * 1000; // Add jitter
  }, []);

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback(() => {
    if (!token || !user) {
      console.log('[SSE] No authentication token, skipping connection');
      return;
    }

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      setConnectionStatus('connecting');
      setError(null);

      // Create EventSource with authentication
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const url = `${apiUrl}/api/sse/alerts?token=${token}`;

      console.log('[SSE] Connecting to:', url.replace(token, 'TOKEN_REDACTED'));

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      // Connection opened
      eventSource.onopen = () => {
        console.log('[SSE] Connection established');
        setConnectionStatus('connected');
        setError(null);
        reconnectAttempts.current = 0; // Reset reconnect counter on success
      };

      // New alert received
      eventSource.addEventListener('alert', (event) => {
        try {
          const alertData = JSON.parse(event.data);
          console.log('[SSE] New alert received:', alertData);

          // Show toast notification based on severity
          const patientName = alertData.patient
            ? `${alertData.patient.firstName} ${alertData.patient.lastName}`
            : 'Unknown Patient';

          const toastMessage = `${patientName}: ${alertData.message}`;

          switch (alertData.severity) {
            case 'CRITICAL':
              toast.error(toastMessage, {
                position: 'top-right',
                autoClose: false, // Keep critical alerts visible
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
              });
              break;
            case 'HIGH':
              toast.warning(toastMessage, {
                position: 'top-right',
                autoClose: 10000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
              });
              break;
            case 'MEDIUM':
              toast.info(toastMessage, {
                position: 'top-right',
                autoClose: 7000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
              });
              break;
            case 'LOW':
            default:
              toast.success(toastMessage, {
                position: 'top-right',
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
              });
              break;
          }

          // Add alert to state (prepend to show newest first)
          setAlerts((prevAlerts) => {
            // Prevent duplicates
            const exists = prevAlerts.some(a => a.id === alertData.id);
            if (exists) {
              console.log('[SSE] Alert already exists, updating:', alertData.id);
              return prevAlerts.map(a => a.id === alertData.id ? alertData : a);
            }
            return [alertData, ...prevAlerts];
          });
        } catch (err) {
          console.error('[SSE] Error parsing alert data:', err);
        }
      });

      // Alert updated (status change, assignment, etc.)
      eventSource.addEventListener('alert_update', (event) => {
        try {
          const updatedAlert = JSON.parse(event.data);
          console.log('[SSE] Alert updated:', updatedAlert);

          setAlerts((prevAlerts) =>
            prevAlerts.map(a => a.id === updatedAlert.id ? updatedAlert : a)
          );
        } catch (err) {
          console.error('[SSE] Error parsing alert update data:', err);
        }
      });

      // Alert resolved/dismissed
      eventSource.addEventListener('alert_resolved', (event) => {
        try {
          const resolvedAlert = JSON.parse(event.data);
          console.log('[SSE] Alert resolved:', resolvedAlert);

          setAlerts((prevAlerts) =>
            prevAlerts.filter(a => a.id !== resolvedAlert.id)
          );
        } catch (err) {
          console.error('[SSE] Error parsing alert resolved data:', err);
        }
      });

      // Heartbeat (keep-alive)
      eventSource.addEventListener('heartbeat', (event) => {
        try {
          const heartbeat = JSON.parse(event.data);
          console.log('[SSE] Heartbeat:', heartbeat.timestamp);
        } catch (err) {
          console.error('[SSE] Error parsing heartbeat:', err);
        }
      });

      // Connection error
      eventSource.onerror = (err) => {
        console.error('[SSE] Connection error:', err);
        setConnectionStatus('error');
        setError('Connection lost. Attempting to reconnect...');

        // Close current connection
        eventSource.close();
        eventSourceRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = getReconnectDelay();
          console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current += 1;
            connect();
          }, delay);
        } else {
          console.error('[SSE] Max reconnect attempts reached');
          setError('Unable to establish connection. Please refresh the page.');
        }
      };

    } catch (err) {
      console.error('[SSE] Failed to create EventSource:', err);
      setConnectionStatus('error');
      setError('Failed to connect to real-time alerts');
    }
  }, [token, user, getReconnectDelay]);

  /**
   * Manual reconnect (user-triggered)
   */
  const reconnect = useCallback(() => {
    console.log('[SSE] Manual reconnect triggered');
    reconnectAttempts.current = 0; // Reset counter
    connect();
  }, [connect]);

  /**
   * Disconnect from SSE
   */
  const disconnect = useCallback(() => {
    console.log('[SSE] Disconnecting');

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionStatus('disconnected');
  }, []);

  // Connect on mount and when auth changes
  useEffect(() => {
    if (user && token) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [user, token, connect, disconnect]);

  return {
    alerts,
    connectionStatus,
    error,
    reconnect,
    disconnect
  };
}
