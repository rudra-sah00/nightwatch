# Performance Quick Reference

Quick lookup for common optimization patterns from Vercel React Best Practices.

## 🚨 Critical Patterns

### ✅ Barrel Imports (DONE)
```typescript
// next.config.ts
experimental: {
  optimizePackageImports: ['lucide-react'],
}
```
**Impact**: 40% faster cold starts, 28% faster builds

---

### ⚠️ Loading States → useTransition
```tsx
// ❌ Before
const [isLoading, setIsLoading] = useState(false);
setIsLoading(true);
await fetchData();
setIsLoading(false);

// ✅ After
const [isPending, startTransition] = useTransition();
startTransition(async () => {
  await fetchData();
});
```

---

### ⚠️ Stale Closures → Functional setState
```tsx
// ❌ Before: Stale + recreates
const add = useCallback((item) => {
  setItems([...items, item]);
}, [items]);

// ✅ After: Fresh + stable
const add = useCallback((item) => {
  setItems(prev => [...prev, item]);
}, []);
```

---

### ⚠️ Event Listeners → Passive
```tsx
// ❌ Before
element.addEventListener('scroll', handler);

// ✅ After
element.addEventListener('scroll', handler, { passive: true });
```

---

## 🔧 Common Patterns

### localStorage → Cached
```tsx
// Use the cache utility
import { getCachedLocalStorage, setCachedLocalStorage } from '@/lib/storage-cache';

const value = getCachedLocalStorage('key');
setCachedLocalStorage('key', 'value');
```

---

### Static JSX → Hoist
```tsx
// ❌ Before: Recreates every render
<div>{isLoading && <LoadingSpinner />}</div>

// ✅ After: Reuse reference
const spinner = <LoadingSpinner />;
<div>{isLoading && spinner}</div>
```

---

### Multiple Iterations → Single Loop
```tsx
// ❌ Before: 3 iterations
const admins = users.filter(u => u.isAdmin);
const active = users.filter(u => u.isActive);

// ✅ After: 1 iteration
const admins = [], active = [];
for (const u of users) {
  if (u.isAdmin) admins.push(u);
  if (u.isActive) active.push(u);
}
```

---

### Array Mutation → toSorted()
```tsx
// ❌ Before: Mutates (React bug!)
const sorted = items.sort((a, b) => a.id - b.id);

// ✅ After: Immutable
const sorted = items.toSorted((a, b) => a.id - b.id);

// Or fallback:
const sorted = [...items].sort((a, b) => a.id - b.id);
```

---

### Early Returns
```tsx
// ❌ Before: Processes all
function validate(items) {
  let hasError = false;
  for (const item of items) {
    if (invalid(item)) hasError = true;
  }
  return hasError ? 'error' : 'ok';
}

// ✅ After: Returns immediately
function validate(items) {
  for (const item of items) {
    if (invalid(item)) return 'error';
  }
  return 'ok';
}
```

---

### Debounce → Hook + Transition
```tsx
// ❌ Before: Manual
useEffect(() => {
  const timer = setTimeout(async () => {
    setLoading(true);
    await check();
    setLoading(false);
  }, 500);
  return () => clearTimeout(timer);
}, [value]);

// ✅ After: Clean
const debounced = useDebouncedValue(value, 500);
const [isPending, startCheck] = useTransition();

useEffect(() => {
  startCheck(async () => {
    await check(debounced);
  });
}, [debounced]);
```

---

## 📏 Impact Scale

| Priority | Example | Time Saved |
|----------|---------|------------|
| CRITICAL | Barrel imports | 200-800ms |
| HIGH | Functional setState | Prevents bugs |
| MEDIUM | Static JSX | 10-50ms |
| LOW | toSorted() | 1-5ms |

---

## 🎯 When to Apply

**useTransition**: Loading states, non-urgent updates, search
**Functional setState**: Callbacks that read current state
**Passive listeners**: scroll, touch, wheel events
**localStorage cache**: Frequent reads, user preferences
**Static JSX**: Loading skeletons, icons, placeholders
**Single loop**: Multiple filters/maps on same array
**Early return**: Validation, search, error checking

---

## 📚 Full Guide

See [docs/PERFORMANCE_OPTIMIZATION.md](../docs/PERFORMANCE_OPTIMIZATION.md) for complete details.
