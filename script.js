// ─── Firebase Configuration ───
const firebaseConfig = {
    apiKey: "AIzaSyCCG8klnUTW4XAAu2SF37HNjfQAmqkv4cM",
    authDomain: "enterthedaydecider.firebaseapp.com",
    projectId: "enterthedaydecider",
    storageBucket: "enterthedaydecider.firebasestorage.app",
    messagingSenderId: "350978080652",
    appId: "1:350978080652:web:048e86582eb2ea4c9920a9"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Keep user logged in across browser restarts
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// ─── Default Activities for New Accounts ───
const DEFAULT_ACTIVITIES = [
    "Read (30 minute min)",
    "Work on schedule (20 minute min)",
    "5x5 cleaning (15 minute min)",
    "Meditate (10 minute min)",
    "Peloton (10 minute min)",
    "Plan (10 minute min)",
    "Journal (no min)",
    "Eat 3 full sheet pan cakes (no min)",
    "Random chore from to-do list (no min)"
];

// ─── App State ───
let currentUser = null;
let userData = null;
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();

// ─── DOM Elements ───
const loadingScreen = document.getElementById('loading-screen');
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const authError = document.getElementById('auth-error');
const randomizeBtn = document.getElementById('randomize-btn');
const activityDisplay = document.getElementById('activity-display');
const activityText = document.getElementById('activity-text');
const daysCountEl = document.getElementById('days-count');
const daysGoalEl = document.getElementById('days-goal');
const goalPeriodLabel = document.getElementById('goal-period-label');
const progressFill = document.getElementById('progress-fill');
const calendarTitle = document.getElementById('calendar-title');
const calendarDays = document.getElementById('calendar-days');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const goalDaysInput = document.getElementById('goal-days-input');
const goalPeriodSelect = document.getElementById('goal-period-select');
const saveGoalBtn = document.getElementById('save-goal-btn');
const activityInput = document.getElementById('activity-input');
const addBtn = document.getElementById('add-btn');
const activitiesList = document.getElementById('activities-list');


// ═══════════════════════════════════════════
//  AUTHENTICATION
// ═══════════════════════════════════════════

auth.onAuthStateChanged(async (user) => {
    loadingScreen.style.display = 'none';

    if (user) {
        currentUser = user;
        authScreen.style.display = 'none';
        appScreen.style.display = 'block';
        await loadUserData();
        renderApp();
    } else {
        currentUser = null;
        userData = null;
        authScreen.style.display = 'block';
        appScreen.style.display = 'none';
    }
});

loginBtn.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    authError.textContent = '';

    if (!email || !password) {
        authError.textContent = 'Please enter both email and password.';
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (e) {
        authError.textContent = friendlyError(e.code);
    }
});

registerBtn.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    authError.textContent = '';

    if (!email || !password) {
        authError.textContent = 'Please enter both email and password.';
        return;
    }

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        // Create their Firestore document with default data
        await db.collection('users').doc(cred.user.uid).set({
            email: email,
            activities: DEFAULT_ACTIVITIES,
            goalDays: 5,
            goalPeriod: 'week',
            logDates: []
        });
    } catch (e) {
        authError.textContent = friendlyError(e.code);
    }
});

logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// Allow Enter key on password field to trigger login
authPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginBtn.click();
});

authEmail.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') authPassword.focus();
});

function friendlyError(code) {
    switch (code) {
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/invalid-credential':
            return 'Invalid email or password.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'Password must be at least 6 characters.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please wait a moment and try again.';
        default:
            return 'Something went wrong. Please try again.';
    }
}


// ═══════════════════════════════════════════
//  USER DATA (Firestore)
// ═══════════════════════════════════════════

async function loadUserData() {
    const docRef = db.collection('users').doc(currentUser.uid);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
        userData = docSnap.data();
    } else {
        // Safety net: create default doc if it doesn't exist
        userData = {
            email: currentUser.email,
            activities: DEFAULT_ACTIVITIES,
            goalDays: 5,
            goalPeriod: 'week',
            logDates: []
        };
        await docRef.set(userData);
    }
}

async function saveField(updates) {
    await db.collection('users').doc(currentUser.uid).update(updates);
    Object.assign(userData, updates);
}


// ═══════════════════════════════════════════
//  RENDER THE APP
// ═══════════════════════════════════════════

function renderApp() {
    // Set goal controls to current values
    goalDaysInput.value = userData.goalDays;
    goalPeriodSelect.value = userData.goalPeriod;

    renderAccountability();
    renderCalendar();
    renderActivitiesList();
}


// ═══════════════════════════════════════════
//  RANDOM ACTIVITY BUTTON
// ═══════════════════════════════════════════

randomizeBtn.addEventListener('click', async () => {
    if (!userData || userData.activities.length === 0) {
        activityText.textContent = 'No activities yet — add some below!';
        return;
    }

    // Pick a random activity
    const idx = Math.floor(Math.random() * userData.activities.length);
    const activity = userData.activities[idx];

    // Show it with animation
    activityText.textContent = activity;
    activityDisplay.classList.remove('fade-in');
    void activityDisplay.offsetWidth; // force reflow to restart animation
    activityDisplay.classList.add('fade-in');

    // Log today (only counts once per day thanks to arrayUnion)
    const today = todayString();
    if (!userData.logDates.includes(today)) {
        userData.logDates.push(today);
        await db.collection('users').doc(currentUser.uid).update({
            logDates: firebase.firestore.FieldValue.arrayUnion(today)
        });
    }

    renderAccountability();
    renderCalendar();
});


// ═══════════════════════════════════════════
//  ACCOUNTABILITY TRACKER
// ═══════════════════════════════════════════

function renderAccountability() {
    const period = userData.goalPeriod;
    const goal = userData.goalDays;
    const count = countDaysInPeriod(userData.logDates, period);

    daysCountEl.textContent = count;
    daysGoalEl.textContent = goal;
    goalPeriodLabel.textContent = period;

    const pct = goal > 0 ? Math.min((count / goal) * 100, 100) : 0;
    progressFill.style.width = pct + '%';

    if (count >= goal) {
        progressFill.classList.add('complete');
    } else {
        progressFill.classList.remove('complete');
    }
}

function countDaysInPeriod(dates, period) {
    const now = new Date();
    let startStr, endStr;

    if (period === 'week') {
        const dayOfWeek = now.getDay(); // 0 = Sunday
        const start = new Date(now);
        start.setDate(now.getDate() - dayOfWeek);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        startStr = formatDate(start);
        endStr = formatDate(end);
    } else if (period === 'month') {
        startStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        endStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(lastDay)}`;
    } else {
        // year
        startStr = `${now.getFullYear()}-01-01`;
        endStr = `${now.getFullYear()}-12-31`;
    }

    return dates.filter(d => d >= startStr && d <= endStr).length;
}


// ═══════════════════════════════════════════
//  MONTHLY CALENDAR
// ═══════════════════════════════════════════

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

function renderCalendar() {
    calendarTitle.textContent = `${MONTH_NAMES[calendarMonth]} ${calendarYear}`;

    const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const today = todayString();
    const logSet = new Set(userData.logDates || []);

    let html = '';

    // Empty cells before the 1st
    for (let i = 0; i < firstDayOfWeek; i++) {
        html += '<div class="calendar-cell empty"></div>';
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${calendarYear}-${pad(calendarMonth + 1)}-${pad(day)}`;
        const isActive = logSet.has(dateStr);
        const isToday = dateStr === today;

        let cls = 'calendar-cell';
        if (isActive) cls += ' active';
        if (isToday) cls += ' today';

        html += `<div class="${cls}">${day}</div>`;
    }

    calendarDays.innerHTML = html;
}

prevMonthBtn.addEventListener('click', () => {
    calendarMonth--;
    if (calendarMonth < 0) {
        calendarMonth = 11;
        calendarYear--;
    }
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    calendarMonth++;
    if (calendarMonth > 11) {
        calendarMonth = 0;
        calendarYear++;
    }
    renderCalendar();
});


// ═══════════════════════════════════════════
//  MANAGE ACTIVITIES
// ═══════════════════════════════════════════

function renderActivitiesList() {
    activitiesList.innerHTML = '';

    if (userData.activities.length === 0) {
        activitiesList.innerHTML = '<li class="empty-message">No activities yet. Add your first one!</li>';
        return;
    }

    userData.activities.forEach((activity, index) => {
        const li = document.createElement('li');
        li.className = 'list-item';

        const span = document.createElement('span');
        span.className = 'activity-name';
        span.textContent = activity;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteActivity(index));

        li.appendChild(span);
        li.appendChild(deleteBtn);
        activitiesList.appendChild(li);
    });
}

async function addActivity() {
    const value = activityInput.value.trim();
    if (!value) return;

    if (userData.activities.includes(value)) {
        alert('This activity already exists!');
        return;
    }

    userData.activities.push(value);
    await saveField({ activities: userData.activities });
    activityInput.value = '';
    renderActivitiesList();
}

async function deleteActivity(index) {
    const name = userData.activities[index];
    if (!confirm(`Delete "${name}"?`)) return;

    userData.activities.splice(index, 1);
    await saveField({ activities: userData.activities });
    renderActivitiesList();
}

addBtn.addEventListener('click', addActivity);
activityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addActivity();
});

// ─── Goal Setting ───

saveGoalBtn.addEventListener('click', async () => {
    const days = parseInt(goalDaysInput.value, 10);
    const period = goalPeriodSelect.value;

    if (!days || days < 1) {
        alert('Goal must be at least 1 day.');
        return;
    }

    await saveField({ goalDays: days, goalPeriod: period });
    renderAccountability();
});


// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════

function todayString() {
    return formatDate(new Date());
}

function formatDate(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function pad(n) {
    return String(n).padStart(2, '0');
}
