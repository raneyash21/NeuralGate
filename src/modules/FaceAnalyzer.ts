import FaceDetection from '@react-native-ml-kit/face-detection';
import RNFS from 'react-native-fs';

export interface FaceData {
  hasFace: boolean;
  leftEyeOpen: number;
  rightEyeOpen: number;
  smiling: number;
  yaw: number;
  pitch: number;
}

const DEFAULT_FACE: FaceData = {
  hasFace: false,
  leftEyeOpen: 1,
  rightEyeOpen: 1,
  smiling: 0,
  yaw: 0,
  pitch: 0,
};

export const analyzeFace = async (imagePath: string): Promise<FaceData> => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣ Raw path:', imagePath);

    // Remove 'file://' prefix
    let rawPath = imagePath.replace(/^file:\/\//, '');
    console.log('2️⃣ Raw path without file://:', rawPath);

    // Check file exists
    const exists = await RNFS.exists(rawPath);
    console.log('3️⃣ File exists?', exists);

    if (!exists) {
      console.log('❌ File missing – returning no face');
      return DEFAULT_FACE;
    }

    // Get file stats (size)
    const stat = await RNFS.stat(rawPath);
    console.log('4️⃣ File size:', stat.size, 'bytes');

    if (stat.size < 5000) {
      console.log('⚠️ File too small (<5KB) – corrupted or empty');
      return DEFAULT_FACE;
    }

    // **SAVE A COPY to Downloads folder for manual inspection**
    const destPath = `${RNFS.DownloadDirectoryPath}/neuralgate_test_${Date.now()}.jpg`;
    await RNFS.copyFile(rawPath, destPath);
    console.log('5️⃣ Saved copy to:', destPath);

    // Run detection
    console.log('6️⃣ Running ML Kit on:', rawPath);
    const faces = await FaceDetection.detect(rawPath, {
      performanceMode: 'accurate',
      classificationMode: 'all',
      minFaceSize: 0.1,
    });

    console.log('7️⃣ Faces found:', faces?.length ?? 0);

    if (!faces || faces.length === 0) {
      console.log('❌ No faces – returning default');
      return DEFAULT_FACE;
    }

    const face = faces[0];
    console.log('✅ Success:', {
      leftEye: face.leftEyeOpenProbability,
      rightEye: face.rightEyeOpenProbability,
      smiling: face.smilingProbability,
      yaw: face.headEulerAngleY,
    });

    return {
      hasFace: true,
      leftEyeOpen: face.leftEyeOpenProbability ?? 1,
      rightEyeOpen: face.rightEyeOpenProbability ?? 1,
      smiling: face.smilingProbability ?? 0,
      yaw: face.headEulerAngleY ?? 0,
      pitch: face.headEulerAngleX ?? 0,
    };
  } catch (err: any) {
    console.log('💥 Crash:', err.message);
    return DEFAULT_FACE;
  }
};