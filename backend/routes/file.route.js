import express from 'express';
import { auth } from '../middleware/auth.js';
import multer from 'multer';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { GridFSBucket } from 'mongodb';
import Transaction from '../models/Transaction.js';

dotenv.config();

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'File upload route is working' });
});

// Custom storage for GridFS
const gridFsStorage = multer.memoryStorage();

const upload = multer({ storage: gridFsStorage });

// Function to extract text from PDF using pdfjs-dist
async function extractTextFromPDF(buffer) {
  try {
    console.log('Extracting text from PDF using pdfjs-dist...');
    
    // Import pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(buffer);
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });
    
    const pdf = await loadingTask.promise;
    console.log(`PDF has ${pdf.numPages} pages`);
    
    let fullText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processing page ${i}...`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      // Process text items to create compact format
      let pageText = '';
      let lastY = null;
      let lineBuffer = '';
      
      for (const item of content.items) {
        const currentY = Math.round(item.transform[5]); // Y position
        
        // If Y position changed significantly, start a new line
        if (lastY !== null && Math.abs(currentY - lastY) > 5) {
          if (lineBuffer.trim()) {
            pageText += lineBuffer.trim() + ' ';
            lineBuffer = '';
          }
        }
        
        // Add text to current line
        lineBuffer += item.str;
        lastY = currentY;
      }
      
      // Add remaining line buffer
      if (lineBuffer.trim()) {
        pageText += lineBuffer.trim();
      }
      
      fullText += pageText + ' ';
      console.log(`Page ${i} text length: ${pageText.length}`);
      console.log(`Page ${i} text preview: ${pageText.substring(0, 200)}`);
    }
    
    // Clean up the text to match expected format
    let cleanedText = fullText
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();
    
    console.log(`Total extracted text length: ${cleanedText.length}`);
    console.log(`Cleaned text preview: ${cleanedText.substring(0, 300)}`);
    
    // If the text looks like it contains table data, format it to match expected structure
    if (cleanedText.includes('expense') || cleanedText.includes('amount') || cleanedText.includes('date')) {
      cleanedText = formatTableText(cleanedText);
    }
    
    return cleanedText;
    
  } catch (error) {
    console.error('PDF parsing error:', error);
    return '';
  }
}

// function to extract text from image using Tesseract OCR
async function extractTextFromImage(buffer) {
  const strategies = [
    // Strategy 1: Modern Tesseract.js with createWorker
    async () => {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      
      try {
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\s\-\.\/',
          tessedit_pageseg_mode: '6',
          preserve_interword_spaces: '1',
        });
        
        const { data: { text } } = await worker.recognize(buffer);
        return text;
      } finally {
        await worker.terminate();
      }
    },
    
    // Strategy 2: Direct Tesseract.recognize method
    async () => {
      const Tesseract = await import('tesseract.js');
      const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {
        logger: m => console.log('OCR Progress:', m.status, m.progress)
      });
      return text;
    },
    
    // Strategy 3: Simplified approach
    async () => {
      const tesseract = await import('tesseract.js');
      const result = await tesseract.recognize(buffer, 'eng');
      return typeof result === 'string' ? result : result.data.text;
    }
  ];
  
  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`Trying OCR strategy ${i + 1}...`);
      const text = await strategies[i]();
      console.log(`OCR Strategy ${i + 1} succeeded. Extracted text length:`, text?.length || 0);
      if (text && text.trim()) {
        console.log('Raw OCR text preview:', text.substring(0, 200));
        return text;
      }
    } catch (error) {
      console.error(`OCR Strategy ${i + 1} failed:`, error.message);
      if (i === strategies.length - 1) {
        console.error('All OCR strategies failed');
        return '';
      }
    }
  }
  
  return '';
}

// Function to format table text from PDF to match expected format
function formatTableText(text) {
  console.log('Formatting table text from PDF...');
  console.log('Original text:', text);
  
  // Remove headers and common words more thoroughly
  let formattedText = text;
  
  // Remove table headers and common words
  const headerPatterns = [
    /table\s*\d*\s*/gi,
    /expense\s*/gi,
    /amount\s*/gi,
    /date\s*/gi,
    /note\s*/gi,
    /rupees?\s*/gi
  ];
  
  for (const pattern of headerPatterns) {
    formattedText = formattedText.replace(pattern, '');
  }
  
  // Clean up extra spaces
  formattedText = formattedText.replace(/\s+/g, ' ').trim();
  
  console.log('Formatted text:', formattedText);
  return formattedText;
}

// Function to determine transaction type based on keywords
function determineTransactionType(category, note, text) {
  const lowerCategory = category.toLowerCase();
  const lowerNote = note.toLowerCase();
  const lowerText = text.toLowerCase();
  
  // Bill and receipt keywords - ALWAYS expenses
  const billReceiptKeywords = [
    'bill', 'receipt', 'invoice', 'electricity bill', 'water bill', 'gas bill', 
    'phone bill', 'internet bill', 'utility bill', 'subscription', 'maintenance', 
    'repair', 'service', 'tax', 'fine', 'penalty', 'fee', 'charge'
  ];
  
  // Check for bill/receipt keywords first - these are ALWAYS expenses
  for (const keyword of billReceiptKeywords) {
    if (lowerCategory.includes(keyword) || lowerNote.includes(keyword) || lowerText.includes(keyword)) {
      console.log(`Found bill/receipt keyword '${keyword}', marking as expense: ${category}`);
      return 'expense';
    }
  }
  
  // Income keywords
  const incomeKeywords = [
    'salary', 'wage', 'income', 'earning', 'payment received', 'received',
    'bonus', 'commission', 'dividend', 'interest', 'refund', 'cashback', 'reward',
    'freelance', 'consulting', 'profit', 'revenue', 'deposit', 'gift received',
    'prize', 'winning', 'allowance', 'pension', 'rent received', 'sale'
  ];
  
  // Expense keywords
  const expenseKeywords = [
    'expense', 'cost', 'spent', 'paid for', 'purchase', 'bought', 'rent', 
    'food', 'fuel', 'grocery', 'shopping', 'medical', 'doctor', 'hospital', 
    'medicine', 'insurance', 'loan', 'emi', 'donation', 'entertainment', 
    'movie', 'restaurant', 'travel', 'transport', 'utility'
  ];
  
  // Check category and note for keywords
  const combinedText = `${lowerCategory} ${lowerNote}`.trim();
  
  // Check for income indicators
  for (const keyword of incomeKeywords) {
    if (combinedText.includes(keyword) || lowerText.includes(keyword)) {
      return 'income';
    }
  }
  
  // Check for expense indicators
  for (const keyword of expenseKeywords) {
    if (combinedText.includes(keyword) || lowerText.includes(keyword)) {
      return 'expense';
    }
  }
  
  // Default logic: if context suggests income/credit, mark as income
  if (combinedText.includes('received') || combinedText.includes('credit') || 
      combinedText.includes('deposit') || combinedText.includes('earning')) {
    return 'income';
  }
  
  // Default to expense if unclear
  return 'expense';
}

// Function to parse transactions from extracted text
function parseTransactionsFromText(text) {
  const transactions = [];
  
  if (!text || typeof text !== 'string') {
    console.log('No valid text provided for parsing');
    return transactions;
  }
  
  // Clean and normalize text
  const cleanText = text.replace(/\s+/g, ' ').trim();
  console.log('Clean text for parsing:', cleanText.substring(0, 500));
  
  // Check if it's a receipt format
  const isReceipt = /(?:receipt|invoice|bill)\s*(?:date|#|no)/i.test(cleanText) || 
                   /(?:description|item)\s*(?:unit\s*price|price|amount)/i.test(cleanText) ||
                   /(?:subtotal|total|tax)/i.test(cleanText);
  
  if (isReceipt) {
    console.log('Detected receipt format, using specialized parsing...');
    return parseReceiptFormat(cleanText);
  }
  
  // Check if text contains table-like structure
  const hasTableStructure = /(?:expense|income|transaction).*(?:rupees|amount).*date.*(?:note|description)/i.test(cleanText);
  
  if (hasTableStructure) {
    console.log('Detected table structure, using specialized parsing...');
    return parseTableStructure(cleanText);
  }
  
  // Enhanced patterns for general transaction detection
  const patterns = [
    // Pattern for table-like data: Category Amount Date Note
    /([A-Za-z][A-Za-z\s]{2,}?)\s+(\d+\.?\d*)\s+(\d{4}-\d{2}-\d{2})\s+([A-Za-z][A-Za-z\s]*)/gi,
    // Pattern: Category followed by amount
    /([A-Za-z][A-Za-z\s]{2,})\s+(\d+\.?\d*)/gi,
    // Pattern: Amount followed by category
    /(\d+\.?\d*)\s+([A-Za-z][A-Za-z\s]{2,})/gi,
    // Pattern: Amount with currency symbols
    /(\d+\.?\d*)\s*(?:rs?\.?|₹|rupees?|rupee)\s*(?:for|on|-\s*)?([A-Za-z][A-Za-z\s]{2,})/gi,
    // Pattern: Category with currency symbols
    /([A-Za-z][A-Za-z\s]{2,})\s*(?:rs?\.?|₹|rupees?|rupee)\s*(\d+\.?\d*)/gi,
  ];
  
  // Try to split text into meaningful chunks
  let textToProcess = cleanText;
  
  // Remove common headers
  textToProcess = textToProcess.replace(/^.*?(?:expense|income|transaction|rupees?|date|note).*?(?=\w)/i, '');
  
  console.log('Text after header removal:', textToProcess.substring(0, 300));
  
  // Split into lines and process
  const lines = textToProcess.split(/[\n\r]+/).filter(line => line.trim());
  console.log('Processing', lines.length, 'lines');
  
  // If only one line, try to split it intelligently
  if (lines.length === 1 && lines[0].length > 50) {
    return parseInlineTransactions(lines[0]);
  }
  
  // Process each line with patterns
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    if (!trimmedLine || trimmedLine.length < 5) {
      return;
    }
    
    console.log(`Processing line ${index + 1}: "${trimmedLine}"`);
    
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(trimmedLine);
      
      if (match) {
        let amount, category, date, note = '';
        
        if (match.length >= 4) {
          // Table format: category, amount, date, note
          category = match[1]?.trim();
          amount = parseFloat(match[2]);
          date = match[3]?.trim();
          note = match[4]?.trim() || '';
        } else {
          // Simple format: category and amount
          const group1 = match[1]?.trim();
          const group2 = match[2]?.trim();
          
          if (group1 && group2) {
            const group1IsNumber = !isNaN(parseFloat(group1)) && isFinite(group1);
            const group2IsNumber = !isNaN(parseFloat(group2)) && isFinite(group2);
            
            if (group1IsNumber && !group2IsNumber) {
              amount = parseFloat(group1);
              category = group2;
            } else if (!group1IsNumber && group2IsNumber) {
              category = group1;
              amount = parseFloat(group2);
            }
          }
        }
        
        if (amount && category && amount > 0 && amount < 1000000 && category.length > 2) {
          category = category.replace(/[^\w\s]/g, '').trim();
          
          const isDuplicate = transactions.some(txn => 
            Math.abs(txn.amount - amount) < 0.01 && 
            txn.category.toLowerCase() === category.toLowerCase()
          );
          
          if (!isDuplicate) {
            // Determine transaction type
            const transactionType = determineTransactionType(category, note, cleanText);
            
            console.log(`✓ Found ${transactionType}: ${category} - ₹${amount}${date ? ` on ${date}` : ''}`);
            transactions.push({
              amount: amount,
              category: category,
              note: note || `Extracted from uploaded file`,
              date: date && /\d{4}-\d{2}-\d{2}/.test(date) ? date : new Date().toISOString().split('T')[0],
              type: transactionType
            });
          }
        }
        break;
      }
    }
  });
  
  console.log(`Final parsed transactions count: ${transactions.length}`);
  transactions.forEach((txn, i) => {
    console.log(`${i + 1}. ${txn.category}: ₹${txn.amount} (${txn.type})`);
  });
  
  return transactions;
}

// Specialized function to parse receipt format
function parseReceiptFormat(text) {
  const transactions = [];
  console.log('Parsing receipt format...');
  
  // Extract date from receipt
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{1,2}-\d{1,2}-\d{4})/
  ];
  
  let receiptDate = new Date().toISOString().split('T')[0];
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const dateParts = match[1].split(/[-\/]/);
        if (dateParts.length === 3) {
          // Convert to YYYY-MM-DD format
          if (dateParts[0].length === 4) {
            receiptDate = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
          } else {
            receiptDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
          }
        }
        break;
      } catch (e) {
        console.log('Date parsing error:', e.message);
      }
    }
  }
  
  console.log('Extracted receipt date:', receiptDate);
  
  // Patterns for receipt line items
  const receiptPatterns = [
    // Pattern 1: Number + Description + Price + Amount (like your receipt)
    /(\d+)\s*([A-Za-z][A-Za-z\s]{3,}?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)/g,
    // Pattern 2: Description + Unit Price + Amount
    /([A-Za-z][A-Za-z\s]{3,}?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)/g,
    // Pattern 3: Description followed by amount
    /([A-Za-z][A-Za-z\s]{3,}?)\s+(?:₹|Rs\.?|USD|\$)?\s*(\d+\.?\d*)/g,
    // Pattern 4: Simple description and amount
    /([A-Za-z][A-Za-z\s]{2,})\s+(\d+\.?\d*)/g
  ];
  
  // First, try to find the items section
  let itemsSection = text;
  
  // Look for common receipt sections
  const descriptionStart = text.search(/description|item|product/i);
  const totalStart = text.search(/(?:subtotal|total|amount due)/i);
  
  if (descriptionStart !== -1) {
    itemsSection = text.substring(descriptionStart);
    if (totalStart !== -1 && totalStart > descriptionStart) {
      itemsSection = text.substring(descriptionStart, totalStart);
    }
  }
  
  console.log('Items section:', itemsSection.substring(0, 200));
  
  // Remove common non-item text
  itemsSection = itemsSection.replace(/(?:description|item|product|unit\s*price|price|amount|qty|quantity)/gi, '');
  
  // Try each pattern
  for (let patternIndex = 0; patternIndex < receiptPatterns.length; patternIndex++) {
    const pattern = receiptPatterns[patternIndex];
    pattern.lastIndex = 0;
    
    console.log(`Trying receipt pattern ${patternIndex + 1}...`);
    
    let match;
    let foundItems = 0;
    
    while ((match = pattern.exec(itemsSection)) !== null && foundItems < 20) {
      let description, amount, unitPrice;
      
      if (match.length === 5) {
        // Pattern 1: qty + description + unitPrice + amount
        description = match[2].trim();
        unitPrice = parseFloat(match[3]);
        amount = parseFloat(match[4]);
      } else if (match.length === 4) {
        // Pattern 2: description + unitPrice + amount
        description = match[1].trim();
        unitPrice = parseFloat(match[2]);
        amount = parseFloat(match[3]);
      } else if (match.length === 3) {
        // Pattern 3 & 4: description + amount
        description = match[1].trim();
        amount = parseFloat(match[2]);
      }
      
      // Clean up description
      description = description.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Validate the extracted data
      if (description && 
          description.length > 2 && 
          description.length < 50 &&
          amount > 0 && 
          amount < 100000 &&
          !description.match(/^\d+$/) && // Not just numbers
          !description.match(/^[A-Z]{2,3}$/) && // Not state codes
          !description.toLowerCase().includes('subtotal') &&
          !description.toLowerCase().includes('total') &&
          !description.toLowerCase().includes('tax') &&
          !description.toLowerCase().includes('due') &&
          !description.toLowerCase().includes('date') &&
          !description.toLowerCase().includes('receipt')) {
        
        // Check for duplicates
        const isDuplicate = transactions.some(txn => 
          Math.abs(txn.amount - amount) < 0.01 && 
          txn.category.toLowerCase() === description.toLowerCase()
        );
        
        if (!isDuplicate) {
          // For receipts, items are typically expenses (purchases)
          // But could be income if it's a sales receipt
          const transactionType = determineTransactionType(description, 'Purchase from receipt', text);
          
          console.log(`✓ Found receipt item: ${description} - ${amount} (${transactionType})`);
          
          transactions.push({
            amount: amount,
            category: description,
            note: `Purchase from receipt`,
            date: receiptDate,
            type: transactionType
          });
          
          foundItems++;
        }
      }
    }
    
    if (foundItems > 0) {
      console.log(`Receipt pattern ${patternIndex + 1} found ${foundItems} items`);
      break; // Stop if we found items with this pattern
    }
  }
  
  // If no items found with patterns, try manual extraction for your specific format
  if (transactions.length === 0) {
    console.log('No items found with patterns, trying manual extraction...');
    
    // Your specific receipt format: "1Frontandrearbrakecables 100.00 100.00"
    const manualPattern = /(\d+)([A-Za-z][A-Za-z\s]*?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)/g;
    let manualMatch;
    
    while ((manualMatch = manualPattern.exec(text)) !== null) {
      const quantity = parseInt(manualMatch[1]);
      let description = manualMatch[2].trim();
      const unitPrice = parseFloat(manualMatch[3]);
      const totalAmount = parseFloat(manualMatch[4]);
      
      // Add spaces to camelCase descriptions
      description = description.replace(/([a-z])([A-Z])/g, '$1 $2');
      description = description.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
      
      if (description.length > 2 && totalAmount > 0) {
        const transactionType = determineTransactionType(description, 'Purchase from receipt', text);
        
        console.log(`✓ Manual extraction: ${description} - ${totalAmount} (${transactionType})`);
        
        transactions.push({
          amount: totalAmount,
          category: description.trim(),
          note: `Purchase from receipt (Qty: ${quantity})`,
          date: receiptDate,
          type: transactionType
        });
      }
    }
  }
  
  console.log(`Receipt parsing completed. Found ${transactions.length} items.`);
  return transactions;
}

// Specialized function to parse table structure
function parseTableStructure(text) {
  const transactions = [];
  
  // Remove the header part
  let dataText = text.replace(/^.*?(?:expense|income|transaction|rupees?|date|note)/i, '').trim();
  console.log('Data text after header removal:', dataText);
  
  // First, let's identify the actual data by removing any header text
  let cleanDataText = dataText;
  
  // Remove common header patterns
  const headerPatterns = [
    /^.*?(?:table|expense|amount|date|note|rupees?)\s*/gi,
    /^(?:amount|date|note|table|expense|rupees?)\s*/gi
  ];
  
  for (const pattern of headerPatterns) {
    cleanDataText = cleanDataText.replace(pattern, '');
  }
  
  console.log('Clean data text:', cleanDataText);
  
  // Find all date patterns to identify transaction boundaries
  const datePattern = /(\d{1,2}-\d{1,2}-\d{2})/g;
  const dates = [];
  let dateMatch;
  
  while ((dateMatch = datePattern.exec(cleanDataText)) !== null) {
    dates.push({
      date: dateMatch[1],
      index: dateMatch.index
    });
  }
  
  console.log('Found dates:', dates);
  
  // Parse each transaction based on date positions
  for (let i = 0; i < dates.length; i++) {
    const currentDate = dates[i];
    const nextDate = dates[i + 1];
    
    // Find the amount that comes before this date
    let amountIndex = currentDate.index;
    while (amountIndex > 0 && !/^\d+$/.test(cleanDataText[amountIndex - 1])) {
      amountIndex--;
    }
    
    // Find the category start (look backwards from amount to find word boundary)
    let categoryStart = amountIndex;
    while (categoryStart > 0 && /[A-Za-z]/.test(cleanDataText[categoryStart - 1])) {
      categoryStart--;
    }
    
    // Find the end of this transaction
    let endIndex = nextDate ? nextDate.index : cleanDataText.length;
    
    // Extract the transaction text
    const transactionText = cleanDataText.substring(categoryStart, endIndex).trim();
    console.log(`Transaction ${i + 1} text: "${transactionText}"`);
    
    // Parse the transaction components
    const parts = transactionText.split(/\s+/);
    if (parts.length >= 3) {
      // Find the amount (should be a number before the date)
      let amountIndex = -1;
      let amount = 0;
      
      for (let j = 0; j < parts.length; j++) {
        if (/^\d+$/.test(parts[j]) && j < parts.length - 1) {
          const nextPart = parts[j + 1];
          if (nextPart.includes('-') && nextPart.split('-').length === 3) {
            amount = parseInt(parts[j]);
            amountIndex = j;
            break;
          }
        }
      }
      
      if (amountIndex > 0) {
        // Extract category (everything before the amount, but clean it)
        let category = parts.slice(0, amountIndex).join(' ').trim();
        
        // Clean category - remove header words and common words
        category = category
          .replace(/\b(amount|date|note|table|expense|rupees?)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Extract date
        const dateStr = parts[amountIndex + 1];
        
        // Extract note (everything after the date)
        let note = parts.slice(amountIndex + 2).join(' ').trim();
        
        // Clean note - remove any remaining header words
        note = note
          .replace(/\b(amount|date|note|table|expense|rupees?)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Convert date format (DD-M-YY to YYYY-MM-DD)
        let date = new Date().toISOString().split('T')[0];
        if (dateStr && dateStr.includes('-') && dateStr.split('-').length === 3) {
          const dateParts = dateStr.split('-');
          if (dateParts[0].length <= 2 && dateParts[1].length <= 2 && dateParts[2].length === 2) {
            const day = dateParts[0].padStart(2, '0');
            const month = dateParts[1].padStart(2, '0');
            const year = '20' + dateParts[2]; // Assuming 20xx years
            date = `${year}-${month}-${day}`;
          }
        }
        
        if (category && amount > 0) {
          // Determine transaction type
          const transactionType = determineTransactionType(category, note, text);
          
          console.log(`✓ New parsing: ${category} - ₹${amount} on ${date} (${note}) - ${transactionType}`);
          transactions.push({
            amount: amount,
            category: category,
            note: note || 'Extracted from uploaded file',
            date: date,
            type: transactionType
          });
        }
      }
    }
  }
  
  // If no transactions found with specific pattern, try alternative patterns
  if (transactions.length === 0) {
    console.log('No transactions found with specific pattern, trying alternative patterns...');
    
    const alternativePatterns = [
      // Pattern: Category Amount Date Note (YYYY-MM-DD format)
      /([A-Za-z][A-Za-z\s]*(?:[A-Za-z])*)\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+([A-Za-z][A-Za-z\s]*?)(?=\s+[A-Za-z][A-Za-z]*\s+\d+\s+\d{4}-\d{2}-\d{2}|$)/g,
      // Pattern: Category Amount Date (simple format)
      /([A-Za-z][A-Za-z\s]*(?:[A-Za-z])*)\s+(\d+)\s+(\d{1,2}-\d{1,2}-\d{2})/g,
      // Pattern: Category Amount (no date)
      /([A-Za-z][A-Za-z\s]*(?:[A-Za-z])*)\s+(\d+)/g
    ];
    
    for (const pattern of alternativePatterns) {
      pattern.lastIndex = 0;
      let match;
      
      while ((match = pattern.exec(dataText)) !== null) {
        const category = match[1].trim();
        const amount = parseFloat(match[2]);
        let date = match[3] ? match[3].trim() : new Date().toISOString().split('T')[0];
        const note = match[4] ? match[4].trim() : '';
        
        // Convert date format if needed
        if (date && date.includes('-') && date.split('-').length === 3) {
          const dateParts = date.split('-');
          if (dateParts[0].length <= 2 && dateParts[1].length <= 2 && dateParts[2].length === 2) {
            const day = dateParts[0].padStart(2, '0');
            const month = dateParts[1].padStart(2, '0');
            const year = '20' + dateParts[2];
            date = `${year}-${month}-${day}`;
          }
        }
        
        if (category && amount > 0) {
          // Check if this transaction is already added
          const isDuplicate = transactions.some(txn => 
            Math.abs(txn.amount - amount) < 0.01 && 
            txn.category.toLowerCase() === category.toLowerCase()
          );
          
          if (!isDuplicate) {
            const transactionType = determineTransactionType(category, note, text);
            
            console.log(`✓ Alternative pattern parsed: ${category} - ₹${amount} on ${date} (${note}) - ${transactionType}`);
            transactions.push({
              amount: amount,
              category: category,
              note: note || 'Extracted from uploaded file',
              date: date,
              type: transactionType
            });
          }
        }
      }
      
      if (transactions.length > 0) {
        break;
      }
    }
  }
  
  console.log(`Table structure parsing completed. Found ${transactions.length} transactions.`);
  
  // If still no transactions found, try manual parsing for the specific format
  if (transactions.length === 0) {
    console.log('No transactions found with patterns, trying manual parsing...');
    return parseManualTableFormat(dataText);
  }
  
  return transactions;
}

// Manual parsing for specific table format
function parseManualTableFormat(text) {
  const transactions = [];
  console.log('Manual parsing for table format:', text);
  
  // Split the text into chunks that look like transactions
  
  // First, try to find all numbers that could be amounts
  const amountMatches = text.match(/\d+/g);
  if (!amountMatches) {
    console.log('No amounts found in text');
    return transactions;
  }
  
  console.log('Found potential amounts:', amountMatches);
  
  // Split text by amounts to get categories and notes
  const parts = text.split(/(\d+)/);
  console.log('Text parts:', parts);
  
  for (let i = 0; i < parts.length - 2; i++) {
    const categoryPart = parts[i].trim();
    const amountPart = parts[i + 1];
    const remainingPart = parts.slice(i + 2).join('').trim();
    
    // Skip if category is too short or amount is not a number
    if (categoryPart.length < 3 || !/^\d+$/.test(amountPart)) {
      continue;
    }
    
    const amount = parseInt(amountPart);
    if (amount <= 0 || amount > 100000) {
      continue;
    }
    
    // Extract category (remove common words)
    let category = categoryPart
      .replace(/\b(expense|amount|date|note|table|rupees?)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (category.length < 2) continue;
    
    // Extract date and note from remaining part
    const dateMatch = remainingPart.match(/(\d{1,2}-\d{1,2}-\d{2})/);
    let date = new Date().toISOString().split('T')[0];
    let note = '';
    
    if (dateMatch) {
      const dateStr = dateMatch[1];
      const dateParts = dateStr.split('-');
      if (dateParts.length === 3) {
        const day = dateParts[0].padStart(2, '0');
        const month = dateParts[1].padStart(2, '0');
        const year = '20' + dateParts[2];
        date = `${year}-${month}-${day}`;
        
        // Extract note (everything after the date)
        note = remainingPart.replace(dateStr, '').trim();
        
        // Clean note - remove any remaining header words
        note = note
          .replace(/\b(amount|date|note|table|expense|rupees?)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
    } else {
      note = remainingPart
        .replace(/\b(amount|date|note|table|expense|rupees?)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // Check for duplicates
    const isDuplicate = transactions.some(txn => 
      Math.abs(txn.amount - amount) < 0.01 && 
      txn.category.toLowerCase() === category.toLowerCase()
    );
    
    if (!isDuplicate && category.length > 2) {
      const transactionType = determineTransactionType(category, note, text);
      
      console.log(`✓ Manual parsing: ${category} - ₹${amount} on ${date} (${note}) - ${transactionType}`);
      transactions.push({
        amount: amount,
        category: category,
        note: note || 'Extracted from uploaded file',
        date: date,
        type: transactionType
      });
    }
  }
  
  console.log(`Manual parsing completed. Found ${transactions.length} transactions.`);
  return transactions;
}

// Main file upload route
router.post('/receipt', auth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  console.log('File upload started:', {
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
  
  try {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
    
    // Store file in GridFS
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      metadata: { 
        user: req.user.id,
        uploadedAt: new Date(),
        contentType: req.file.mimetype
      }
    });
    
    uploadStream.end(req.file.buffer);
    
    uploadStream.on('finish', async () => {
      try {
        let extractedText = '';
        let extractedTransactions = [];
        
        console.log('File stored in GridFS, starting text extraction...');
        
        // Extract text based on file type
        if (req.file.mimetype === 'application/pdf') {
          console.log('Processing PDF file...');
          extractedText = await extractTextFromPDF(req.file.buffer);
        } else if (req.file.mimetype.startsWith('image/')) {
          console.log('Processing image file...');
          extractedText = await extractTextFromImage(req.file.buffer);
        } else {
          console.log('Unsupported file type:', req.file.mimetype);
        }
        
        console.log('Text extraction completed. Length:', extractedText?.length || 0);
        
        // Parse transactions from extracted text
        if (extractedText && extractedText.trim()) {
          console.log('Starting transaction parsing...');
          extractedTransactions = parseTransactionsFromText(extractedText);
        } else {
          console.log('No text extracted, skipping transaction parsing');
        }
        
        // Add extracted transactions to database
        const addedTransactions = [];
        if (extractedTransactions.length > 0) {
          console.log(`Adding ${extractedTransactions.length} transactions to database...`);
          
          for (const transaction of extractedTransactions) {
            try {
              const newTransaction = new Transaction({
                ...transaction,
                user: req.user.id
              });
              await newTransaction.save();
              addedTransactions.push(newTransaction);
              console.log(`✓ Added: ${transaction.category} - ₹${transaction.amount} (${transaction.type})`);
            } catch (dbError) {
              console.error(`Failed to save transaction: ${transaction.category}`, dbError.message);
            }
          }
        }
        
        // Count income vs expense transactions
        const incomeCount = addedTransactions.filter(t => t.type === 'income').length;
        const expenseCount = addedTransactions.filter(t => t.type === 'expense').length;
        
        console.log(`Processing completed. ${addedTransactions.length} transactions added (${incomeCount} income, ${expenseCount} expense).`);
        
        res.json({
          success: true,
          fileId: uploadStream.id,
          filename: req.file.originalname,
          originalname: req.file.originalname,
          contentType: req.file.mimetype,
          extractedText: extractedText ? extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '') : 'No text extracted',
          extractedTransactions: extractedTransactions.length,
          addedTransactions: addedTransactions.length,
          incomeTransactions: incomeCount,
          expenseTransactions: expenseCount,
          transactions: addedTransactions,
          message: extractedTransactions.length > 0 
            ? `File uploaded successfully. ${extractedTransactions.length} transactions found (${incomeCount} income, ${expenseCount} expense), ${addedTransactions.length} added to database.`
            : 'File uploaded successfully, but no transactions could be extracted.'
        });
        
      } catch (error) {
        console.error('Processing error:', error);
        res.status(500).json({ 
          success: false,
          message: 'File uploaded but processing failed',
          error: error.message,
          fileId: uploadStream.id
        });
      }
    });
    
    uploadStream.on('error', (error) => {
      console.error('GridFS upload error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Upload failed',
        error: error.message 
      });
    });
    
  } catch (error) {
    console.error('GridFS initialization error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Upload initialization failed',
      error: error.message 
    });
  }
});

// // Route to retrieve uploaded files
router.get('/receipt/:id', auth, async (req, res) => {
  const db = mongoose.connection.db;
  const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
  
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const downloadStream = bucket.openDownloadStream(fileId);
    
    downloadStream.on('error', (error) => {
      console.error('File download error:', error);
      res.status(404).json({ message: 'File not found' });
    });
    
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Invalid file ID:', error);
    res.status(400).json({ message: 'Invalid file id' });
  }
});

export default router;