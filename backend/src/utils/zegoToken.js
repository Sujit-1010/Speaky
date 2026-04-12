'use strict';

const crypto = require('crypto');

function makeNonce() {
    const min = -Math.pow(2, 31);
    const max = Math.pow(2, 31) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function aesGcmEncrypt(plainText, key) {
    if (![16, 24, 32].includes(key.length)) {
        throw new Error('Invalid Secret length. Key must be 16, 24, or 32 bytes.');
    }
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
    cipher.setAutoPadding(true);
    const encrypted = cipher.update(plainText, 'utf8');
    const encryptBuf = Buffer.concat([encrypted, cipher.final(), cipher.getAuthTag()]);
    return { encryptBuf, nonce };
}

function generateToken04(appId, userId, secret, effectiveTimeInSeconds, payload) {
    if (!appId || typeof appId !== 'number') {
        throw new Error('appID invalid');
    }
    if (!userId || typeof userId !== 'string' || userId.length > 64) {
        throw new Error('userId invalid');
    }
    if (!secret || typeof secret !== 'string' || secret.length !== 32) {
        throw new Error('secret must be a 32 byte string');
    }
    if (!(effectiveTimeInSeconds > 0)) {
        throw new Error('effectiveTimeInSeconds invalid');
    }

    const VERSION_FLAG = '04';
    const createTime = Math.floor(Date.now() / 1000);
    const tokenInfo = {
        app_id: appId,
        user_id: userId,
        nonce: makeNonce(),
        ctime: createTime,
        expire: createTime + effectiveTimeInSeconds,
        payload: payload || ''
    };

    const plainText = JSON.stringify(tokenInfo);
    const { encryptBuf, nonce } = aesGcmEncrypt(plainText, secret);

    const b1 = new Uint8Array(8);
    const b2 = new Uint8Array(2);
    const b3 = new Uint8Array(2);
    const b4 = new Uint8Array(1);

    new DataView(b1.buffer).setBigInt64(0, BigInt(tokenInfo.expire), false);
    new DataView(b2.buffer).setUint16(0, nonce.byteLength, false);
    new DataView(b3.buffer).setUint16(0, encryptBuf.byteLength, false);
    new DataView(b4.buffer).setUint8(0, 1);

    const buf = Buffer.concat([
        Buffer.from(b1),
        Buffer.from(b2),
        Buffer.from(nonce),
        Buffer.from(b3),
        Buffer.from(encryptBuf),
        Buffer.from(b4),
    ]);

    const dv = new DataView(Uint8Array.from(buf).buffer);
    return VERSION_FLAG + Buffer.from(dv.buffer).toString('base64');
}

function generateRoomToken({ appId, serverSecret, userId, roomId, expiresInSeconds = 3600, canPublish = true }) {
    const payloadObject = {
        room_id: String(roomId || ''),
        privilege: {
            1: 1,
            2: canPublish ? 1 : 0,
        },
        stream_id_list: null,
    };
    const payload = JSON.stringify(payloadObject);
    const token = generateToken04(appId, String(userId), serverSecret, expiresInSeconds, payload);
    const expireAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    return { token, expireAt };
}

module.exports = { generateRoomToken };
