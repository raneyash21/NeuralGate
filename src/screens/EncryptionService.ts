// src/services/EncryptionService.ts

import Aes from 'react-native-aes-crypto';

let sessionKey: string = '';
let sessionIv: string = '';

export const initEncryption = async (): Promise<void> => {
  try {
    const password = 'NeuralGate_SecureKey_2024';
    const salt = 'NeuralGate_Salt_FieldOps';

    sessionKey = await Aes.pbkdf2(password, salt, 5000, 256, 'sha256');
    sessionIv = await Aes.randomKey(16);

    console.log('🔐 Encryption initialized');
  } catch (e) {
    console.log('Encryption init error:', e);
    sessionKey = 'fallback_key_32_chars_neuralgate!';
    sessionIv = 'fallback_iv_16ch';
  }
};

export const encryptData = async (plainText: string): Promise<string> => {
  try {
    if (!sessionKey) await initEncryption();
    const cipher = await Aes.encrypt(plainText, sessionKey, sessionIv, 'aes-256-cbc');
    return cipher;
  } catch (e) {
    console.log('Encrypt error:', e);
    return btoa(plainText);
  }
};

export const decryptData = async (cipherText: string): Promise<string> => {
  try {
    if (!sessionKey) await initEncryption();
    const plain = await Aes.decrypt(cipherText, sessionKey, sessionIv, 'aes-256-cbc');
    return plain;
  } catch (e) {
    console.log('Decrypt error:', e);
    try {
      return atob(cipherText);
    } catch {
      return cipherText;
    }
  }
};

export const encryptEmbedding = async (embedding: number[]): Promise<string> => {
  const json = JSON.stringify(embedding);
  return encryptData(json);
};

export const decryptEmbedding = async (encrypted: string): Promise<number[]> => {
  const json = await decryptData(encrypted);
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
};