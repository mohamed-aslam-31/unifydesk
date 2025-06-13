import mongoose, { Schema, Document } from 'mongoose';

export interface RoleDataDocument extends Document {
  userId: number;
  role: string;
  data: any;
}

const RoleDataSchema = new Schema<RoleDataDocument>({
  userId: { type: Number, required: true },
  role: { type: String, required: true },
  data: { type: Schema.Types.Mixed, required: true },
}, {
  timestamps: true
});

// Add indexes for better performance
RoleDataSchema.index({ userId: 1 });
RoleDataSchema.index({ role: 1 });

export const RoleDataModel = mongoose.model<RoleDataDocument>('RoleData', RoleDataSchema);