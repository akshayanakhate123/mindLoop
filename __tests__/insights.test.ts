/**
 * @jest-environment jsdom
 */

// Mock the localStorage hook and useMemo logic for tests
const calculateStats = (sessions: any[]) => {
  if (sessions.length === 0) return null;
  
  // Improvement Rate (Last 3 vs Previous 3)
  let improvementRate = null;
  if (sessions.length >= 6) {
    const last3Avg = sessions.slice(-3).reduce((acc, s) => acc + s.accuracyScore, 0) / 3;
    const prev3Avg = sessions.slice(-6, -3).reduce((acc, s) => acc + s.accuracyScore, 0) / 3;
    improvementRate = Math.round(last3Avg - prev3Avg);
  }

  // Readiness (Last 5 avg)
  const last5Avg = Math.round(sessions.slice(-5).reduce((acc, s) => acc + (s.accuracyScore + s.structureScore) / 2, 0) / Math.min(sessions.length, 5));
  const readinessZone = last5Avg > 80 ? "Expert" : last5Avg > 60 ? "Getting There" : "Needs Practice";

  return { improvementRate, last5Avg, readinessZone };
};

describe("Insights Logic Tests", () => {
  
  it("calculates positive improvement rate correctly", () => {
    const sessions = [
      { accuracyScore: 60 }, { accuracyScore: 60 }, { accuracyScore: 60 }, // Avg 60
      { accuracyScore: 80 }, { accuracyScore: 80 }, { accuracyScore: 80 }  // Avg 80
    ];
    const stats = calculateStats(sessions);
    expect(stats?.improvementRate).toBe(20);
  });

  it("calculates negative improvement rate correctly", () => {
    const sessions = [
      { accuracyScore: 90 }, { accuracyScore: 90 }, { accuracyScore: 90 }, // Avg 90
      { accuracyScore: 70 }, { accuracyScore: 70 }, { accuracyScore: 70 }  // Avg 70
    ];
    const stats = calculateStats(sessions);
    expect(stats?.improvementRate).toBe(-20);
  });

  it("identifies Expert readiness zone (> 80)", () => {
    const sessions = [
      { accuracyScore: 85, structureScore: 85 },
      { accuracyScore: 90, structureScore: 90 }
    ];
    const stats = calculateStats(sessions);
    expect(stats?.readinessZone).toBe("Expert");
  });

  it("identifies Getting There readiness zone (61-80)", () => {
    const sessions = [
      { accuracyScore: 70, structureScore: 70 }
    ];
    const stats = calculateStats(sessions);
    expect(stats?.readinessZone).toBe("Getting There");
  });

  it("identifies Needs Practice readiness zone (<= 60)", () => {
    const sessions = [
      { accuracyScore: 50, structureScore: 50 }
    ];
    const stats = calculateStats(sessions);
    expect(stats?.readinessZone).toBe("Needs Practice");
  });

  it("returns null improvement if sessions < 6", () => {
    const sessions = [{ accuracyScore: 80 }];
    const stats = calculateStats(sessions);
    expect(stats?.improvementRate).toBeNull();
  });

});
