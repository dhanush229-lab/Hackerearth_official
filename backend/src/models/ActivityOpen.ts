import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const ACTIVITY_OPEN_TYPES = [
  "weekly_contest",
  "dsa_dpp",
  "aptitude_dpp",
] as const;

export type ActivityOpenType = (typeof ACTIVITY_OPEN_TYPES)[number];

export interface IActivityOpen extends Document {
  studentId: Types.ObjectId;
  activityType: ActivityOpenType;
  weeklyContestId?: Types.ObjectId;
  dppId?: Types.ObjectId;
  firstOpenedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const activityOpenSchema = new Schema<IActivityOpen>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    activityType: {
      type: String,
      enum: ACTIVITY_OPEN_TYPES,
      required: true,
      index: true,
    },
    weeklyContestId: {
      type: Schema.Types.ObjectId,
      ref: "WeeklyContest",
      index: true,
    },
    dppId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    firstOpenedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

activityOpenSchema.pre("validate", function validateActivityOpenTarget() {
  if (this.activityType === "weekly_contest") {
    if (!this.weeklyContestId) {
      this.invalidate(
        "weeklyContestId",
        "weeklyContestId is required for weekly contest opens"
      );
    }

    if (this.dppId) {
      this.invalidate("dppId", "dppId must not be set for weekly contest opens");
    }
  }

  if (this.activityType === "dsa_dpp" || this.activityType === "aptitude_dpp") {
    if (!this.dppId) {
      this.invalidate("dppId", "dppId is required for DPP opens");
    }

    if (this.weeklyContestId) {
      this.invalidate(
        "weeklyContestId",
        "weeklyContestId must not be set for DPP opens"
      );
    }
  }
});

activityOpenSchema.index(
  { studentId: 1, weeklyContestId: 1 },
  {
    name: "unique_weekly_contest_first_open",
    unique: true,
    partialFilterExpression: {
      activityType: "weekly_contest",
      weeklyContestId: { $exists: true },
    },
  }
);

activityOpenSchema.index(
  { studentId: 1, activityType: 1, dppId: 1 },
  {
    name: "unique_dpp_first_open",
    unique: true,
    partialFilterExpression: {
      activityType: { $in: ["dsa_dpp", "aptitude_dpp"] },
      dppId: { $exists: true },
    },
  }
);

const ActivityOpen: Model<IActivityOpen> =
  (mongoose.models.ActivityOpen as Model<IActivityOpen> | undefined) ||
  mongoose.model<IActivityOpen>("ActivityOpen", activityOpenSchema);

export default ActivityOpen;
