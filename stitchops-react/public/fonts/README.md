# Brand fonts

## inter-display/ — done
Loaded from the official Inter Project release (SIL Open Font License —
free for commercial use). `InterDisplay-Regular/Medium/SemiBold/Bold.ttf`
are in place and confirmed loading.

## stk-bureau-serif/ — waiting on a legitimately licensed file
The copy that showed up in `E:/StichOps/fonts/STK Bureau Serif/` is **not**
from Smuss Type Kiosk (the foundry that actually sells this typeface,
$19.99 at typekiosk.smuss.studio). Its License.txt is branded
"OnlineWebFonts.Com" — a site that repackages paid commercial fonts without
authorization and relabels them "CC BY 4.0," which isn't theirs to grant.
Its own license text even says it "may not allow embedding unless a
commercial license is purchased." I didn't copy it in here.

`theme-elegant.css` already has `@font-face` rules wired up for this family
(Regular/Medium/SemiBold/Bold as `.woff2`) — once you buy/download the real
files from Smuss Type Kiosk, drop them in with those names and it'll pick
up automatically. Until then the theme falls back to Georgia, which is
already working correctly (no errors, no broken layout).
