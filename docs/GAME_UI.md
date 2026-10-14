# Game UI and scoring boards

The 14 October 2026 update changes presentation and adds the two requested gameplay options. It preserves the existing 3×3 rules, all 22 powers, three equipped slots, cosmetics, account progression, payments and provider settings. Food, health, morale, survival events and other reference examples are not game mechanics.

The title screen offers New game, Continue and Settings. Continue resumes an active server battle or a saved local board. A compact player HUD shows actual trophies, coins and rank. The game dock and Journey panel keep every existing destination reachable. Battle intel and the timeline expand on demand. Existing artwork supplies the world, avatars and equipped cosmetics. Motion and contrast preferences remain supported; existing synthesized sounds remain controlled by the current sound and volume settings.

## Board rules

3×3 keeps first-line wins and the existing round rules. 4×4, 5×5 and 6×6 use one scored board. Each contiguous horizontal, vertical or diagonal run of three real marks counts as one point. Overlapping runs count: four marks in a row contain two triplets. Scores reflect the current board; moving or removing marks can change the score. Phantom illusions do not score. When the board fills, the higher score wins and equal scores draw. Existing timeout, surrender and stalemate protection continue to apply. Larger boards have proportionate thinking banks of 240, 360 and 480 seconds; turns remain 20 seconds.

Board size is selectable for online queues, practice and private rooms, and separately for same-device play. Matchmaking pairs identical board sizes and rulesets. Snapshots, reconnects and replays retain the chosen size; old saved games remain 3×3.

## Ranked fallback

The Ranked selection and queue show the requested disclosure:

> If no real world players are found you'll play against a competitive bot

The queue searches human opponents first, then offers a competitive bot after 25 seconds. Difficulty is Hard below 450 trophies, Expert from 450, Extreme from 1,400 and Nightmare from 2,500. Bot names, opponent labels, snapshots and results identify the bot explicitly. No fake human account or leaderboard entry is created. Ranked cups use the existing rating formula against the disclosed opponent rating; existing AI coin, XP and human-only mission rules remain in effect.

## Release pipeline

Pushes to `main` run the existing GitHub release gate: pure tests/build, isolated MySQL tests, Linux container startup/coordinator takeover and browser gameplay flows. Railway follows `main` automatically with Wait for CI enabled. This update requires no database migration, reset or provider-key change.
