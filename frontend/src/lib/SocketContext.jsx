import { API_BASE_URL } from '@/api/apiClient';
import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        const inferredUrl = (() => {
            try {
                const proto = window.location.protocol.startsWith('https') ? 'https' : 'http';
                const host = window.location.hostname || 'localhost';
                const port = '5000';
                return `${proto}://${host}:${port}`;
            } catch {
                return 'http://localhost:5000';
            }
        })();
        const envUrl = (typeof globalThis !== 'undefined' && globalThis['__API_BASE_URL__']) || null;
        const backendUrl = API_BASE_URL || envUrl || inferredUrl;
        const newSocket = io(backendUrl, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
        });
        setSocket(newSocket);

        const onConnect = () => {
            console.log('Socket connected:', newSocket.id);
            if (user?.email) newSocket.emit('register_user', user.email);
        };
        newSocket.on('connect', onConnect);
        newSocket.on('connect_error', (err) => { try { console.warn('Socket connect_error:', err && err.message ? err.message : err); } catch {} });
        try { globalThis.__appSocket = newSocket; } catch {}

        return () => {
            try { newSocket.off('connect', onConnect); } catch {}
            newSocket.disconnect();
        };
        // re-run if user email changes to re-register
    }, [user?.email]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
