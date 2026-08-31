import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IEventRegistration extends Document {
  eventId: Types.ObjectId;
  studentId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const eventRegistrationSchema = new Schema<IEventRegistration>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

eventRegistrationSchema.index(
  { eventId: 1, studentId: 1 },
  { unique: true }
);
eventRegistrationSchema.index({ studentId: 1, createdAt: -1 });

const EventRegistration: Model<IEventRegistration> =
  (mongoose.models.EventRegistration as Model<IEventRegistration> | undefined) ||
  mongoose.model<IEventRegistration>(
    "EventRegistration",
    eventRegistrationSchema
  );

export default EventRegistration;
