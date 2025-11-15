# IELTS Vocabulary Extractor & Flashcard Trainer

A simple full-stack web application to extract vocabulary from IELTS reading passages and study them using interactive flashcards.

## 🌟 Features

### Flow 1: Extract & Export Vocabulary
- Paste IELTS reading passages
- AI-powered vocabulary extraction using Gemini API
- Extract 7 fields per word: word, phonetic, part of speech, English meaning, Vietnamese meaning, context, and example
- Export vocabulary as JSON files
- Beautiful card-based display

### Flow 2: Flashcard Learning
- Import JSON vocabulary files
- Interactive flashcard interface with flip animation
- Navigation controls (previous, next, shuffle, reset)
- Keyboard shortcuts (Arrow keys, Space/Enter)
- Progress tracking
- Responsive design

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- A Gemini API key (optional - mock data available)

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd eng-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and add your Gemini API key:
     ```
     GEMINI_API_KEY=your_actual_api_key_here
     PORT=3000
     ```
   - If you don't have an API key, the app will use mock data

4. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   - Extraction page: http://localhost:3000
   - Flashcard page: http://localhost:3000/hoc-flashcard

## 📁 Project Structure

```
eng-app/
├── public/
│   ├── index.html              # Extraction page
│   ├── hoc-flashcard.html      # Flashcard learning page
│   ├── styles.css              # Shared styles
│   ├── script_extract.js       # Extraction logic
│   └── script_flashcard.js     # Flashcard logic
├── server.js                   # Express server
├── package.json
├── .env.example                # Environment template
├── .env                        # Your environment config (create this)
└── README.md
```

## 🎯 Usage

### Extracting Vocabulary

1. Go to http://localhost:3000
2. Paste an IELTS reading passage into the textarea
3. **(New!)** Set the number of words to extract (5-30, default: 15)
4. Click "Trích xuất từ vựng" (Extract Vocabulary)
5. Wait for the AI to process (or see mock data if no API key)
6. Review the extracted vocabulary cards
7. Click "Tải xuống (.json)" to download the vocabulary file

### Manual Word Lookup (New Feature!)

1. After pasting your passage, highlight/select any word or phrase
2. Click "Tra cứu từ đã chọn" (Lookup selected word)
3. The word will be looked up with AI and added to your vocabulary list
4. You can mix automatic extraction with manual lookups
5. Duplicate words won't be added twice

### Studying with Flashcards

1. Go to http://localhost:3000/hoc-flashcard
2. Click "Chọn file .json" to select a vocabulary file
3. Use the controls to navigate:
   - **Lật thẻ** (Flip): Show word definition
   - **Tiếp theo** (Next): Go to next card
   - **Trước đó** (Previous): Go to previous card
   - **Xáo trộn** (Shuffle): Randomize card order
   - **Bắt đầu lại** (Reset): Start from beginning
4. Keyboard shortcuts:
   - `←/→`: Navigate cards
   - `Space/Enter`: Flip card

## 🔑 Getting a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it into your `.env` file

## 🎨 Design

- **Font:** Poppins (Google Fonts)
- **Color Palette:**
  - Primary: #4A90E2 (Blue)
  - Secondary: #50C878 (Green)
  - Background: #F5F7FA (Light Gray)
  - Surface: #FFFFFF (White)
- **Modern UI:** Rounded corners, subtle shadows, smooth animations
- **Fully Responsive:** Works on desktop, tablet, and mobile

## 📝 JSON Format

The vocabulary JSON files follow this structure:

```json
[
  {
    "word": "substantial",
    "phonetic": "/səbˈstænʃəl/",
    "partOfSpeech": "adjective",
    "meaning_en": "of considerable importance, size, or worth",
    "meaning_vi": "đáng kể, quan trọng",
    "context": "There has been substantial progress in the field of renewable energy.",
    "example": "The company made substantial profits this quarter."
  }
]
```

## 🛠️ Technologies

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express
- **AI:** Google Gemini API
- **Storage:** JSON files (no database required)

## 📄 License

This project is open source and available for educational purposes.

## 👨‍💻 Author

Made with ❤️ for IELTS learners

---

**Happy Learning! 📚✨**
