import type { Equipment, MuscleGroup } from "../types";

export interface SeedExercise {
  name: string;
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
  category: "strength" | "cardio" | "mobility" | "conditioning";
  instructions: string;
  /** Suitable for someone new to training. */
  beginnerFriendly: boolean;
  defaultSets?: number;
  defaultReps?: number;
  defaultSeconds?: number;
}

export const EXERCISE_LIBRARY: SeedExercise[] = [
  // Upper body — push
  { name: "Push-up", muscleGroups: ["chest", "triceps", "shoulders"], equipment: ["bodyweight"], category: "strength", instructions: "Hands under shoulders, body in one line. Lower until elbows are about 90°, then press back up.", beginnerFriendly: true, defaultSets: 3, defaultReps: 10 },
  { name: "Incline Push-up", muscleGroups: ["chest", "triceps"], equipment: ["bodyweight", "bench"], category: "strength", instructions: "Hands on a bench or sturdy surface. The higher the surface, the easier the push-up.", beginnerFriendly: true, defaultSets: 3, defaultReps: 12 },
  { name: "Dumbbell Bench Press", muscleGroups: ["chest", "triceps", "shoulders"], equipment: ["dumbbells", "bench"], category: "strength", instructions: "Lie back, press the dumbbells up over the chest, lower under control.", beginnerFriendly: true, defaultSets: 3, defaultReps: 10 },
  { name: "Shoulder Press", muscleGroups: ["shoulders", "triceps"], equipment: ["dumbbells"], category: "strength", instructions: "Press from shoulder height to overhead without arching the lower back.", beginnerFriendly: true, defaultSets: 3, defaultReps: 10 },
  { name: "Lateral Raise", muscleGroups: ["shoulders"], equipment: ["dumbbells"], category: "strength", instructions: "Raise the dumbbells out to the sides to shoulder height with soft elbows.", beginnerFriendly: true, defaultSets: 3, defaultReps: 12 },
  { name: "Triceps Dip", muscleGroups: ["triceps", "chest"], equipment: ["bodyweight", "bench"], category: "strength", instructions: "Hands on a bench behind you, lower until elbows reach about 90°, press back up.", beginnerFriendly: true, defaultSets: 3, defaultReps: 10 },
  { name: "Barbell Bench Press", muscleGroups: ["chest", "triceps", "shoulders"], equipment: ["barbell", "bench"], category: "strength", instructions: "Lower the bar to mid-chest, keep the shoulder blades pulled together, press up.", beginnerFriendly: false, defaultSets: 4, defaultReps: 6 },

  // Upper body — pull
  { name: "Dumbbell Row", muscleGroups: ["back", "biceps"], equipment: ["dumbbells"], category: "strength", instructions: "Hinge at the hips with a flat back. Pull the dumbbell to the hip, lower under control.", beginnerFriendly: true, defaultSets: 3, defaultReps: 10 },
  { name: "Pull-up", muscleGroups: ["back", "biceps"], equipment: ["pull_up_bar"], category: "strength", instructions: "Hang with straight arms, pull until the chin passes the bar, lower slowly.", beginnerFriendly: false, defaultSets: 3, defaultReps: 6 },
  { name: "Band Row", muscleGroups: ["back", "biceps"], equipment: ["resistance_band"], category: "strength", instructions: "Anchor the band, pull the handles to your ribs, squeeze the shoulder blades.", beginnerFriendly: true, defaultSets: 3, defaultReps: 12 },
  { name: "Bicep Curl", muscleGroups: ["biceps"], equipment: ["dumbbells"], category: "strength", instructions: "Elbows tucked, curl the weight up without swinging, lower under control.", beginnerFriendly: true, defaultSets: 3, defaultReps: 12 },
  { name: "Face Pull", muscleGroups: ["back", "shoulders"], equipment: ["resistance_band"], category: "strength", instructions: "Pull the band toward your face with elbows high — good for posture.", beginnerFriendly: true, defaultSets: 3, defaultReps: 15 },
  { name: "Inverted Row", muscleGroups: ["back", "biceps"], equipment: ["bodyweight", "bench"], category: "strength", instructions: "Lie under a bar or table edge, keep the body straight and pull your chest to it.", beginnerFriendly: true, defaultSets: 3, defaultReps: 10 },

  // Lower body
  { name: "Bodyweight Squat", muscleGroups: ["quads", "glutes"], equipment: ["bodyweight"], category: "strength", instructions: "Feet shoulder-width, sit back and down, keep the chest up, drive through the whole foot.", beginnerFriendly: true, defaultSets: 3, defaultReps: 15 },
  { name: "Goblet Squat", muscleGroups: ["quads", "glutes", "core"], equipment: ["dumbbells", "kettlebell"], category: "strength", instructions: "Hold a weight at the chest, squat down between the knees, stand tall.", beginnerFriendly: true, defaultSets: 3, defaultReps: 12 },
  { name: "Lunge", muscleGroups: ["quads", "glutes"], equipment: ["bodyweight"], category: "strength", instructions: "Step forward, lower the back knee toward the floor, push back to standing.", beginnerFriendly: true, defaultSets: 3, defaultReps: 10 },
  { name: "Romanian Deadlift", muscleGroups: ["hamstrings", "glutes", "back"], equipment: ["dumbbells", "barbell"], category: "strength", instructions: "Hinge at the hips with a long spine, feel a stretch in the hamstrings, stand up.", beginnerFriendly: true, defaultSets: 3, defaultReps: 10 },
  { name: "Glute Bridge", muscleGroups: ["glutes", "hamstrings"], equipment: ["bodyweight", "mat"], category: "strength", instructions: "Lie on your back, drive the hips up, squeeze the glutes at the top.", beginnerFriendly: true, defaultSets: 3, defaultReps: 15 },
  { name: "Step-up", muscleGroups: ["quads", "glutes"], equipment: ["bodyweight", "bench"], category: "strength", instructions: "Step onto a box, drive through the front heel, lower with control.", beginnerFriendly: true, defaultSets: 3, defaultReps: 10 },
  { name: "Calf Raise", muscleGroups: ["calves"], equipment: ["bodyweight"], category: "strength", instructions: "Rise onto the balls of the feet, pause, lower slowly.", beginnerFriendly: true, defaultSets: 3, defaultReps: 15 },
  { name: "Barbell Squat", muscleGroups: ["quads", "glutes", "core"], equipment: ["barbell"], category: "strength", instructions: "Bar on the upper back, brace, squat to depth you control, stand up.", beginnerFriendly: false, defaultSets: 4, defaultReps: 6 },
  { name: "Kettlebell Swing", muscleGroups: ["glutes", "hamstrings", "core"], equipment: ["kettlebell"], category: "conditioning", instructions: "Hinge and snap the hips to swing the bell to chest height. Power comes from the hips.", beginnerFriendly: false, defaultSets: 4, defaultReps: 15 },

  // Core
  { name: "Plank", muscleGroups: ["core"], equipment: ["bodyweight", "mat"], category: "strength", instructions: "Forearms down, body in one line, ribs tucked. Breathe steadily.", beginnerFriendly: true, defaultSets: 3, defaultSeconds: 30 },
  { name: "Side Plank", muscleGroups: ["core"], equipment: ["bodyweight", "mat"], category: "strength", instructions: "Stack the hips, lift them off the floor, keep the neck long.", beginnerFriendly: true, defaultSets: 2, defaultSeconds: 25 },
  { name: "Dead Bug", muscleGroups: ["core"], equipment: ["bodyweight", "mat"], category: "strength", instructions: "On your back, extend opposite arm and leg while keeping the lower back down.", beginnerFriendly: true, defaultSets: 3, defaultReps: 10 },
  { name: "Bird Dog", muscleGroups: ["core", "back"], equipment: ["bodyweight", "mat"], category: "strength", instructions: "On all fours, reach opposite arm and leg out slowly, keep the hips level.", beginnerFriendly: true, defaultSets: 3, defaultReps: 10 },
  { name: "Hanging Knee Raise", muscleGroups: ["core"], equipment: ["pull_up_bar"], category: "strength", instructions: "Hang and lift the knees toward the chest without swinging.", beginnerFriendly: false, defaultSets: 3, defaultReps: 10 },

  // Cardio
  { name: "Brisk Walk", muscleGroups: ["cardio"], equipment: ["bodyweight"], category: "cardio", instructions: "Steady pace where you can still hold a conversation.", beginnerFriendly: true, defaultSeconds: 1800 },
  { name: "Easy Run", muscleGroups: ["cardio"], equipment: ["bodyweight"], category: "cardio", instructions: "Conversational pace. Keep it comfortable.", beginnerFriendly: true, defaultSeconds: 1500 },
  { name: "Cycling", muscleGroups: ["cardio", "quads"], equipment: ["cardio_machine"], category: "cardio", instructions: "Steady effort, smooth cadence.", beginnerFriendly: true, defaultSeconds: 1800 },
  { name: "Rowing", muscleGroups: ["cardio", "back"], equipment: ["cardio_machine"], category: "cardio", instructions: "Drive with the legs first, then lean back, then pull.", beginnerFriendly: true, defaultSeconds: 1200 },
  { name: "Jump Rope", muscleGroups: ["cardio", "calves"], equipment: ["jump_rope"], category: "cardio", instructions: "Small bounces, relaxed shoulders, turn the rope with the wrists.", beginnerFriendly: true, defaultSets: 4, defaultSeconds: 60 },
  { name: "Marching in Place", muscleGroups: ["cardio"], equipment: ["bodyweight"], category: "cardio", instructions: "Lift the knees at a comfortable rhythm — a gentle way to warm up.", beginnerFriendly: true, defaultSeconds: 300 },

  // Conditioning
  { name: "Mountain Climber", muscleGroups: ["core", "cardio"], equipment: ["bodyweight"], category: "conditioning", instructions: "From a plank, drive the knees toward the chest at a steady rhythm.", beginnerFriendly: true, defaultSets: 3, defaultSeconds: 30 },
  { name: "Burpee", muscleGroups: ["full_body", "cardio"], equipment: ["bodyweight"], category: "conditioning", instructions: "Squat, hands down, step or hop back to a plank, return and stand.", beginnerFriendly: false, defaultSets: 3, defaultReps: 8 },
  { name: "Squat Jump", muscleGroups: ["quads", "glutes", "cardio"], equipment: ["bodyweight"], category: "conditioning", instructions: "Squat then jump, land softly with bent knees.", beginnerFriendly: false, defaultSets: 3, defaultReps: 8 },
  { name: "Lateral Shuffle", muscleGroups: ["quads", "cardio"], equipment: ["bodyweight"], category: "conditioning", instructions: "Stay low and shuffle side to side over a short distance.", beginnerFriendly: true, defaultSets: 4, defaultSeconds: 30 },
  { name: "Farmer's Carry", muscleGroups: ["core", "back", "full_body"], equipment: ["dumbbells", "kettlebell"], category: "conditioning", instructions: "Walk tall carrying a weight in each hand, ribs down, shoulders back.", beginnerFriendly: true, defaultSets: 3, defaultSeconds: 40 },

  // Mobility
  { name: "Cat-Cow", muscleGroups: ["back", "core"], equipment: ["mat"], category: "mobility", instructions: "On all fours, alternate arching and rounding the spine with your breath.", beginnerFriendly: true, defaultSets: 2, defaultReps: 10 },
  { name: "World's Greatest Stretch", muscleGroups: ["full_body"], equipment: ["mat"], category: "mobility", instructions: "Deep lunge, drop the elbow inside the front foot, then rotate open.", beginnerFriendly: true, defaultSets: 2, defaultReps: 6 },
  { name: "Hip Flexor Stretch", muscleGroups: ["quads", "glutes"], equipment: ["mat"], category: "mobility", instructions: "Half-kneeling, tuck the pelvis and ease forward. Breathe.", beginnerFriendly: true, defaultSets: 2, defaultSeconds: 30 },
  { name: "Thoracic Rotation", muscleGroups: ["back", "shoulders"], equipment: ["mat"], category: "mobility", instructions: "Side-lying, open the top arm across the body and follow it with your eyes.", beginnerFriendly: true, defaultSets: 2, defaultReps: 8 },
  { name: "Hamstring Stretch", muscleGroups: ["hamstrings"], equipment: ["mat"], category: "mobility", instructions: "Long spine, hinge forward until you feel a gentle stretch — never painful.", beginnerFriendly: true, defaultSets: 2, defaultSeconds: 30 },
  { name: "Shoulder Pass-through", muscleGroups: ["shoulders"], equipment: ["resistance_band"], category: "mobility", instructions: "Hold a band wide and take it overhead and behind you, keeping the arms straight.", beginnerFriendly: true, defaultSets: 2, defaultReps: 10 },
  { name: "Ankle Rocks", muscleGroups: ["calves"], equipment: ["bodyweight"], category: "mobility", instructions: "Half-kneeling, drive the knee gently over the toes and back.", beginnerFriendly: true, defaultSets: 2, defaultReps: 10 },
  { name: "Child's Pose", muscleGroups: ["back"], equipment: ["mat"], category: "mobility", instructions: "Sit back onto the heels, reach the arms forward, relax and breathe.", beginnerFriendly: true, defaultSets: 1, defaultSeconds: 60 },
];
