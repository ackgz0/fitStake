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
- Ensure the camera asks for permissions properly and works gracefully on mobile browsers.