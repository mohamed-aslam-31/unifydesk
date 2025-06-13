import mongoose, { Schema, Document } from 'mongoose';
import { User as UserInterface } from '@shared/schema';

export interface UserDocument extends UserInterface, Document {}

const UserSchema = new Schema<UserDocument>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  countryCode: { type: String, required: true },
  isWhatsApp: { type: Boolean, default: false },
  gender: { type: String, required: true },
  dateOfBirth: { type: String, required: true },
  country: { type: String, required: true },
  state: { type: String, required: true },
  city: { type: String, required: true },
  address: { type: String },
  password: { type: String, required: true },
  firebaseUid: { type: String },
  role: { type: String },
  roleStatus: { type: String, default: 'pending' },
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  profilePicture: { type: String },
}, {
  timestamps: true
});

// Add indexes for better performance
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ firebaseUid: 1 });

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);