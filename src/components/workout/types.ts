/** Plain, serialisable shapes passed from server components to the client. */

export interface PlainExercise {
  id: string;
  name: string;
  muscleGroups: string[];
  equipment: string[];
  category: string;
  instructions: string | null;
  isCustom: boolean;
}

export interface PlainWorkoutExercise {
  id: string;
  name: string;
  muscleGroups: string[];
  targetSets: number | null;
  targetReps: number | null;
  targetSeconds: number | null;
}

export interface PlainWorkout {
  id: string;
  name: string;
  description: string | null;
  style: string;
  isTemplate: boolean;
  estimatedMinutes: number;
  scheduledFor: string | null;
  updatedAt: string;
  exercises: PlainWorkoutExercise[];
}

export interface PlainSet {
  id: string;
  order: number;
  reps: number | null;
  seconds: number | null;
  weight: number | null;
  weightUnit: string;
  completed: boolean;
}

export interface PlainSessionExercise {
  id: string;
  name: string;
  muscleGroups: string[];
  order: number;
  notes: string | null;
  completed: boolean;
  sets: PlainSet[];
}

export interface PlainSession {
  id: string;
  name: string;
  style: string;
  status: string;
  startedAt: string;
  notes: string | null;
  exercises: PlainSessionExercise[];
}
