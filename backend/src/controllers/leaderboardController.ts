import { Request, Response } from "express";
import {
  getAvailableWeeklyContestWeeks,
  getOverallLeaderboard,
  getWeeklyLeaderboard,
  parseLeaderboardPagination,
} from "../services/leaderboardService";

export const getOverallLeaderboardHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const pagination = parseLeaderboardPagination(req.query);
    const result = await getOverallLeaderboard(pagination);

    return res.status(200).json({
      success: true,
      leaderboard: result.leaderboard,
      pagination: result.pagination,
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const getWeeklyLeaderboardHandler = async (
  req: Request,
  res: Response
) => {
  try {
    if (
      req.query.scope !== undefined &&
      req.query.scope !== "all" &&
      req.query.scope !== "week"
    ) {
      return res.status(400).json({
        success: false,
        code: "INVALID_SCOPE",
        message: "Weekly leaderboard scope must be all or week.",
      });
    }

    const scope = req.query.scope === "all" ? "all" : "week";
    const week = Number(req.query.week);

    if (scope === "week" && (!Number.isInteger(week) || week < 1 || week > 10)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_WEEK",
        message: "A valid week number from 1 to 10 is required.",
      });
    }

    const pagination = parseLeaderboardPagination(req.query);
    const result = await getWeeklyLeaderboard(
      scope === "week"
        ? { ...pagination, scope, week }
        : { ...pagination, scope }
    );

    return res.status(200).json({
      success: true,
      scope,
      week: scope === "week" ? week : null,
      leaderboard: result.leaderboard,
      pagination: result.pagination,
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const getWeeklyContestWeeksHandler = async (
  _req: Request,
  res: Response
) => {
  try {
    const weeks = await getAvailableWeeklyContestWeeks();

    return res.status(200).json({
      success: true,
      weeks,
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};
