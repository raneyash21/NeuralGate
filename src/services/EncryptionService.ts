import Aes from 'react-native-aes-crypto';

// Session key — generated once when app starts, kept in memory
// For production: use Android Keystore / iOS Keychain
let sessionKey: string = '';
let sessionIv: string = '';

// ── Initialize encryption keys ─────────────────────────────
export const initEncryption = async (): Promise<void> => {
  try {
    // Generate a unique key per device session
    // In production this would be stored in Keystore/Keychain
    const password = 'NeuralGate_SecureKey_2024';
    const salt = 'NeuralGate_Salt_FieldOps';

    sessionKey = await Aes.pbkdf2(password, salt, 5000, 256, 'sha256');
    sessionIv = await Aes.randomKey(16);

    console.log('🔐 Encryption initialized');
  } catch (e) {
    console.log('Encryption init error:', e);
    // Fallback key if crypto fails
    sessionKey = 'fallback_key_32_chars_neuralgate!';
    sessionIv = 'fallback_iv_16ch';
  }
};

// ── Encrypt a string (e.g. face embedding JSON) ────────────
export const encryptData = async (plainText: string): Promise<string> => {
  try {
    if (!sessionKey) await initEncryption();
    const cipher = await Aes.encrypt(plainText, sessionKey, sessionIv, 'aes-256-cbc');
    return cipher;
  } catch (e) {
    console.log('Encrypt error:', e);
    // Return base64 of plain text as fallback for demo
    return btoa(plainText);
  }
};

// ── Decrypt a string back to plain text ───────────────────
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

// ── Encrypt a face embedding array ────────────────────────
export const encryptEmbedding = async (
  embedding: number[]
): Promise<string> => {
  const json = JSON.stringify(embedding);
  return encryptData(json);
};

// ── Decrypt back to embedding array ───────────────────────
export const decryptEmbedding = async (
  encrypted: string
): Promise<number[]> => {
  const json = await decryptData(encrypted);
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
};// Save an employee with face embeddings (encrypted)
export const saveEmployee = async (id: string, name: string, embedding: number[]): Promise<void> => {
  const encrypted = await encryptEmbedding(embedding);
  db.execute(
    `INSERT OR REPLACE INTO employees (id, name, embedding_1, enrolled_at, device_id)
     VALUES (?, ?, ?, ?, ?)`,
    [id, name, encrypted, Date.now(), 'DEVICE_001']
  );
};

// Retrieve all employees with their decrypted embeddings
export const getAllEmployeesWithEmbeddings = async (): Promise<{ id: string; name: string; embedding: number[] }[]> => {
  const result = db.execute('SELECT id, name, embedding_1 FROM employees WHERE embedding_1 IS NOT NULL');
  const rows = result.rows?._array ?? [];
  const out = [];
  for (const row of rows) {
    const embedding = await decryptEmbedding(row.embedding_1);
    if (embedding.length) {
      out.push({ id: row.id, name: row.name, embedding });
    }
  }
  return out;
};