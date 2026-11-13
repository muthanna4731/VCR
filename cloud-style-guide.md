# Cloud / Smoke Transition — Style Guide

How the hero section bleeds into the section below it with a soft "cloud rolling in"
effect. This is **100% CSS + one image** — there is no JS animation driving the cloud
itself. The illusion comes from three layered pieces:

1. A wide **smoke image** (`smoke.webp`) anchored to the bottom of the hero.
2. The smoke is pushed *past* the bottom edge so it overflows into the next section.
3. A **white gradient overlay** that fades the bottom of the hero into solid white,
   which matches the background of the section underneath — so the cloud appears to
   melt into the next block instead of cutting off.

---

## The asset

- File: `src/images/smoke.webp`
- Intrinsic size: `3840 × 1240` (very wide, short — a horizontal band of cloud/smoke)
- A transparent-edged PNG/WebP of smoke works best. The transparency at the top lets
  the hero show through; the body of the cloud is what reads as the transition.

---

## The markup

The cloud lives in a positioned wrapper *inside* the hero, after the main content.
From [src/components/home/HeroSection.jsx](src/components/home/HeroSection.jsx):

```jsx
<div>
  <div className="hero-overlap">
    <div className="hero-smoke">
      <img
        alt=""
        loading="lazy"
        fetchPriority="low"
        width="3840"
        height="1240"
        decoding="async"
        style={{ color: 'transparent' }}
        src={smokeImg}
      />
    </div>
    <div className="hero-overlay"></div>
  </div>
</div>
```

Notes:
- `alt=""` + `loading="lazy"` + `fetchPriority="low"` — it's decorative, so it never
  blocks the hero's priority images from loading.
- Two siblings inside `.hero-overlap`: the **smoke image** and a **white gradient
  overlay**. Order matters only via `z-index` (both sit at `z-index: 3`).

---

## The CSS

From [src/css/hero.css](src/css/hero.css). Four rules do all the work.

### 1. The overlap container

Pins to the hero and is non-interactive so it never eats clicks.

```css
.hero-overlap {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 100vh;
    pointer-events: none;
}
```

### 2. The smoke band

Anchored to the bottom of the hero, full width, fixed tall height.

```css
.hero-smoke {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 45rem;
    z-index: 3;
}

@media (min-width: 768px) {
    .hero-smoke {
        height: 62rem;
    }
}
```

### 3. Push it past the edge — the key trick

The smoke is translated **down by 70% of its own height** so most of the cloud spills
out below the hero and overlaps the next section. This is what makes it "come in on
top" of the section below.

```css
.hero-top .hero-smoke {
    transform: translateY(70%);
}
```

> `.hero-top` is the hero's own wrapper class — this rule scopes the overflow to the
> first hero only.

### 4. Make the image cover & sit at the top of its band

```css
.hero-smoke img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
}
```

### 5. The white fade — blends cloud into the next section

A bottom-anchored gradient from transparent → solid white. Because the section below
the hero has a **white background**, this overlay makes the cloud dissolve seamlessly
into it instead of ending in a hard line.

```css
.hero-overlay {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 10rem;
    z-index: 3;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0), #fff);
}

@media (min-width: 768px) {
    .hero-overlay {
        height: 30.9rem;
    }
}
```

---

## How the pieces combine

```
┌──────────────────────────────┐
│            HERO               │
│   (title, text, button)      │
│                              ░│ ← smoke image starts near bottom
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└──░░░░░░░░░░░░░░░░░░░░░░░░░░░░──┘ ← hero edge
   ░░░ cloud spills 70% past ░░░    (translateY(70%))
   ▓▓▓ white gradient → #fff ▓▓▓     (.hero-overlay)
┌──────────────────────────────┐
│      NEXT SECTION (#fff)      │ ← cloud melts into white bg
```

---

## Recreating it elsewhere — checklist

1. Drop a wide, short, transparent-topped smoke/cloud image into your assets.
2. Make sure the **section below has the same solid background color** as the gradient
   end-stop (here: `#fff`). The fade color **must match** that background.
3. Put `.hero-overlap` → `.hero-smoke` (img) + `.hero-overlay` at the end of the hero,
   inside a `position: relative` hero.
4. Anchor `.hero-smoke` to `bottom: 0`, give it a tall fixed `height`.
5. Apply `transform: translateY(70%)` to push it down over the next section. Tune the
   percentage: higher = more overlap onto the next section.
6. Add the `linear-gradient(180deg, transparent, <bg-color>)` overlay to dissolve the
   bottom edge.
7. Keep the image decorative: `alt=""`, `loading="lazy"`, `pointer-events: none` on the
   wrapper.

## Tuning knobs

| Want… | Change |
|---|---|
| Cloud to sit higher/lower | `.hero-smoke` `bottom` or the `translateY()` % |
| More/less of the cloud showing | `.hero-smoke` `height` |
| Softer/harder blend | `.hero-overlay` `height` (taller = softer) |
| Different next-section color | Match `#fff` in the gradient to that color |
| Crop the cloud differently | `object-position` on `.hero-smoke img` |
