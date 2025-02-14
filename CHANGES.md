# changelog

### v0.1.5
- Hopefully fix again Next Level text being overlapped by the grid
- Add help text to buy menu
- Add 2 new themes
- *Remove old hash bytes routes from server*
- If continuous tapping letters is detected, show help message
- All elements transition with the change of theme now
- Fixed popout menu edge case

### v0.1.4

- Optimize built binary for size
- Disable iOS hold magnifier `* { -webkit-user-select: none; }`
- *Cheat code input not always being focused*
- *Disable Cheat code input autocorrect `autocomplete="off" autocapitalize="off" spellcheck="false" autocorrect="off"`*
- Fix haptic spam on pop out menu
- Make pop out menu less glitchy
- Add haptic feedback to pop out menu initial open
- Cells glow after being filled out for a second
- Update grid update animation
- *Secret zebra theme*
- Popout menu haptic feedback when selecting active option
- Fix counter off center
- Rewrite shuffle animation
- Add haptic to selecting to buy cols/rows
- Found bonus words list are not being persisted
- Improve data persistence
- Fix buying haptic feedback
- Update selected row/col indicator within buy menu

### v0.1.3

- Resolved special case app would fail to launch
- Resolve bundle naming issues

### v0.1.2

- Changed grid letters to use original font
- Black and white buttons & emojis
- Shuffle button spins on shuffle
- Popover overlap of other emoji (e.x. dark mode selector over theme) looks bad / cover up with background
- Unlock all themes for beta
- \[internal\] Migrate all 'template' refs to actually use template ref (`InstanceType<Component>`)
- Refined haptics in various places
- Add staggered animation to popout menus
- Fix bonus letter animation shadow bug
- Many UI fixes on the buy menu screen
- Shimmer animation when finding a word
- Rewrote and optimized local cache of word list and puzzles list, app should load faster

### v0.1.1

- Fix currently built word text's position
- Fade out from loading into game
- Next level animation has variations in its text
- Light theme by default
- Redo all dark themes
- Next level animation on top
- New font
- Next level animation handles spam 
