[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Arifpratama19/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Arifpratama19/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

# Leonida Trophy Atlas — GTA VI Trophy Guide & Tracker

Entry for the [make.fun bounty "Build the best GTA 6 trophy guide"](https://make.fun/bounty/gta6-trophy-guide-01) ($250).

An offline web app that guides you to all **55 PlayStation 5 trophies** of
Grand Theft Auto VI and tracks your progress toward the platinum,
**Vice Got a Price!** Open it in a desktop browser and it works with the
network off — no account, no server, no Rockstar artwork.

## What it does

- **All 55 trophies, verified.** Every official trophy name, description and
  grade (1 Platinum, 2 Gold, 6 Silver, 46 Bronze), researched from the
  published lists at PowerPyx, PushSquare and Insider Gaming (November 2026).
  Where sources disagreed, the majority reading is used and the disagreement
  is noted in that trophy's guide.
- **A guide for every trophy, in our own words.** What to do, where and how,
  and when it can be missed — with sources cited on each trophy, never
  copied. The one still-unconfirmed trophy (**Bad Luck, I Guess**) says so
  plainly instead of guessing.
- **Checklist saved in your browser.** Tick trophies as you earn them;
  progress is stored in `localStorage` and never leaves your machine.
- **Export / import.** Download your progress as JSON, or import a previous
  export to restore it on another browser.
- **Filters by kind** — story, side missions, activities, combat,
  collectibles, exploration, crime, money, completion — plus grade, earned
  status, missable-only, and text search.
- **Spoiler setting.** Story trophies stay hidden until you earn them (or
  until you switch the setting off), so the list won't spoil the plot.
- **Roadmap to the platinum.** Three steps, built from the official
  descriptions: story first (watch the one possibly missable meditation in
  Chapter 1), then the 100% completion checklist, then Strangers & Freaks
  and cleanup. The single possibly missable trophy,
  **Positive Mental Attitude**, is flagged throughout.

## The one missable trophy

**Positive Mental Attitude** (meditate at every spot across Leonida) is the
only trophy any published guide flags as possibly missable. During Chapter 1,
after the mission Down to Earth, Lucia may say in the kitchen in the morning
that she is going to meditate, then walk to the balcony. Follow her, accept,
and do the meditation. That session raises your meditation counter but is not
marked as a normal spot, and it is gone for good after Chapter 1. Whether it
is strictly required is still unconfirmed — so do it in Chapter 1 to be safe.
Everything else can be finished after the story in free roam.

## Run it

```sh
node main.ts build   # validate the app (55 trophies, links, JS syntax)
node main.ts serve   # serve on http://localhost:4173
```

Or just open `app/index.html` directly in a desktop browser — the app is
plain static files (`index.html`, `style.css`, `app.js`,
`data/trophies.json`) and needs no server at all.

## Files

| File | What it is |
| --- | --- |
| `main.ts` | Dev server + build validator (Node 22+ stdlib only) |
| `app/index.html` | The guide page |
| `app/style.css` | Original Vice-sunset styling |
| `app/app.js` | Checklist, filters, spoiler toggle, export/import |
| `app/data/trophies.json` | All 55 trophies with guides and sources |
| `screenshots/` | Renders of the guide's own interface |

## Sources

- PowerPyx — GTA 6 (Grand Theft Auto VI) Trophy Guide & Roadmap
  (<https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/>)
- PushSquare — GTA 6: Trophy Guide & Roadmap
  (<https://www.pushsquare.com/guides/gta-6-trophy-guide-and-roadmap>)
- Insider Gaming — Complete GTA 6 Trophy List
  (<https://insider-gaming.com/complete-gta-6-trophy-list-how-to-get-all-trophies-achievements/>)

## Disclaimer

Unofficial fan guide, not affiliated with Rockstar Games or Take-Two
Interactive. Grand Theft Auto and GTA are trademarks of Take-Two
Interactive. This guide uses no Rockstar logo or official artwork; all
visuals are original. Guide text is written in the author's own words;
sources are cited, never copied.
