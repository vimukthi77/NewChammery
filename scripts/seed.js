const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://newchammery_db_user:TRY9JiccqsNgsqwr@cluster0.03mmog3.mongodb.net/chammery_db";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true },
  biometricCredentialId: { type: String, default: null },
  biometricPublicKey: { type: String, default: null },
  profileImage: { type: String, default: '' },
}, { timestamps: true });

const CutoffSettingsSchema = new mongoose.Schema({
  breakfastCutoffTime: { type: String, default: '07:00' },
  lunchCutoffTime: { type: String, default: '10:00' },
  dinnerCutoffTime: { type: String, default: '15:00' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const CutoffSettings = mongoose.models.CutoffSettings || mongoose.model('CutoffSettings', CutoffSettingsSchema);

    let admin = await User.findOne({ email: 'admin@chammery.com' });
    if (!admin) {
      const hashedPassword = await bcrypt.hash('Admin@123', 12);
      admin = await User.create({
        name: 'System Admin',
        email: 'admin@chammery.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      });
      console.log('Default admin created: admin@chammery.com / Admin@123');
    } else {
      console.log('Default admin already exists: admin@chammery.com');
    }

    let cutoffs = await CutoffSettings.findOne();
    if (!cutoffs) {
      cutoffs = await CutoffSettings.create({
        breakfastCutoffTime: '07:00',
        lunchCutoffTime: '10:00',
        dinnerCutoffTime: '15:00',
        updatedBy: admin._id,
      });
      console.log('Default cutoff settings created: 07:00, 10:00, 15:00');
    } else {
      console.log('Cutoff settings already exist:', cutoffs.toObject());
    }

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();

