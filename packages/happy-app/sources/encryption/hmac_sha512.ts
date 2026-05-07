import { sha512 } from '@noble/hashes/sha512';
import { hmac } from '@noble/hashes/hmac';

export async function hmac_sha512(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
    return hmac(sha512, key, data);
}