import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHoliday extends Document {
  date: Date;
  title: string;
  isWeekend: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const HolidaySchema = new Schema<IHoliday>(
  {
    date: { type: Date, required: true, unique: true },
    title: { type: String, required: true },
    isWeekend: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

export const Holiday: Model<IHoliday> =
  mongoose.models.Holiday || mongoose.model<IHoliday>('Holiday', HolidaySchema);
export default Holiday;

