import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  PermissionsAndroid, Platform, Animated, Alert,
} from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { getFaceEmbedding, matchFace } from '../services/FaceEmbedder';
import { getAllEmployeesWithEmbeddings, saveAttendanceLog } from '../services/DatabaseService';

const CHALLENGES = [
  { id: 'blink',     label: 'Blink twice slowly', emoji: '👁️', duration: 3000 },
  { id: 'turn_left', label: 'Turn head left',      emoji: '←',  duration: 2500 },
  { id: 'smile',     label: 'Give a big smile',    emoji: '😊', duration: 2500 },
];

const getRandomChallenges = () =>
  [...CHALLENGES].sort(() => Math.random() - 0.5).slice(0, 2);

export default function CameraScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'checking' | 'detected' | 'authenticating' | 'done'>('idle');
  const [challenges, setChallenges] = useState<typeof CHALLENGES>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [authResult, setAuthResult] = useState<string | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('front');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { requestPermission(); }, []);
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const requestPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const r = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          { title: 'Camera', message: 'NeuralGate needs camera', buttonPositive: 'Allow', buttonNegative: 'Deny' }
        );
        setHasPermission(r === PermissionsAndroid.RESULTS.GRANTED);
      } else { setHasPermission(true); }
    } catch (e) {}
  };

  const runChallenge = (index: number, challengeList: typeof CHALLENGES) => {
    const challenge = challengeList[index];
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: challenge.duration,
      useNativeDriver: false,
    }).start();

    timeoutRef.current = setTimeout(() => {
      setPhase('detected');
      setTimeout(() => {
        const next = index + 1;
        if (next >= challengeList.length) {
          // Liveness done → now authenticate face
          performFaceAuthentication();
        } else {
          setCurrentIdx(next);
          setPhase('checking');
          runChallenge(next, challengeList);
        }
      }, 600);
    }, challenge.duration);
  };

  const performFaceAuthentication = async () => {
    if (!cameraRef.current) return;
    setPhase('authenticating');
    try {
      const photo = await cameraRef.current.takePhoto({ qualityPrioritization: 'quality' });
      const embedding = await getFaceEmbedding(photo.path);
      if (!embedding) {
        setAuthResult('❌ Face not detected. Please try again.');
        setPhase('done');
        Animated.timing(successAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        return;
      }
      const stored = await getAllEmployeesWithEmbeddings();
      const { matched, userId, score } = matchFace(embedding, stored, 0.65);
      if (matched && userId) {
        const user = stored.find(u => u.id === userId);
        saveAttendanceLog(userId!, user!.name);
        setAuthResult(`✅ Authenticated as ${user!.name} (score: ${score?.toFixed(2)})`);
      } else {
        setAuthResult('❌ Face not recognized. Please enroll first.');
      }
    } catch (err) {
      setAuthResult('❌ Authentication error');
    } finally {
      setPhase('done');
      Animated.timing(successAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  };

  const startCheck = () => {
    const ch = getRandomChallenges();
    setChallenges(ch);
    setCurrentIdx(0);
    setAuthResult(null);
    successAnim.setValue(0);
    setPhase('checking');
    runChallenge(0, ch);
  };

  const reset = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    progressAnim.setValue(0);
    successAnim.setValue(0);
    setPhase('idle');
    setChallenges([]);
    setCurrentIdx(0);
    setAuthResult(null);
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (!hasPermission) return (
    <View style={s.centered}>
      <Text style={s.text}>Camera permission needed</Text>
      <TouchableOpacity style={s.btn} onPress={requestPermission}>
        <Text style={s.btnText}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  );

  if (!device) return (
    <View style={s.centered}>
      <Text style={s.text}>Loading camera...</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />

      {(phase === 'checking' || phase === 'authenticating') && <ScanLine />}

      {phase === 'idle' && (
        <View style={s.bottom}>
          <Text style={s.title}>NeuralGate</Text>
          <Text style={s.sub}>Offline Face Authentication</Text>
          <TouchableOpacity style={s.startBtn} onPress={startCheck}>
            <Text style={s.startBtnText}>▶  Start Liveness Check</Text>
          </TouchableOpacity>
        </View>
      )}

      {(phase === 'checking' || phase === 'detected') && currentIdx < challenges.length && (
        <View style={s.overlay}>
          <View style={s.dots}>
            {challenges.map((_, i) => (
              <View key={i} style={[s.dot, i < currentIdx ? s.dotDone : i === currentIdx ? s.dotActive : s.dotPending]} />
            ))}
          </View>
          <View style={s.card}>
            {phase === 'detected' ? (
              <>
                <Text style={s.detectedEmoji}>✅</Text>
                <Text style={s.detectedText}>Detected!</Text>
              </>
            ) : (
              <>
                <Text style={s.emoji}>{challenges[currentIdx].emoji}</Text>
                <Text style={s.challengeText}>{challenges[currentIdx].label}</Text>
                <Text style={s.stepLabel}>Step {currentIdx + 1} of {challenges.length}</Text>
                <View style={s.progressTrack}>
                  <Animated.View style={[s.progressFill, { width: progressWidth }]} />
                </View>
                <Text style={s.progressLabel}>Analyzing...</Text>
              </>
            )}
          </View>
        </View>
      )}

      {phase === 'authenticating' && (
        <View style={s.overlay}>
          <View style={s.card}>
            <Text style={s.emoji}>🔍</Text>
            <Text style={s.challengeText}>Authenticating your face...</Text>
            <View style={s.progressTrack}>
              <Animated.View style={[s.progressFill, { width: progressWidth }]} />
            </View>
          </View>
        </View>
      )}

      {phase === 'done' && (
        <Animated.View style={[s.successOverlay, { opacity: successAnim }]}>
          <Text style={s.successEmoji}>{authResult?.includes('✅') ? '✅' : '❌'}</Text>
          <Text style={s.successTitle}>{authResult?.includes('✅') ? 'Authenticated!' : 'Authentication Failed'}</Text>
          <Text style={s.successSub}>{authResult || 'Please try again'}</Text>
          <TouchableOpacity style={s.resetBtn} onPress={reset}>
            <Text style={s.resetText}>Back to Camera</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

function ScanLine() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-300, 300] });
  return <Animated.View style={[s.scanLine, { transform: [{ translateY }] }]} />;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  text: { color: 'white', fontSize: 16, marginBottom: 20 },
  btn: { backgroundColor: '#534AB7', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: 'white', fontSize: 14 },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: 'rgba(83,74,183,0.7)', top: '50%' },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 52, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center' },
  title: { color: 'white', fontSize: 26, fontWeight: '700', letterSpacing: 1 },
  sub: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4, marginBottom: 24 },
  startBtn: { backgroundColor: '#534AB7', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 30, width: '100%', alignItems: 'center' },
  startBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', paddingTop: 60, paddingBottom: 48, paddingHorizontal: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotDone: { backgroundColor: '#2ECC71' },
  dotActive: { backgroundColor: '#534AB7', transform: [{ scale: 1.3 }] },
  dotPending: { backgroundColor: 'rgba(255,255,255,0.3)' },
  card: { backgroundColor: 'rgba(20,20,40,0.9)', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' },
  emoji: { fontSize: 44, marginBottom: 12 },
  challengeText: { color: 'white', fontSize: 22, fontWeight: '600', textAlign: 'center' },
  stepLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 6, marginBottom: 16 },
  progressTrack: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#534AB7', borderRadius: 3 },
  progressLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  detectedEmoji: { fontSize: 44, marginBottom: 8 },
  detectedText: { color: '#2ECC71', fontSize: 22, fontWeight: '700' },
  successOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,110,86,0.93)', justifyContent: 'center', alignItems: 'center', gap: 12 },
  successEmoji: { fontSize: 72 },
  successTitle: { color: 'white', fontSize: 28, fontWeight: '700' },
  successSub: { color: 'rgba(255,255,255,0.7)', fontSize: 16, textAlign: 'center', paddingHorizontal: 20 },
  resetBtn: { marginTop: 20, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  resetText: { color: 'white', fontSize: 15 },
});