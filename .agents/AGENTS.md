# Project Rules

## Code Quality
- Always use `setDoc(..., { merge: true })` instead of `updateDoc` when writing to Firestore user documents — user docs may not have all fields yet.
- Always run `npm run build` before committing to verify TypeScript and Vite both pass with zero errors.
- Remove all unused imports and variables before finalizing to avoid Vercel build failures.

## Communication
- Be concise. No long explanations unless asked.
- Skip summaries after edits — just confirm it builds and provide the git commands.

## Tech Stack
- Frontend: React + TypeScript + Vite at `c:\Users\ADMIN\OneDrive\Desktop\Dashboard`
- Auth & DB: Firebase (Auth + Firestore)
- Image storage: Cloudinary (`cloud_name=dbvpimaqi`, `upload_preset=DashboardPreset`, folder=`dashboard_avatars`)
- Deployment: Vercel auto-deploy from GitHub `wanchaleaw2548zaza/Dashboard-wann`, branch `main`
- CSS: Vanilla CSS with CSS variables (no Tailwind)

## Firestore Schema
- `users/{uid}`: `{ username, displayName, isOnline, avatarUrl, avatarPublicId }`
- `subjects/{id}`: `{ name, teacher, room, day, startTime, endTime, createdAt }`
- `homework/{id}`: `{ title, subjectId, dueDate, createdAt }`
- `completedHomework/{uid_hwId}`: `{ userId, homeworkId, completedAt }`
- `homeworkRequests/{id}`: `{ userId, username, title, subjectId, dueDate, status, createdAt }`

- **MUST ALWAYS follow the CSS Theme**: NEVER use hardcoded colors (like #10b981 or 
ed). ALWAYS use the predefined CSS variables from index.css (e.g., ar(--accent-color), ar(--bg-primary), ar(--text-secondary)) or global classes (e.g., .btn-primary) to ensure Dark/Light mode works seamlessly.

- **ALWAYS Translate UI Text**: All new visible UI text must use the 	('key') function from the useLanguage hook. Hardcoded strings (e.g., >Hello<) are strictly forbidden. If a key doesn't exist, add it to src/translations.ts in English, Thai, and Chinese.
