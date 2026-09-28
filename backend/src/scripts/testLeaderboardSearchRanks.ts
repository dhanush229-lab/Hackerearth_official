import assert from "node:assert/strict";
import { filterAndPaginateRankedLeaderboard } from "../services/leaderboardService";

type TestLeaderboardEntry = {
  rank: number;
  studentId: string;
  name: string;
  usn: string;
  points: number;
};

const createRankedEntries = (): TestLeaderboardEntry[] => [
  {
    rank: 1,
    studentId: "student-1",
    name: "Aarav Rao",
    usn: "NNM24IS001",
    points: 120,
  },
  {
    rank: 2,
    studentId: "student-2",
    name: "Maya Search Alpha",
    usn: "NNM24IS002",
    points: 100,
  },
  {
    rank: 3,
    studentId: "student-3",
    name: "Nikhil Pai",
    usn: "NNM24IS003",
    points: 80,
  },
  {
    rank: 4,
    studentId: "student-4",
    name: "Aman Target",
    usn: "NNM24IS057",
    points: 60,
  },
  {
    rank: 5,
    studentId: "student-5",
    name: "Isha Search Beta",
    usn: "NNM24IS005",
    points: 40,
  },
];

const assertRanks = (
  actual: TestLeaderboardEntry[],
  expectedRanks: number[],
  message: string
) => {
  assert.deepEqual(
    actual.map((entry) => entry.rank),
    expectedRanks,
    message
  );
};

const runOverallSearchRankTests = () => {
  const leaderboard = createRankedEntries();

  const nameSearch = filterAndPaginateRankedLeaderboard(
    leaderboard,
    "Aman",
    0,
    25
  );
  assertRanks(
    nameSearch.entries,
    [4],
    "Overall name search should preserve the student's full-leaderboard rank."
  );

  const usnSearch = filterAndPaginateRankedLeaderboard(
    leaderboard,
    "NNM24IS057",
    0,
    25
  );
  assertRanks(
    usnSearch.entries,
    [4],
    "Overall USN search should preserve the student's full-leaderboard rank."
  );
};

const runWeeklySearchRankTests = () => {
  const leaderboard = createRankedEntries();

  const nameSearch = filterAndPaginateRankedLeaderboard(
    leaderboard,
    "Aman",
    0,
    25
  );
  assertRanks(
    nameSearch.entries,
    [4],
    "Weekly name search should preserve the student's full-weekly rank."
  );

  const usnSearch = filterAndPaginateRankedLeaderboard(
    leaderboard,
    "NNM24IS057",
    0,
    25
  );
  assertRanks(
    usnSearch.entries,
    [4],
    "Weekly USN search should preserve the student's full-weekly rank."
  );
};

const runMultipleMatchAndPaginationTests = () => {
  const leaderboard = createRankedEntries();

  const multipleMatches = filterAndPaginateRankedLeaderboard(
    leaderboard,
    "Search",
    0,
    25
  );
  assertRanks(
    multipleMatches.entries,
    [2, 5],
    "Multiple search matches should retain original ranks instead of becoming #1 and #2."
  );
  assert.equal(
    multipleMatches.total,
    2,
    "Search total should count filtered matches without changing their ranks."
  );

  const paginatedMatches = filterAndPaginateRankedLeaderboard(
    leaderboard,
    "Search",
    1,
    1
  );
  assertRanks(
    paginatedMatches.entries,
    [5],
    "Pagination after search should not rewrite preserved ranks."
  );
};

runOverallSearchRankTests();
runWeeklySearchRankTests();
runMultipleMatchAndPaginationTests();

console.log("Leaderboard search rank regression tests passed.");
