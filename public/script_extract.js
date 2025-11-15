// ===========================
// State Management
// ===========================
let vocabularyData = [];
let currentFileName = '';

// ===========================
// DOM Elements
// ===========================
const passageInput = document.getElementById('passageInput');
const extractBtn = document.getElementById('extractBtn');
const wordCountInput = document.getElementById('wordCountInput');
const lookupBtn = document.getElementById('lookupBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultsSection = document.getElementById('resultsSection');
const vocabularyList = document.getElementById('vocabularyList');
const downloadBtn = document.getElementById('downloadBtn');
const mockDataWarning = document.getElementById('mockDataWarning');

// ===========================
// Event Listeners
// ===========================
extractBtn.addEventListener('click', handleExtract);
downloadBtn.addEventListener('click', handleDownload);
lookupBtn.addEventListener('click', handleLookup);
searchBtn.addEventListener('click', handleSearch);

// Enable lookup button when text is selected
passageInput.addEventListener('mouseup', handleTextSelection);
passageInput.addEventListener('keyup', handleTextSelection);

// Search on Enter key
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

// ===========================
// Search Functionality
// ===========================
function handleSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        alert('Vui lòng nhập từ cần tìm!');
        return;
    }

    searchResults.innerHTML = '';
    searchResults.style.display = 'block';

    // 1. Search in extracted vocabulary first
    const foundInVocab = vocabularyData.filter(vocab => 
        vocab.word.toLowerCase().includes(searchTerm)
    );

    if (foundInVocab.length > 0) {
        displaySearchResultsInVocab(searchTerm, foundInVocab);
    } else {
        // 2. Search in passage if not found in vocabulary
        const passage = passageInput.value;
        if (!passage) {
            searchResults.innerHTML = '<div class="search-no-results">⚠️ Chưa có đoạn văn để tìm kiếm</div>';
            return;
        }
        
        searchInPassage(searchTerm, passage);
    }
}

function displaySearchResultsInVocab(searchTerm, results) {
    searchResults.innerHTML = `
        <div class="search-result-type">
            ✅ Tìm thấy trong danh sách từ vựng 
            <span class="match-count">${results.length} kết quả</span>
        </div>
    `;

    results.forEach(vocab => {
        const card = createVocabCard(vocab, vocabularyData.indexOf(vocab) + 1);
        card.style.border = '3px solid #FFD93D';
        card.style.animation = 'highlight-pulse 1s ease-in-out';
        searchResults.appendChild(card);
    });

    // Scroll to results
    searchResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function searchInPassage(searchTerm, passage) {
    // Find all matches (case-insensitive, whole words only)
    const regex = new RegExp(`\\b(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*)\\b`, 'gi');
    const matches = [...passage.matchAll(regex)];

    if (matches.length === 0) {
        searchResults.innerHTML = `
            <div class="search-no-results">
                ❌ Không tìm thấy "${searchTerm}" trong đoạn văn và danh sách từ vựng
            </div>
        `;
        return;
    }

    // Get unique matches and check which are in vocabulary
    const uniqueMatches = [...new Set(matches.map(m => m[0]))];
    const matchesInVocab = uniqueMatches.filter(match => 
        vocabularyData.some(v => v.word.toLowerCase() === match.toLowerCase())
    );
    const matchesNotInVocab = uniqueMatches.filter(match => 
        !vocabularyData.some(v => v.word.toLowerCase() === match.toLowerCase())
    );

    // Split passage into sentences
    const sentences = passage.split(/(?<=[.!?])\s+/);
    
    // Find sentences containing the matches
    const relevantSentences = sentences.filter(sentence => 
        regex.test(sentence)
    ).map(sentence => {
        // Reset regex
        const sentenceRegex = new RegExp(`\\b(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*)\\b`, 'gi');
        
        // Highlight matches in sentence
        return sentence.replace(sentenceRegex, (match) => {
            const isInVocab = vocabularyData.some(v => 
                v.word.toLowerCase() === match.toLowerCase()
            );
            
            if (isInVocab) {
                return `<span class="highlight-match already-extracted" data-word="${match}">
                    ${match} <span class="check-mark">✓</span>
                </span>`;
            } else {
                return `<span class="highlight-match" data-word="${match}">${match}</span>`;
            }
        });
    });

    // Build results HTML
    let resultsHTML = `
        <div class="search-result-type">
            🔍 Tìm thấy trong đoạn văn 
            <span class="match-count">${matches.length} lần xuất hiện</span>
            ${matchesInVocab.length > 0 ? 
                `<span class="match-count" style="background: #51CF66; margin-left: 5px;">
                    ✓ ${matchesInVocab.length} đã có
                </span>` : ''}
        </div>
        <p style="margin: 10px 0; color: var(--text-secondary); font-size: 0.9rem;">
            💡 Từ <span style="background: #FFD93D; padding: 2px 6px; border-radius: 3px; font-weight: 600;">vàng</span>: Click để tra cứu | 
            Từ <span style="background: #51CF66; color: white; padding: 2px 6px; border-radius: 3px; font-weight: 600;">xanh ✓</span>: Đã có (click để xem)
        </p>
        <div class="passage-highlight-container">
    `;

    // Add each sentence as a separate line
    relevantSentences.forEach((sentence, index) => {
        resultsHTML += `<p class="highlighted-sentence">${sentence}</p>`;
        if (index < relevantSentences.length - 1) {
            resultsHTML += '<div class="sentence-divider"></div>';
        }
    });

    resultsHTML += `</div>`;
    searchResults.innerHTML = resultsHTML;

    // Add click handlers to highlighted words (only for non-extracted words)
    const highlightedWords = searchResults.querySelectorAll('.highlight-match:not(.already-extracted)');
    highlightedWords.forEach(element => {
        element.addEventListener('click', async () => {
            const word = element.getAttribute('data-word');
            await lookupWordFromSearch(word, passage);
        });
    });

    // Add click handlers for already extracted words (scroll to them)
    const extractedWords = searchResults.querySelectorAll('.highlight-match.already-extracted');
    extractedWords.forEach(element => {
        element.addEventListener('click', () => {
            const word = element.getAttribute('data-word');
            scrollToVocabWord(word);
        });
    });

    searchResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function scrollToVocabWord(word) {
    const existingWord = vocabularyData.find(v => 
        v.word.toLowerCase() === word.toLowerCase()
    );
    
    if (existingWord) {
        const cards = vocabularyList.querySelectorAll('.vocab-card');
        const index = vocabularyData.indexOf(existingWord);
        if (cards[index]) {
            cards[index].style.border = '3px solid #51CF66';
            cards[index].style.animation = 'highlight-pulse 1s ease-in-out';
            cards[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                cards[index].style.border = '';
                cards[index].style.animation = '';
            }, 2000);
        }
        showNotification(`ℹ️ Từ "${word}" đã có trong danh sách!`);
    }
}

async function lookupWordFromSearch(word, passage) {
    // Find context sentence
    const sentences = passage.split(/[.!?]+/);
    let contextSentence = '';
    
    for (let sentence of sentences) {
        if (sentence.toLowerCase().includes(word.toLowerCase())) {
            contextSentence = sentence.trim();
            break;
        }
    }

    // Check if word already exists
    const existingWord = vocabularyData.find(v => 
        v.word.toLowerCase() === word.toLowerCase()
    );

    if (existingWord) {
        showNotification(`ℹ️ Từ "${word}" đã có trong danh sách!`);
        // Scroll to the word in vocabulary list
        const cards = vocabularyList.querySelectorAll('.vocab-card');
        const index = vocabularyData.indexOf(existingWord);
        if (cards[index]) {
            cards[index].style.border = '3px solid #FFD93D';
            cards[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                cards[index].style.border = '';
            }, 3000);
        }
        return;
    }

    // Show loading
    showNotification('⏳ Đang tra cứu từ "' + word + '"...');

    try {
        const response = await fetch('/api/lookup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                word: word,
                context: contextSentence 
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Đã xảy ra lỗi khi tra cứu từ');
        }

        // Add to vocabulary list
        vocabularyData.push(data.vocabulary);
        displayVocabulary(vocabularyData);
        showNotification(`✅ Đã thêm "${data.vocabulary.word}" vào danh sách!`);

        // Scroll to new word
        setTimeout(() => {
            const cards = vocabularyList.querySelectorAll('.vocab-card');
            const lastCard = cards[cards.length - 1];
            if (lastCard) {
                lastCard.style.border = '3px solid #51CF66';
                lastCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    lastCard.style.border = '';
                }, 3000);
            }
        }, 100);

    } catch (error) {
        console.error('Error:', error);
        
        const errorMsg = error.message || 'Đã xảy ra lỗi khi tra cứu từ';
        if (errorMsg.includes('429') || errorMsg.includes('giới hạn')) {
            showRateLimitError();
        } else {
            alert(errorMsg);
        }
    }
}

// ===========================
// Text Selection Handler
// ===========================
function handleTextSelection() {
    const selectedText = window.getSelection().toString().trim();
    lookupBtn.disabled = !selectedText;
    if (selectedText) {
        lookupBtn.textContent = `📖 Tra cứu: "${selectedText.substring(0, 30)}${selectedText.length > 30 ? '...' : ''}"`;
    } else {
        lookupBtn.textContent = '📖 Tra cứu từ đã chọn';
    }
}

// ===========================
// Extract Vocabulary
// ===========================
async function handleExtract() {
    const passage = passageInput.value.trim();
    const wordCount = wordCountInput.value;

    if (!passage) {
        alert('Vui lòng nhập đoạn văn để trích xuất từ vựng!');
        return;
    }

    // Show loading, hide results
    extractBtn.disabled = true;
    loadingIndicator.style.display = 'block';
    resultsSection.style.display = 'none';
    vocabularyData = [];

    try {
        const response = await fetch('/api/extract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ passage, wordCount })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Đã xảy ra lỗi khi trích xuất từ vựng');
        }

        vocabularyData = data.vocabulary;

        // Show mock data warning if applicable
        if (data.isMockData) {
            mockDataWarning.style.display = 'block';
        } else {
            mockDataWarning.style.display = 'none';
        }

        // Display results
        displayVocabulary(vocabularyData);

        // Generate filename
        const timestamp = new Date().toISOString().split('T')[0];
        currentFileName = `ielts_vocab_${timestamp}.json`;

    } catch (error) {
        console.error('Error:', error);
        
        // Show user-friendly error message
        const errorMsg = error.message || 'Đã xảy ra lỗi. Vui lòng thử lại!';
        
        // Create a more visible error notification
        if (errorMsg.includes('429') || errorMsg.includes('giới hạn')) {
            showRateLimitError();
        } else {
            alert(errorMsg);
        }
    } finally {
        extractBtn.disabled = false;
        loadingIndicator.style.display = 'none';
    }
}

// Show notification message
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary-color);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        font-size: 0.95rem;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Show rate limit error with retry countdown
function showRateLimitError() {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 500px;
        text-align: center;
    `;
    
    errorDiv.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 15px;">⏳</div>
        <h3 style="color: #ff6b6b; margin-bottom: 15px;">Vượt quá giới hạn API</h3>
        <p style="margin-bottom: 20px; line-height: 1.6;">
            Gemini API miễn phí có giới hạn số lần gọi.<br>
            Vui lòng chờ <strong id="countdown">60</strong> giây.
        </p>
        <p style="margin-bottom: 20px; color: #666;">
            <strong>Gợi ý:</strong> Sử dụng tính năng "Tra cứu từ thủ công"<br>
            để thêm từng từ một thay vì trích xuất hàng loạt.
        </p>
        <button id="closeErrorBtn" style="
            padding: 10px 30px;
            background: #4A90E2;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 600;
        ">Đóng</button>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Countdown
    let seconds = 60;
    const countdownEl = document.getElementById('countdown');
    const interval = setInterval(() => {
        seconds--;
        if (countdownEl) countdownEl.textContent = seconds;
        if (seconds <= 0) clearInterval(interval);
    }, 1000);
    
    // Close button
    document.getElementById('closeErrorBtn').addEventListener('click', () => {
        clearInterval(interval);
        errorDiv.remove();
    });
}

// ===========================
// Display Vocabulary Cards
// ===========================
function displayVocabulary(vocabulary) {
    if (!vocabulary || vocabulary.length === 0) {
        vocabularyList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Không tìm thấy từ vựng nào.</p>';
        resultsSection.style.display = 'block';
        return;
    }

    vocabularyList.innerHTML = '';

    vocabulary.forEach((vocab, index) => {
        const card = createVocabCard(vocab, index + 1);
        vocabularyList.appendChild(card);
    });

    resultsSection.style.display = 'block';
}

// ===========================
// Create Vocabulary Card
// ===========================
function createVocabCard(vocab, number) {
    const card = document.createElement('div');
    card.className = 'vocab-card';
    
    // Get color class based on part of speech
    const posColor = getPosColorClass(vocab.partOfSpeech);

    card.innerHTML = `
        <div class="vocab-card-header">
            <div>
                <div class="vocab-word">${number}. ${vocab.word}</div>
                <div class="vocab-phonetic">${vocab.phonetic || ''}</div>
            </div>
            <div class="vocab-pos ${posColor}">${vocab.partOfSpeech || 'N/A'}</div>
        </div>
        
        <div class="vocab-meanings">
            <p><strong>English:</strong> ${vocab.meaning_en || 'N/A'}</p>
            <p><strong>Tiếng Việt:</strong> ${vocab.meaning_vi || 'N/A'}</p>
        </div>
        
        <div class="vocab-examples">
            <p><strong>Context:</strong></p>
            <p class="example-text">${vocab.context || 'N/A'}</p>
            
            <p style="margin-top: 15px;"><strong>Example:</strong></p>
            <p class="example-text">${vocab.example || 'N/A'}</p>
        </div>
    `;

    return card;
}

// ===========================
// Download JSON (Save to Server)
// ===========================
async function handleDownload() {
    if (!vocabularyData || vocabularyData.length === 0) {
        alert('Không có dữ liệu để lưu!');
        return;
    }

    // Ask user for filename
    const filename = prompt(
        `Nhập tên file (không cần .json):\n\nSố từ: ${vocabularyData.length}\nGợi ý: technology_vocab, environment_vocab, health_vocab`,
        currentFileName.replace('.json', '') || 'ielts_vocab_' + Date.now()
    );

    if (!filename || filename.trim() === '') {
        return; // User cancelled
    }

    try {
        downloadBtn.disabled = true;
        downloadBtn.textContent = '⏳ Đang lưu...';

        const response = await fetch('/api/save-vocabulary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: filename.trim(),
                vocabulary: vocabularyData
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Đã xảy ra lỗi khi lưu file');
        }

        showNotification(`✅ Đã lưu: ${data.filename} (${data.wordCount} từ)`);
        
        // Also offer browser download
        if (confirm('File đã được lưu trên server!\n\nBạn có muốn tải về máy không?')) {
            downloadToLocal();
        }

    } catch (error) {
        console.error('Save error:', error);
        alert(error.message || 'Đã xảy ra lỗi khi lưu file!');
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent = '💾 Tải xuống (.json)';
    }
}

// Helper function to download to local machine
function downloadToLocal() {
    const jsonString = JSON.stringify(vocabularyData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = currentFileName || 'ielts_vocab.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// ===========================
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
// Notification (Optional)
// ===========================
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
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===========================
// Lookup Single Word
// ===========================
async function handleLookup() {
    const selectedText = window.getSelection().toString().trim();
    
    if (!selectedText) {
        alert('Vui lòng bôi đen từ hoặc cụm từ cần tra cứu!');
        return;
    }

    // Get the context sentence
    const fullText = passageInput.value;
    const selectionStart = passageInput.selectionStart;
    const selectionEnd = passageInput.selectionEnd;
    
    // Find sentence containing the selected text
    let contextSentence = '';
    const sentences = fullText.split(/[.!?]+/);
    let charCount = 0;
    for (let sentence of sentences) {
        const sentenceEnd = charCount + sentence.length;
        if (selectionStart >= charCount && selectionStart <= sentenceEnd) {
            contextSentence = sentence.trim();
            break;
        }
        charCount = sentenceEnd + 1;
    }

    lookupBtn.disabled = true;
    const originalText = lookupBtn.textContent;
    lookupBtn.textContent = '⏳ Đang tra cứu...';

    try {
        const response = await fetch('/api/lookup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                word: selectedText,
                context: contextSentence 
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Đã xảy ra lỗi khi tra cứu từ');
        }

        // Show mock data warning if applicable
        if (data.isMockData) {
            mockDataWarning.style.display = 'block';
        }

        // Add to vocabulary list if not already there
        const existingWord = vocabularyData.find(v => 
            v.word.toLowerCase() === data.vocabulary.word.toLowerCase()
        );

        if (!existingWord) {
            vocabularyData.push(data.vocabulary);
            displayVocabulary(vocabularyData);
            showNotification(`✅ Đã thêm từ "${data.vocabulary.word}" vào danh sách!`);
        } else {
            showNotification(`ℹ️ Từ "${data.vocabulary.word}" đã có trong danh sách!`);
        }

        // Update filename if not set
        if (!currentFileName) {
            const timestamp = new Date().toISOString().split('T')[0];
            currentFileName = `ielts_vocab_${timestamp}.json`;
        }

    } catch (error) {
        console.error('Error:', error);
        
        const errorMsg = error.message || 'Đã xảy ra lỗi khi tra cứu từ. Vui lòng thử lại!';
        
        if (errorMsg.includes('429') || errorMsg.includes('giới hạn')) {
            showRateLimitError();
        } else {
            alert(errorMsg);
        }
    } finally {
        lookupBtn.disabled = false;
        lookupBtn.textContent = originalText;
    }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
