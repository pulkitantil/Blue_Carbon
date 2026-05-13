# Fix Auditor Access to Verifier Panel

## Steps
- [x] 1. Update `App.jsx` — Add `'auditor'` to `/verifier` route roles
- [x] 2. Update `Layout.jsx` — Show "Verifier Panel" nav for `auditor` role
- [x] 3. Update `authStore.js` — Include `auditor` in `isVerifier()`
- [x] 4. Update `projects.js` backend — Allow `auditor` on verify endpoint
- [x] 5. Update `mrv.js` backend — Allow `auditor` on review & issue-credits endpoints

