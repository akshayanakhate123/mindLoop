/**
 * @jest-environment node
 */
import { POST } from '../src/app/api/generate-questions/route';

const mockResponseJSON = {
  questions: [
    {
      day: 1,
      question: "Test question 1",
      hint: "Hint 1",
      difficulty: "Hard"
    },
    {
      day: 2,
      question: "Test question 2",
      hint: "Hint 2",
      difficulty: "Easy"
    }
  ]
};

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

describe('/api/generate-questions POST endpoint', () => {
  it('should generate questions successfully using Gemini provider', async () => {
    const req = new Request('http://localhost:3000/api/generate-questions', {
      method: 'POST',
      body: JSON.stringify({
        totalDays: 2,
        apiKey: 'fake-gemini-key',
        provider: 'gemini'
      })
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0]).toHaveProperty('question', 'Test question 1');
  });
});
