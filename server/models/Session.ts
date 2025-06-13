import mongoose, { Schema, Document } from 'mongoose';

export interface SessionDocument extends Document {
  userId: number;
  sessionToken: string;
  expiresAt: Date;
}

const SessionSchema = new Schema<SessionDocument>({
  userId: { type: Number, required: true },
  sessionToken: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, {
  timestamps: true
});

// Add indexes for better performance
SessionSchema.index({ sessionToken: 1 });
SessionSchema.index({ userId: 1 });
SessionSchema.index({ expiresAt: 1 });

export const SessionModel = mongoose.model<SessionDocument>('Session', SessionSchema);