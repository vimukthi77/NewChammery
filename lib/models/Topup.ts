import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITopup extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  points: number;
  month: string; // "YYYY-MM"
  description: string;
  addedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TopupSchema = new Schema<ITopup>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, default: 0 },
    points: { type: Number, required: true },
    month: { type: String, required: true, index: true },
    description: { type: String, default: '' },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

export const Topup: Model<ITopup> = mongoose.models.Topup || mongoose.model<ITopup>('Topup', TopupSchema);
export default Topup;

