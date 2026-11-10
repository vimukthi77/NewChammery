import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMonthlyAllocation extends Document {
  _id: mongoose.Types.ObjectId;
  dateFrom: Date;
  dateTo: Date;
  totalBudget: number;
  totalPointsUsed: number;
  pointPrice: number;
  status: 'active' | 'calculated' | 'closed';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  calculatedAt?: Date;
  updatedAt: Date;
}

const MonthlyAllocationSchema = new Schema<IMeasMonthlyAllocationSchema>(
  {
    dateFrom: { type: Date, required: true },
    dateTo: { type: Date, required: true },
    totalBudget: { type: Number, required: true },
    totalPointsUsed: { type: Number, default: 0 },
    pointPrice: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'calculated', 'closed'], default: 'active' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    calculatedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

type IMeasMonthlyAllocationSchema = IMonthlyAllocation;

export const MonthlyAllocation: Model<IMonthlyAllocation> =
  mongoose.models.MonthlyAllocation || mongoose.model<IMonthlyAllocation>('MonthlyAllocation', MonthlyAllocationSchema);
export default MonthlyAllocation;

