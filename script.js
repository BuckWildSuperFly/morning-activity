// Default list of morning activities
const defaultActivities = [
    "Meditate (10 minute min)",
    "10-minute meditation",
    "5x5 cleaning (15 minute min)",
    "Work on schedule (30 minute min)",
    "Peloton (10 minute min)",
    "Journal (no min)",
    "Plan (10 minute min)",
    "Learn (30 minute min)",
    "Read (45 minute min)",
    "Random chore"
];

// LocalStorage key
const STORAGE_KEY = 'morningActivities';

// Get activities from localStorage or use defaults
let activities = loadActivities();

// Get DOM elements
const randomizeBtn = document.getElementById('randomizeBtn');
const activityText = document.querySelector('.activity-text');
const newActivityInput = document.getElementById('newActivityInput');
const addActivityBtn = document.getElementById('addActivityBtn');
const activitiesList = document.getElementById('activitiesList');

// Load activities from localStorage
function loadActivities() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    }
    // First visit - use default activities
    return [...defaultActivities];
}

// Save activities to localStorage
function saveActivities() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
}

// Function to get a random activity
function getRandomActivity() {
    if (activities.length === 0) {
        return "No activities available. Add some activities first!";
    }
    const randomIndex = Math.floor(Math.random() * activities.length);
    return activities[randomIndex];
}

// Function to display the activity with animation
function displayActivity() {
    const activity = getRandomActivity();

    // Remove animation class to reset it
    activityText.style.animation = 'none';

    // Trigger reflow to restart animation
    setTimeout(() => {
        activityText.textContent = activity;
        activityText.style.animation = 'fadeIn 0.5s ease-in';
    }, 10);
}

// Render the activities list
function renderActivitiesList() {
    activitiesList.innerHTML = '';

    if (activities.length === 0) {
        activitiesList.innerHTML = '<li class="empty-message">No activities yet. Add your first activity!</li>';
        return;
    }

    activities.forEach((activity, index) => {
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

// Add new activity
function addActivity() {
    const newActivity = newActivityInput.value.trim();

    if (newActivity === '') {
        alert('Please enter an activity name.');
        return;
    }

    if (activities.includes(newActivity)) {
        alert('This activity already exists.');
        return;
    }

    activities.push(newActivity);
    saveActivities();
    renderActivitiesList();
    newActivityInput.value = '';
    newActivityInput.focus();
}

// Delete activity
function deleteActivity(index) {
    if (confirm(`Are you sure you want to delete "${activities[index]}"?`)) {
        activities.splice(index, 1);
        saveActivities();
        renderActivitiesList();
    }
}

// Event listeners
randomizeBtn.addEventListener('click', displayActivity);
addActivityBtn.addEventListener('click', addActivity);

// Allow Enter key to add activity
newActivityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addActivity();
    }
});

// Initial render
renderActivitiesList();
