import { encryptEmbedding, decryptEmbedding } from './EncryptionService';

export const saveEmployeeWithEmbedding = async (
  id: string,
  name: string,
  embedding: number[]
): Promise<void> => {
  const encrypted = await encryptEmbedding(embedding);
  db.execute(
    `INSERT OR REPLACE INTO employees (id, name, embedding_1, enrolled_at, device_id)
     VALUES (?, ?, ?, ?, ?)`,
    [id, name, encrypted, Date.now(), 'DEVICE_001']
  );
};

export const getAllEmployeesWithEmbeddings = async (): Promise<{ id: string; name: string; embedding: number[] }[]> => {
  const result = db.execute('SELECT id, name, embedding_1 FROM employees WHERE embedding_1 IS NOT NULL');
  const rows = result.rows?._array ?? [];
  const out = [];
  for (const row of rows) {
    const emb = await decryptEmbedding(row.embedding_1);
    if (emb.length) out.push({ id: row.id, name: row.name, embedding: emb });
  }
  return out;
};