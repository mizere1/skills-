/*
This script can be used to populate your Firebase Realtime Database with sample data.
You can run this in a browser console where your Firebase app is initialized,
or adapt it to run with Node.js using the Firebase Admin SDK.

Make sure your Firebase app is initialized and `db` (firebase.database()) is available
before running these functions.

Example usage in browser console after logging in to your app:
addSampleCourses();
addSampleAnnouncements();
*/

// Ensure Firebase is initialized and db is available
// const db = firebase.database(); // This should already be defined if running in your app's context

function addSampleCourses() {
    if (typeof firebase === 'undefined' || !firebase.database) {
        console.error("Firebase Realtime Database is not initialized. Make sure firebase-config.js is correct and Firebase is loaded.");
        alert("Firebase is not initialized. Cannot add sample data.");
        return;
    }
    const db = firebase.database();

    const courses = {
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

    db.ref('courses').set(courses)
        .then(() => {
            console.log("Sample courses added successfully!");
            alert("Sample courses added to your Realtime Database!");
        })
        .catch((error) => {
            console.error("Error adding sample courses: ", error);
            alert("Error adding sample courses: " + error.message);
        });
}

function addSampleAnnouncements() {
     if (typeof firebase === 'undefined' || !firebase.database) {
        console.error("Firebase Realtime Database is not initialized. Make sure firebase-config.js is correct and Firebase is loaded.");
        alert("Firebase is not initialized. Cannot add sample data.");
        return;
    }
    const db = firebase.database();

    const announcements = {
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

    db.ref('announcements').set(announcements)
        .then(() => {
            console.log("Sample announcements added successfully!");
            alert("Sample announcements added to your Realtime Database!");
        })
        .catch((error) => {
            console.error("Error adding sample announcements: ", error);
            alert("Error adding sample announcements: " + error.message);
        });
}

// To use this, you might open your website in the browser,
// open the developer console, and type:
// addSampleCourses();
// addSampleAnnouncements();
// Make sure you are logged in or Firebase is configured to allow writes.
// Alternatively, include this file in your HTML and call these functions based on a button click, for example.
// e.g., in one of your HTML files, temporarily add:
// <script src="sample-data.js"></script>
// <button onclick="addSampleCourses()">Add Sample Courses</button>
// <button onclick="addSampleAnnouncements()">Add Sample Announcements</button>
// Remember to remove these temporary buttons after populating data.
