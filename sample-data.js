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
            "title": "Introduction to Computer Science and Programming",
            "description": "This course is designed to introduce students to the fundamentals of computer science and programming. It covers basic concepts like variables, control structures, data structures, and algorithms, using Python as the primary language.",
            "instructor": "Prof. John Guttag",
            "department": "Electrical Engineering and Computer Science",
            "level": "Undergraduate",
            "term": "Fall 2023",
            "credits": 12, // Assuming this is the same as creditHours for now
            "code": "CS101", // Added field
            "creditHours": 12, // Added field
            "modules": [
                { "moduleId": "module-0", "title": "Introduction and Python Basics", "content": "Overview of computation, Python programs, variables, expressions, and statements." },
                { "moduleId": "module-1", "title": "Branching and Iteration", "content": "Conditionals, loops, and iteration in Python." },
                { "moduleId": "module-2", "title": "Data Structures", "content": "Strings, lists, tuples, and dictionaries in Python." },
                { "moduleId": "module-3", "title": "Functions and Recursion", "content": "Defining and using functions, recursion, and scope." }
            ],
            "exams": {
                "exam1": {
                    "title": "Midterm Exam",
                    "date": Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
                    "duration": 90,
                    "weight": 30,
                    "topics": "Modules 1-3"
                },
                "exam2": {
                    "title": "Final Exam",
                    "date": Date.now() + (90 * 24 * 60 * 60 * 1000), // 90 days from now
                    "duration": 180,
                    "weight": 40,
                    "topics": "All modules"
                }
            },
            "assignments": {
                "assign1": {
                    "title": "Problem Set 1",
                    "dueDate": Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days from now
                    "weight": 10,
                    "description": "Basic Python programming exercises"
                },
                "assign2": {
                    "title": "Problem Set 2",
                    "dueDate": Date.now() + (14 * 24 * 60 * 60 * 1000), // 14 days from now
                    "weight": 10,
                    "description": "Data structures and algorithms"
                }
            }
        },
        "course202": {
            "title": "Algorithms and Data Structures",
            "description": "A comprehensive study of algorithms and data structures, focusing on efficiency and practical applications. Topics include sorting, searching, graph algorithms, and dynamic programming.",
            "instructor": "Prof. Erik Demaine",
            "department": "Electrical Engineering and Computer Science",
            "level": "Undergraduate",
            "term": "Spring 2024",
            "credits": 12, // Assuming this is the same as creditHours for now
            "code": "CS202", // Added field
            "creditHours": 12, // Added field
            "modules": [
                { "moduleId": "module-0", "title": "Analysis of Algorithms", "content": "Asymptotic notation, recurrences, and master theorem." },
                { "moduleId": "module-1", "title": "Sorting and Searching", "content": "Merge sort, quicksort, heapsort, binary search trees." },
                { "moduleId": "module-2", "title": "Graph Algorithms", "content": "BFS, DFS, shortest paths, minimum spanning trees." },
                { "moduleId": "module-3", "title": "Dynamic Programming", "content": "Principles of dynamic programming, common problems." }
            ],
            "exams": {
                "exam1": {
                    "title": "Quiz 1",
                    "date": Date.now() + (25 * 24 * 60 * 60 * 1000),
                    "duration": 60,
                    "weight": 25,
                    "topics": "Modules 1-2"
                },
                "exam2": {
                    "title": "Quiz 2",
                    "date": Date.now() + (70 * 24 * 60 * 60 * 1000),
                    "duration": 60,
                    "weight": 25,
                    "topics": "Modules 3-4"
                }
            },
            "assignments": {
                "assign1": {
                    "title": "Implementation Assignment 1",
                    "dueDate": Date.now() + (20 * 24 * 60 * 60 * 1000),
                    "weight": 25,
                    "description": "Implement sorting algorithms."
                },
                 "assign2": {
                    "title": "Graph Problems",
                    "dueDate": Date.now() + (50 * 24 * 60 * 60 * 1000),
                    "weight": 25,
                    "description": "Solve graph theory problems."
                }
            }
        }
        // Add more MIT-like courses...
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
