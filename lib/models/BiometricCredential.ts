import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBiometricCredential extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceName: string;
  transports?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const BiometricCredentialSchema = new Schema<IBiometricCredential>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    credentialId: { type: String, required: true, unique: true },
    publicKey: { type: String, required: true },
    counter: { type: Number, default: 0 },
    deviceName: { type: String, default: 'My Device' },
    transports: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

export const BiometricCredential: Model<IBiometricCredential> =
  mongoose.models.BiometricCredential || mongoose.model<IBiometricCredential>('BiometricCredential', BiometricCredentialSchema);
export default BiometricCredential;

