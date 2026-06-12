# MindLoop Brand Book

## Product Vision

MindLoop helps aspiring product managers, consultants, and MBA candidates improve structured thinking through deliberate practice.

The product should feel:

- Intelligent
- Premium
- Calm
- Focused
- Encouraging
- Structured

The product should NOT feel:

- Childish
- Cartoon-heavy
- Over-gamified
- Emoji-driven
- Social-media-like

Design inspiration:

- Linear
- Notion
- Exponent
- Stripe Dashboard

---

# Core Design Principles

1. Icons over emojis.
2. Consistency over creativity.
3. Data should be clean and readable.
4. Use illustrations sparingly.
5. Color should communicate meaning.
6. Every screen should feel professional.
7. The user should feel like they are training for interviews, not playing a game.

---

# Emoji Policy

## NEVER USE EMOJIS

Do not use emojis anywhere in the product.

Forbidden examples:

🔥 🏆 💡 📈 🎯 📦 📅 🎤 🚀 ⭐ 🎉 💬

Replace all emojis with icons.

---

# Icon System

All icons must come from:

```bash
lucide-react
```

Never mix icon libraries.

Preferred sizes:

- 16px
- 20px
- 24px

---

## Navigation Icons

| Navigation | Icon |
|------------|------|
| Home | House |
| Challenge | Zap |
| Insights | TrendingUp |
| History | Clock3 |
| Bookmarks | Bookmark |
| Profile | User |
| Settings | Settings |

---

## Metric Icons

| Metric | Icon |
|---------|------|
| Accuracy | Target |
| Structure | Workflow |
| Current Streak | Flame |
| Best Streak | Award |
| Sessions | Calendar |
| Readiness | Gauge |
| Ranking | Trophy |

---

## Action Icons

| Action | Icon |
|---------|------|
| Practice | Play |
| Submit | ArrowRight |
| Save | Bookmark |
| Remove | Trash2 |
| Edit | Pencil |
| Search | Search |
| Ask Question | MessageSquarePlus |

---

## Challenge Page Icons

| Section | Icon |
|----------|------|
| Goal | Target |
| Focus | Users |
| Tip | Sparkles |
| Clarification Questions | Lightbulb |
| Thought Process | Mic |
| Final Estimate | Calculator |

---

## Insight Icons

| Section | Icon |
|----------|------|
| Strongest Area | TrendingUp |
| Weakest Area | TriangleAlert |
| Structure Insight | Workflow |
| Thinking Profile | Brain |
| Consistency | CalendarDays |

---

# Color Palette

## Primary Navy
```css
#142850
```
Usage: Main headings, primary buttons, active navigation, important actions.

---

## Accent Orange
```css
#F59E0B
```
Usage: Challenge labels, progress indicators, highlight states.

---

## Purple
```css
#8B5CF6
```
Usage: Focus, learning journey, secondary accents.

---

## Green
```css
#22C55E
```
Usage: Positive feedback, success states, growth indicators.

---

## Blue
```css
#3B82F6
```
Usage: Accuracy, analytics, data indicators.

---

## Red
```css
#EF4444
```
Usage: Errors, destructive actions, forfeit actions.

---

# Domain Colors

| Domain | Color | Hex |
|--------|-------|-----|
| Product | Green | #22C55E |
| Marketing | Amber | #F59E0B |
| Sales | Purple | #8B5CF6 |
| Finance | Blue | #3B82F6 |
| Generalist | Slate | #64748B |

---

# Background Colors

| Token | Hex |
|-------|-----|
| Page Background | #F8F6F1 |
| Card Background | #FFFFFF |
| Border | #E7E5E4 |
| Muted Text | #64748B |

---

# Typography

| Element | Weight | Color |
|---------|--------|-------|
| Headings | 700 | #142850 |
| Body | 400–500 | #64748B |
| Labels | 600 | — (letter-spacing: 0.02em) |

---

# Owl Mascot Rules

The owl is the MindLoop mascot.

**Use owl illustrations ONLY in:**
- Hero section
- Empty states
- Motivation banners
- Celebration states

**Do NOT use owl in:**
- Metric cards
- Charts
- Statistics
- Navigation
- Achievement badges

The owl should support the experience, not dominate it.

---

# Illustration Rules

Store assets in:
```
/public/illustrations
/public/owl
/public/domains
```

Illustrations are allowed only for:
- Hero section
- Learning Journey section
- Empty states
- Motivation cards

Use icons everywhere else.

---

# UI Style Reference

MindLoop visual style: **70% Linear · 20% Notion · 10% Duolingo**

Characteristics:
- Soft shadows
- Large spacing
- Rounded corners
- Clean cards
- Premium SaaS feel
- Minimal visual noise

---

# Claude Code Rules

Whenever modifying UI:

1. Never introduce emojis.
2. Always use Lucide React icons.
3. Use only approved colors.
4. Keep layouts clean and spacious.
5. Use owl illustrations only in approved locations.
6. Maintain consistency across all pages.
7. Prioritize readability and professionalism over decoration.
