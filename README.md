# Maintenance Team - Machine Management System

ระบบจัดการซ่อมบำรุงเครื่องจักรสำหรับ Art of Baking (AOB) พัฒนาด้วย Next.js และ Firebase

## ✨ ฟีเจอร์หลัก

- **จัดการเครื่องจักร**: บันทึกข้อมูลเครื่องจักร พิกัด และรายละเอียดต่างๆ
- **จัดการอะไหล่**: ติดตามสต็อกอะไหล่ เบิก-รับของ และประวัติการทำรายการ
- **บันทึกการซ่อมบำรุง**: บันทึกการซ่อมบำรุง พร้อมข้อมูล Motor/Gear, Vibration, Voltage, Current
- **ตารางงาน PM**: จัดการแผนการบำรุงรักษาแบบป้องกัน (Preventive Maintenance)
- **Analytics & Predictive**: วิเคราะห์ข้อมูลและพยากรณ์การซ่อมบำรุงด้วย AI
- **Audit Dashboard**: Dashboard สำหรับตรวจสอบความสอดคล้องและ Traceability
- **จัดการผู้ใช้**: ระบบ Role-based access control (Admin, Supervisor, Technician, Viewer)

## 🚀 เริ่มต้นใช้งาน

### ความต้องการของระบบ

- Node.js 20.9.0 หรือสูงกว่า
- npm, yarn, pnpm หรือ bun
- Firebase project (Firebase Realtime Database, Firestore, Storage, Authentication)

### การติดตั้ง

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd maintenance-team
   ```

2. **ติดตั้ง dependencies**
   ```bash
   npm install
   # หรือ
   yarn install
   # หรือ
   pnpm install
   ```

3. **ตั้งค่า Environment Variables**
   
   คัดลอกไฟล์ `.env.example` เป็น `.env`:
   ```bash
   cp .env.example .env
   ```
   
   แก้ไขไฟล์ `.env` และใส่ค่า Firebase configuration ของคุณ:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.asia-southeast1.firebasedatabase.app
   NEXT_PUBLIC_INITIAL_ADMIN_EMAIL=admin@example.com
   ```

   **วิธีหา Firebase Configuration:**
   - ไปที่ [Firebase Console](https://console.firebase.google.com/)
   - เลือกโปรเจกต์ของคุณ
   - ไปที่ Project Settings > General
   - เลื่อนลงไปที่ "Your apps" > Firebase SDK snippet > Config
   - คัดลอกค่าต่างๆ มาใส่ในไฟล์ `.env`

4. **ตั้งค่า Firebase Security Rules**
   
   Deploy Firebase Realtime Database rules จากไฟล์ `database.rules.json`:
   ```bash
   firebase deploy --only database
   ```

5. **รัน Development Server**
   ```bash
   npm run dev
   # หรือ
   yarn dev
   # หรือ
   pnpm dev
   ```

6. **เปิดเบราว์เซอร์**
   
   ไปที่ [http://localhost:3000](http://localhost:3000)

## 📁 โครงสร้างโปรเจกต์

```
maintenance-team/
├── app/                    # Next.js App Router
│   ├── components/         # React components
│   │   ├── admin/         # Admin dashboard components
│   │   ├── auth/          # Authentication components
│   │   ├── calendar/      # Calendar components
│   │   ├── forms/         # Form modals
│   │   ├── pm/            # Preventive Maintenance components
│   │   └── ui/            # UI components (Modal, Toast, etc.)
│   ├── contexts/          # React contexts (Auth, Language, Toast)
│   ├── lib/               # Utility functions & services
│   │   ├── firebase.ts    # Firebase initialization
│   │   ├── firebaseService.ts  # Firebase service functions
│   │   └── ...
│   ├── translations/      # i18n translations (TH/EN)
│   ├── types/             # TypeScript type definitions
│   └── [pages]/           # Next.js pages/routes
├── public/                # Static assets
├── database.rules.json    # Firebase Realtime Database security rules
├── .env.example           # Environment variables template
└── package.json           # Dependencies
```

## 🔧 Scripts

- `npm run dev` - รัน development server
- `npm run build` - Build สำหรับ production
- `npm run start` - รัน production server
- `npm run lint` - ตรวจสอบ code quality ด้วย ESLint

## 🔐 การจัดการผู้ใช้

### Roles

- **Admin**: เข้าถึงได้ทุกอย่าง รวมถึงจัดการผู้ใช้และตั้งค่าระบบ
- **Supervisor**: จัดการเครื่องจักร อะไหล่ และแผน PM
- **Technician**: บันทึกการซ่อมบำรุงและเบิกอะไหล่
- **Viewer**: ดูข้อมูลได้อย่างเดียว

### การสร้าง Admin แรก

1. ตั้งค่า `NEXT_PUBLIC_INITIAL_ADMIN_EMAIL` ในไฟล์ `.env` เป็น email ที่ต้องการให้เป็น admin
2. Login ด้วย email นั้นผ่าน Google Authentication
3. ระบบจะให้สิทธิ์ admin อัตโนมัติ

## 🌐 ภาษา

ระบบรองรับ 2 ภาษา:
- ไทย (TH) - ภาษาเริ่มต้น
- English (EN)

สามารถเปลี่ยนภาษาได้จาก Header

## 🚢 Deploy

### Vercel (แนะนำ)

1. Push code ไปยัง GitHub repository
2. Import project ใน [Vercel](https://vercel.com)
3. ตั้งค่า Environment Variables ใน Vercel dashboard
4. Deploy

### Environment Variables สำหรับ Production

อย่าลืมตั้งค่า Environment Variables ทั้งหมดใน production environment:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
- `NEXT_PUBLIC_INITIAL_ADMIN_EMAIL`

## 🛠️ เทคโนโลยีที่ใช้

- **Framework**: Next.js 16.1.1 (App Router)
- **UI Library**: React 19.2.3
- **Styling**: Tailwind CSS 4
- **Backend**: Firebase (Realtime Database, Firestore, Storage, Authentication)
- **Language**: TypeScript
- **State Management**: React Context API
- **Charts**: Recharts
- **Animations**: Framer Motion
- **QR Code**: html5-qrcode

## 📝 License

Private project - Art of Baking

## 🤝 การสนับสนุน

หากมีปัญหาหรือคำถาม กรุณาติดต่อทีมพัฒนา

---

**หมายเหตุ**: ระบบนี้ใช้ Firebase Realtime Database และ Firestore สำหรับเก็บข้อมูล ต้องแน่ใจว่าได้ตั้งค่า Security Rules อย่างถูกต้องก่อนใช้งานจริง
