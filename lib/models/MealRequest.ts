import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMealRequest extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  breakfastPoints: number;
  lunchPoints: number;
  dinnerPoints: number;
  totalPoints: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  requestedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MealRequestSchema = new Schema<IMealRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true, index: true },
    breakfast: { type: Boolean, default: false },
    lunch: { type: Boolean, default: false },
    dinner: { type: Boolean, default: false },
    breakfastPoints: { type: Number, default: 0 },
    lunchPoints: { type: Number, default: 0 },
    dinnerPoints: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' },
    requestedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only have one meal request per date
MealRequestSchema.index({ userId: 1, date: 1 }, { unique: true });

export const MealRequest: Model<IMealRequest> =
  mongoose.models.MealRequest || mongoose.model<IMealRequest>('MealRequest', MealRequestSchema);
export default MealRequest;

