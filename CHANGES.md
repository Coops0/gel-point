# changelog

### v0.1.6
- Loading screen wasn't fully covering screen
- Add direct iOS splash screen with dark mode support
- Move letters up
- Slightly increase letter radius
- Reduce letter parent sizing
- Compress attached puzzles and words data files
- Remove bundled font to reduce binary size, use system font 

### v0.1.5
- Use capital letters for all game-related elements
- New icon (thanks Chloe)
- Hopefully fix again Next Level text being overlapped by the grid
- Add help text to buy menu
- Add 2 new themes
- *Remove old hash bytes routes from server*
- If continuous tapping letters is detected, show help message
- All elements transition with the change of theme now
- Fixed popout menu edge case
- Refine haptics
- Fixed popout menu snap animation
- Improve theme colors
- Try to load theme immediately on app load
- Tap to dismiss hint popups
- New word list
- Fix popout menu being aligned incorrectly for the first few seconds of the app loading
- Move all icons up a little bit to prevent accidental swipes up
- Change how letter deselection works to be more intuitive
- Hopefully fully disabled iOS magnifier
- Updated word building indicator to react to guesses
- Fix visual bug when selecting letters immediately after finding a bonus word
- Increased letter sizes
- Rewrite letter interactions to allow for a much larger radius on initial selection
- Massively decreased complexity of backend, app should be substantially faster
- Use a lazy load storage method for found words to decrease initial load time

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
- *\[internal\] Migrate all 'template' refs to actually use template ref (`InstanceType<Component>`)*
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
