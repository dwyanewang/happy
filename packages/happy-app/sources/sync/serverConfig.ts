import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';

const isWeb = Platform.OS === 'web';

// Separate MMKV instance for server config that persists across logouts
const serverConfigStorage = isWeb ? null : new MMKV({ id: 'server-config' });

const SERVER_KEY = 'custom-server-url';
const LOG_SERVER_KEY = 'log-server-url';
const DEFAULT_SERVER_URL = 'http://172.16.21.200:3005';

function getRuntimeConfig(): { serverUrl?: string; logServerUrl?: string } | undefined {
    if (isWeb && typeof window !== 'undefined') {
        return (window as any).__HAPPY_RUNTIME_CONFIG__;
    }
    return undefined;
}

function getStorageString(key: string): string | undefined {
    if (isWeb) {
        try {
            return localStorage.getItem(key) || undefined;
        } catch {
            return undefined;
        }
    }
    return serverConfigStorage?.getString(key) || undefined;
}

function setStorageString(key: string, value: string | null): void {
    if (isWeb) {
        try {
            if (value) {
                localStorage.setItem(key, value);
            } else {
                localStorage.removeItem(key);
            }
        } catch {
            // ignore
        }
        return;
    }
    if (value) {
        serverConfigStorage?.set(key, value);
    } else {
        serverConfigStorage?.delete(key);
    }
}

function isPrivateIP(hostname: string): boolean {
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return true;
    }
    const parts = hostname.split('.').map(Number);
    if (parts.length !== 4 || parts.some(Number.isNaN)) {
        return false;
    }
    const [a, b] = parts;
    return (
        a === 10 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
    );
}

function inferLocalServerUrl(): string | undefined {
    if (!isWeb || typeof window === 'undefined') {
        return undefined;
    }
    const currentHost = window.location.hostname;
    if (isPrivateIP(currentHost)) {
        return `http://${currentHost}:3005`;
    }
    return undefined;
}

export function getServerUrl(): string {
    // 用户手动设置始终优先
    const custom = getStorageString(SERVER_KEY);
    if (custom) return custom;

    // 根据当前访问地址自动推断内网 server 地址
    const inferred = inferLocalServerUrl();
    if (inferred) return inferred;

    return (
        getRuntimeConfig()?.serverUrl ||
        process.env.EXPO_PUBLIC_HAPPY_SERVER_URL ||
        DEFAULT_SERVER_URL
    );
}

export function setServerUrl(url: string | null): void {
    if (url && url.trim()) {
        setStorageString(SERVER_KEY, url.trim());
    } else {
        setStorageString(SERVER_KEY, null);
    }
}

export function getLogServerUrl(): string | null {
    return getStorageString(LOG_SERVER_KEY) ||
           getRuntimeConfig()?.logServerUrl ||
           process.env.EXPO_PUBLIC_LOG_SERVER_URL ||
           null;
}

export function setLogServerUrl(url: string | null): void {
    if (url && url.trim()) {
        setStorageString(LOG_SERVER_KEY, url.trim());
    } else {
        setStorageString(LOG_SERVER_KEY, null);
    }
}

export function isUsingCustomServer(): boolean {
    return getServerUrl() !== DEFAULT_SERVER_URL;
}

export function getServerInfo(): { hostname: string; port?: number; isCustom: boolean } {
    const url = getServerUrl();
    const isCustom = isUsingCustomServer();

    try {
        const parsed = new URL(url);
        const port = parsed.port ? parseInt(parsed.port) : undefined;
        return {
            hostname: parsed.hostname,
            port,
            isCustom
        };
    } catch {
        // Fallback if URL parsing fails
        return {
            hostname: url,
            port: undefined,
            isCustom
        };
    }
}

export function validateServerUrl(url: string): { valid: boolean; error?: string } {
    if (!url || !url.trim()) {
        return { valid: false, error: 'Server URL cannot be empty' };
    }

    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return { valid: false, error: 'Server URL must use HTTP or HTTPS protocol' };
        }
        return { valid: true };
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }
}
