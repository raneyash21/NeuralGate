import RNFS from 'react-native-fs';

export const initFaceEmbedder = async () => {
  console.log('✅ Mock FaceEmbedder ready');
};

const generateMockEmbedding = async (imagePath: string, userId?: string): Promise<number[]> => {
  const seed = userId || imagePath + Date.now().toString();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const embedding = new Array(512);
  for (let i = 0; i < 512; i++) {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    embedding[i] = (hash / 0x7fffffff) * 2 - 1;
  }
  return embedding;
};

export const getFaceEmbedding = async (imagePath: string, userId?: string): Promise<number[]> => {
  return generateMockEmbedding(imagePath, userId);
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-8);
};

export const matchFace = (
  embedding: number[],
  stored: { id: string; embedding: number[] }[],
  threshold = 0.65
): { matched: boolean; userId?: string; score?: number } => {
  let best = { score: -1, userId: '' };
  for (const s of stored) {
    const sim = cosineSimilarity(embedding, s.embedding);
    if (sim > best.score) best = { score: sim, userId: s.id };
  }
  return {
    matched: best.score >= threshold,
    userId: best.userId,
    score: best.score,
  };
};