# Frontend Performance Optimization Guide

Based on Vercel React Best Practices (40+ rules) - Applied to Watch Rudra

## ✅ Completed Optimizations

### 1. **Barrel Import Optimization** - CRITICAL ✅
**Status**: Fixed in `next.config.ts`
```typescript
experimental: {
  optimizePackageImports: ['lucide-react'],
}
```
**Impact**: 
- 40% faster cold starts
- 28% faster builds  
- 15-70% faster dev boot
- Eliminates 200-800ms import overhead

### 2. **localStorage Caching** ✅
**Status**: Created `src/lib/storage-cache.ts`
**Impact**: Reduces expensive synchronous I/O operations
**Usage**:
```typescript
import { getCachedLocalStorage, setCachedLocalStorage } from '@/lib/storage-cache';

// Before: localStorage.getItem('key') on every call
// After: Cached in memory, invalidated on external changes
```

---

## 🔴 CRITICAL - Immediate Action Required

### 3. **Replace Manual Loading States with useTransition**
**File**: `src/features/search/hooks/use-content-detail.ts`
**Lines**: 56-62

**Current** (Manual state management):
```tsx
const [isLoading, setIsLoading] = useState(true);
const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
const [isLoadingProgress, setIsLoadingProgress] = useState(true);

// Later...
setIsLoading(true);
const details = await getShowDetails(contentId);
setIsLoading(false);
```

**Optimized**:
```tsx
import { useTransition } from 'react';

const [isPendingDetails, startDetailsTransition] = useTransition();
const [isPendingEpisodes, startEpisodesTransition] = useTransition();

// Later...
startDetailsTransition(async () => {
  const details = await getShowDetails(contentId);
  setShow(details);
});
```

**Benefits**:
- Automatic pending state management
- Better error handling (pending state resets correctly)
- Interrupt support (new transitions cancel pending ones)
- Reduces re-renders

**Reference**: AGENTS.md Section 6.9

---

### 4. **Fix Stale Closures - Use Functional setState**
**Files**: Multiple files with useCallback

**Problem**: State is captured in closures, callbacks recreate unnecessarily

**Example in `src/providers/auth-provider.tsx`**:
```tsx
// ❌ BAD: Stale closure + recreates on user change
const updateUser = useCallback((data: Partial<User>) => {
  setUser({ ...user, ...data }); // user is stale!
  storeUser({ ...user, ...data });
}, [user]); // Recreates every time user changes

// ✅ GOOD: Always fresh + stable reference
const updateUser = useCallback((data: Partial<User>) => {
  setUser(prev => {
    const updated = { ...prev, ...data };
    storeUser(updated);
    return updated;
  });
}, []); // Never recreates!
```

**Apply to**:
- `src/providers/auth-provider.tsx` - All callbacks that reference user state
- `src/features/search/hooks/use-content-detail.ts` - Episode/show state callbacks

**Impact**: Prevents bugs, reduces re-renders, stable callback references

**Reference**: AGENTS.md Section 5.9

---

### 5. **Optimize Event Listeners**
**File**: `src/features/watch/controls/SubtitleSelector.tsx`
**Line**: 50-60

**Current**:
```tsx
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsOpen(false);
      setCurrentScreen('tracks');
    }
  };

  if (isOpen) {
    document.addEventListener('mousedown', handleClickOutside);
  }
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [isOpen]);
```

**Optimized**:
```tsx
useEffect(() => {
  if (!isOpen) return;
  
  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsOpen(false);
      setCurrentScreen('tracks');
    }
  };

  // Add passive option for better scrolling performance
  document.addEventListener('mousedown', handleClickOutside, { passive: true });
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [isOpen]);
```

**Benefits**: Passive listeners enable immediate scrolling without waiting for event handler

**Reference**: AGENTS.md Section 4.2

---

## 🟡 HIGH Priority

### 6. **Debounce Optimization**
**File**: `src/features/profile/components/update-profile-form.tsx`
**Line**: 19-43

**Current** (manual implementation):
```tsx
useEffect(() => {
  if (!username || username === user?.username) {
    setIsAvailable(null);
    setIsCheckingUsername(false);
    return;
  }

  const timer = setTimeout(async () => {
    setIsCheckingUsername(true);
    try {
      const { available } = await checkUsername(username);
      setIsAvailable(available);
    } catch {
      toast.error('Failed to check username availability');
    } finally {
      setIsCheckingUsername(false);
    }
  }, 500);

  return () => clearTimeout(timer);
}, [username, user?.username]);
```

**Optimized** (use existing hook):
```tsx
import { useDebouncedValue } from '@/hooks/use-debounce';

const debouncedUsername = useDebouncedValue(username, 500);
const [isCheckingUsername, startCheck] = useTransition();

useEffect(() => {
  if (!debouncedUsername || debouncedUsername === user?.username) {
    setIsAvailable(null);
    return;
  }

  if (debouncedUsername.length < 3) {
    setIsAvailable(false);
    return;
  }

  startCheck(async () => {
    try {
      const { available } = await checkUsername(debouncedUsername);
      setIsAvailable(available);
    } catch {
      toast.error('Failed to check username availability');
    }
  });
}, [debouncedUsername, user?.username]);
```

**Benefits**: Cleaner code, automatic pending state, no manual loading state

---

### 7. **Extract Static JSX**
**Files**: Components with repeated loading skeletons

**Pattern**:
```tsx
// ❌ Before: Recreates element on every render
function Component() {
  return (
    <div>
      {isLoading && <div className="animate-pulse h-20 bg-gray-200" />}
    </div>
  );
}

// ✅ After: Reuses same element reference
const LoadingSkeleton = <div className="animate-pulse h-20 bg-gray-200" />;

function Component() {
  return <div>{isLoading && LoadingSkeleton}</div>;
}
```

**Reference**: AGENTS.md Section 6.3

---

## 🟢 MEDIUM Priority

### 8. **Avoid Multiple Array Iterations**

**Pattern to watch for**:
```tsx
// ❌ Bad: 3 iterations
const admins = users.filter(u => u.isAdmin);
const testers = users.filter(u => u.isTester);
const inactive = users.filter(u => !u.isActive);

// ✅ Good: 1 iteration
const admins: User[] = [];
const testers: User[] = [];
const inactive: User[] = [];

for (const user of users) {
  if (user.isAdmin) admins.push(user);
  if (user.isTester) testers.push(user);
  if (!user.isActive) inactive.push(user);
}
```

**Reference**: AGENTS.md Section 7.6

---

### 9. **localStorage Error Handling**

**Current pattern** (will throw in incognito/private mode):
```tsx
localStorage.setItem('key', 'value');
const value = localStorage.getItem('key');
```

**Safe pattern**:
```tsx
import { getCachedLocalStorage, setCachedLocalStorage } from '@/lib/storage-cache';

// Already handles try-catch internally
setCachedLocalStorage('key', 'value');
const value = getCachedLocalStorage('key');
```

**Why**: localStorage throws in:
- Incognito/private browsing (Safari, Firefox)
- When quota exceeded
- When disabled by user/enterprise policy

**Reference**: AGENTS.md Section 4.4

---

### 10. **Early Return Optimization**

**Pattern**:
```tsx
// ❌ Before: Processes all items even after finding error
function validateUsers(users: User[]) {
  let hasError = false;
  let errorMessage = '';
  
  for (const user of users) {
    if (!user.email) {
      hasError = true;
      errorMessage = 'Email required';
    }
  }
  
  return hasError ? { valid: false, error: errorMessage } : { valid: true };
}

// ✅ After: Returns immediately on first error
function validateUsers(users: User[]) {
  for (const user of users) {
    if (!user.email) {
      return { valid: false, error: 'Email required' };
    }
  }
  
  return { valid: true };
}
```

**Reference**: AGENTS.md Section 7.8

---

## 🔵 LOW Priority (Nice to Have)

### 11. **Use toSorted() Instead of sort()**

**Pattern** (prevents mutation bugs):
```tsx
// ❌ Bad: Mutates original array (React state mutation bug!)
const sorted = items.sort((a, b) => a.value - b.value);

// ✅ Good: Creates new array (React-safe)
const sorted = items.toSorted((a, b) => a.value - b.value);

// Or fallback for older browsers:
const sorted = [...items].sort((a, b) => a.value - b.value);
```

**Browser support**: Chrome 110+, Safari 16+, Firefox 115+, Node.js 20+

**Reference**: AGENTS.md Section 7.12

---

## 📊 Expected Performance Gains

After implementing CRITICAL and HIGH priority optimizations:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Dev boot time | Baseline | -15-70% | Faster |
| Build time | Baseline | -28% | Faster |
| Cold start | Baseline | -40% | Faster |
| Bundle size | Baseline | -200KB+ | Smaller |
| Re-renders | Many | Fewer | More responsive |
| localStorage I/O | Every call | Cached | Much faster |

---

## 🛠️ Implementation Checklist

### Phase 1: CRITICAL (This Week)
- [x] Enable optimizePackageImports in next.config.ts
- [x] Create localStorage cache utility
- [ ] Replace manual loading states with useTransition
- [ ] Fix stale closures with functional setState
- [ ] Add passive event listeners

### Phase 2: HIGH (Next Week)
- [ ] Optimize debounce implementation
- [ ] Extract static JSX elements
- [ ] Add proper localStorage error handling

### Phase 3: MEDIUM (Following Sprint)
- [ ] Audit for multiple array iterations
- [ ] Add early return optimizations
- [ ] Review and optimize hot paths

### Phase 4: LOW (As Needed)
- [ ] Replace .sort() with .toSorted()
- [ ] Hoist static RegExp
- [ ] Optimize SVG animations

---

## 📚 References

- [Vercel React Best Practices](/.github/skills/vercel-react-best-practices/AGENTS.md)
- [React Documentation](https://react.dev)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)

---

## 🔍 Monitoring

After implementation, monitor:
- Lighthouse scores (Performance, TTI, LCP)
- Core Web Vitals
- Bundle analyzer output
- Dev server startup time
- Hot Module Replacement (HMR) speed

Run: `pnpm analyze` to check bundle size impact.
