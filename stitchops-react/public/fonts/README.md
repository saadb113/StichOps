# Brand fonts

## inter-display/ — done
Loaded from the official Inter Project release (SIL Open Font License —
free for commercial use). `InterDisplay-Regular/Medium/SemiBold/Bold.ttf`
are in place and confirmed loading.

## stk-bureau-serif/ — loaded, but check the license before shipping
Wired up from `STKBureauSerif-{Regular,Medium,SemiBold,Bold}[-Italic]-Trial.otf`
(valid OpenType/CFF font data, real glyphs — a legitimate foundry trial,
unlike the earlier OnlineWebFonts.com copy in `E:/StichOps/fonts/`, which
is still not used anywhere).

**The "-Trial" in every filename is the catch.** Foundries almost always
license trial fonts for evaluation/personal preview only — not production
or commercial deployment on a live site. Before this ships:
1. Check the EULA that came with your Smuss Type Kiosk purchase — it should
   say what's actually licensed (desktop use, web use, static site,
   dynamic/app embedding, etc. are often separate tiers).
2. If your purchase includes proper webfont files (`.woff`/`.woff2`, not
   suffixed "-Trial"), swap those in under the same weight names and delete
   the `-Trial.otf` set.
3. If you only have the trial pack, treat this as a placeholder — matches
   what production will look like, but shouldn't go to a real deployment
   as-is.
