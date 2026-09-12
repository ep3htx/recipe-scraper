// Seeds the exercise library used by the workout-program builder and the
// exercise browser. Heavy on bodyweight movements per the app's brief, plus
// enough strength/kettlebell/resistance-band/mobility coverage to build real
// programs from. Idempotent — skips any exercise that already exists by name
// (name has a unique constraint, so this also protects against races).
import { prisma } from "../db/prisma";

interface SeedExercise {
  name: string;
  category: string;
  equipment?: string;
  muscleGroup?: string;
  description?: string;
}

const EXERCISES: SeedExercise[] = [
  // Bodyweight
  { name: "Push-Up", category: "bodyweight", equipment: "none", muscleGroup: "chest", description: "Hands slightly wider than shoulders, lower chest to the floor, keep core tight." },
  { name: "Incline Push-Up", category: "bodyweight", equipment: "none", muscleGroup: "chest", description: "Hands elevated on a bench or step — an easier push-up variant." },
  { name: "Diamond Push-Up", category: "bodyweight", equipment: "none", muscleGroup: "triceps", description: "Hands close together under the chest, forming a diamond shape." },
  { name: "Pike Push-Up", category: "bodyweight", equipment: "none", muscleGroup: "shoulders", description: "Hips high, head lowers toward the floor between the hands." },
  { name: "Bodyweight Squat", category: "bodyweight", equipment: "none", muscleGroup: "legs", description: "Feet shoulder-width, sit the hips back and down, chest up." },
  { name: "Jump Squat", category: "bodyweight", equipment: "none", muscleGroup: "legs", description: "Explosive squat with a jump at the top." },
  { name: "Lunge", category: "bodyweight", equipment: "none", muscleGroup: "legs", description: "Step forward and lower the back knee toward the floor." },
  { name: "Reverse Lunge", category: "bodyweight", equipment: "none", muscleGroup: "legs", description: "Step backward instead of forward — easier on the knees." },
  { name: "Bulgarian Split Squat", category: "bodyweight", equipment: "bench", muscleGroup: "legs", description: "Rear foot elevated behind you on a bench or step." },
  { name: "Glute Bridge", category: "bodyweight", equipment: "none", muscleGroup: "glutes", description: "Lie on your back, feet flat, drive the hips up." },
  { name: "Single-Leg Glute Bridge", category: "bodyweight", equipment: "none", muscleGroup: "glutes", description: "Glute bridge performed on one leg at a time." },
  { name: "Plank", category: "bodyweight", equipment: "none", muscleGroup: "core", description: "Forearms and toes on the floor, straight line from head to heels." },
  { name: "Side Plank", category: "bodyweight", equipment: "none", muscleGroup: "core", description: "Supported on one forearm, hips lifted, body in a straight line." },
  { name: "Mountain Climbers", category: "bodyweight", equipment: "none", muscleGroup: "core", description: "From a plank, drive knees toward the chest alternating quickly." },
  { name: "Bicycle Crunch", category: "bodyweight", equipment: "none", muscleGroup: "core", description: "Alternate elbow to opposite knee in a pedaling motion." },
  { name: "Sit-Up", category: "bodyweight", equipment: "none", muscleGroup: "core", description: "Classic sit-up from lying to seated." },
  { name: "Superman", category: "bodyweight", equipment: "none", muscleGroup: "back", description: "Lie face down, lift arms and legs off the floor together." },
  { name: "Bird Dog", category: "bodyweight", equipment: "none", muscleGroup: "core", description: "From all fours, extend opposite arm and leg, hold, switch." },
  { name: "Burpee", category: "bodyweight", equipment: "none", muscleGroup: "full body", description: "Squat, kick back to a plank, push-up, jump back in, jump up." },
  { name: "Jumping Jacks", category: "bodyweight", equipment: "none", muscleGroup: "full body", description: "Classic cardio warm-up movement." },
  { name: "High Knees", category: "bodyweight", equipment: "none", muscleGroup: "legs", description: "Run in place bringing knees up toward hip height." },
  { name: "Wall Sit", category: "bodyweight", equipment: "none", muscleGroup: "legs", description: "Back against a wall, knees at 90 degrees, hold the position." },
  { name: "Tricep Dips", category: "bodyweight", equipment: "chair or bench", muscleGroup: "triceps", description: "Hands on a chair or bench behind you, lower and press back up." },
  { name: "Pull-Up", category: "bodyweight", equipment: "pull-up bar", muscleGroup: "back", description: "Overhand grip, pull chin above the bar." },
  { name: "Chin-Up", category: "bodyweight", equipment: "pull-up bar", muscleGroup: "back", description: "Underhand grip pull-up — easier for most people than a pull-up." },
  { name: "Inverted Row", category: "bodyweight", equipment: "bar or rings", muscleGroup: "back", description: "Body under a bar or rings, pull chest up toward it." },
  { name: "Calf Raise", category: "bodyweight", equipment: "none", muscleGroup: "calves", description: "Rise up onto the balls of the feet, lower slowly." },
  { name: "Step-Up", category: "bodyweight", equipment: "step or bench", muscleGroup: "legs", description: "Step fully onto a bench or step, drive through the lead leg." },

  // Strength (weighted)
  { name: "Barbell Back Squat", category: "strength", equipment: "barbell", muscleGroup: "legs", description: "Bar on the upper back, squat to depth, drive up through the heels." },
  { name: "Barbell Deadlift", category: "strength", equipment: "barbell", muscleGroup: "back", description: "Hinge at the hips, keep the bar close, stand up tall." },
  { name: "Barbell Bench Press", category: "strength", equipment: "barbell", muscleGroup: "chest", description: "Lower the bar to the chest, press back up to lockout." },
  { name: "Overhead Press", category: "strength", equipment: "barbell or dumbbell", muscleGroup: "shoulders", description: "Press the weight straight overhead from shoulder height." },
  { name: "Bent-Over Row", category: "strength", equipment: "barbell or dumbbell", muscleGroup: "back", description: "Hinge forward, pull the weight to the lower ribs." },
  { name: "Dumbbell Chest Press", category: "strength", equipment: "dumbbell", muscleGroup: "chest", description: "Flat or incline, press dumbbells up over the chest." },
  { name: "Dumbbell Row", category: "strength", equipment: "dumbbell", muscleGroup: "back", description: "One hand supported, row the dumbbell to the hip." },
  { name: "Dumbbell Shoulder Press", category: "strength", equipment: "dumbbell", muscleGroup: "shoulders", description: "Press dumbbells overhead from shoulder height." },
  { name: "Dumbbell Bicep Curl", category: "strength", equipment: "dumbbell", muscleGroup: "arms", description: "Curl dumbbells from thigh to shoulder, elbows fixed." },
  { name: "Tricep Extension", category: "strength", equipment: "dumbbell", muscleGroup: "arms", description: "Overhead or lying extension, elbows fixed, extend at the elbow." },
  { name: "Romanian Deadlift", category: "strength", equipment: "barbell or dumbbell", muscleGroup: "hamstrings", description: "Slight knee bend, hinge at the hips, feel a hamstring stretch." },
  { name: "Leg Press", category: "strength", equipment: "machine", muscleGroup: "legs", description: "Press the sled away using the legs, control the return." },

  // Resistance bands
  { name: "Band Pull-Apart", category: "resistance_bands", equipment: "resistance band", muscleGroup: "shoulders", description: "Arms extended, pull the band apart squeezing the shoulder blades." },
  { name: "Band Squat", category: "resistance_bands", equipment: "resistance band", muscleGroup: "legs", description: "Band under the feet and over the shoulders, squat down and up." },
  { name: "Band Row", category: "resistance_bands", equipment: "resistance band", muscleGroup: "back", description: "Anchor the band, row the handles to the ribs." },
  { name: "Band Bicep Curl", category: "resistance_bands", equipment: "resistance band", muscleGroup: "arms", description: "Stand on the band, curl the handles up." },
  { name: "Band Lateral Walk", category: "resistance_bands", equipment: "mini loop band", muscleGroup: "glutes", description: "Loop band above the knees, step sideways keeping tension." },
  { name: "Band Deadlift", category: "resistance_bands", equipment: "resistance band", muscleGroup: "back", description: "Stand on the band, hinge and stand up against the resistance." },
  { name: "Band Chest Press", category: "resistance_bands", equipment: "resistance band", muscleGroup: "chest", description: "Anchor behind you, press the handles forward." },

  // Kettlebells
  { name: "Kettlebell Swing", category: "kettlebells", equipment: "kettlebell", muscleGroup: "full body", description: "Hinge and hike the bell back, drive the hips forward to swing it to chest height." },
  { name: "Kettlebell Goblet Squat", category: "kettlebells", equipment: "kettlebell", muscleGroup: "legs", description: "Hold the bell at the chest, squat between the knees." },
  { name: "Kettlebell Deadlift", category: "kettlebells", equipment: "kettlebell", muscleGroup: "back", description: "Hinge at the hips to pick the bell up from between the feet." },
  { name: "Kettlebell Clean", category: "kettlebells", equipment: "kettlebell", muscleGroup: "full body", description: "Pull the bell from the floor or swing into the rack position." },
  { name: "Kettlebell Snatch", category: "kettlebells", equipment: "kettlebell", muscleGroup: "full body", description: "One explosive pull from between the legs to overhead." },
  { name: "Kettlebell Turkish Get-Up", category: "kettlebells", equipment: "kettlebell", muscleGroup: "full body", description: "Slow, controlled transition from lying to standing with the bell overhead." },
  { name: "Kettlebell Row", category: "kettlebells", equipment: "kettlebell", muscleGroup: "back", description: "Hinge forward, row the bell to the ribs." },
  { name: "Kettlebell Overhead Press", category: "kettlebells", equipment: "kettlebell", muscleGroup: "shoulders", description: "Press the bell from the rack position to overhead." },

  // Mobility
  { name: "Cat-Cow Stretch", category: "mobility", equipment: "none", muscleGroup: "back", description: "On all fours, alternate arching and rounding the spine." },
  { name: "World's Greatest Stretch", category: "mobility", equipment: "none", muscleGroup: "full body", description: "Lunge with a rotation and reach — a full-body mobility flow." },
  { name: "Hip Flexor Stretch", category: "mobility", equipment: "none", muscleGroup: "hips", description: "Kneeling lunge position, shift weight forward to stretch the front hip." },
  { name: "Hamstring Stretch", category: "mobility", equipment: "none", muscleGroup: "legs", description: "Seated or standing forward fold, reach toward the toes." },
  { name: "Shoulder Dislocates", category: "mobility", equipment: "band or dowel", muscleGroup: "shoulders", description: "Wide overhand grip, rotate the band or dowel from front to back." },
  { name: "Thoracic Spine Rotation", category: "mobility", equipment: "none", muscleGroup: "back", description: "Quadruped position, rotate one arm up toward the ceiling." },
  { name: "Ankle Circles", category: "mobility", equipment: "none", muscleGroup: "ankles", description: "Seated or standing, rotate the ankle through its full range." },
  { name: "Child's Pose", category: "mobility", equipment: "none", muscleGroup: "back", description: "Kneel and sit back onto the heels, reach arms forward, relax." },
  { name: "Downward Dog", category: "mobility", equipment: "none", muscleGroup: "full body", description: "Inverted V shape, heels reaching toward the floor." },
  { name: "Standing Quad Stretch", category: "mobility", equipment: "none", muscleGroup: "legs", description: "Standing, pull one heel toward the glutes to stretch the quad." },
];

async function main() {
  let created = 0;
  let skipped = 0;
  for (const exercise of EXERCISES) {
    const existing = await prisma.exercise.findUnique({ where: { name: exercise.name } });
    if (existing) {
      skipped += 1;
      continue;
    }
    await prisma.exercise.create({ data: exercise });
    created += 1;
  }
  // eslint-disable-next-line no-console
  console.log(`Seeded ${created} exercises (${skipped} already present, skipped).`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
