import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const POINT_TRANSACTION_SOURCES = [
  "event",
  "weekly_contest",
  "admin_adjustment",
] as const;

export type PointTransactionSource =
  (typeof POINT_TRANSACTION_SOURCES)[number];

export const WEEKLY_CONTEST_POINT_TYPES = [
  "open_reward",
  "contest_score",
] as const;

export type WeeklyContestPointType =
  (typeof WEEKLY_CONTEST_POINT_TYPES)[number];

export interface IPointTransaction extends Document {
  studentId: Types.ObjectId;
  points: number;
  source: PointTransactionSource;
  description?: string;
  awardedBy?: Types.ObjectId;
  contestId?: Types.ObjectId | string;
  weeklyContestId?: Types.ObjectId;
  weeklyContestPointType?: WeeklyContestPointType;
  weekNumber?: number;
  previousPoints?: number;
  previousDescription?: string;
  updatedBy?: Types.ObjectId;
  manualUpdatedAt?: Date;
  scoreUpdatedBy?: Types.ObjectId;
  scoreUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const pointTransactionSchema = new Schema<IPointTransaction>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    points: {
      type: Number,
      required: true,
    },
    source: {
      type: String,
      enum: POINT_TRANSACTION_SOURCES,
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 240,
    },
    awardedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    contestId: {
      type: Schema.Types.Mixed,
    },
    weeklyContestId: {
      type: Schema.Types.ObjectId,
      ref: "WeeklyContest",
      index: true,
    },
    weeklyContestPointType: {
      type: String,
      enum: WEEKLY_CONTEST_POINT_TYPES,
      index: true,
    },
    weekNumber: {
      type: Number,
      min: 1,
      validate: {
        validator: (value: number | undefined) =>
          value === undefined || Number.isInteger(value),
        message: "Week number must be an integer",
      },
    },
    previousPoints: {
      type: Number,
    },
    previousDescription: {
      type: String,
      trim: true,
      maxlength: 240,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    manualUpdatedAt: {
      type: Date,
    },
    scoreUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    scoreUpdatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

pointTransactionSchema.index({ studentId: 1, createdAt: -1 });
pointTransactionSchema.index({ source: 1, weekNumber: 1, studentId: 1 });
pointTransactionSchema.index({ source: 1, createdAt: -1 });
pointTransactionSchema.index(
  { studentId: 1, weeklyContestId: 1, weeklyContestPointType: 1 },
  {
    unique: true,
    partialFilterExpression: {
      source: "weekly_contest",
      weeklyContestId: { $exists: true },
      weeklyContestPointType: { $exists: true },
    },
  }
);

const PointTransaction: Model<IPointTransaction> =
  (mongoose.models.PointTransaction as Model<IPointTransaction> | undefined) ||
  mongoose.model<IPointTransaction>(
    "PointTransaction",
    pointTransactionSchema
  );

export default PointTransaction;
