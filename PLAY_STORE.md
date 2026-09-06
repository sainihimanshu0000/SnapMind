# SnapMind — Google Play launch checklist

Use this before uploading to Play Console. Code changes for policy-sensitive items are already in the Android project; items marked **You** need your account / assets / hosting.

## 1. Create a release keystore (required)

```bash
cd android
keytool -genkeypair -v -storetype PKCS12 \
  -keystore snapmind-release.keystore \
  -alias snapmind \
  -keyalg RSA -keysize 2048 -validity 10000
```

Copy `keystore.properties.example` → `keystore.properties` and fill in passwords.
Never commit `*.keystore` or `keystore.properties`.

Back up the keystore offline. Losing it means you cannot update the same Play listing.

## 2. Build the Play App Bundle

```bash
npm run android:bundle
```

Output:

`android/app/build/outputs/bundle/release/app-release.aab`

Upload that `.aab` (not a debug APK) in Play Console → Production / Testing.

## 3. Privacy policy (**You** — blocking)

1. Host `legal/privacy-policy.md` (or the in-app text) at a public **HTTPS** URL.
2. Set `PRIVACY_POLICY_URL` in `src/screens/SettingsScreen.tsx` to that URL.
3. Paste the same URL in Play Console → App content → Privacy policy.

## 4. Data safety form (Play Console)

Suggested answers for SnapMind’s current design:

| Question | Answer |
| --- | --- |
| Collects / shares user data | **No** collected by developer servers (data stays on device) |
| Encryption in transit | N/A for local-only; export uses user-chosen apps |
| Users can request deletion | Yes — in-app Delete all data / uninstall |
| Photos / videos | Collected **on device only** for app functionality (organize screenshots) |
| Shared with third parties? | No (unless user exports via share sheet) |
| Advertising ID | No |
| Data sold? | No |

Be accurate: if you later add analytics or cloud sync, update this form and the privacy policy.

## 5. Photo / video permission declaration

Because the app uses `READ_MEDIA_IMAGES`:

- Declare use case: **Media management / gallery-style organizer** for screenshots the user imports or chooses to save.
- Provide a short demo video showing: open app → grant photos → import or quick-action save → library shows the image.
- Do **not** claim the permission is only for one-time picker if you also support Screenshot Quick Actions (background watch).

## 6. Foreground service / notifications

- Type: `dataSync` for optional screenshot watcher.
- Persistent notification while watching is intentional and required.
- In Play Console declarations, state the FGS is optional and user-enabled in Settings.
- Notifications permission is for reminders + watcher alerts.

## 7. Permissions removed for policy

Already removed / blocked in the manifest:

- `USE_EXACT_ALARM` / `SCHEDULE_EXACT_ALARM` (high scrutiny; not needed)
- `WRITE_EXTERNAL_STORAGE`
- Advertising ID (`AD_ID`)
- Cleartext HTTP disabled
- Backup of app data disabled

## 8. Store listing copy (draft)

**Short description (≤80 chars):**  
Organize screenshots offline with search, tags, and cleanup.

**Full description:**  
SnapMind helps you keep screenshots useful—not buried in Photos. Import screenshots, read text on-device when available, tag and collect them, set reminders, and clean up old items. Your library stays on your device by default. Optional screenshot quick actions can watch for new screenshots and show a notification while enabled.

**Category:** Productivity  
**Tags:** screenshots, organizer, gallery, OCR, offline  

## 9. Content rating & audience

- Complete the IARC questionnaire in Play Console.
- Target audience: 13+ (app is not directed at children).
- No user-generated public content feed; local personal files only.

## 10. Graphics (**You**)

Prepare:

- App icon 512×512 PNG
- Feature graphic 1024×500
- At least 2 phone screenshots (prefer 1080×1920 or Play’s current size guide)
- Optional 7" / 10" tablet screenshots

## 11. Testing track

1. Create Internal testing → upload AAB → add testers.
2. Install from the testing link on a real device.
3. Verify: import, search, settings toggles, export, delete all, privacy screen, notifications prompt, photo permission prompt.
4. Promote to Closed / Open / Production when stable.

## 12. Versioning

Current: `versionName 1.0.0`, `versionCode 1` in `android/app/build.gradle`.

Every Play upload must increase `versionCode`.

## 13. Account / legal (**You**)

- Play Console developer account (one-time fee)
- If you are an organization, complete identity verification
- Countries / pricing (free is fine)
- Contact email on the store listing

## Common rejection causes for this app type

1. Privacy policy URL missing or placeholder (`example.com`)
2. Photo permission without a clear in-app justification / video
3. Persistent FGS notification without declaring the feature or making it optional (already optional)
4. Uploading a debug-signed build
5. Misleading “cloud” / “AI upload” claims while the app is local-only—keep listing honest

When those are done, SnapMind is structurally ready for Play review.
