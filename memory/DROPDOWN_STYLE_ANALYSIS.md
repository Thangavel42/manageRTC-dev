# Dropdown Style Analysis Report

**Project:** manageRTC-my
**Analysis Date:** 2026-03-05
**Scope:** Complete dropdown component and style analysis

---

## Executive Summary

The manageRTC-my application uses **three different dropdown libraries** to serve different use cases:

| Library | Version | Usage Count | Primary Use Case |
|---------|---------|-------------|------------------|
| **React Select** | ^5.8.3 | 138+ files | Standard data selection (primary) |
| **PrimeReact Dropdown** | ^10.8.5 | 2 files | Image-rich dropdowns |
| **Bootstrap Native** | Built-in | Various | Simple selects |

**Dominant Pattern:** React Select with default styling (no custom theme applied)

---

## 1. React Select (Primary Library)

### Overview
React Select is the most widely used dropdown component in the application, appearing in **138+ files** across the codebase.

### Key Files

| File | Purpose |
|------|---------|
| [`react/src/core/common/commonSelect.tsx`](react/src/core/common/commonSelect.tsx) | Main React Select wrapper component |
| [`react/src/types/react-select.d.ts`](react/src/types/react-select.d.ts) | TypeScript type definitions |
| [`react/src/core/common/selectoption/selectoption.js`](react/src/core/common/selectoption/selectoption.js) | Centralized dropdown options data |

### Component Features

The `CommonSelect` wrapper provides:
- ✅ Searchable dropdowns
- ✅ Clearable options
- ✅ Custom placeholder support
- ✅ Loading states
- ✅ Disabled states
- ✅ Both string and Option object values

### Usage Pattern

```tsx
import CommonSelect from '../../../core/common/commonSelect';

<CommonSelect
  options={employeeOptions}
  value={selectedEmployee}
  onChange={handleEmployeeChange}
  placeholder="Select Employee..."
  isSearchable={true}
  isClearable={true}
/>
```

### Styling Approach

**Important:** React Select uses **default library styles** with no custom theme configuration.

CSS Classes Generated:
- `.react-select__control` - Main container
- `.react-select__value-container` - Value display area
- `.react-select__indicators` - Dropdown arrow/clear icon
- `.react-select__menu` - Dropdown menu
- `.react-select__option` - Individual options
- `.react-select__placeholder` - Placeholder text

---

## 2. Bootstrap Dropdown Styles

### SCSS Configuration

Located in [`react/src/style/scss/components/_dropdown.scss`](react/src/style/scss/components/_dropdown.scss)

### CSS Variables Used

```scss
// Colors
$primary              // Primary brand color (active/hover states)
$primary-transparent  // Light primary background for active items
$gray-900            // Main text color
$gray-200            // Border color
$border-color        // General border color
$white               // Background color

// Typography
$font-size-14        // 0.875rem - base font size
$font-weight-normal  // Regular font weight

// Effects
$box-shadow-lg       // Large drop shadow for menu
```

### Styling Patterns

#### Dropdown Toggle Button
```scss
.dropdown-toggle {
  color: $gray-900;
  border: 1px solid $gray-200;
  font-size: $font-size-14;
  font-weight: $font-weight-normal;

  &:hover, &:focus, &:active {
    color: $primary;
    background-color: $primary-transparent;
  }
}
```

#### Dropdown Menu
```scss
.dropdown-menu {
  background-color: $white;
  color: $gray-900;
  font-size: 0.875rem;
  box-shadow: $box-shadow-lg;
  border-color: $border-color;
  z-index: 10;
}
```

#### Dropdown Items
```scss
.dropdown-item {
  padding: 0.594rem 0.9375rem;
  font-size: $font-size-14;

  &.active {
    background-color: $primary-transparent;
    color: $primary;
  }
}
```

#### Chevron Icon
```scss
.dropdown-toggle::after {
  content: "\f078";  // Font Awesome chevron down
  font-family: "Font Awesome 5 Free";
  font-size: 0.6rem;
  margin-inline-start: 0.25rem;
}
```

---

## 3. PrimeReact Dropdown (Secondary)

### Overview
Used sparingly for dropdowns requiring rich content display (images, icons).

### Key Files

| File | Purpose |
|------|---------|
| [`react/src/core/common/selectWithImage.tsx`](react/src/core/common/selectWithImage.tsx) | Image dropdown variant 1 |
| [`react/src/core/common/selectWithImage2.tsx`](react/src/core/common/selectWithImage2.tsx) | Image dropdown variant 2 |

### Features
- Custom value templates
- Custom option templates
- Image support in dropdown items
- Rich content display

---

## 4. Dropdown Variants

### Size Variants
```html
<!-- Standard (default) -->
<select class="form-select">...</select>

<!-- Large -->
<select class="form-select form-select-lg">...</select>

<!-- Small -->
<select class="form-select form-select-sm">...</select>
```

### Color Variants (Bootstrap)
- Primary
- Secondary
- Success
- Danger
- Warning
- Info
- Dark (`dropdown-menu-dark`)

### Special Dropdown Classes

| Class | Min-Width | Description |
|-------|-----------|-------------|
| `dropdown-md` | 320px | Medium dropdown |
| `dropdown-lg` | 380px | Large dropdown |
| `card-dropdown` | Variable | Card-styled dropdown |
| `notes-menu` | Variable | Special notes dropdown |

---

## 5. Design System Integration

### Component Hierarchy

```
App
 └── Bootstrap Theme
      ├── CSS Variables (colors, spacing, typography)
      ├── SCSS Components
      │    ├── _dropdown.scss (Bootstrap styles)
      │    └── _select2.scss (Vendor - unused)
      └── React Components
           ├── CommonSelect (React Select wrapper)
           ├── selectWithImage (PrimeReact)
           └── Native selects (Bootstrap)
```

### Icon Usage
- **Font Awesome 5 Free** for dropdown chevrons
- Icon: `\f078` (chevron-down)
- Size: `0.6rem`
- Positioned: `margin-inline-start: 0.25rem`

---

## 6. Common Usage Examples

### Example 1: Employee Selection (React Select)
```tsx
import CommonSelect from '../../../core/common/commonSelect';

const [selectedEmployee, setSelectedEmployee] = useState(null);

<CommonSelect
  options={[
    { value: 'EMP-001', label: 'John Doe' },
    { value: 'EMP-002', label: 'Jane Smith' }
  ]}
  value={selectedEmployee}
  onChange={setSelectedEmployee}
  placeholder="Select Employee"
  isSearchable={true}
  isClearable={true}
/>
```

### Example 2: Native Bootstrap Select
```tsx
<select
  className="form-select"
  aria-label="Default select example"
  onChange={(e) => setValue(e.target.value)}
>
  <option>Open this select menu</option>
  <option value="1">One</option>
  <option value="2">Two</option>
  <option value="3">Three</option>
</select>
```

### Example 3: With Size Variant
```tsx
<select className="form-select form-select-lg">
  <option>Large dropdown</option>
</select>

<select className="form-select form-select-sm">
  <option>Small dropdown</option>
</select>
```

---

## 7. Recommendations

### Current State
✅ **Well-structured** with clear separation of concerns
✅ **React Select** as primary choice for interactive dropdowns
✅ **Bootstrap** for simple native selects
✅ **PrimeReact** for specialized use cases

### Potential Improvements

| Area | Current State | Suggested Improvement |
|------|---------------|----------------------|
| React Select Theming | Default styles | Consider custom theme for brand consistency |
| Type Definitions | Basic types | Expand TypeScript definitions |
| Centralized Options | 1300+ options in one file | Consider splitting by module |
| Accessibility | Default library support | Add custom ARIA labels where needed |

---

## 8. Quick Reference

### File Locations

```
react/src/
├── core/
│   └── common/
│       ├── commonSelect.tsx          # Main React Select wrapper
│       ├── selectWithImage.tsx       # PrimeReact image dropdown
│       ├── selectWithImage2.tsx      # PrimeReact image dropdown v2
│       └── selectoption/
│           └── selectoption.js       # Centralized options data
├── types/
│   └── react-select.d.ts             # Type definitions
└── style/
    └── scss/
        └── components/
            └── _dropdown.scss        # Bootstrap dropdown styles
```

### CSS Classes Reference

| Class | Library | Purpose |
|-------|---------|---------|
| `.form-select` | Bootstrap | Native select styling |
| `.dropdown-menu` | Bootstrap | Dropdown menu container |
| `.dropdown-item` | Bootstrap | Individual dropdown items |
| `.react-select__*` | React Select | Auto-generated classes |
| `.p-dropdown` | PrimeReact | PrimeReact dropdown base |

---

## 9. Key Findings Summary

1. **React Select is dominant** - Used in 138+ files as the primary dropdown
2. **No custom React Select theme** - Uses default library styling
3. **Bootstrap-based theming** - CSS variables drive color and typography
4. **Three-tier approach** - React Select → PrimeReact → Native (fallback)
5. **Centralized options** - 1300+ predefined options in `selectoption.js`
6. **Font Awesome icons** - Standard chevron-down icon for dropdowns
7. **Responsive sizing** - Built-in support for small/large variants

---

## Appendix: Color Palette Reference

Based on Bootstrap SCSS variables:

```scss
// Primary (brand color)
$primary: #007bff; (or custom brand color)

// Grays
$gray-900: #212529;  // Main text
$gray-200: #e9ecef;  // Borders
$gray-500: #adb5bd;  // Muted text

// Semantics
$white: #ffffff;
$border-color: $gray-200;

// Effects
$primary-transparent: rgba($primary, 0.1);
$box-shadow-lg: 0 1rem 3rem rgba($black, 0.175);
```

---

**End of Report**
