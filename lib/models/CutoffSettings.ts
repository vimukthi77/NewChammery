import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICutoffSettings extends Document {
  breakfastCutoffTime: string; // "07:00"
  lunchCutoffTime: string;     // "10:00"
  dinnerCutoffTime: string;    // "15:00"
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const CutoffSettingsSchema = new Schema<ICutoffSettings>(
  {
    breakfastCutoffTime: { type: String, default: '07:00' },
    lunchCutoffTime: { type: String, default: '10:00' },
    dinnerCutoffTime: { type: String, default: '15:00' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

export const CutoffSettings: Model<ICutoffSettings> =
  mongoose.models.CutoffSettings || mongoose.model<ICutoffSettings>('CutoffSettings', CutoffSettingsSchema);
export default CutoffSettings;

