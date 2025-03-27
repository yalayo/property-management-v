import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize the Google Generative AI with the API key
const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
  console.error('Missing GOOGLE_GEMINI_API_KEY environment variable');
  throw new Error('Missing GOOGLE_GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Extracts data from an Excel/CSV file using Google Gemini
 * @param filePath Path to the uploaded file
 * @param fileType Type of the file ('excel', 'csv', 'pdf', etc.)
 * @returns Extracted structured data
 */
export async function extractDataFromFile(filePath: string, fileType: string): Promise<any> {
  try {
    // Read file content as binary data
    const fileContent = await fs.readFile(filePath, { encoding: 'base64' });
    
    // Convert base64 to binary MIME data for Gemini
    const mimeType = getMimeType(fileType);
    
    // Create a proper Part object as expected by Gemini API
    const fileData = {
      inlineData: {
        mimeType,
        data: fileContent
      }
    };
    
    // Get the Gemini Pro Vision model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
    
    // Generate content based on file type and specific extraction needs
    let prompt;
    if (fileType === 'csv' || fileType === 'xlsx' || fileType === 'xls') {
      prompt = `
        Extract the following information from this financial/property document:
        1. If it's a bank statement: Look for transaction dates, amounts, account numbers, and categorize as rent payments, expenses, etc.
        2. If it's a property document: Extract property details like address, size, purchase price, current tenants if mentioned.
        3. If it's a tenant document: Extract tenant names, contact information, lease terms, and rental amounts.
        
        Return the data in a structured JSON format with appropriate field names.
        Include all relevant data you can find in the document.
      `;
    } else if (fileType === 'pdf') {
      prompt = `
        Extract all relevant information from this document that would be useful for property management.
        Look for:
        - Property details (addresses, prices, square footage)
        - Financial figures (payments, expenses, rent amounts)
        - Dates (transactions, lease terms, deadlines)
        - People's names and contact information
        
        Return the data in a structured JSON format with appropriate field names.
      `;
    } else {
      prompt = `
        Extract all relevant data from this document and return it in a structured JSON format.
        Focus on any information that would be useful for property management or financial tracking.
      `;
    }
    
    // Generate content
    const result = await model.generateContent([prompt, fileData]);
    const response = await result.response;
    const text = response.text();
    
    // Parse the response to extract structured data
    // Gemini should return JSON, but sometimes it might include markdown or additional text
    try {
      // Try to extract JSON from the response text
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                        text.match(/{[\s\S]*}/) || 
                        text.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0].replace(/```json\n|```/g, '').trim());
      }
      
      // If no JSON found, try to parse the whole text as JSON
      return JSON.parse(text);
    } catch (error) {
      console.log('Failed to parse JSON from Gemini response:', error);
      // Return the raw text if we can't parse it as JSON
      return { 
        rawText: text,
        extractionError: "Couldn't parse structured data, returning raw text"
      };
    }
  } catch (error) {
    console.error('Error extracting data with Gemini:', error);
    throw new Error(`Failed to extract data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get MIME type based on file extension
 */
function getMimeType(fileType: string): string {
  const types: { [key: string]: string } = {
    'pdf': 'application/pdf',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'csv': 'text/csv',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'txt': 'text/plain',
  };
  
  return types[fileType.toLowerCase()] || 'application/octet-stream';
}