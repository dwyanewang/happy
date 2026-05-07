import * as rnCrypto from 'rn-encryption';
import { decodeUTF8, encodeUTF8 } from './text';
import { decodeBase64, encodeBase64 } from '@/encryption/base64';
import { gcm } from '@noble/ciphers/aes';

// Web Crypto API's crypto.subtle is only available in secure contexts (HTTPS/localhost).
// http://IP addresses are NOT secure contexts, so we need a fallback for LAN deployments.
const hasSubtle = typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';

export async function encryptAESGCMString(data: string, key64: string): Promise<string> {
    if (hasSubtle) {
        return await rnCrypto.encryptAsyncAES(data, key64);
    }

    // Fallback: AES-GCM via @noble/ciphers (format-compatible with Web Crypto)
    const key = decodeBase64(key64, 'base64');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = encodeUTF8(data);
    const encrypted = gcm(key, iv).encrypt(plaintext);

    // Concatenate IV + ciphertext + authTag (same format as web-secure-encryption)
    const combined = new Uint8Array(iv.length + encrypted.length);
    combined.set(iv);
    combined.set(encrypted, iv.length);
    return encodeBase64(combined, 'base64');
}

export async function decryptAESGCMString(data: string, key64: string): Promise<string | null> {
    if (hasSubtle) {
        const res = (await rnCrypto.decryptAsyncAES(data, key64)).trim();
        return res;
    }

    // Fallback
    try {
        const key = decodeBase64(key64, 'base64');
        const combined = decodeBase64(data, 'base64');
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);
        const decrypted = gcm(key, iv).decrypt(ciphertext);
        return decodeUTF8(decrypted).trim();
    } catch {
        return null;
    }
}

export async function encryptAESGCM(data: Uint8Array, key64: string): Promise<Uint8Array> {
    const encrypted = (await encryptAESGCMString(decodeUTF8(data), key64)).trim();
    return decodeBase64(encrypted, 'base64');
}

export async function decryptAESGCM(data: Uint8Array, key64: string): Promise<Uint8Array | null> {
    let raw = await decryptAESGCMString(encodeBase64(data, 'base64'), key64);
    return raw ? encodeUTF8(raw) : null;
}
