# AI Vision Integration Specs: MediaPipe Pose

## The Goal
We need a client-side (browser) component in Next.js that opens the device camera and counts "Squats" to verify the daily task.

## Implementation Details
- **Library:** Use `@mediapipe/pose` and `@mediapipe/camera_utils`. Use CDN links in the component or install via npm if faster.
- **Canvas:** Render the webcam video feed and draw the skeleton over it using a `<canvas>` element.
- **The Logic (Squat Counter):**
  - Track landmarks `23` (Left Hip), `24` (Right Hip), `25` (Left Knee), `26` (Right Knee).
  - Calculate the vertical (Y-axis) distance. If the Y-coordinate of the hips goes below the Y-coordinate of the knees, `isSquatting = true`.
  - When the hips go back above the knees, if `isSquatting` was true, increment the `squatCount` by 1 and set `isSquatting = false`.
- **Target:** When `squatCount === 5`, trigger an `onChallengeComplete()` callback function passed as a prop.

## Instructions for Cursor
- Generate a React component named `SquatTracker.tsx`.
- Include clear UI overlays: "Squats: X / 5" and visual feedback when a squat is registered.
- Ensure the camera asks for permissions properly and works gracefully on mobile browsers.s

## 1. Preparation Phase (Calibration)
- A mandatory 10-second countdown must occur before any tracking begins.
- Purpose: Allows the user to step back and position themselves fully within the camera frame.
- UI: Display a clear countdown ("10... 9...") and an instruction ("Lütfen tüm vücudunuz kadraja girecek şekilde uzaklaşın").

## 2. Angle-Based Exercise Detection (Math.atan2)
Instead of unreliable Y-coordinate comparisons, the system must calculate the joint angles using `Math.atan2`.

### A. Squat Detection
- **Landmarks:** Hip (23, 24), Knee (25, 26), Ankle (27, 28).
- **Logic:** - Down Phase (isSquatting = true): Angle < 100 degrees.
  - Up Phase (isSquatting = false & count++): Angle > 160 degrees.

### B. Push-up (Şınav) Detection
- **Landmarks:** Shoulder (11, 12), Elbow (13, 14), Wrist (15, 16).
- **Logic:**
  - Down Phase (isDown = true): Angle < 90 degrees.
  - Up Phase (isDown = false & count++): Angle > 150 degrees.