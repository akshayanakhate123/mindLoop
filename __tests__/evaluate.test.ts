/**
 * @jest-environment node
 */
import { POST } from '../src/app/api/evaluate/route';

const mockResponseJSON = {
  AccuracyScore: 90,
  StructureScore: 80,
  InterviewReadiness: "Almost Ready",
  VerdictLine: "Solid structure.",
  GoodPoints: "Good logic.",
  BadPoints: "Missed edge cases.",
  Improvement: "Try to think broader.",
  AssumptionComparison: [
    { parameter: "Boeing 747 volume", userAssumption: "1000m3", idealAssumption: "1000m3" }
  ],
  StepScores: [
    { step: "Define the container", score: 90, comment: "Good volume logic." }
  ],
  ModelAnswer: [
    "Estimate the volume of a Boeing 747 is approx 1000 cubic meters."
  ]
};

// Mock dependencies
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify(mockResponseJSON)
          }
        })
      })
    }))
  };
});

jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify(mockResponseJSON)
            }
          }]
        })
      }
    }
  }));
});

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify(mockResponseJSON)
            }
          }]
        })
      }
    }
  }));
});

describe('/api/evaluate POST endpoint', () => {
  const baseRequest = {
    question: "Test question",
    transcript: "Test transcript",
    finalAnswer: "200k"
  };

  it('should evaluate successfully using Gemini provider', async () => {
    const req = new Request('http://localhost:3000/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        ...baseRequest,
        apiKey: 'fake-gemini-key',
        provider: 'gemini'
      })
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('AccuracyScore', 90);
    expect(data).toHaveProperty('InterviewReadiness', 'Almost Ready');
    expect(data).toHaveProperty('VerdictLine', 'Solid structure.');
    expect(data.ModelAnswer).toHaveLength(1);
    expect(data.AssumptionComparison).toHaveLength(1);
  });

  it('should evaluate successfully using OpenAI provider', async () => {
    const req = new Request('http://localhost:3000/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        ...baseRequest,
        apiKey: 'fake-openai-key',
        provider: 'openai'
      })
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('VerdictLine', 'Solid structure.');
  });

  it('should evaluate successfully using Groq provider', async () => {
    const req = new Request('http://localhost:3000/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        ...baseRequest,
        apiKey: 'fake-groq-key',
        provider: 'groq'
      })
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('VerdictLine', 'Solid structure.');
  });

  it('should return 400 if apiKey is missing', async () => {
    const req = new Request('http://localhost:3000/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        ...baseRequest,
        provider: 'gemini'
      })
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error', 'Missing API Key.');
  });
});
