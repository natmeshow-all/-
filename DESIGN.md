---
name: Maintenance Team Dashboard
description: Machine maintenance management system for AOB
colors:
  primary: "#3B82F6"
  accent-green: "#10B981"
  accent-yellow: "#D97706"
  accent-red: "#EF4444"
  bg-primary: "#0F172A"
  bg-secondary: "#1E293B"
  text-primary: "#F8FAFC"
  text-secondary: "#94A3B8"
typography:
  display:
    fontFamily: "\"Prompt\", sans-serif"
  body:
    fontFamily: "\"Prompt\", sans-serif"
rounded:
  md: "0.5rem"
  lg: "0.75rem"
  xl: "1rem"
spacing:
  sm: "0.5rem"
  md: "1rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
---

# Design System: Maintenance Team Dashboard

## 1. Overview

**Creative North Star: "The Deep Analysis Engine"**

This system is designed as a sleek, glass-like, and data-forward environment for technicians and supervisors. Built on a deep slate/navy background, it utilizes vibrant, glowing status accents and glassmorphism to visually separate critical data layers without cluttering the screen. Despite its modern aesthetics, it remains utilitarian at its core, prioritizing data density and rapid workflows over purely decorative elements.

**Key Characteristics:**
- Deep, immersive dark backgrounds.
- High-contrast, glowing status indicators (Red, Yellow, Green).
- Glassmorphism for floating panels, modals, and cards.
- Dense typography optimized for complex data tables and analytics.

## 2. Colors

The palette is anchored by deep slate backgrounds with vibrant, luminous accents that guide focus and indicate status.

### Primary
- **Focus Cyan** (#3B82F6): Draws the eye in a dense environment. Used for selection, focus rings, and primary interactive elements.

### Secondary
- **Success Green** (#10B981): Indicates healthy machine status, completed PMs, and positive actions.
- **Warning Yellow** (#D97706): Indicates pending tasks, warnings, or caution states.
- **Alert Red** (#EF4444): Signals critical machine failures or destructive actions.

### Neutral
- **Deep Slate Base** (#0F172A): The primary immersive background.
- **Card Surface** (#1E293B): Used for elevated panels and cards, often with a glass blur.
- **Crisp Text** (#F8FAFC): Primary reading text for maximum contrast against deep slate.
- **Muted Text** (#94A3B8): Secondary text, labels, and table headers.

**The Status Glow Rule.** Status colors (Green, Yellow, Red) must use glowing drop-shadows when indicating active or critical states to ensure immediate visibility on the factory floor.

## 3. Typography

**Display Font:** Prompt, sans-serif
**Body Font:** Prompt, sans-serif

**Character:** Prompt is a modern, geometric sans-serif that reads cleanly in dense data tables while retaining a technical, engineered feel.

### Hierarchy
- **Display** (700, large): Used only for dashboard hero metrics or major section titles.
- **Headline** (600, medium): Used for card titles and modal headers.
- **Body** (400, 0.875rem): The workhorse text for data tables, lists, and forms.
- **Label** (500, 0.875rem): Often colored with warning/accent hues for form field labels.
- **Stat Label** (400, 9px, uppercase): Extremely dense microcopy for metric sub-labels.

**The Functional Density Rule.** Body and label text must remain small and dense (0.875rem or 9px) to maximize the amount of visible data on single screens without scrolling.

## 4. Elevation

The system uses a hybrid elevation approach: flat and dense by default for standard content, but utilizing glassmorphism (`backdrop-filter: blur(12px)`) and glowing shadows for floating panels, active states, and modals. This separates critical interactive layers from the dense background data.

### Shadow Vocabulary
- **Card Shadow** (`0 4px 6px -1px rgba(0, 0, 0, 0.3)`): Used on standard glass cards.
- **Glow Primary** (`0 0 20px rgba(59, 130, 246, 0.3)`): Used on hover states for primary buttons and active selections.
- **Glow Status** (`0 0 20px rgba(color, 0.3)`): Used for urgent or active status indicators.

**The Glass Clarity Rule.** Glass panels must always have a subtle, semi-transparent border (`rgba(148, 163, 184, 0.1)`) to define their edges clearly against the dark background.

## 5. Components

### Buttons
- **Shape:** Medium radius (0.5rem).
- **Primary:** Gradient backgrounds (Green/Yellow/Red) with white text.
- **Hover / Focus:** Lifts up (`translateY(-1px)`) and emits a colored glow matching its gradient.
- **Secondary / Outline:** Transparent background with a subtle slate border, turning slate with a primary border on hover.

### Cards / Containers
- **Corner Style:** Extra large radius (1rem) for main panels.
- **Background:** Glassmorphism (`rgba(30, 41, 59, 0.8)` with a 12px blur).
- **Shadow Strategy:** Standard card shadow, lifting to a deeper shadow on hover.
- **Border:** Light semi-transparent border.

### Inputs / Fields
- **Style:** Deep background (`rgba(51, 65, 85, 0.5)`), standard border, large radius (0.75rem).
- **Focus:** Replaces border with Focus Cyan and adds a 3px Cyan glow ring.

### Tables
- **Style:** Dense rows with subtle bottom borders. Hovering over a row highlights it with a lighter slate background. Headers are uppercase, small, and muted.

## 6. Do's and Don'ts

### Do:
- **Do** use glowing shadows on interactive or critical status elements to make them pop against the dark UI.
- **Do** rely on the `Prompt` font for all text to maintain the clean, technical aesthetic.
- **Do** use glassmorphic panels for modals and top-level cards to separate them from background data.

### Don't:
- **Don't** use old-fashioned, clunky interfaces where accessing and editing data is difficult and tedious.
- **Don't** use consumer-like whitespace that wastes screen real estate; keep data dense.
- **Don't** use generic, un-optimized layouts that slow down technician workflows.
