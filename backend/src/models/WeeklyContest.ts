import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IWeeklyContest extends Document {
  title: string;
  description?: string;
  weekNumber: number;
  contestUrl: string;
  startDateTime: Date;
  endDateTime: Date;
  active: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const weeklyContestSchema = new Schema<IWeeklyContest>(
  {
    title: {
      type: String,
      required: [true, "Contest title is required"],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    weekNumber: {
      type: Number,
      required: [true, "Week number is required"],
      unique: true,
      min: 1,
      max: 10,
      validate: {
        validator: Number.isInteger,
        message: "Week number must be an integer",
      },
    },
    contestUrl: {
      type: String,
      required: [true, "Contest URL is required"],
      trim: true,
      maxlength: 1000,
    },
    startDateTime: {
      type: Date,
      required: [true, "Contest start date and time are required"],
      index: true,
    },
    endDateTime: {
      type: Date,
      required: [true, "Contest end date and time are required"],
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
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

weeklyContestSchema.pre("validate", function validateWeeklyContestDates() {
  if (
    this.startDateTime instanceof Date &&
    this.endDateTime instanceof Date &&
    this.endDateTime <= this.startDateTime
  ) {
    this.invalidate(
      "endDateTime",
      "Contest end date and time must be after the start date and time"
    );
  }
});

weeklyContestSchema.index({ active: 1, startDateTime: 1 });

const WeeklyContest: Model<IWeeklyContest> =
  (mongoose.models.WeeklyContest as Model<IWeeklyContest> | undefined) ||
  mongoose.model<IWeeklyContest>("WeeklyContest", weeklyContestSchema);

export default WeeklyContest;
