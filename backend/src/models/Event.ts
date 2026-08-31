import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IEvent extends Document {
  title: string;
  description: string;
  venue: string;
  posterUrl: string;
  posterPublicId?: string;
  eventDateTime: Date;
  eventEndDateTime?: Date;
  registrationDeadline: Date;
  maxRegistrations: number;
  registrationCount: number;
  createdBy: Types.ObjectId;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
      trim: true,
      maxlength: 2000,
    },
    venue: {
      type: String,
      required: [true, "Event venue is required"],
      trim: true,
      maxlength: 160,
    },
    posterUrl: {
      type: String,
      required: [true, "Poster image URL is required"],
      trim: true,
      maxlength: 1000,
    },
    posterPublicId: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    eventDateTime: {
      type: Date,
      required: [true, "Event date and time are required"],
      index: true,
    },
    eventEndDateTime: {
      type: Date,
      index: true,
    },
    registrationDeadline: {
      type: Date,
      required: [true, "Registration deadline is required"],
      index: true,
    },
    maxRegistrations: {
      type: Number,
      required: [true, "Maximum registrations is required"],
      min: 1,
      max: 10000,
      validate: {
        validator: Number.isInteger,
        message: "Maximum registrations must be an integer",
      },
    },
    registrationCount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Registration count must be an integer",
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ active: 1, eventDateTime: 1 });

eventSchema.pre("validate", function validateEventDates() {
  if (
    this.eventDateTime instanceof Date &&
    this.eventEndDateTime instanceof Date &&
    this.eventEndDateTime <= this.eventDateTime
  ) {
    this.invalidate(
      "eventEndDateTime",
      "Event end date and time must be after the event start date and time"
    );
  }

  if (
    this.eventDateTime instanceof Date &&
    this.registrationDeadline instanceof Date &&
    this.registrationDeadline > this.eventDateTime
  ) {
    this.invalidate(
      "registrationDeadline",
      "Registration deadline must be before or at the event start date and time"
    );
  }
});

const Event: Model<IEvent> =
  (mongoose.models.Event as Model<IEvent> | undefined) ||
  mongoose.model<IEvent>("Event", eventSchema);

export default Event;
