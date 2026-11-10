# Haru design system

## Scene and theme

A learner opens a five-minute lesson on a phone in a bright café or on the way home. Ice-white surfaces, navy text and clear blue actions stay readable. The panda provides energetic, playful feedback while the surrounding interface stays steady.

## Palette

User-approved main palette: navy #081F5C, primary blue #334EAC, sky #7096D1, border blue #D0E3FF, ice #E7F1FF, paper/card #F9FCFF. Use navy for headings, primary blue for actions and selected controls, sky for the panda clothing and decorative detail, and pale blues for surfaces and borders. Muted copy uses #4E6593 to preserve contrast on the pale surfaces. Green and red remain semantic success/error accents. Native and NativeWind share the same tokens.

## Type and spacing

Native system type with Korean platform fallback. Headings 30/36 and 23/29, body 16/25, supporting text 13/19. Horizontal screen padding 24, main section spacing 28, grouped controls 12. Avoid fixed-height text containers. Keep forms and captions legible at increased font scales.

## Components

24-radius lesson surfaces, 18-radius primary buttons, pill difficulty labels, simple icon buttons, inline error callouts, ice-white bottom navigation. Tappable lessons use distinct editorial rows rather than identical icon card grids.

## Panda tutor

Dori uses `public/mascot/panda_rive_v2_assets/panda_rig_v2.svg`: 22 independently named groups and 38 vector shapes. Preserve its white belly, dark fur paws, facial features, proportions and paint stops. No clothing or fur recolor overlays. Optional headphones/glasses/hat use separate attachment slots. Learning screens use the shared seven-state `panda.riv`; Home uses the gentle ten-state cozy-room rig.

## Cozy room

Home is an interactive illustrated study room built from all four supplied `public/pandaRoom/` phases. Preserve the master’s mint walls, warm wood, teal chair, Seoul window and illustrated style. A single hand-parented cup follows a complete 9.2-second coffee cycle. Rain stays inside the window; steam, leaves, light and clock animate independently. Day/night changes environment layers, without darkening the panda. Touch motion stays within a few pixels. Use native Rive where available, with animated SVG parts as the Expo Go/error fallback. Keep existing learning actions and progress below the scene; the book opens the real next lesson.

## Motion

Short eased UI transitions. Character reactions use anticipation, squash and stretch, staggered head and limb follow-through, two celebratory hops, foot kicks, a broad wave, a wink and a landing shimmy. Blue vector confetti and six sparkles burst in the celebrating state and reset in other states. Idle uses weight shifts, a foot tap and gaze changes; speaking gestures with both arms. Reduced motion retains the static panda.

## Launch

Sky-blue #D0E3FF full-screen launch with the original panda face centered and navy Haru branding near the bottom. Native uses an exported still; React uses the extracted face Rive animation, with blinking and a curious head tilt. Reduced motion remains still.

## Onboarding

Onboarding opens directly on Dori's first Korean phrase, with bundled audio, optional browser recognition, native attempt recording, and a visible no-mic route. After the phrase, ask about the learner's goal, interests, optional age range, starting point, daily-time goal, and optional reminder time. Interests tailor the lesson preview from the real local catalog. Keep age range and interests on-device. Ask for notification permission only after the learner chooses to turn on a reminder; let them skip. Introduce streaks after the first phrase, accurately explaining that the first streak day is earned by completing a conversation. Never award a streak, gift, or progress that has not been recorded. Warm ivory surfaces support the app's navy, primary blue, sky, and ice tokens. The daily selector retains 10–120 minutes; the reveal shows accurate practice-time projections without implying proficiency. The final ready screen previews actual lessons from the bundled catalog. Completion enters the existing cozy-room Home directly. Actions stay above safe areas while content scrolls on small screens.
