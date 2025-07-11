// Import Firebase services from firebase-config.js
import { auth, db } from './firebase-config.js';

// Import Firebase functions
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
    ref,
    set,
    get,
    child,
    onValue,
    update,
    push, // Though not used in current enroll, good to have if we change to push keys
    orderByChild, // For querying announcements
    query // For querying announcements
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";


// Wait for the DOM to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', () => {
    if (!auth || !db) {
        console.error("Firebase auth or db service not available. Check firebase-config.js.");
        // Display a message to the user on the page if Firebase is not configured.
        const mainContent = document.querySelector('main');
        if (mainContent) {
            const errorDiv = document.createElement('div');
            errorDiv.textContent = 'Error: Firebase services are not configured correctly. Please check firebase-config.js.';
            errorDiv.style.color = 'red';
            errorDiv.style.textAlign = 'center';
            errorDiv.style.padding = '20px';
            mainContent.prepend(errorDiv);
        }
        // Disable forms or buttons that rely on Firebase
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const buttons = form.querySelectorAll('button');
            buttons.forEach(button => button.disabled = true);
        });
        return; // Stop script execution if Firebase is not ready
    }

    // DOM Elements
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const logoutButton = document.getElementById('logout-button'); // On profile page
    const loginLogoutNav = document.getElementById('login-logout'); // In navbar
    const authSection = document.getElementById('auth-section');
    const authError = document.getElementById('auth-error');
    const welcomeMessage = document.getElementById('welcome-message');
    const mainContentPages = {
        home: document.getElementById('home-page'),
        dashboard: document.getElementById('dashboard-page'),
        courseDetail: document.getElementById('course-detail-page'),
        profile: document.getElementById('profile-page')
    };

    // --- AUTHENTICATION ---

    // Signup
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;

            createUserWithEmailAndPassword(auth, email, password)
                .then(userCredential => {
                    const user = userCredential.user;
                    // Store additional user info in Realtime Database
                    const userRef = ref(db, 'users/' + user.uid);
                    set(userRef, {
                        displayName: name,
                        email: email,
                        role: 'student',
                        enrolledCourses: [], // Initialize as empty array or null for Firebase
                        progress: {} // Initialize as empty object or null
                    }).then(() => {
                        console.log('User signed up and data stored:', user.uid);
                        signupForm.reset();
                        if(authError) authError.textContent = '';
                        // User will be managed by onAuthStateChanged
                    }).catch(dbError => {
                        console.error('Error storing user data:', dbError);
                         if(authError) authError.textContent = `Error storing user data: ${dbError.message}`;
                    });
                })
                .catch(authErrorFull => {
                    console.error('Signup error:', authErrorFull);
                    if(authError) authError.textContent = `Signup Error: ${authErrorFull.message}`;
                });
        });
    }

    // Login
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            signInWithEmailAndPassword(auth, email, password)
                .then(userCredential => {
                    console.log('User logged in:', userCredential.user.uid);
                    loginForm.reset();
                    if(authError) authError.textContent = '';
                    // User will be managed by onAuthStateChanged
                })
                .catch(error => {
                    console.error('Login error:', error);
                    if(authError) authError.textContent = `Login Error: ${error.message}`;
                });
        });
    }

    // Logout
    function handleLogout() {
        signOut(auth).then(() => {
            console.log('User logged out');
            // onAuthStateChanged will handle UI updates and redirection
            window.location.href = 'index.html';
        }).catch(error => {
            console.error('Logout error:', error);
        });
    }

    if (logoutButton) { // For profile page logout button
        logoutButton.addEventListener('click', handleLogout);
    }

    // Auth state listener
    onAuthStateChanged(auth, user => {
        if (user) {
            // User is signed in.
            console.log('User is signed in:', user.uid);
            updateUIForLoggedInUser(user);
            loadUserData(user); // Load user-specific data
        } else {
            // User is signed out.
            console.log('User is signed out.');
            updateUIForLoggedOutUser();
        }
    });

    function updateUIForLoggedInUser(user) {
        if (loginLogoutNav) {
            loginLogoutNav.textContent = 'Logout';
            loginLogoutNav.removeEventListener('click', showAuthSection); // Remove old listener if any
            loginLogoutNav.addEventListener('click', (e) => {
                e.preventDefault();
                handleLogout();
            });
        }
        if (authSection) authSection.classList.add('hidden');

        // Show relevant page content, hide others (basic routing idea)
        const currentPage = window.location.pathname.split("/").pop();
        if (currentPage === 'index.html' || currentPage === '') {
            if(mainContentPages.home) mainContentPages.home.classList.remove('hidden');
            if(welcomeMessage) welcomeMessage.classList.remove('hidden');
            loadAllCourses(user.uid); // Load courses for home page
        } else if (currentPage === 'dashboard.html') {
            if(mainContentPages.dashboard) mainContentPages.dashboard.classList.remove('hidden');
        } else if (currentPage === 'profile.html') {
             if(mainContentPages.profile) mainContentPages.profile.classList.remove('hidden');
        } else if (currentPage === 'course.html') {
            if(mainContentPages.courseDetail) mainContentPages.courseDetail.classList.remove('hidden');
            // Course detail loading will be handled by URL params or specific function
        }
    }

    function showAuthSection(e){
        e.preventDefault();
        if (authSection) authSection.classList.remove('hidden');
        if (welcomeMessage) welcomeMessage.classList.add('hidden'); // Hide welcome message if showing auth
        if (mainContentPages.home && (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/'))) {
             // If on home page, hide course list when auth is shown
            const coursesContainer = document.getElementById('courses-container');
            if (coursesContainer) coursesContainer.innerHTML = ''; // Clear courses
        }
    }

    function updateUIForLoggedOutUser() {
        if (loginLogoutNav) {
            loginLogoutNav.textContent = 'Login';
            loginLogoutNav.removeEventListener('click', handleLogout); // Remove logout listener
            loginLogoutNav.addEventListener('click', showAuthSection);
        }

        const currentPage = window.location.pathname.split("/").pop();
        if (currentPage === 'dashboard.html' || currentPage === 'profile.html' || currentPage === 'course.html') {
            // If on a page that requires login, redirect to home and show auth
            window.location.href = 'index.html';
            // The onAuthStateChanged on index.html will handle showing auth section
        } else if (currentPage === 'index.html' || currentPage === '') {
            // On home page, show auth section by default if not logged in
            if (authSection) authSection.classList.remove('hidden');
            if (welcomeMessage) welcomeMessage.classList.add('hidden');
            const coursesContainer = document.getElementById('courses-container');
            if (coursesContainer) coursesContainer.innerHTML = '<p>Please log in or sign up to see courses.</p>';
        }

        // Clear user-specific data from UI elements
        if (document.getElementById('user-name')) document.getElementById('user-name').textContent = '';
        if (document.getElementById('user-email')) document.getElementById('user-email').textContent = '';
        if (document.getElementById('user-role')) document.getElementById('user-role').textContent = '';
        if (document.getElementById('enrolled-courses-list')) document.getElementById('enrolled-courses-list').innerHTML = '';
        if (document.getElementById('announcements-list')) document.getElementById('announcements-list').innerHTML = '<li>No new announcements.</li>';

    }

    // --- USER DATA HANDLING ---
    function loadUserData(user) {
        const userDbRef = ref(db, 'users/' + user.uid);
        onValue(userDbRef, (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                // Populate profile page
                if (document.getElementById('user-name')) document.getElementById('user-name').textContent = userData.displayName;
                if (document.getElementById('user-email')) document.getElementById('user-email').textContent = userData.email;
                if (document.getElementById('user-role')) document.getElementById('user-role').textContent = userData.role;

                // If on dashboard, load enrolled courses
                if (window.location.pathname.endsWith('dashboard.html')) {
                    loadEnrolledCourses(user.uid, userData.enrolledCourses || [], userData.progress || {});
                    loadAnnouncements(userData.enrolledCourses || []);
                }
            }
        }, (error) => {
            console.error("Error loading user data:", error);
        });

        // If on course detail page, load its details
        if (window.location.pathname.endsWith('course.html')) {
            const urlParams = new URLSearchParams(window.location.search);
            const courseId = urlParams.get('id');
            if (courseId) {
                loadCourseDetails(courseId, user.uid);
            } else {
                 if(mainContentPages.courseDetail) mainContentPages.courseDetail.innerHTML = '<p>Course ID not found.</p>';
            }
        }
    }

    // --- COURSE & PORTAL FUNCTIONALITY ---

    // Load all available courses on the Home Page
    async function loadAllCourses(currentUserId) {
        const coursesDbRef = ref(db, 'courses');
        const coursesContainer = document.getElementById('courses-container');
        if (!coursesContainer) return;

        try {
            const coursesSnapshot = await get(coursesDbRef);
            coursesContainer.innerHTML = ''; // Clear existing courses
            const courses = coursesSnapshot.val();

            if (courses) {
                const userEnrolledCoursesRef = ref(db, 'users/' + currentUserId + '/enrolledCourses');
                const enrolledSnapshot = await get(userEnrolledCoursesRef);
                const enrolledCourseIds = enrolledSnapshot.val() || [];

                for (const courseId in courses) {
                    const course = courses[courseId];
                    const courseCard = document.createElement('div');
                    courseCard.classList.add('course-card');
                    courseCard.innerHTML = `
                        <h3>${course.title}</h3>
                        <p>${course.description}</p>
                        <button class="btn enroll-btn" data-course-id="${courseId}" ${enrolledCourseIds.includes(courseId) ? 'disabled' : ''}>
                            ${enrolledCourseIds.includes(courseId) ? 'Enrolled' : 'Enroll'}
                        </button>
                    `;
                    coursesContainer.appendChild(courseCard);
                }
                // Add event listeners to new enroll buttons
                document.querySelectorAll('.enroll-btn').forEach(button => {
                    button.addEventListener('click', () => enrollInCourse(currentUserId, button.dataset.courseId, button));
                });
            } else {
                coursesContainer.innerHTML = '<p>No courses available at the moment.</p>';
            }
        } catch (error) {
            console.error("Error loading courses:", error);
            coursesContainer.innerHTML = '<p>Error loading courses. Please try again later.</p>';
        }
    }

    // Enroll user in a course
    async function enrollInCourse(userId, courseId, button) {
        const userCoursesDbRef = ref(db, 'users/' + userId + '/enrolledCourses');
        try {
            const snapshot = await get(userCoursesDbRef);
            let enrolledCourses = snapshot.val() || [];
            if (!Array.isArray(enrolledCourses)) enrolledCourses = []; // Ensure it's an array

            if (!enrolledCourses.includes(courseId)) {
                enrolledCourses.push(courseId);
                await set(userCoursesDbRef, enrolledCourses);

                console.log(`User ${userId} enrolled in course ${courseId}`);
                alert(`Successfully enrolled in course!`);
                if (button) {
                    button.textContent = 'Enrolled';
                    button.disabled = true;
                }
                // Initialize progress for this course
                const userProgressDbRef = ref(db, `users/${userId}/progress/${courseId}`);
                await set(userProgressDbRef, { completedModules: [] }); // Store completed modules as an array
            } else {
                alert('You are already enrolled in this course.');
                if (button) {
                    button.textContent = 'Enrolled';
                    button.disabled = true;
                }
            }
        } catch (error) {
            console.error("Error enrolling in course:", error);
            alert(`Error enrolling: ${error.message}`);
        }
    }

    // Load enrolled courses on the Dashboard
    async function loadEnrolledCourses(userId, enrolledCourseIds, userProgress) {
        const enrolledCoursesList = document.getElementById('enrolled-courses-list');
        if (!enrolledCoursesList) return;
        enrolledCoursesList.innerHTML = ''; // Clear previous list

        if (!enrolledCourseIds || enrolledCourseIds.length === 0) {
            enrolledCoursesList.innerHTML = '<p>You are not enrolled in any courses yet. <a href="index.html">Browse courses</a>.</p>';
            return;
        }

        for (const courseId of enrolledCourseIds) {
            try {
                const courseSnapshot = await get(ref(db, 'courses/' + courseId));
                const course = courseSnapshot.val();
                if (course) {
                    const courseProg = userProgress[courseId] || { completedModules: [] };
                    const completedModulesCount = Array.isArray(courseProg.completedModules) ? courseProg.completedModules.length : 0;
                    const totalModules = course.modules ? course.modules.length : 0;
                    const progressPercent = totalModules > 0 ? (completedModulesCount / totalModules) * 100 : 0;

                    const courseCard = document.createElement('div');
                    courseCard.classList.add('course-card');
                    courseCard.innerHTML = `
                        <h3>${course.title}</h3>
                        <p>${course.description.substring(0,100)}...</p>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${progressPercent.toFixed(0)}%;">${progressPercent.toFixed(0)}%</div>
                        </div>
                        <p>Modules: ${completedModulesCount} / ${totalModules} completed</p>
                        <a href="course.html?id=${courseId}" class="btn">View Course</a>
                    `;
                    enrolledCoursesList.appendChild(courseCard);
                }
            } catch (error) {
                console.error(`Error loading details for enrolled course ${courseId}:`, error);
            }
        }
    }

    // Load announcements for enrolled courses on Dashboard
    function loadAnnouncements(enrolledCourseIds) {
        const announcementsList = document.getElementById('announcements-list');
        if (!announcementsList) return;
        announcementsList.innerHTML = ''; // Clear old announcements

        if (!enrolledCourseIds || enrolledCourseIds.length === 0) {
            announcementsList.innerHTML = '<li>No announcements for your courses.</li>';
            return;
        }

        const announcementsDbRef = query(ref(db, 'announcements'), orderByChild('timestamp'));
        onValue(announcementsDbRef, (snapshot) => {
            const allAnnouncements = snapshot.val();
            let userAnnouncementsFound = false;
            announcementsList.innerHTML = ''; // Clear before re-populating
            if (allAnnouncements) {
                const announcementKeys = Object.keys(allAnnouncements).sort((a,b) => allAnnouncements[b].timestamp - allAnnouncements[a].timestamp); // Sort newest first

                announcementKeys.forEach(key => {
                    const announcement = allAnnouncements[key];
                    if (enrolledCourseIds.includes(announcement.courseId)) {
                        const listItem = document.createElement('li');
                        listItem.innerHTML = `
                            <strong>${new Date(announcement.timestamp).toLocaleDateString()} - Course ID: ${announcement.courseId}</strong>:
                            ${announcement.message}
                        `;
                        announcementsList.appendChild(listItem);
                        userAnnouncementsFound = true;
                    }
                });
            }
            if (!userAnnouncementsFound) {
                announcementsList.innerHTML = '<li>No new announcements for your courses.</li>';
            }
        }, (error) => {
            console.error("Error loading announcements:", error);
            announcementsList.innerHTML = '<li>Error loading announcements.</li>';
        });
    }


    // Load Course Details page
    async function loadCourseDetails(courseId, userId) {
        const courseTitleEl = document.getElementById('course-title');
        const courseSyllabusEl = document.getElementById('course-syllabus');
        const modulesListEl = document.getElementById('modules-list');
        const mainContent = mainContentPages.courseDetail;

        if (!courseTitleEl || !courseSyllabusEl || !modulesListEl || !mainContent) return;

        try {
            const courseSnapshot = await get(ref(db, 'courses/' + courseId));
            const course = courseSnapshot.val();
            if (!course) {
                mainContent.innerHTML = '<p>Course not found.</p>';
                return;
            }

            courseTitleEl.textContent = course.title;
            courseSyllabusEl.textContent = course.description; // Using description as syllabus for simplicity
            modulesListEl.innerHTML = ''; // Clear previous modules

            const progressSnapshot = await get(ref(db, `users/${userId}/progress/${courseId}`));
            const courseProgress = progressSnapshot.val() || { completedModules: [] };
            const completedModules = Array.isArray(courseProgress.completedModules) ? courseProgress.completedModules : [];

            if (course.modules && course.modules.length > 0) {
                course.modules.forEach((module, index) => {
                    const moduleId = module.moduleId || `module-${index}`; // Ensure moduleId exists
                    const isCompleted = completedModules.includes(moduleId);

                    const moduleItem = document.createElement('div');
                    moduleItem.classList.add('module-item');
                    moduleItem.innerHTML = `
                        <div>
                            <h4>${module.title}</h4>
                            <p>${module.content || 'No content preview.'}</p>
                        </div>
                        <div>
                            <span class="module-status">${isCompleted ? 'Completed' : 'Incomplete'}</span>
                            <button class="btn btn-secondary mark-complete-btn"
                                    data-course-id="${courseId}"
                                    data-module-id="${moduleId}"
                                    ${isCompleted ? 'disabled' : ''}>
                                ${isCompleted ? 'Completed' : 'Mark as Complete'}
                            </button>
                        </div>
                    `;
                    modulesListEl.appendChild(moduleItem);
                });

                // Add event listeners to "Mark as Complete" buttons
                document.querySelectorAll('.mark-complete-btn').forEach(button => {
                    button.addEventListener('click', () => {
                        markModuleComplete(userId, button.dataset.courseId, button.dataset.moduleId, button);
                    });
                });

            } else {
                modulesListEl.innerHTML = '<p>No modules available for this course.</p>';
            }
        } catch (error) {
            console.error("Error loading course details:", error);
            mainContent.innerHTML = '<p>Error loading course details.</p>';
        }

        // Simulate upload assignment button
        const uploadBtn = document.getElementById('upload-assignment-btn');
        if(uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                alert('Assignment upload simulation: This feature is not fully implemented.');
            });
        }
    }

    async function markModuleComplete(userId, courseId, moduleId, button) {
        const progressDbRef = ref(db, `users/${userId}/progress/${courseId}/completedModules`);
        try {
            const snapshot = await get(progressDbRef);
            let completedModules = snapshot.val() || [];
            if (!Array.isArray(completedModules)) completedModules = []; // Ensure it's an array

            if (!completedModules.includes(moduleId)) {
                completedModules.push(moduleId);
                await set(progressDbRef, completedModules);

                console.log(`Module ${moduleId} for course ${courseId} marked as complete for user ${userId}.`);
                if (button) {
                    button.textContent = 'Completed';
                    button.disabled = true;
                    const statusEl = button.parentElement.querySelector('.module-status');
                    if(statusEl) statusEl.textContent = 'Completed';
                }

                if (window.location.pathname.endsWith('dashboard.html')) {
                     const currentUser = auth.currentUser; // Re-fetch user from auth
                     if(currentUser) loadUserData(currentUser); // This will re-trigger dashboard load
                }
            }
        } catch (error) {
            console.error("Error marking module complete:", error);
            alert(`Error: ${error.message}`);
        }
    }

    // Initial check for auth section visibility on index.html
    if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
        if (!auth.currentUser) { // If not logged in
            if (authSection) authSection.classList.remove('hidden');
            if (welcomeMessage) welcomeMessage.classList.add('hidden');
            const coursesContainer = document.getElementById('courses-container');
            if (coursesContainer) coursesContainer.innerHTML = '<p>Please log in or sign up to see courses.</p>';
        } else { // If logged in
             if (authSection) authSection.classList.add('hidden');
             if (welcomeMessage) welcomeMessage.classList.remove('hidden');
        }
    }

}); // End DOMContentLoaded
