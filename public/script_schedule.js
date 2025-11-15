// Elements
const todayDateEl = document.getElementById('todayDate');
const loadingState = document.getElementById('loadingState');
const summaryCards = document.getElementById('summaryCards');
const reviewSection = document.getElementById('reviewSection');
const newSection = document.getElementById('newSection');
const completedSection = document.getElementById('completedSection');
const reviewList = document.getElementById('reviewList');
const newList = document.getElementById('newList');
const completedList = document.getElementById('completedList');

// Initialize
async function init() {
    displayTodayDate();
    await loadTodaySchedule();
}

// Display today's date
function displayTodayDate() {
    const today = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    todayDateEl.textContent = today.toLocaleDateString('vi-VN', options);
}

// Load today's study schedule
async function loadTodaySchedule() {
    try {
        loadingState.style.display = 'block';
        
        const response = await fetch('/api/study/today');
        const data = await response.json();
        
        loadingState.style.display = 'none';
        
        // Display summary
        displaySummary(data.summary);
        
        // Display review files
        if (data.reviewFiles.length > 0) {
            displayReviewFiles(data.reviewFiles);
        }
        
        // Display new files
        if (data.newFiles.length > 0) {
            displayNewFiles(data.newFiles);
        }
        
        // Display upcoming files
        if (data.upcomingFiles && data.upcomingFiles.length > 0) {
            displayUpcomingFiles(data.upcomingFiles);
        }
        
        // Display completed files
        if (data.completed.length > 0) {
            displayCompletedFiles(data.completed);
        }
        
        // Show empty state if no tasks
        if (data.reviewFiles.length === 0 && data.newFiles.length === 0) {
            showEmptyState();
        }
        
    } catch (error) {
        console.error('Error loading schedule:', error);
        loadingState.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Lỗi khi tải lịch học</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Display summary cards
function displaySummary(summary) {
    summaryCards.style.display = 'grid';
    summaryCards.innerHTML = `
        <div class="summary-card">
            <div class="icon">📚</div>
            <div class="count">${summary.total}</div>
            <div class="label">Tổng file</div>
        </div>
        <div class="summary-card">
            <div class="icon">🔥</div>
            <div class="count">${summary.review}</div>
            <div class="label">Cần ôn tập</div>
        </div>
        <div class="summary-card">
            <div class="icon">✨</div>
            <div class="count">${summary.new}</div>
            <div class="label">Chưa học</div>
        </div>
        <div class="summary-card">
            <div class="icon">✅</div>
            <div class="count">${summary.completed}</div>
            <div class="label">Đã hoàn thành</div>
        </div>
    `;
}

// Display review files
function displayReviewFiles(files) {
    reviewSection.style.display = 'block';
    reviewList.innerHTML = '';
    
    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item review';
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-name">${file.filename.replace('.json', '')}</div>
                <div class="file-meta">
                    <span class="meta-item">📝 ${file.wordCount} từ</span>
                    <span class="meta-item">📅 Học lần đầu: ${formatDate(file.firstStudyDate)}</span>
                    <span class="meta-item">🔄 Đã ôn: ${file.completedCount} lần</span>
                </div>
                <div class="review-badge">🔥 ${file.reviewType}</div>
            </div>
            <div class="file-actions">
                <button class="btn-study" onclick="studyFile('${file.filename}', false)">
                    🎯 Ôn tập ngay
                </button>
                <button class="btn-complete" onclick="markAsStudied('${file.filename}', false)">
                    ✓ Đã xong
                </button>
            </div>
        `;
        reviewList.appendChild(fileItem);
    });
}

// Display new files
function displayNewFiles(files) {
    newSection.style.display = 'block';
    newList.innerHTML = '';
    
    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item new';
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-name">${file.filename.replace('.json', '')}</div>
                <div class="file-meta">
                    <span class="meta-item">📝 ${file.wordCount} từ</span>
                    <span class="meta-item">📅 Tạo ngày: ${formatDate(file.createdDate)}</span>
                </div>
            </div>
            <div class="file-actions">
                <button class="btn-study" onclick="studyFile('${file.filename}', true)">
                    ✨ Học ngay
                </button>
                <button class="btn-complete" onclick="markAsStudied('${file.filename}', true)">
                    ✓ Đã học
                </button>
            </div>
        `;
        newList.appendChild(fileItem);
    });
}

// Display completed files
function displayCompletedFiles(files) {
    completedSection.style.display = 'block';
    completedList.innerHTML = '';
    
    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item completed';
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-name">${file.filename.replace('.json', '')}</div>
                <div class="file-meta">
                    <span class="meta-item">📝 ${file.wordCount} từ</span>
                    <span class="meta-item">📅 Học lần đầu: ${formatDate(file.firstStudyDate)}</span>
                    <span class="meta-item">✅ Hoàn thành ${file.completedCount} lần ôn tập</span>
                </div>
            </div>
            <div class="file-actions">
                <button class="btn-study" onclick="studyFile('${file.filename}', false)">
                    📖 Xem lại
                </button>
            </div>
        `;
        completedList.appendChild(fileItem);
    });
}

// Show empty state
function showEmptyState() {
    if (reviewList.children.length === 0 && newList.children.length === 0) {
        summaryCards.insertAdjacentHTML('afterend', `
            <div class="empty-state">
                <div class="icon">🎉</div>
                <h3>Tuyệt vời! Không có gì cần học hôm nay</h3>
                <p>Bạn đã hoàn thành tất cả các bài ôn tập. Quay lại vào ngày ôn tập tiếp theo!</p>
            </div>
        `);
    }
}

// Study file (redirect to flashcard page)
function studyFile(filename, isFirstTime) {
    // Store study info in sessionStorage
    sessionStorage.setItem('studyFilename', filename);
    sessionStorage.setItem('isFirstTime', isFirstTime);
    
    // Redirect to flashcard page with filename
    window.location.href = `/hoc-flashcard?file=${encodeURIComponent(filename)}&autoload=true`;
}

// Mark file as studied
async function markAsStudied(filename, isFirstTime) {
    try {
        const response = await fetch('/api/study/mark-studied', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename, isFirstTime })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Show success message
            showNotification(`✅ Đã đánh dấu hoàn thành: ${filename.replace('.json', '')}`);
            
            // Show next review dates
            if (data.schedule && data.schedule.reviewDates) {
                const nextReview = data.schedule.reviewDates[0];
                if (nextReview) {
                    showNotification(`📅 Lần ôn tập tiếp theo: ${formatDate(nextReview)}`);
                }
            }
            
            // Reload schedule after 1.5s
            setTimeout(() => {
                loadTodaySchedule();
            }, 1500);
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        console.error('Error marking as studied:', error);
        alert('Đã xảy ra lỗi khi đánh dấu hoàn thành');
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return date.toLocaleDateString('vi-VN', options);
}

// Show notification
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

// Initialize on page load
init();
