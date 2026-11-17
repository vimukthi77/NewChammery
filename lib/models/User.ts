import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'user' | 'cook';
  isActive: boolean;
  balance: number; // Monetary balance in LKR (default 15,000)
  startDate: Date; // Meal tracking start date
  biometricCredentialId?: string;
  biometricPublicKey?: string;
  profileImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user', 'cook'], default: 'user' },
    isActive: { type: Boolean, default: true },
    balance: { type: Number, default: 15000 },
    startDate: { type: Date, default: Date.now },
    biometricCredentialId: { type: String, default: null },
    biometricPublicKey: { type: String, default: null },
    profileImage: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
