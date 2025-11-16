# CareTrek App Flow Documentation

## App-wide Patterns / Navigation
- **Roles**: Senior, Family only.
- **Senior Primary Nav**: Bottom tabs — Home | Map | Health | Reminders | More. Persistent SOS FAB.
- **Family Primary Nav**: Bottom tabs — Dashboard | Map | Seniors | Messages | More.
- **Global Header**: Shows language selector and simple settings icon.
- **Confirmations**: Large buttons + audio feedback for Senior.

---

## 1. Launch / Shared Screens

### 1.1 Splash
- Logo, subtle animation, accessibility skip link.
- Auto-navigates to Role Select.

### 1.2 Role Select
- Buttons: "I am a Senior" | "I am a Family Member"
- Microcopy: "Choose who you are to open the right experience."
- Navigation: Tap leads to Language selector → Auth

### 1.3 Language Selector
- Pick from list (English, Hindi, Marathi, Tamil, Telugu...).
- Save preference → Next

### 1.4 Auth (Phone OTP)
- Fields: Phone number → Send OTP → Enter code.
- Option: Fallback email.
- After success → Onboarding / Permissions

### 1.5 Onboarding (role-specific)
- 3 simple slides with large text + audio narration and "Skip" button.
- Senior slide shows SOS & big targets.

### 1.6 Permissions Request
- Location, Notifications, Microphone, Bluetooth.
- Each explained in simple language + "Allow" button.

---

## 2. Senior Screens

### 2.1 Senior Home (default)
- **Top**: Senior name, quick health snapshot (HR, SpO₂, Steps).
- **Buttons**: SOS (big), Call Family, Show My ID, Start Walk.
- **Reminder Card**: Today's next medication/time with "Taken" button.
- **Navigation**: Bottom tabs to Map, Health, Reminders, More.

### 2.2 Show My ID (Senior ID Screen)
- Big 4-digit code (e.g., 3721) centered.
- Large Copy & Share buttons.
- QR icon reveals QR modal.
- Toggle: Require Approval (ON by default).
- Button: Regenerate (24h cooldown).
- Microcopy: "Share only with trusted family."
- **Actions**: Share, Copy, Toggle Approval, Regenerate.

### 2.3 Map (Senior)
- Current-location pin, TTS turn-by-turn toggle.
- POI legend (hospital, pharmacy, washroom, police).
- Button: Set Safe Zone (geofence).

### 2.4 Health Dashboard (Senior)
- Tiles for Heartbeat, SpO₂, Steps, Temp/BP.
- "Sync Device" CTA, "Send to Family" action.
- History access (day/week/month).

### 2.5 Reminders (Senior)
- List of scheduled reminders (Medication/Water/Walk).
- Large Taken/Missed buttons with voice confirmation.
- Add/edit reminder functionality.

### 2.6 SOS Flow (Senior)
1. SOS FAB → Full-screen confirmation (3s countdown).
2. After confirm: "SOS Sent" screen with live route.
3. Microcopy: "Your location and medical info have been sent to your family and emergency contacts."

### 2.7 Pending Link Requests (Senior)
- List of incoming requests with family details.
- Approve/Reject options.
- Permission toggles before finalizing.

### 2.8 Profile & Settings (Senior)
- Personal info, emergency contacts.
- Paired devices, accessibility toggles.
- Language, Logout.

---

## 3. Family Screens

### 3.1 Family Dashboard (default)
- Overview cards: Linked Seniors, Active Alerts, Appointments.
- Health trends snapshot.
- Quick "Link Senior" CTA.

### 3.2 Link Senior
- Two options: Enter 4-digit ID or Scan QR.
- Submit button sends link request.
- Status: Pending or Instantly Linked.
- Microcopy: "Enter the 4-digit ID provided by your senior or scan their QR code."

### 3.3 Seniors List
- Tiles for each linked senior.
- Quick actions: Call, View Map, View Health.
- Tap opens Senior Detail.

### 3.4 Senior Detail (per senior)
- Live map with route, last known address.
- Latest vitals snapshot with status.
- Reminders list, recent events.
- Buttons: Request Location, Message, Schedule Call.
- Permissions panel.

### 3.5 Map (Family)
- Multi-pin view of all linked seniors.
- Tap pin to center single senior route.
- Live-tracking toggle.

### 3.6 Messages
- Simple chat per senior (E2E encrypted).
- Broadcast to all linked family.

### 3.7 More / Settings (Family)
- Manage account.
- Add/remove linked seniors.
- Notification preferences.
- Regenerate senior ID request flow.

---

## 4. Key Flows

### A. Senior Sign-up → See 4-digit ID
1. Role Select → Senior → Language → Phone OTP → Onboarding → Permissions → Show My ID screen.

### B. Family Link Senior
1. Family sign-in → Dashboard → Link Senior → Enter 4-digit/Scan QR → Submit → Pending approval.

### C. Auto-approve vs Require Approval
- Default: Require approval.
- Senior can toggle auto-approve in settings.

### D. SOS Flow
- Senior taps SOS → Confirm → Notify family → Live tracking.

### E. Vitals Upload & AI Insight
- Device uploads → Analysis → Notify if anomaly.

### F. Regenerate 4-digit ID
- Senior can regenerate ID (24h cooldown).
- Notifies linked family.

---

## 5. Edge Cases & Protections
- Rate-limiting for link attempts.
- Pending request TTL: 24h.
- Regenerate cooldown: 24h.
- Approval audit logging.
- Offline behavior support.
- Accessibility features.

---

## 6. Microcopy Examples
- Role select: "Who are you?"
- Senior ID: "Your CareTrek ID: 3721 — Share only with trusted family."
- Link Senior: "Enter 4-digit Senior ID (e.g., 3721)."
- Pending: "Request sent — waiting for approval."
- SOS: "Emergency alert sent to family and contacts."

---

## 7. Navigation Map
- **Splash** → Role Select → Language → Auth → Onboarding → (Senior Home OR Family Dashboard)
- **Senior**: Home ↔ Map ↔ Health ↔ Reminders ↔ More
- **Family**: Dashboard ↔ Map ↔ Seniors List ↔ Messages ↔ More
