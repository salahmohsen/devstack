# 16 — oRPC AI + notification settings

**What to build:** Protected get/update procedures for AI and notification settings. Mask provider keys after save (`hasKey` + last4). Validate notification email format. Reply autonomy only on AI router.

**Blocked by:** 15

**Status:** done

- [x] `aiSettings` router: get, update
- [x] `notificationSettings` router: get, update
- [x] Registered on app router
- [x] Typed errors for invalid email / provider key required
- [x] API keys sealed AES-GCM; public shape has last4 only
