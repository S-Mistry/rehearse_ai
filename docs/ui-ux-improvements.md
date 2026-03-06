# UI/UX Improvement Suggestions

Flagged during the copy revamp audit. These are not copy changes — they are layout, component, and flow improvements to review and implement separately.

---

## Setup Flow

1. **Add a visual progress stepper.** The numbered steps (1–4) exist but there's no progress bar or stepper component. Users don't know how many steps remain or how far along they are. A simple 4-dot stepper at the top of the form would reduce drop-off.

2. **Add a "quick start" for returning users.** If a user already has a CV and JD uploaded, offer a one-click "Start with same setup" button on the dashboard. Going through the full wizard every time is unnecessary friction for repeat users.

---

## Question Workspace (Core Experience)

3. **Move the timer to the session header.** The recording timer is currently inside the transcript panel. A persistent, visible timer in the header would help users gauge answer length in real time without scanning for it.

4. **Add a live answer-length indicator.** Show a subtle visual cue when the answer passes 90 seconds (ideal zone) and turns amber/red at 180 seconds (too long). This is more effective than retroactive "tighten the answer" feedback.

5. **Add keyboard shortcuts.** Spacebar to start/stop recording, Enter to continue. Users doing 10 questions in a row will appreciate not reaching for the mouse every time.

6. **Make the "Continue" button contextual.** After scoring, "Continue" should say "Next question" (if more remain) or "See your results" (if last question). The generic "Continue" leaves users uncertain about what happens next.

7. **Add micro-animations to STAR cue strip transitions.** When a STAR element changes from "Missing" → "Thin" → "Covered" across retries, a subtle color fade would make progress feel more rewarding.

8. **Show seniority level in the session header.** Users may forget what seniority they selected. Showing "Senior" or "Lead / Principal" in the session shell header reinforces what scoring expectations they're being held to.

---

## Feedback & Scoring

9. **Add a "What is STAR?" expandable tooltip.** Not everyone knows the STAR framework. A small info icon next to "STAR breakdown" that expands into a one-liner would help first-timers: "STAR = Situation, Task, Action, Result — the standard framework for structuring behavioural answers."

10. **Consider a visual score progression chart.** On the score sheet, if this is attempt 2 or 3, show a simple visual (e.g., small bar or dot) comparing the current score to the previous attempt. This makes improvement tangible.

---

## Dashboard

11. **Add empty states with illustrations.** The dashboard, history, and documents pages have text-only empty states. Even a large Lucide icon or a simple illustration would make these feel less bare and more inviting.

12. **Add a "session in progress" banner.** If the user has an active session that isn't complete, show a prominent banner at the top of the dashboard with a "Continue session" button. Currently, in-progress sessions are buried in the session list.

---

## History & Summary

13. **Add filtering and sorting to the history page.** As users accumulate sessions, they'll want to filter by status (completed/in progress), sort by date, or search by seniority level.

14. **Add an "export" or "share" option on the summary page.** Users preparing for specific interviews might want to save or share their session summary as a PDF or link.

---

## General

15. **Add a global onboarding tooltip tour.** For first-time users, a 3–4 step tooltip tour highlighting the STAR cue strip, score sheet, and retry mechanism would reduce the learning curve significantly.

16. **Consistent mobile breakpoint handling.** The question workspace's 3-column layout currently uses `xl:` breakpoint. On tablet-sized screens (768–1280px), consider a 2-column layout with the STAR strip and score sheet as a tabbed panel below the main content.
