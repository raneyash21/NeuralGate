import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { LivenessState, getProgressText } from '../services/LivenessEngine';

interface Props {
  state: LivenessState;
  hasFace: boolean;
  onReset: () => void;
}

export default function LivenessOverlay({ state, hasFace, onReset }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation on instruction box
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [state.currentIndex]);

  // Success fade-in animation
  useEffect(() => {
    if (state.isComplete) {
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [state.isComplete]);

  // SUCCESS SCREEN
  if (state.isComplete) {
    return (
      <Animated.View style={[s.successOverlay, { opacity: successAnim }]}>
        <Text style={s.successEmoji}>✅</Text>
        <Text style={s.successTitle}>Liveness Verified!</Text>
        <Text style={s.successSub}>All challenges passed</Text>
        <TouchableOpacity style={s.resetBtn} onPress={onReset}>
          <Text style={s.resetBtnText}>Check Again</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const currentChallenge = state.challenges[state.currentIndex];
  const progressText = getProgressText(state);

  return (
    <View style={s.container}>

      {/* Top — challenge progress dots */}
      <View style={s.dotsRow}>
        {state.challenges.map((ch, i) => (
          <View
            key={i}
            style={[
              s.dot,
              i < state.currentIndex
                ? s.dotDone
                : i === state.currentIndex
                ? s.dotActive
                : s.dotPending,
            ]}
          />
        ))}
      </View>

      {/* No face warning */}
      {!hasFace && (
        <View style={s.noFaceBox}>
          <Text style={s.noFaceText}>👤 No face detected — look at camera</Text>
        </View>
      )}

      {/* Bottom — instruction card */}
      <Animated.View
        style={[s.instructionCard, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={s.challengeEmoji}>
          {currentChallenge?.emoji ?? ''}
        </Text>
        <Text style={s.instructionText}>
          {currentChallenge?.instruction ?? ''}
          <Text style={s.progressText}>{progressText}</Text>
        </Text>
        <Text style={s.stepLabel}>
          Step {state.currentIndex + 1} of {state.challenges.length}
        </Text>
      </Animated.View>

    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 48,
    paddingHorizontal: 20,
  },

  // Progress dots at top
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotDone: {
    backgroundColor: '#2ECC71',
  },
  dotActive: {
    backgroundColor: '#534AB7',
    transform: [{ scale: 1.3 }],
  },
  dotPending: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // No face warning
  noFaceBox: {
    alignSelf: 'center',
    backgroundColor: 'rgba(200, 50, 50, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  noFaceText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },

  // Instruction card at bottom
  instructionCard: {
    backgroundColor: 'rgba(20, 20, 40, 0.88)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  challengeEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  instructionText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressText: {
    color: '#AFA9EC',
    fontSize: 18,
    fontWeight: '400',
  },
  stepLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginTop: 6,
  },

  // Success screen
  successOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 110, 86, 0.93)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  successEmoji: {
    fontSize: 72,
  },
  successTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
  },
  successSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  resetBtn: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  resetBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
  },
});