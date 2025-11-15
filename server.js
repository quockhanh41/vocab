require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Create vocabulary storage directory if it doesn't exist
const VOCAB_DIR = path.join(__dirname, 'vocabulary_files');
if (!fs.existsSync(VOCAB_DIR)) {
  fs.mkdirSync(VOCAB_DIR, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize Gemini AI
const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// Helper function to retry API calls with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      // Check if it's a rate limit error
      if (error.message && error.message.includes('429')) {
        if (i === maxRetries - 1) {
          // Last retry failed
          throw new Error('Vượt quá giới hạn API. Vui lòng chờ 1-2 phút và thử lại.');
        }
        // Wait with exponential backoff
        const delay = initialDelay * Math.pow(2, i);
        console.log(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Other errors, throw immediately
        throw error;
      }
    }
  }
}

// Mock vocabulary data for testing when API key is not available
const getMockVocabulary = () => {
  return [
    {
      word: "substantial",
      phonetic: "/səbˈstænʃəl/",
      partOfSpeech: "adjective",
      meaning_en: "of considerable importance, size, or worth",
      meaning_vi: "đáng kể, quan trọng",
      context: "There has been substantial progress in the field of renewable energy.",
      example: "The company made substantial profits this quarter."
    },
    {
      word: "prevalent",
      phonetic: "/ˈprevələnt/",
      partOfSpeech: "adjective",
      meaning_en: "widespread in a particular area or at a particular time",
      meaning_vi: "phổ biến, thịnh hành",
      context: "This disease is prevalent in tropical regions.",
      example: "Social media addiction has become increasingly prevalent among teenagers."
    },
    {
      word: "deteriorate",
      phonetic: "/dɪˈtɪriəreɪt/",
      partOfSpeech: "verb",
      meaning_en: "become progressively worse",
      meaning_vi: "xấu đi, suy giảm",
      context: "The patient's condition began to deteriorate rapidly.",
      example: "Without proper maintenance, the building will continue to deteriorate."
    }
  ];
};

// API Endpoint: Extract vocabulary from passage
app.post('/api/extract', async (req, res) => {
  try {
    const { passage, wordCount } = req.body;

    if (!passage || passage.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Passage text is required',
        message: 'Vui lòng nhập đoạn văn để trích xuất từ vựng'
      });
    }

    // Validate wordCount
    const count = wordCount && !isNaN(wordCount) ? parseInt(wordCount) : 15;
    const validCount = Math.max(5, Math.min(30, count)); // Between 5-30

    // If no API key, return mock data
    if (!genAI) {
      console.log('Using mock data (no API key configured)');
      return res.json({ 
        vocabulary: getMockVocabulary(),
        isMockData: true,
        message: 'API key not configured. Using sample data.'
      });
    }

    // Call Gemini API with retry logic
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Analyze the following IELTS reading passage and extract advanced vocabulary words suitable for IELTS learners. 
For each word, provide the following information in JSON format:

1. word: the vocabulary word
2. phonetic: IPA pronunciation
3. partOfSpeech: noun, verb, adjective, etc.
4. meaning_en: English definition
5. meaning_vi: Vietnamese translation
6. context: the sentence from the passage where the word appears
7. example: an additional example sentence using this word

Extract ${validCount} words that would be most valuable for IELTS preparation. Focus on academic and formal vocabulary.

Return ONLY a valid JSON array without any markdown formatting or additional text. The format should be:
[
  {
    "word": "...",
    "phonetic": "...",
    "partOfSpeech": "...",
    "meaning_en": "...",
    "meaning_vi": "...",
    "context": "...",
    "example": "..."
  }
]

Passage:
${passage}`;

    // Use retry logic for API call
    const generateContent = async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    };

    let text = await retryWithBackoff(generateContent, 3, 2000);

    // Clean up the response - remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse the JSON response
    let vocabulary;
    try {
      vocabulary = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Response text:', text);
      return res.status(500).json({ 
        error: 'Failed to parse API response',
        message: 'Không thể phân tích kết quả từ API. Vui lòng thử lại.'
      });
    }

    // Validate the response format
    if (!Array.isArray(vocabulary)) {
      return res.status(500).json({ 
        error: 'Invalid response format',
        message: 'Định dạng phản hồi không hợp lệ'
      });
    }

    res.json({ vocabulary, isMockData: false });

  } catch (error) {
    console.error('Error extracting vocabulary:', error);
    
    // Handle specific error types
    let userMessage = 'Đã xảy ra lỗi khi trích xuất từ vựng. Vui lòng thử lại.';
    let statusCode = 500;
    
    if (error.message && error.message.includes('429')) {
      userMessage = '⏳ Vượt quá giới hạn API.\n\n' +
                   'Gemini API miễn phí có giới hạn số lần gọi.\n' +
                   'Vui lòng chờ 1-2 phút rồi thử lại.\n\n' +
                   'Hoặc sử dụng tính năng "Tra cứu từ thủ công" để thêm từng từ.';
      statusCode = 429;
    } else if (error.message && error.message.includes('API key')) {
      userMessage = 'API key không hợp lệ. Vui lòng kiểm tra lại file .env';
    }
    
    res.status(statusCode).json({ 
      error: 'API error',
      message: userMessage,
      details: error.message,
      retryAfter: statusCode === 429 ? 60 : null // Suggest retry after 60 seconds
    });
  }
});

// API Endpoint: Look up a single word or phrase
app.post('/api/lookup', async (req, res) => {
  try {
    const { word, context } = req.body;

    if (!word || word.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Word is required',
        message: 'Vui lòng chọn từ cần tra cứu'
      });
    }

    // If no API key, return mock data
    if (!genAI) {
      console.log('Using mock lookup data (no API key configured)');
      return res.json({ 
        vocabulary: {
          word: word.trim(),
          phonetic: "/ˈeksəmpl/",
          partOfSpeech: "noun",
          meaning_en: "a thing characteristic of its kind or illustrating a general rule",
          meaning_vi: "ví dụ, mẫu",
          context: context || "This is a context sentence.",
          example: "For example, this is how you use it."
        },
        isMockData: true,
        message: 'API key not configured. Using sample data.'
      });
    }

    // Call Gemini API with retry logic
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Look up the following word/phrase and provide detailed information in JSON format:

Word/Phrase: "${word.trim()}"
${context ? `Context: "${context}"` : ''}

Provide the following information:
1. word: the vocabulary word/phrase
2. phonetic: IPA pronunciation
3. partOfSpeech: noun, verb, adjective, etc.
4. meaning_en: English definition
5. meaning_vi: Vietnamese translation
6. context: ${context ? 'use the provided context sentence' : 'create a meaningful context sentence'}
7. example: an additional example sentence using this word

Return ONLY a valid JSON object (not an array) without any markdown formatting or additional text. The format should be:
{
  "word": "...",
  "phonetic": "...",
  "partOfSpeech": "...",
  "meaning_en": "...",
  "meaning_vi": "...",
  "context": "...",
  "example": "..."
}`;

    // Use retry logic for API call
    const generateContent = async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    };

    let text = await retryWithBackoff(generateContent, 3, 2000);

    // Clean up the response - remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse the JSON response
    let vocabulary;
    try {
      vocabulary = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Response text:', text);
      return res.status(500).json({ 
        error: 'Failed to parse API response',
        message: 'Không thể phân tích kết quả từ API. Vui lòng thử lại.'
      });
    }

    // Validate the response format
    if (typeof vocabulary !== 'object' || !vocabulary.word) {
      return res.status(500).json({ 
        error: 'Invalid response format',
        message: 'Định dạng phản hồi không hợp lệ'
      });
    }

    res.json({ vocabulary, isMockData: false });

  } catch (error) {
    console.error('Error looking up word:', error);
    
    // Handle specific error types
    let userMessage = 'Đã xảy ra lỗi khi tra cứu từ. Vui lòng thử lại.';
    let statusCode = 500;
    
    if (error.message && error.message.includes('429')) {
      userMessage = '⏳ Vượt quá giới hạn API.\n\n' +
                   'Vui lòng chờ 1-2 phút rồi thử lại.';
      statusCode = 429;
    }
    
    res.status(statusCode).json({ 
      error: 'API error',
      message: userMessage,
      details: error.message,
      retryAfter: statusCode === 429 ? 60 : null
    });
  }
});

// API Endpoint: Save vocabulary file to server
app.post('/api/save-vocabulary', (req, res) => {
  try {
    const { filename, vocabulary } = req.body;

    if (!filename || !vocabulary) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Vui lòng cung cấp tên file và dữ liệu từ vựng'
      });
    }

    if (!Array.isArray(vocabulary)) {
      return res.status(400).json({ 
        error: 'Invalid vocabulary format',
        message: 'Dữ liệu từ vựng phải là một mảng'
      });
    }

    // Sanitize filename
    const sanitizedFilename = filename.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    const finalFilename = sanitizedFilename.endsWith('.json') 
      ? sanitizedFilename 
      : `${sanitizedFilename}.json`;

    // Check if file already exists
    const filePath = path.join(VOCAB_DIR, finalFilename);
    if (fs.existsSync(filePath)) {
      return res.status(409).json({ 
        error: 'File already exists',
        message: 'File với tên này đã tồn tại. Vui lòng chọn tên khác.'
      });
    }

    // Save file
    fs.writeFileSync(filePath, JSON.stringify(vocabulary, null, 2));

    res.json({ 
      success: true,
      message: 'Lưu file thành công!',
      filename: finalFilename,
      wordCount: vocabulary.length
    });

  } catch (error) {
    console.error('Error saving vocabulary:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Đã xảy ra lỗi khi lưu file. Vui lòng thử lại.',
      details: error.message
    });
  }
});

// API Endpoint: Get list of saved vocabulary files
app.get('/api/vocabulary-files', (req, res) => {
  try {
    const files = fs.readdirSync(VOCAB_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(VOCAB_DIR, file);
        const stats = fs.statSync(filePath);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        return {
          filename: file,
          wordCount: Array.isArray(content) ? content.length : 0,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          size: stats.size
        };
      })
      .sort((a, b) => b.modifiedAt - a.modifiedAt); // Sort by most recent

    res.json({ files });

  } catch (error) {
    console.error('Error getting vocabulary files:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Đã xảy ra lỗi khi lấy danh sách file.',
      details: error.message
    });
  }
});

// API Endpoint: Get vocabulary file content
app.get('/api/vocabulary-files/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(VOCAB_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'File not found',
        message: 'Không tìm thấy file này.'
      });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const vocabulary = JSON.parse(content);

    res.json({ 
      vocabulary,
      filename,
      wordCount: Array.isArray(vocabulary) ? vocabulary.length : 0
    });

  } catch (error) {
    console.error('Error reading vocabulary file:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Đã xảy ra lỗi khi đọc file.',
      details: error.message
    });
  }
});

// API Endpoint: Delete vocabulary file
app.delete('/api/vocabulary-files/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(VOCAB_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'File not found',
        message: 'Không tìm thấy file này.'
      });
    }

    fs.unlinkSync(filePath);

    res.json({ 
      success: true,
      message: 'Đã xóa file thành công!'
    });

  } catch (error) {
    console.error('Error deleting vocabulary file:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Đã xảy ra lỗi khi xóa file.',
      details: error.message
    });
  }
});

// ===========================
// Spaced Repetition System
// ===========================

const STUDY_SCHEDULE_FILE = path.join(VOCAB_DIR, '.study_schedule.json');

// Load study schedule
function loadStudySchedule() {
  try {
    if (fs.existsSync(STUDY_SCHEDULE_FILE)) {
      const data = fs.readFileSync(STUDY_SCHEDULE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading study schedule:', error);
  }
  return {};
}

// Save study schedule
function saveStudySchedule(schedule) {
  try {
    fs.writeFileSync(STUDY_SCHEDULE_FILE, JSON.stringify(schedule, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving study schedule:', error);
  }
}

// Calculate next review dates (Day 2, 4, 7, 14)
function calculateNextReviews(firstStudyDate) {
  const dates = [];
  const intervals = [1, 3, 6, 13]; // Days after first study
  
  intervals.forEach(days => {
    const nextDate = new Date(firstStudyDate);
    nextDate.setDate(nextDate.getDate() + days);
    dates.push(nextDate.toISOString().split('T')[0]);
  });
  
  return dates;
}

// API: Get today's study list
app.get('/api/study/today', (req, res) => {
  try {
    const schedule = loadStudySchedule();
    const today = new Date().toISOString().split('T')[0];
    
    const result = {
      today,
      newFiles: [],
      reviewFiles: [],
      completed: []
    };
    
    // Get all vocabulary files
    const allFiles = fs.readdirSync(VOCAB_DIR)
      .filter(f => f.endsWith('.json') && !f.startsWith('.'))
      .map(filename => {
        const filepath = path.join(VOCAB_DIR, filename);
        const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        const stats = fs.statSync(filepath);
        
        return {
          filename,
          wordCount: content.vocabulary?.length || 0,
          createdDate: stats.birthtime.toISOString().split('T')[0]
        };
      });
    
    // Categorize files
    allFiles.forEach(file => {
      const studyInfo = schedule[file.filename];
      
      if (!studyInfo) {
        // Never studied
        result.newFiles.push({
          ...file,
          status: 'new',
          message: 'Chưa học'
        });
      } else {
        const reviewDates = studyInfo.reviewDates || [];
        
        if (reviewDates.includes(today)) {
          // Need review today
          const daysSinceFirst = Math.floor(
            (new Date(today) - new Date(studyInfo.firstStudyDate)) / (1000 * 60 * 60 * 24)
          );
          
          let reviewType = '';
          if (daysSinceFirst === 1) reviewType = 'Ngày 2 (Ôn lại lần 1)';
          else if (daysSinceFirst === 3) reviewType = 'Ngày 4 (Ôn lại lần 2)';
          else if (daysSinceFirst === 6) reviewType = 'Ngày 7 (Ôn lại lần 3)';
          else if (daysSinceFirst === 13) reviewType = 'Ngày 14 (Ôn lại cuối)';
          
          result.reviewFiles.push({
            ...file,
            status: 'review',
            reviewType,
            firstStudyDate: studyInfo.firstStudyDate,
            completedCount: studyInfo.completedReviews?.length || 0
          });
        } else if (reviewDates.length === 0) {
          // All reviews completed
          result.completed.push({
            ...file,
            status: 'completed',
            message: 'Đã hoàn thành tất cả ôn tập',
            firstStudyDate: studyInfo.firstStudyDate,
            completedCount: studyInfo.completedReviews?.length || 0
          });
        }
      }
    });
    
    res.json({
      ...result,
      summary: {
        total: allFiles.length,
        new: result.newFiles.length,
        review: result.reviewFiles.length,
        completed: result.completed.length
      }
    });
  } catch (error) {
    console.error('Error getting today study list:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Lỗi khi lấy danh sách học hôm nay' 
    });
  }
});

// API: Mark file as studied
app.post('/api/study/mark-studied', (req, res) => {
  try {
    const { filename, isFirstTime } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    if (!filename) {
      return res.status(400).json({ message: 'Thiếu tên file' });
    }
    
    const schedule = loadStudySchedule();
    
    if (isFirstTime) {
      // First time studying
      const reviewDates = calculateNextReviews(today);
      
      schedule[filename] = {
        firstStudyDate: today,
        lastReviewDate: today,
        reviewDates: reviewDates,
        completedReviews: [today]
      };
    } else {
      // Review session
      if (!schedule[filename]) {
        return res.status(400).json({ message: 'File chưa được học lần đầu' });
      }
      
      schedule[filename].lastReviewDate = today;
      
      if (!schedule[filename].completedReviews) {
        schedule[filename].completedReviews = [];
      }
      if (!schedule[filename].completedReviews.includes(today)) {
        schedule[filename].completedReviews.push(today);
      }
      
      // Remove today from reviewDates
      schedule[filename].reviewDates = schedule[filename].reviewDates.filter(d => d !== today);
    }
    
    saveStudySchedule(schedule);
    
    res.json({
      success: true,
      message: 'Đã đánh dấu hoàn thành',
      schedule: schedule[filename]
    });
  } catch (error) {
    console.error('Error marking as studied:', error);
    res.status(500).json({ message: 'Lỗi khi đánh dấu đã học' });
  }
});

// API: Get study history for a file
app.get('/api/study/history/:filename', (req, res) => {
  try {
    const schedule = loadStudySchedule();
    const filename = req.params.filename;
    
    if (!schedule[filename]) {
      return res.json({
        filename,
        status: 'never_studied',
        message: 'Chưa học file này'
      });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const upcomingReviews = schedule[filename].reviewDates?.filter(d => d >= today) || [];
    
    res.json({
      filename,
      ...schedule[filename],
      upcomingReviews,
      status: 'studied'
    });
  } catch (error) {
    console.error('Error getting study history:', error);
    res.status(500).json({ message: 'Lỗi khi lấy lịch sử học' });
  }
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/hoc-flashcard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'hoc-flashcard.html'));
});

app.get('/hoc-theo-lich', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'hoc-theo-lich.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📚 Extraction page: http://localhost:${PORT}/`);
  console.log(`🎴 Flashcard page: http://localhost:${PORT}/hoc-flashcard`);
  
  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  Warning: GEMINI_API_KEY not found. Using mock data.');
    console.log('   Set your API key in .env file to use real AI extraction.');
  }
});
