// ===========================
// State Management
// ===========================
let vocabList = [];
let currentIndex = 0;
let isFlipped = false;
let currentFileName = '';
let isTestMode = false;

// ===========================
// DOM Elements
// ===========================
const importSection = document.getElementById('importSection');
const previewSection = document.getElementById('previewSection');
const flashcardSection = document.getElementById('flashcardSection');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const refreshFilesBtn = document.getElementById('refreshFilesBtn');
const serverFilesList = document.getElementById('serverFilesList');

const previewFileName = document.getElementById('previewFileName');
const previewWordCount = document.getElementById('previewWordCount');
const previewList = document.getElementById('previewList');
const startLearningBtn = document.getElementById('startLearningBtn');
const backToSelectBtn = document.getElementById('backToSelectBtn');

const flashcard = document.getElementById('flashcard');
const cardWord = document.getElementById('cardWord');
const cardPhonetic = document.getElementById('cardPhonetic');
const cardPos = document.getElementById('cardPos');
const cardMeaningEn = document.getElementById('cardMeaningEn');
const cardMeaningVi = document.getElementById('cardMeaningVi');
const cardContext = document.getElementById('cardContext');
const cardExample = document.getElementById('cardExample');

const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');
const fileNameDisplay = document.getElementById('fileNameDisplay');

const flipBtn = document.getElementById('flipBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const resetBtn = document.getElementById('resetBtn');
const changeFileBtn = document.getElementById('changeFileBtn');

// Test Mode Elements
const toggleModeBtn = document.getElementById('toggleModeBtn');
const testInputContainer = document.getElementById('testInput');
const userInput = document.getElementById('userInput');
const checkAnswerBtn = document.getElementById('checkAnswerBtn');
const testResult = document.getElementById('testResult');
const frontBadge = document.getElementById('frontBadge');

// ===========================
// Event Listeners
// ===========================
selectFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
refreshFilesBtn.addEventListener('click', loadServerFiles);
toggleModeBtn.addEventListener('click', toggleTestMode);
checkAnswerBtn.addEventListener('click', checkAnswer);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkAnswer();
});
startLearningBtn.addEventListener('click', startFlashcards);
backToSelectBtn.addEventListener('click', backToSelect);

flipBtn.addEventListener('click', handleFlip);
prevBtn.addEventListener('click', handlePrevious);
nextBtn.addEventListener('click', handleNext);
shuffleBtn.addEventListener('click', handleShuffle);
resetBtn.addEventListener('click', handleReset);
changeFileBtn.addEventListener('click', handleChangeFile);

// Click on flashcard to flip
flashcard.addEventListener('click', handleFlip);

// Keyboard navigation (but not when typing in input)
document.addEventListener('keydown', (e) => {
    // Don't trigger if user is typing in any input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    handleKeyboard(e);
});

// ===========================
// Load Server Files
// ===========================
async function loadServerFiles() {
    try {
        serverFilesList.innerHTML = '<div class="loading-files">Đang tải danh sách...</div>';
        
        const response = await fetch('/api/vocabulary-files');
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Không thể tải danh sách file');
        }

        if (!data.files || data.files.length === 0) {
            serverFilesList.innerHTML = '<div class="loading-files">Chưa có file nào. Hãy tạo file từ trang Trích xuất!</div>';
            return;
        }

        // Display files
        serverFilesList.innerHTML = '';
        data.files.forEach(file => {
            const fileItem = createFileItem(file);
            serverFilesList.appendChild(fileItem);
        });

    } catch (error) {
        console.error('Error loading files:', error);
        serverFilesList.innerHTML = `<div class="loading-files" style="color: #ff4444;">Lỗi: ${error.message}</div>`;
    }
}

function createFileItem(file) {
    const item = document.createElement('div');
    item.className = 'file-item';
    
    const modifiedDate = new Date(file.modifiedAt).toLocaleDateString('vi-VN');
    
    item.innerHTML = `
        <div class="file-info" style="flex: 1;">
            <h4>📚 ${file.filename.replace('.json', '')}</h4>
            <div class="file-meta">
                ${file.wordCount} từ • ${modifiedDate}
            </div>
        </div>
        <div class="file-actions">
            <button class="btn-icon delete" onclick="deleteFile('${file.filename}')" title="Xóa">
                🗑️
            </button>
        </div>
    `;
    
    // Click on item to select
    item.querySelector('.file-info').addEventListener('click', () => {
        loadVocabularyFromServer(file.filename);
    });
    
    return item;
}

async function loadVocabularyFromServer(filename) {
    try {
        const response = await fetch(`/api/vocabulary-files/${filename}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Không thể tải file');
        }

        if (!Array.isArray(data.vocabulary) || data.vocabulary.length === 0) {
            throw new Error('File không chứa từ vựng hợp lệ');
        }

        // Load into preview
        vocabList = data.vocabulary;
        currentFileName = filename;
        showPreview();

    } catch (error) {
        console.error('Error loading vocabulary:', error);
        alert(`Lỗi: ${error.message}`);
    }
}

async function deleteFile(filename) {
    if (!confirm(`Xóa file "${filename}"?\n\nHành động này không thể hoàn tác!`)) {
        return;
    }

    try {
        const response = await fetch(`/api/vocabulary-files/${filename}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Không thể xóa file');
        }

        showNotification('✅ Đã xóa file!');
        loadServerFiles(); // Refresh list

    } catch (error) {
        console.error('Error deleting file:', error);
        alert(`Lỗi: ${error.message}`);
    }
}

// ===========================
// Show Preview
// ===========================
function showPreview() {
    previewFileName.textContent = `📁 ${currentFileName}`;
    previewWordCount.textContent = `📊 ${vocabList.length} từ vựng`;
    
    // Display vocabulary list
    previewList.innerHTML = '';
    vocabList.forEach((vocab, index) => {
        const item = document.createElement('div');
        item.className = 'preview-item';
        
        const posColor = getPosColorClass(vocab.partOfSpeech);
        
        item.innerHTML = `
            <div style="flex: 1;">
                <div class="preview-word">${index + 1}. ${vocab.word}</div>
                <div class="preview-phonetic">${vocab.phonetic || ''}</div>
                <div class="preview-meaning">${vocab.meaning_vi || vocab.meaning_en || ''}</div>
            </div>
            <div class="vocab-pos ${posColor}" style="align-self: center;">
                ${vocab.partOfSpeech || 'N/A'}
            </div>
        `;
        previewList.appendChild(item);
    });
    
    // Show preview section
    importSection.style.display = 'none';
    previewSection.style.display = 'block';
}

function startFlashcards() {
    currentIndex = 0;
    isFlipped = false;
    
    previewSection.style.display = 'none';
    flashcardSection.style.display = 'block';
    
    displayCard();
    updateProgress();
}

function backToSelect() {
    previewSection.style.display = 'none';
    importSection.style.display = 'flex';
    vocabList = [];
    currentFileName = '';
}

// ===========================
// File Selection & Import (Local)
// ===========================
function handleFileSelect(event) {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.name.endsWith('.json')) {
        alert('Vui lòng chọn file .json!');
        return;
    }

    currentFileName = file.name;

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            if (!Array.isArray(data)) {
                throw new Error('File không đúng định dạng. Cần là một mảng JSON.');
            }

            if (data.length === 0) {
                throw new Error('File không chứa từ vựng nào.');
            }

            // Validate data structure
            const isValid = data.every(item => 
                item.word && 
                typeof item.word === 'string'
            );

            if (!isValid) {
                throw new Error('Dữ liệu trong file không hợp lệ.');
            }

            // Load vocabulary
            vocabList = data;
            currentIndex = 0;
            isFlipped = false;

            // Show preview
            showPreview();

        } catch (error) {
            console.error('Error loading file:', error);
            alert(`Lỗi: ${error.message}`);
        }
    };

    reader.onerror = function() {
        alert('Đã xảy ra lỗi khi đọc file!');
    };

    reader.readAsText(file);
}

// ===========================
// Display Flashcard
// ===========================
function displayCard() {
    if (!vocabList || vocabList.length === 0) return;

    const vocab = vocabList[currentIndex];

    if (isTestMode) {
        // Test Mode: Show Vietnamese, user types English
        frontBadge.textContent = 'Test Mode';
        cardWord.textContent = vocab.meaning_vi || 'N/A';
        cardPhonetic.textContent = `(${vocab.partOfSpeech || 'N/A'})`;
        testInputContainer.style.display = 'flex';
        userInput.value = '';
        userInput.focus();
        testResult.style.display = 'none';
        testResult.className = 'test-result';
    } else {
        // Normal Mode: Show English word
        frontBadge.textContent = 'Front';
        cardWord.textContent = vocab.word || 'N/A';
        cardPhonetic.textContent = vocab.phonetic || '';
        testInputContainer.style.display = 'none';
    }

    // Update back side
    cardPos.textContent = vocab.partOfSpeech || 'N/A';
    
    // Update color based on part of speech
    const posColor = getPosColorClass(vocab.partOfSpeech);
    cardPos.className = 'card-pos ' + posColor;
    
    cardMeaningEn.textContent = vocab.meaning_en || 'N/A';
    cardMeaningVi.textContent = vocab.meaning_vi || 'N/A';
    cardContext.textContent = vocab.context || 'No context available';
    cardExample.textContent = vocab.example || 'No example available';

    // Reset flip state
    if (isFlipped) {
        flashcard.classList.remove('flipped');
        isFlipped = false;
    }

    // Update button states
    updateButtonStates();
}

// ===========================
// Flashcard Controls
// ===========================
function handleFlip() {
    flashcard.classList.toggle('flipped');
    isFlipped = !isFlipped;
}

function handleNext() {
    if (currentIndex < vocabList.length - 1) {
        currentIndex++;
        displayCard();
        updateProgress();
    }
}

function handlePrevious() {
    if (currentIndex > 0) {
        currentIndex--;
        displayCard();
        updateProgress();
    }
}

function handleShuffle() {
    if (confirm('Xáo trộn danh sách từ vựng?')) {
        vocabList = shuffleArray([...vocabList]);
        currentIndex = 0;
        displayCard();
        updateProgress();
        showNotification('🔀 Đã xáo trộn!');
    }
}

function handleReset() {
    if (confirm('Bắt đầu lại từ đầu?')) {
        currentIndex = 0;
        displayCard();
        updateProgress();
        showNotification('🔄 Đã reset!');
    }
}

function handleChangeFile() {
    if (confirm('Đổi file khác? (Tiến trình hiện tại sẽ bị mất)')) {
        vocabList = [];
        currentIndex = 0;
        isFlipped = false;
        currentFileName = '';
        fileInput.value = '';
        
        flashcardSection.style.display = 'none';
        previewSection.style.display = 'none';
        importSection.style.display = 'flex';
        loadServerFiles(); // Refresh the list
    }
}

// ===========================
// Progress Update
// ===========================
function updateProgress() {
    const current = currentIndex + 1;
    const total = vocabList.length;
    const percentage = (current / total) * 100;

    progressText.textContent = `Thẻ ${current} / ${total}`;
    progressFill.style.width = `${percentage}%`;
    fileNameDisplay.textContent = currentFileName;
}

function updateButtonStates() {
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === vocabList.length - 1;
}

// ===========================
// Keyboard Navigation
// ===========================
function handleKeyboard(event) {
    // Only handle keyboard events when flashcard is visible
    if (flashcardSection.style.display !== 'block') return;
    
    // Don't handle ANY keyboard events if input is focused in test mode
    if (isTestMode && document.activeElement === userInput) return;
    
    // Don't handle keyboard if any input/textarea is focused
    if (document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA') {
        return;
    }

    switch(event.key) {
        case 'ArrowLeft':
            event.preventDefault();
            handlePrevious();
            break;
        case 'ArrowRight':
            event.preventDefault();
            handleNext();
            break;
        case ' ':
        case 'Enter':
            // Don't flip in test mode
            if (!isTestMode) {
                event.preventDefault();
                handleFlip();
            }
            break;
    }
}

// ===========================
// Utility Functions
// ===========================
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--secondary-color);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        animation: slideIn 0.3s ease;
        font-weight: 600;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// ===========================
// ===========================
// Test Mode Functions
// ===========================
function toggleTestMode() {
    isTestMode = !isTestMode;
    
    if (isTestMode) {
        toggleModeBtn.innerHTML = '📖 Chuyển sang chế độ Học';
        toggleModeBtn.classList.remove('btn-outline');
        toggleModeBtn.classList.add('btn-secondary');
        flipBtn.disabled = true;
        flipBtn.style.opacity = '0.5';
    } else {
        toggleModeBtn.innerHTML = '📝 Chuyển sang chế độ Test';
        toggleModeBtn.classList.remove('btn-secondary');
        toggleModeBtn.classList.add('btn-outline');
        flipBtn.disabled = false;
        flipBtn.style.opacity = '1';
    }
    
    displayCard();
}

function checkAnswer() {
    const vocab = vocabList[currentIndex];
    const userAnswer = userInput.value.trim().toLowerCase();
    const correctAnswer = vocab.word.toLowerCase();
    
    if (!userAnswer) {
        showNotification('⚠️ Vui lòng nhập câu trả lời!');
        return;
    }
    
    // Disable input and button while checking
    userInput.disabled = true;
    checkAnswerBtn.disabled = true;
    
    // Calculate similarity
    if (userAnswer === correctAnswer) {
        // Exact match - CORRECT
        testResult.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 10px;">✅</div>
            <strong style="font-size: 1.3rem; color: #2B8A3E;">ĐÚNG RỒI!</strong><br>
            <span style="font-size: 1.1rem;">Từ: <strong>${vocab.word}</strong></span>
        `;
        testResult.className = 'test-result correct';
        testResult.style.display = 'block';
        
        // Play success sound (optional)
        showNotification('✅ Chính xác! Chuyển sang từ tiếp theo...');
        
        // Auto next after 1.2s
        setTimeout(() => {
            testResult.style.display = 'none';
            userInput.disabled = false;
            checkAnswerBtn.disabled = false;
            handleNext();
        }, 1200);
        
    } else if (correctAnswer.includes(userAnswer) || userAnswer.includes(correctAnswer)) {
        // Partial match - CLOSE
        testResult.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 10px;">⚠️</div>
            <strong style="font-size: 1.2rem;">GẦN ĐÚNG RỒI!</strong><br>
            Đáp án chính xác: <strong style="font-size: 1.2rem;">${vocab.word}</strong><br>
            <small>Bạn viết: <em>${userInput.value}</em></small>
        `;
        testResult.className = 'test-result partial';
        testResult.style.display = 'block';
        
        showNotification('⚠️ Gần đúng! Xem lại chính tả');
        
        // Re-enable after 2s
        setTimeout(() => {
            userInput.disabled = false;
            checkAnswerBtn.disabled = false;
            userInput.value = '';
            userInput.focus();
        }, 2000);
        
    } else {
        // Wrong - INCORRECT
        testResult.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 10px;">❌</div>
            <strong style="font-size: 1.2rem; color: #C92A2A;">SAI RỒI!</strong><br>
            Đáp án đúng: <strong style="font-size: 1.3rem; color: #2B8A3E;">${vocab.word}</strong><br>
            <small>Bạn viết: <em>${userInput.value}</em></small>
        `;
        testResult.className = 'test-result incorrect';
        testResult.style.display = 'block';
        
        showNotification('❌ Sai rồi! Xem đáp án đúng');
        
        // Re-enable after 2.5s
        setTimeout(() => {
            userInput.disabled = false;
            checkAnswerBtn.disabled = false;
            userInput.value = '';
            userInput.focus();
        }, 2500);
    }
}

// Utility Functions
// ===========================
// Get color class based on part of speech
function getPosColorClass(pos) {
    if (!pos) return '';
    
    const posLower = pos.toLowerCase();
    
    if (posLower.includes('noun')) return 'pos-noun';
    if (posLower.includes('verb')) return 'pos-verb';
    if (posLower.includes('adj')) return 'pos-adj';
    if (posLower.includes('adv')) return 'pos-adv';
    if (posLower.includes('prep')) return 'pos-prep';
    if (posLower.includes('conj')) return 'pos-conj';
    if (posLower.includes('pron')) return 'pos-pron';
    
    return ''; // Default color
}

// ===========================
// Initialize
// ===========================
// Check if auto-load from schedule page
const urlParams = new URLSearchParams(window.location.search);
const autoLoadFile = urlParams.get('file');
const shouldAutoLoad = urlParams.get('autoload') === 'true';

if (autoLoadFile && shouldAutoLoad) {
    // Auto load the specified file and start directly
    loadAndStartFlashcard(autoLoadFile);
} else {
    // Load server files on page load
    loadServerFiles();
}

// Load file and start flashcard directly (skip preview)
async function loadAndStartFlashcard(filename) {
    try {
        // Hide import section immediately
        importSection.style.display = 'none';
        previewSection.style.display = 'none';
        flashcardSection.style.display = 'block';
        
        // Show loading in flashcard
        cardWord.textContent = 'Đang tải...';
        cardPhonetic.textContent = '';
        cardPos.textContent = '';
        cardMeaningEn.textContent = 'Vui lòng đợi...';
        cardMeaningVi.textContent = '';
        
        // Load vocabulary from server
        const response = await fetch(`/api/vocabulary-files/${filename}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Không thể tải file');
        }

        if (!Array.isArray(data.vocabulary) || data.vocabulary.length === 0) {
            throw new Error('File không chứa từ vựng hợp lệ');
        }

        // Set data and start learning
        vocabList = data.vocabulary;
        currentFileName = filename;
        currentIndex = 0;
        isFlipped = false;
        
        // Update UI
        fileNameDisplay.textContent = filename.replace('.json', '');
        updateProgress();
        displayCard();
        
        console.log(`✅ Loaded ${vocabList.length} words from ${filename}`);

    } catch (error) {
        console.error('Error loading vocabulary:', error);
        
        // Show error and return to import
        alert(`❌ Lỗi khi tải file: ${error.message}`);
        flashcardSection.style.display = 'none';
        importSection.style.display = 'block';
        loadServerFiles();
    }
}

console.log('🎴 Flashcard script loaded!');
console.log('💡 Tip: Use Arrow keys (←/→) to navigate, Space/Enter to flip');

// Make deleteFile globally accessible
window.deleteFile = deleteFile;
