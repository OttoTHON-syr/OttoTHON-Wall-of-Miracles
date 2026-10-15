# Events page: what is built, and what still needs to be drawn

The Events page follows the scrapbook mockup: a big "Next up" ticket, calendar-page cards colored by event type, and a row of faded tickets for past events. Everything is built in code except the hand-made artwork below. The page looks finished without any of it, and each piece can be swapped in later.

## How events turn into the design

| What you enter in the editor | What the page does |
| --- | --- |
| **Date** | Picks Upcoming or Where we've been automatically. Fills the calendar page and the countdown ("IN 5 DAYS!"). |
| **Type of event** | Card color and icon: Fundraiser (yellow), Meeting (blue), Social (pink), Community (green), Other (lavender). |
| **Time**, **Place** | The clock and pin lines. Time also feeds the Add to Calendar button, so write it like `7:00 PM – 8:00 PM`. |
| **Photo or flyer** | The taped-down photo on the card. Without one, a daisy is shown instead. |
| **Show as the big Next up ticket** | Pins that event as the big ticket. If nothing is pinned, the soonest upcoming event is used. |

Events synced from the campus calendar get a type automatically (from the title and the campus category), and they get the same Add to Calendar button.

**Add to Calendar** downloads a standard calendar file that opens in Apple Calendar, Outlook and Google Calendar. It is built in the browser, so there is nothing to host.

## What needs to be drawn (or photographed)

These are the parts of the mockup that are artwork, not code. Until you add them, the site uses the stand-ins in the right column.

| Artwork | Why it can't be code | Stand-in right now | Best format |
| --- | --- | --- | --- |
| **"UPCOMING EVENTS" lettering** and the small handwritten notes | Real hand lettering | System handwriting fonts (see below) | A free font, or the title as a transparent SVG/PNG |
| **Hand-drawn blue line-art daisy** (beside the title, and the tiny daisy stickers on photos and calendar pages) | The wobbly drawn line | The site's simple built-in daisy | SVG, or transparent PNG about 600 px wide, plus one tiny version |
| **Doodles**: sparkles, stars, hearts, dashes around the title | Hand-drawn marks | A few plain lines and one star | One transparent PNG/SVG sheet |
| **Watercolor paper texture and pastel washes** behind sections | Painted/scanned texture | Flat cream background | A seamless paper texture (JPG/PNG tile), and optional transparent wash blobs |
| **Torn or wavy paper edges** on the ticket, the tape labels and the header and footer bands | Hand-cut edges | A dashed stitched border, notches, and zig-zag tape ends | SVG edge strips or transparent PNG |
| **Event illustrations** (the pie, the E-Board notebook, bracelets, and so on) | One drawing per event | A photo, or the daisy | Transparent PNG/SVG, uploaded through "Photo or flyer" |
| **Event photos** | They have to be taken | Daisy placeholder | JPG, any shape (cropped to a square or 4:3) |
| **Custom category icons** (optional) | The mockup's icons are drawn | Simple line icons built into the code | SVG |

Washi tape (four patterns) is already built in code. A scanned or drawn tape strip would look more authentic if you want that later.

## Using a real handwriting font (optional)

The page uses two font settings, `--hand-title` (the big brush title and dates) and `--hand` (the handwritten notes). Right now they use fonts already on each visitor's device, so they look different on Mac, Windows and Android.

To make them identical for everyone:

1. Download two free fonts from fonts.google.com. Good matches: **Caveat Brush** for the title and **Patrick Hand** for the notes (check each font's license, these are open licenses).
2. Put the font files (`.ttf` or `.woff2`) in a new folder `assets/fonts/`.
3. At the bottom of `assets/site.css`, add:

```css
@font-face { font-family: 'OttoTitle'; src: url('fonts/CaveatBrush-Regular.ttf'); font-display: swap; }
@font-face { font-family: 'OttoHand';  src: url('fonts/PatrickHand-Regular.ttf'); font-display: swap; }
:root { --hand-title: 'OttoTitle', cursive; --hand: 'OttoHand', cursive; }
```

Adjust the file names to match what you downloaded. The site loads fonts from its own folder only, so nothing is requested from other websites.
