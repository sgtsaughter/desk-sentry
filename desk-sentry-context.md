# Desk Sentry Project - Context Summary

## Project Goal
Building "Desk Sentry" - an AI-powered posture tracking application that:
- Uses webcam to monitor user's spinal alignment in real-time
- Triggers interventions (screen blur, notifications) when user slouches
- Runs as a desktop application for system-level control

## Technology Stack Decided
- **Desktop Framework:** Electron (for system-level interventions, screen overlay, background operation)
- **Frontend:** Angular (user has Angular background)
- **Pose Detection:** MediaPipe Pose (Google's solution - 33 body landmarks)
- **Language:** TypeScript
- **Styling:** SCSS

## Why Electron Over Web App
- Can blur entire screen, not just browser window
- Runs in system tray without browser tab
- Better native notifications and OS integration
- Auto-start on login capability
- Won't lose state if browser closes

## Learning Approach
User wants **guided learning** - explain concepts and guide through steps rather than generating everything automatically. Only generate code when specifically requested.

## Current Progress
1. ✅ Node.js updated to v20.19+/v22.12+
2. ✅ Angular CLI installed globally
3. ✅ About to create Angular project: `ng new desk-sentry --routing --style=scss`
4. ⏳ **NEXT STEP:** Manual Electron setup (Option A) - step-by-step integration
   - Will install Electron as dev dependency
   - Create main.js (Electron main process)
   - Configure Angular build output
   - Set up npm scripts

## Key Architecture Concepts
- **Main Process (main.js):** Node.js environment, controls app lifecycle
- **Renderer Process (Angular app):** Runs in Chromium window, displays UI
- Angular app loads inside Electron window

## Planned Features
1. Calibration mode (set good posture baseline)
2. Real-time skeleton visualization on webcam
3. Posture score dashboard (analytics)
4. Smart detection (pause when user leaves)
5. Privacy-first (all local processing)
6. Tiered interventions (gentle → medium → screen blur)

## Current Working Directory
`C:\Users\baxte\OneDrive\Desktop\dev-projects\desk-sentry` (will be created)

## User Background
- Experienced with Angular
- Learning Electron for first time
- Wants to understand the architecture deeply
