import mongoose, { Schema, Document } from 'mongoose';

export interface OtpAttemptDocument extends Document {
  identifier: string;
  type: string;
  attempts: number;
  lastAttempt?: Date;
  blockedUntil?: Date;
}

const OtpAttemptSchema = new Schema<OtpAttemptDocument>({
  identifier: { type: String, required: true },
  type: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lastAttempt: { type: Date },
  blockedUntil: { type: Date },
}, {
  timestamps: true
});

// Add indexes for better performance
OtpAttemptSchema.index({ identifier: 1, type: 1 });

export const OtpAttemptModel = mongoose.model<OtpAttemptDocument>('OtpAttempt', OtpAttemptSchema);