# Conversational Interviewer Spike

## Current Production Shape
- The live round is intentionally turn-based: intro, candidate answer, optional follow-up, candidate answer, feedback.
- Audio capture and browser captions are handled in the client workspace.
- Canonical transcription, scoring, follow-up selection, and speech synthesis are handled on the server.
- This release keeps that architecture because the immediate product issues are continuity, coaching quality, and UI clarity rather than realtime orchestration.

## What "Conversational Model" Could Mean Here
- Controlled prompt/model swap:
  Keep the current request boundaries, but tune the interviewer prompt/model so follow-ups and spoken feedback feel more natural.
- Realtime conversational interviewer:
  Move to a streaming audio session where the model can listen, interrupt, respond, and maintain a live conversation state.

## Controlled Swap vs Realtime Redesign
- Controlled swap is lower risk:
  No major browser architecture changes, no new transport layer, and the existing transcript/scoring persistence model can stay intact.
- Controlled swap is limited:
  The interaction still feels turn-based because audio is captured and scored in chunks.
- Realtime redesign is higher fidelity:
  The interviewer can react mid-answer, maintain stronger conversational flow, and potentially coach more naturally.
- Realtime redesign is materially more complex:
  It needs streaming audio transport, explicit interruption handling, session lifecycle management, transcript ownership rules, and a different QA surface.

## Key Risks and Constraints
- Latency:
  Realtime systems are only worthwhile if response latency is consistently low enough to feel conversational.
- Browser permissions:
  Microphone setup is already a fragile edge. Realtime audio increases the number of failure points.
- Interruptions:
  The system needs a clear policy for barge-in, overlapping speech, and when the interviewer is allowed to cut in.
- Transcript ownership:
  We need to decide whether the browser captions, model transcript, or post-processed transcript is the canonical record.
- Cost:
  Streaming speech-to-speech sessions are likely to cost more than the current chunked intro/follow-up/feedback pattern.
- QA complexity:
  Regression testing becomes much harder because timing, interruption, and partial transcript edge cases all become first-class behaviors.

## Recommendation
- Keep the current production flow for now.
- Revisit the conversational interviewer only after transcript continuity and coaching quality are stable in production.
- If the team wants to explore next, start with a controlled prompt/model spike inside the current backend boundaries before considering a realtime rebuild.
