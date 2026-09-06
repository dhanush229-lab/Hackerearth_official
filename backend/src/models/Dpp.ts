import mongoose, { Document, Model, Schema, Types } from "mongoose";

export const DPP_TYPES = ["dsa", "aptitude"] as const;

export type DppType = (typeof DPP_TYPES)[number];

export interface IDpp extends Document {
  type: DppType;
  title: string;
  url: string;
  description?: string;
  active: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const isHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const dppSchema = new Schema<IDpp>(
  {
    type: {
      type: String,
      enum: DPP_TYPES,
      required: [true, "DPP type is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "DPP title is required"],
      trim: true,
      maxlength: 120,
    },
    url: {
      type: String,
      required: [true, "DPP URL is required"],
      trim: true,
      maxlength: 1000,
      validate: {
        validator: isHttpUrl,
        message: "DPP URL must be a valid http or https URL",
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
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

dppSchema.index({ active: 1, type: 1, createdAt: -1 });

const Dpp: Model<IDpp> =
  (mongoose.models.Dpp as Model<IDpp> | undefined) ||
  mongoose.model<IDpp>("Dpp", dppSchema);

export default Dpp;
