import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserSettlementItem {
  userId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  pointsUsed: number;
  deductionAmount: number;
  previousBalance: number;
  newBalance: number;
}

export interface IMonthlyAllocation extends Document {
  _id: mongoose.Types.ObjectId;
  dateFrom: Date;
  dateTo: Date;
  totalBudget: number;
  totalPointsUsed: number;
  pointPrice: number;
  status: 'active' | 'calculated' | 'closed';
  userBreakdown?: IUserSettlementItem[];
  settledAt?: Date;
  settledBy?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  calculatedAt?: Date;
  updatedAt: Date;
}

const MonthlyAllocationSchema = new Schema<IMonthlyAllocation>(
  {
    dateFrom: { type: Date, required: true },
    dateTo: { type: Date, required: true },
    totalBudget: { type: Number, required: true },
    totalPointsUsed: { type: Number, default: 0 },
    pointPrice: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'calculated', 'closed'], default: 'active' },
    userBreakdown: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        name: { type: String },
        email: { type: String },
        pointsUsed: { type: Number, default: 0 },
        deductionAmount: { type: Number, default: 0 },
        previousBalance: { type: Number, default: 0 },
        newBalance: { type: Number, default: 0 },
      },
    ],
    settledAt: { type: Date },
    settledBy: { type: Schema.Types.ObjectId, ref: 'User' },
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

