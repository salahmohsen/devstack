# Mastra Bundling Error Debugging Guide

## The Error

```
ERROR (Mastra CLI): Mastra wasn't able to bundle "@mastra", might be an older commonJS module. Please add `@mastra` to your externals.
```

**This is a generic error. The real cause is hidden.**

## Debugging Steps

### 1. Find the Real Error Source

The error originates from `node_modules/@mastra/deployer/dist/validator/custom-resolver.js`.
The `validateError` function masks the actual error message.

**Fix:** Locate the `validateError` function (search for "wasn't able to bundle") and add logging before it wraps the error:

```js
console.error("[MASTRA-REAL-ERROR] message:", err.message);
console.error("[MASTRA-REAL-ERROR] stack:", err.stack);
console.error("[MASTRA-REAL-ERROR] file:", err.url || err.file);
```

### 2. Common Root Causes

**A. Internal Package Import Specifiers**

- Problem: Package uses `#@/*` or `#/*` internal path aliases in `package.json`
- When Mastra externalizes the package, these specifiers can't resolve
- **Fix:** Add `paths` mapping to the package's `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "#@/*": ["./src/*"],
      "#@/*": ["./src/*"]
    }
  }
}
```

**B. Missing Externals**

- Problem: Workspace packages or native modules referenced but not in `externals`
- **Fix:** Add minimal required externals, not everything:

```ts
bundler: {
  externals: ["@mastra/duckdb", "@duckdb/node-bindings"];
}
```

**C. CommonJS Dependencies**

- Problem: Dependencies using `require()` or `.cjs` in ESM context
- **Fix:** Add the specific package name to externals

### 3. Verification

After applying fix:

- `mastra dev` should show "ready in ~1400ms"
- No ERROR level output about bundling
- Log contains `Initial bundle complete`

### 4. Prevention

Always add `paths` mapping to workspace packages that use internal import aliases (`#@/*` or `#/*`). This ensures bundlers can resolve them when the package is copied/moved.
