const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const dataDir = "D:/AI projects/owlly/data_source";
const outDir = "D:/AI projects/owlly/src/data/guesstimates";

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const domains = [
  { file: 'Guesstimates_Finance_Investment_Roles_India.docx', domain: 'Finance' },
  { file: 'Guesstimates_Generalist_Roles_India.docx', domain: 'Generalist' },
  { file: 'Guesstimates_Marketing_Roles_India.docx', domain: 'Marketing' },
  { file: 'Guesstimates_Product_Roles_India.docx', domain: 'Product' },
  { file: 'Guesstimates_Sales_Roles_India.docx', domain: 'Sales' },
];

async function parseDocx(filePath, domainName) {
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value;

  const questions = [];
  
  // Split by Q[number].
  const qBlocks = text.split(/Q\d+\./);
  
  for (let i = 1; i < qBlocks.length; i++) {
    const block = qBlocks[i].trim();
    if (!block) continue;
    
    // Extract question text
    const questionMatch = block.match(/^(.*?)(?=\n|Clarifying questions)/s);
    let questionText = questionMatch ? questionMatch[1].trim() : "Unknown Question";
    
    // Extract hint (from Approach or Clarifying questions)
    const approachMatch = block.match(/Approach:?\s*(.*?)(?=\n\s*Logical reasoning|\n\s*Final Answer)/is);
    let hint = approachMatch ? approachMatch[1].trim() : "Break down the problem logically.";
    
    // Assign a random difficulty to simulate the previous AI behavior
    const difficulties = ["Easy", "Medium", "Hard"];
    const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];

    questions.push({
      id: `${domainName.toLowerCase()}-${i}`,
      domain: domainName,
      question: questionText,
      hint: hint,
      difficulty: difficulty
    });
  }

  return questions;
}

async function run() {
  for (const d of domains) {
    const filePath = path.join(dataDir, d.file);
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${d.file} - not found.`);
      continue;
    }
    console.log(`Parsing ${d.domain}...`);
    const qData = await parseDocx(filePath, d.domain);
    fs.writeFileSync(path.join(outDir, `${d.domain.toLowerCase()}.json`), JSON.stringify(qData, null, 2));
    console.log(`Saved ${qData.length} questions for ${d.domain}.`);
  }
  
  // Write index.ts
  const indexFile = `
import finance from './finance.json';
import generalist from './generalist.json';
import marketing from './marketing.json';
import product from './product.json';
import sales from './sales.json';

export const datasets: Record<string, any[]> = {
  "Finance": finance,
  "Generalist": generalist,
  "Marketing": marketing,
  "Product": product,
  "Sales": sales
};
`;
  fs.writeFileSync(path.join(outDir, 'index.ts'), indexFile.trim());
  console.log("Generated index.ts");
}

run().catch(err => console.error(err));
