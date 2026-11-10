# 🍽️ Chammery - Corporate & Institutional Meal Management System

A production-ready, mobile-first full-stack web application built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **MongoDB with Mongoose ODM**.

Designed specifically for institutional meal planning, staff daily ordering, points allocation, catering budgeting, and automated reports with biometric authentication support.

---

## 🎨 Design Philosophy & Reference Styling
- **Color Palette:** Warm culinary tones inspired by modern gastronomy:
  - Backgrounds: Cream & Beige (`#FFF8F0`, `#F5E6D3`)
  - Typography: Dark Charcoal (`#1A1A2E`)
  - Accents: Deep Orange (`#E67E22`), Warm Brown (`#8B4513`), Soft Peach (`#FFDAB9`)
  - Action Elements: Crisp high-contrast black buttons with smooth rounded corners (`rounded-3xl` / `24px`)
- **Mobile-First UX:**
  - Floating dark capsule bottom navigation bar (`rounded-full`) matching iOS/Android native app navigation.
  - Interactive meal selection cards with dish photos, real-time cutoff status, and instant points tallying.
  - WebAuthn fingerprint & face biometrics for 1-tap instant mobile login.

---

## 📱 Core Features

### 👤 User Features (Mobile-First)
1. **Welcome / Splash Screen:**
   - Full-screen chef aesthetic with warm lighting.
   - Hero text: *"Exceptional Food, Delivered Fresh"* & *"Thoughtfully prepared, freshly delivered meals"*.
   - First-visit detection via `localStorage`.
2. **Authentication & Biometric Login:**
   - Email + auto-generated secure password login.
   - WebAuthn biometric enrollment modal prompted immediately after first login.
   - Subsequent visits feature a prominent **"Login with Biometric (Touch/Face ID)"** button.
3. **Daily Meal Ordering:**
   - Visual greeting: *"Good Morning/Afternoon, [User]! 👋 What's Your Craving Today?"*
   - Prominent **Point Balance Hero Card** showing current month's remaining points and allocation.
   - **Breakfast Card:** Sri Lankan Red Rice & Dhal (1 Point, cutoff 07:00 AM).
   - **Lunch Card:** Dum Handi Chicken Biryani (2 Points, cutoff 10:00 AM).
   - **Dinner Card:** String Hoppers & Kiri Hodi (1 Point, cutoff 15:00 / 03:00 PM).
   - Dynamic logic: Checks local time against cutoff. If past dinner cutoff, automatically offers tomorrow's pre-orders.
   - Quick action: **"Request All Available"** and **"Repeat Yesterday's Selection"**.
4. **Pre-Order Calendar:**
   - Horizontal date strip to pre-order meals for the next 7 days in advance.
5. **Meal History & Refund Policies:**
   - Chronological log of meal requests with status: Confirmed (Green), Cancelled (Red).
   - In-app cancellation button before cutoff time that immediately refunds points to user balance.
6. **Points & Top-up Statement:**
   - Real-time gauge of points consumption percentage.
   - Itemized history of all top-ups and balance additions with LKR monetary tracking.
7. **User Profile:**
   - Change password and toggle biometric authentication.

---

### 👨‍💼 Admin Portal Features
1. **Command Center Dashboard:**
   - KPI metrics: Total Users, Today's Kitchen Requests, Monthly Points Consumed.
   - Real-time kitchen production summary (Breakfast count, Lunch count, Dinner count).
   - Live audit trail log tracking administrator operations.
2. **Staff Management:**
   - Add new staff member with auto-generated 8-character secure passwords.
   - Automated welcome email sent via **Nodemailer (Gmail SMTP)** containing styled credentials card and login link.
   - Activate/Deactivate users and reset passwords with 1 click.
3. **Cutoff Time Management:**
   - Global time pickers for Breakfast, Lunch, and Dinner cutoffs with immediate global application.
4. **Top-up & Points Management:**
   - Single user top-up or **Bulk Top-up** to all active staff in one click.
   - Manual point deduction mode with mandatory reason/audit logging.
5. **Monthly Allocation & Point Pricing Engine:**
   - Date range selector + Total Catering Invoice Budget (LKR).
   - Computes: $\text{Point Price} = \frac{\text{Total Budget}}{\text{Total Points Used}}$.
   - Lockable allocation periods with full historical archival.
6. **PDF Reports & Data Export:**
   - Client-side PDF generation using `jspdf` and `jspdf-autotable`.
   - **Individual Statement Report:** User meal history, point rate, total cost, paid amount, and due balance.
   - **All Users Summary Report:** Tabular roster with financial totals and grand totals.
   - **Daily Kitchen Sheet:** Production counts and staff list for cooking teams.
   - Full CSV spreadsheet export for Excel and accounting software.
7. **Admin Meal Overrides:**
   - Add or alter meal requests on behalf of users even after cutoff times.

---

## 🗄️ Database Schemas (MongoDB / Mongoose)
- `User`: Name, Email, Hashed Password, Role (`admin` | `user`), `isActive`, `biometricCredentialId`, `biometricPublicKey`, Profile Image.
- `MealRequest`: `userId`, `date`, `breakfast`, `lunch`, `dinner`, `breakfastPoints`, `lunchPoints`, `dinnerPoints`, `totalPoints`, `status`, `requestedAt`.
- `CutoffSettings`: `breakfastCutoffTime`, `lunchCutoffTime`, `dinnerCutoffTime`, `updatedBy`.
- `Topup`: `userId`, `amount`, `points`, `month`, `description`, `addedBy`.
- `MonthlyAllocation`: `dateFrom`, `dateTo`, `totalBudget`, `totalPointsUsed`, `pointPrice`, `status`, `createdBy`.
- `BiometricCredential`: `userId`, `credentialId`, `publicKey`, `counter`, `deviceName`, `transports`.
- `AuditLog`: `userId`, `userName`, `action`, `details`, `ip`.
- `Announcement`: Broadcast alerts displayed on user mobile screens.

---

## 🔐 Default Credentials

### Default Admin:
- **Email:** `admin@chammery.com`
- **Password:** `Admin@123`
- **Role:** `admin`

---

## 🚀 Running the Project

```bash
# Install dependencies
npm install --legacy-peer-deps

# Seed database with default admin & cutoffs
node scripts/seed.js

# Run development server
npm run dev

# Run production build
npm run build
npm start
```
The application will be live at `http://localhost:3000`.

