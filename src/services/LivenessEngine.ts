import { FaceData } from '../modules/FaceAnalyzer';

export type ChallengeType = 'blink' | 'turn_left' | 'smile';

export interface Challenge {
  type: ChallengeType;
  instruction: string;
  emoji: string;
  requiredCount: number; // how many times needed (blink=2, others=1)
}

export interface LivenessState {
  challenges: Challenge[];       // 2 random challenges for this session
  currentIndex: number;          // which challenge we are on (0 or 1)
  currentCount: number;          // progress toward requiredCount
  wasEyesClosed: boolean;        // blink state machine tracker
  isComplete: boolean;           // all challenges passed
  isFailed: boolean;             // timed out
  instruction: string;           // text to show on screen
}

// All possible challenges
const ALL_CHALLENGES: Challenge[] = [
  {
    type: 'blink',
    instruction: 'Blink twice slowly',
    emoji: '👁️',
    requiredCount: 2,
  },
  {
    type: 'turn_left',
    instruction: 'Turn head left',
    emoji: '←',
    requiredCount: 1,
  },
  {
    type: 'smile',
    instruction: 'Give a big smile',
    emoji: '😊',
    requiredCount: 1,
  },
];

// Pick 2 random challenges — different every session
export const generateChallenges = (): Challenge[] => {
  const shuffled = [...ALL_CHALLENGES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
};

// Create a fresh liveness state for a new session
export const createInitialState = (): LivenessState => {
  const challenges = generateChallenges();
  return {
    challenges,
    currentIndex: 0,
    currentCount: 0,
    wasEyesClosed: false,
    isComplete: false,
    isFailed: false,
    instruction: challenges[0].instruction,
  };
};

// Check blink: state machine OPEN → CLOSED → OPEN = 1 blink
const checkBlink = (
  state: LivenessState,
  face: FaceData
): LivenessState => {
  const bothEyesClosed =
    face.leftEyeOpen < 0.3 && face.rightEyeOpen < 0.3;

  let { wasEyesClosed, currentCount } = state;

  if (bothEyesClosed && !wasEyesClosed) {
    // Eyes just closed — start of blink
    wasEyesClosed = true;
  } else if (!bothEyesClosed && wasEyesClosed) {
    // Eyes just opened again — blink completed
    wasEyesClosed = false;
    currentCount = currentCount + 1;
  }

  return { ...state, wasEyesClosed, currentCount };
};

// Check head turn left: yaw more negative than -15 degrees
const checkTurnLeft = (
  state: LivenessState,
  face: FaceData
): LivenessState => {
  if (face.yaw < -15) {
    return { ...state, currentCount: 1 };
  }
  return state;
};

// Check smile: smiling probability above 0.72
const checkSmile = (
  state: LivenessState,
  face: FaceData
): LivenessState => {
  if (face.smiling > 0.72) {
    return { ...state, currentCount: 1 };
  }
  return state;
};

// Main function — call this on every frame with latest face data
export const processFrame = (
  state: LivenessState,
  face: FaceData
): LivenessState => {
  // Already done or failed — do nothing
  if (state.isComplete || state.isFailed) return state;

  // No face — return state unchanged (don't advance or reset)
  if (!face.hasFace) return state;

  const currentChallenge = state.challenges[state.currentIndex];
  let newState = { ...state };

  // Run the right checker for current challenge
  switch (currentChallenge.type) {
    case 'blink':
      newState = checkBlink(newState, face);
      break;
    case 'turn_left':
      newState = checkTurnLeft(newState, face);
      break;
    case 'smile':
      newState = checkSmile(newState, face);
      break;
  }

  // Check if current challenge is now complete
  if (newState.currentCount >= currentChallenge.requiredCount) {
    const nextIndex = newState.currentIndex + 1;

    if (nextIndex >= newState.challenges.length) {
      // All challenges passed
      return {
        ...newState,
        currentIndex: nextIndex,
        isComplete: true,
        instruction: '✓ Liveness Verified!',
      };
    } else {
      // Move to next challenge
      const nextChallenge = newState.challenges[nextIndex];
      return {
        ...newState,
        currentIndex: nextIndex,
        currentCount: 0,
        wasEyesClosed: false,
        instruction: nextChallenge.instruction,
      };
    }
  }

  return newState;
};

// Helper: progress text for blink challenge e.g. "(1/2)"
export const getProgressText = (state: LivenessState): string => {
  const challenge = state.challenges[state.currentIndex];
  if (!challenge) return '';
  if (challenge.requiredCount > 1) {
    return ` (${state.currentCount}/${challenge.requiredCount})`;
  }
  return '';
};