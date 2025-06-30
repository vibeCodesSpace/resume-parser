import fs from 'fs';
import { exec } from 'child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI("AIzaSyBDmOXbHyyRNMsG4INO-9qDk5O7RyIaP4A");

async function extractResumeData(resumeText) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are a highly accurate data extraction AI. Your sole purpose is to extract structured data from the provided resume text. Analyze the content to infer the candidate's industry, primary role, and personality based on the language used. You MUST return ONLY a JSON object with the exact structure below. Do NOT include any conversational text, markdown outside the JSON, or any other characters.

{
  "name": "Full Name",
  "title": "Professional Title/Role",
  "summary": "Professional summary",
  "experience": [{"company": "", "role": "", "duration": "", "description": ""}],
  "skills": ["skill1", "skill2"],
  "education": [{"institution": "", "degree": "", "year": ""}],
  "contact": {"email": "", "phone": "", "linkedin": "", "website": ""},
  "industry": "Inferred industry (e.g., Technology, Healthcare, Finance)",
  "role": "Inferred primary role (e.g., Software Engineer, Project Manager, Marketing Specialist)",
  "personality": "Brief analysis of the candidate's personality based on the tone and language of the cover letter or summary (e.g., 'Driven and results-oriented', 'Creative and collaborative')."
}

Resume Text:
${resumeText}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  try {
    // Attempt to parse directly, or extract from markdown if present
    let jsonStr = text;
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse JSON from Gemini API response:", text);
    throw new Error("Invalid JSON response from AI.");
  }
}

async function generatePortfolioHtml(resumeData) {
  const { name, title, summary, experience, skills, education, contact, industry, role, personality } = resumeData;

  const experienceHtml = experience.map(exp => `
    <div class="experience-item">
      <h3>${exp.role} at ${exp.company}</h3>
      <p class="duration">${exp.duration}</p>
      <p>${exp.description}</p>
    </div>
  `).join('');

  const skillsHtml = skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('');

  const educationHtml = education.map(edu => `
    <div class="education-item">
      <h3>${edu.degree}</h3>
      <p>${edu.institution} (${edu.year})</p>
    </div>
  `).join('');

  const contactHtml = `
    <p>Email: <a href="mailto:${contact.email}">${contact.email}</a></p>
    ${contact.phone ? `<p>Phone: ${contact.phone}</p>` : ''}
    ${contact.linkedin ? `<p>LinkedIn: <a href="${contact.linkedin}" target="_blank">${contact.linkedin}</a></p>` : ''}
    ${contact.website ? `<p>Website: <a href="${contact.website}" target="_blank">${contact.website}</a></p>` : ''}
  `;

  // Basic styling based on inferred personality/industry/role
  let dynamicStyles = '';
  if (personality && personality.toLowerCase().includes('creative')) {
    dynamicStyles += `
      body { font-family: 'Georgia', serif; background-color: #f0f8ff; color: #333; }
      .header { background-color: #ff6347; color: white; }
      .skill-tag { background-color: #ff6347; }
    `;
  } else if (industry && industry.toLowerCase().includes('tech')) {
    dynamicStyles += `
      body { font-family: 'Roboto Mono', monospace; background-color: #282c34; color: #abb2bf; }
      .header { background-color: #61afef; color: white; }
      .skill-tag { background-color: #61afef; }
    `;
  } else { // Default professional style
    dynamicStyles += `
      body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; color: #333; }
      .header { background-color: #4CAF50; color: white; }
      .skill-tag { background-color: #4CAF50; }
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${name}'s Portfolio</title>
      <style>
        body { margin: 0; padding: 0; line-height: 1.6; }
        .container { max-width: 900px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; padding: 20px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; color: inherit; }
        .header p { margin: 5px 0 0; font-size: 1.1em; }
        section { margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 8px; }
        h2 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 0; }
        .experience-item, .education-item { margin-bottom: 15px; }
        .experience-item h3, .education-item h3 { margin: 0 0 5px; color: #555; }
        .duration { font-style: italic; color: #777; }
        .skills-grid { display: flex; flex-wrap: wrap; gap: 10px; }
        .skill-tag { display: inline-block; padding: 8px 12px; border-radius: 5px; color: white; font-size: 0.9em; }
        .contact-info p { margin: 5px 0; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        ${dynamicStyles}
      </style>
    </head>
    <body>
      <div class="container">
        <header class="header">
          <h1>${name}</h1>
          <p>${title}</p>
        </header>

        <section id="about">
          <h2>About Me</h2>
          <p>${summary}</p>
        </section>

        <section id="experience">
          <h2>Experience</h2>
          ${experienceHtml}
        </section>

        <section id="skills">
          <h2>Skills</h2>
          <div class="skills-grid">
            ${skillsHtml}
          </div>
        </section>

        <section id="education">
          <h2>Education</h2>
          ${educationHtml}
        </section>

        <section id="contact">
          <h2>Contact</h2>
          <div class="contact-info">
            ${contactHtml}
          </div>
        </section>
      </div>
    </body>
    </html>
  `;
}

async function main() {
  const resumeFilePath = process.argv[2];
  if (!resumeFilePath) {
    console.error('Usage: node generate-portfolio.js <path-to-resume-file>');
    process.exit(1);
  }

  if (!fs.existsSync(resumeFilePath)) {
    console.error(`Error: Resume file not found at ${resumeFilePath}`);
    process.exit(1);
  }

  const resumeText = fs.readFileSync(resumeFilePath, 'utf-8');

  console.log('Extracting resume data with AI...');
  const resumeData = await extractResumeData(resumeText);
  console.log('Resume data extracted:', JSON.stringify(resumeData, null, 2));

  console.log('Generating portfolio HTML...');
  const portfolioHtml = await generatePortfolioHtml(resumeData);

  const outputFileName = `${resumeData.name.toLowerCase().replace(/\s+/g, '-')}-portfolio.html`;
  fs.writeFileSync(outputFileName, portfolioHtml);
  console.log(`Portfolio generated: ${outputFileName}`);

  console.log('\nTo view the portfolio, open the generated HTML file in your browser.');
  console.log('To embed this on another site, you can use an iframe:');
  console.log(`  <iframe src="${outputFileName}" width="100%" height="800px" frameborder="0"></iframe>`);
}

main().catch(console.error);