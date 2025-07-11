// Import db from firebase-config.js and necessary Firebase functions
import { db } from './firebase-config.js';
import { ref, set } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

/*
This script can be used to populate your Firebase Realtime Database with sample data.
You can run this in a browser console where your Firebase app is initialized.
Make sure firebase-config.js and app.js (which initializes Firebase through config) are loaded as modules.

Example usage in browser console after logging in to your app:
To make functions available globally for console access after module loading:
window.addSampleCourses = addSampleCourses;
window.addSampleAnnouncements = addSampleAnnouncements;

Then call:
addSampleCourses();
addSampleAnnouncements();
*/


async function addSampleCourses() {
    if (!db) {
        console.error("Firebase Realtime Database (db) is not available. Check firebase-config.js and ensure it's loaded.");
        alert("Firebase (db) is not initialized. Cannot add sample data.");
        return;
    }

    const coursesData = {
        "course101": {
            "title": "Introduction to Web Development",
            "description": "Learn the fundamentals of HTML, CSS, and JavaScript to build modern websites. This course covers everything from basic syntax to responsive design principles.",
            "modules": [
                { "moduleId": "m1", "title": "Module 1: HTML Basics", "content": "Understanding tags, elements, and page structure." },
                { "moduleId": "m2", "title": "Module 2: CSS Fundamentals", "content": "Styling web pages, selectors, and the box model." },
                { "moduleId": "m3", "title": "Module 3: JavaScript Essentials", "content": "Variables, functions, DOM manipulation, and events." },
                { "moduleId": "m4", "title": "Module 4: Responsive Design", "content": "Media queries and flexible layouts." }
            ]
        },
        "course202": {
            "title": "Advanced JavaScript",
            "description": "Dive deeper into JavaScript concepts like closures, promises, async/await, and modern ES6+ features. Explore functional programming and performance optimization.",
            "modules": [
                { "moduleId": "m1", "title": "Module 1: ES6+ Features", "content": "Arrow functions, destructuring, classes, modules." },
                { "moduleId": "m2", "title": "Module 2: Asynchronous JavaScript", "content": "Callbacks, Promises, async/await." },
                { "moduleId": "m3", "title": "Module 3: Functional Programming", "content": "Immutability, pure functions, higher-order functions." },
                { "moduleId": "m4", "title": "Module 4: JavaScript Tooling", "content": "Linters, bundlers, and debuggers." }
            ]
        },
        "course303": {
            "title": "Data Structures and Algorithms",
            "description": "Understand common data structures like arrays, linked lists, trees, and graphs. Learn algorithmic techniques for problem-solving.",
            "modules": [
                { "moduleId": "m1", "title": "Module 1: Introduction to Algorithms", "content": "Big O notation, time and space complexity." },
                { "moduleId": "m2", "title": "Module 2: Basic Data Structures", "content": "Arrays, Stacks, Queues, Linked Lists." },
                { "moduleId": "m3", "title": "Module 3: Trees and Graphs", "content": "Binary trees, heaps, graph traversal." },
                { "moduleId": "m4", "title": "Module 4: Sorting and Searching", "content": "Bubble sort, merge sort, binary search." }
            ]
        }
    };

    try {
        await set(ref(db, 'courses'), coursesData);
        console.log("Sample courses added successfully!");
        alert("Sample courses added to your Realtime Database!");
    } catch (error) {
        console.error("Error adding sample courses: ", error);
        alert("Error adding sample courses: " + error.message);
    }
}

async function addSampleAnnouncements() {
    if (!db) {
        console.error("Firebase Realtime Database (db) is not available. Check firebase-config.js and ensure it's loaded.");
        alert("Firebase (db) is not initialized. Cannot add sample data.");
        return;
    }

    const announcementsData = {
        "announcement1": {
            "courseId": "course101",
            "message": "Welcome to Introduction to Web Development! The first lecture will be on Monday at 10 AM.",
            "timestamp": Date.now() - (3 * 24 * 60 * 60 * 1000) // 3 days ago
        },
        "announcement2": {
            "courseId": "course202",
            "message": "Office hours for Advanced JavaScript will be held every Wednesday from 2 PM to 3 PM.",
            "timestamp": Date.now() - (2 * 24 * 60 * 60 * 1000) // 2 days ago
        },
        "announcement3": {
            "courseId": "course101",
            "message": "Module 1 (HTML Basics) assignments are due next Friday. Please submit via the portal.",
            "timestamp": Date.now() - (1 * 24 * 60 * 60 * 1000) // 1 day ago
        }
    };

    try {
        await set(ref(db, 'announcements'), announcementsData);
        console.log("Sample announcements added successfully!");
        alert("Sample announcements added to your Realtime Database!");
    } catch (error) {
        console.error("Error adding sample announcements: ", error);
        alert("Error adding sample announcements: " + error.message);
    }
}

// To make functions available globally for console access after module loading:
// Ensure this script is loaded as a module in your HTML: <script type="module" src="sample-data.js"></script>
// Then, in this script, you can expose them like this:
window.addSampleCourses = addSampleCourses;
window.addSampleAnnouncements = addSampleAnnouncements;

// Instructions for user:
// 1. Make sure Firebase is initialized (app.js should handle this via firebase-config.js).
// 2. Log in to your application.
// 3. Open browser developer console.
// 4. Type `addSampleCourses()` and press Enter.
// 5. Type `addSampleAnnouncements()` and press Enter.
// This file (`sample-data.js`) must be included as a module in one of the HTML pages
// temporarily, or you can copy-paste these functions into the console directly
// (after ensuring `firebase-config.js` has run and `db` is available).
// Example for temporary inclusion in index.html:
// <script type="module" src="firebase-config.js"></script>
// <script type="module" src="app.js"></script>
// <script type="module" src="sample-data.js"></script> <!-- Add this line temporarily -->
