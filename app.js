// Wait for the DOM to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', () => {
    // Firebase App Initialization Check
    // The user needs to add their Firebase config to firebase-config.js
    if (typeof firebase === 'undefined' || typeof firebase.app === 'undefined') {
        console.error("Firebase SDK not loaded or initialized. Make sure firebase-config.js is set up correctly.");
        // Display a message to the user on the page if Firebase is not configured.
        const mainContent = document.querySelector('main');
        if (mainContent) {
            const errorDiv = document.createElement('div');
            errorDiv.textContent = 'Error: Firebase is not configured. Please set up firebase-config.js.';
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

    const auth = firebase.auth();
    const db = firebase.database(); // Using Realtime Database

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

            auth.createUserWithEmailAndPassword(email, password)
                .then(userCredential => {
                    const user = userCredential.user;
                    // Store additional user info in Realtime Database
                    db.ref('users/' + user.uid).set({
                        displayName: name,
                        email: email,
                        role: 'student',
                        enrolledCourses: [],
                        progress: {}
                    }).then(() => {
                        console.log('User signed up and data stored:', user.uid);
                        signupForm.reset();
                        if(authError) authError.textContent = '';
                        // User will be redirected by onAuthStateChanged
                    }).catch(error => {
                        console.error('Error storing user data:', error);
                         if(authError) authError.textContent = `Error storing user data: ${error.message}`;
                    });
                })
                .catch(error => {
                    console.error('Signup error:', error);
                    if(authError) authError.textContent = `Signup Error: ${error.message}`;
                });
        });
    }

    // Login
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            auth.signInWithEmailAndPassword(email, password)
                .then(userCredential => {
                    console.log('User logged in:', userCredential.user.uid);
                    loginForm.reset();
                    if(authError) authError.textContent = '';
                    // User will be redirected by onAuthStateChanged
                })
                .catch(error => {
                    console.error('Login error:', error);
                    if(authError) authError.textContent = `Login Error: ${error.message}`;
                });
        });
    }

    // Logout
    function handleLogout() {
        auth.signOut().then(() => {
            console.log('User logged out');
            window.location.href = 'index.html'; // Redirect to home page after logout
        }).catch(error => {
            console.error('Logout error:', error);
        });
    }

    if (logoutButton) { // For profile page logout button
        logoutButton.addEventListener('click', handleLogout);
    }

    // Auth state listener
    auth.onAuthStateChanged(user => {
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
        const userRef = db.ref('users/' + user.uid);
        userRef.on('value', (snapshot) => {
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
    function loadAllCourses(currentUserId) {
        const coursesRef = db.ref('courses');
        const coursesContainer = document.getElementById('courses-container');
        if (!coursesContainer) return;

        coursesRef.on('value', (snapshot) => {
            coursesContainer.innerHTML = ''; // Clear existing courses
            const courses = snapshot.val();
            if (courses) {
                // Get user's enrolled courses to disable enroll button if already enrolled
                db.ref('users/' + currentUserId + '/enrolledCourses').once('value', (enrolledSnapshot) => {
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
                });
            } else {
                coursesContainer.innerHTML = '<p>No courses available at the moment.</p>';
            }
        }, (error) => {
            console.error("Error loading courses:", error);
            coursesContainer.innerHTML = '<p>Error loading courses. Please try again later.</p>';
        });
    }

    // Enroll user in a course
    function enrollInCourse(userId, courseId, button) {
        const userCoursesRef = db.ref('users/' + userId + '/enrolledCourses');
        userCoursesRef.once('value', (snapshot) => {
            let enrolledCourses = snapshot.val() || [];
            if (!enrolledCourses.includes(courseId)) {
                enrolledCourses.push(courseId);
                userCoursesRef.set(enrolledCourses)
                    .then(() => {
                        console.log(`User ${userId} enrolled in course ${courseId}`);
                        alert(`Successfully enrolled in course!`);
                        if (button) {
                            button.textContent = 'Enrolled';
                            button.disabled = true;
                        }
                        // Initialize progress for this course (0 modules completed)
                        const userProgressRef = db.ref(`users/${userId}/progress/${courseId}`);
                        userProgressRef.set({ completedModules: [] }); // Store completed modules as an array
                    })
                    .catch(error => {
                        console.error("Error enrolling in course:", error);
                        alert(`Error enrolling: ${error.message}`);
                    });
            } else {
                alert('You are already enrolled in this course.');
                if (button) {
                    button.textContent = 'Enrolled';
                    button.disabled = true;
                }
            }
        });
    }

    // Load enrolled courses on the Dashboard
    function loadEnrolledCourses(userId, enrolledCourseIds, userProgress) {
        const enrolledCoursesList = document.getElementById('enrolled-courses-list');
        if (!enrolledCoursesList) return;
        enrolledCoursesList.innerHTML = ''; // Clear previous list

        if (!enrolledCourseIds || enrolledCourseIds.length === 0) {
            enrolledCoursesList.innerHTML = '<p>You are not enrolled in any courses yet. <a href="index.html">Browse courses</a>.</p>';
            return;
        }

        enrolledCourseIds.forEach(courseId => {
            db.ref('courses/' + courseId).once('value', (snapshot) => {
                const course = snapshot.val();
                if (course) {
                    const courseProgress = userProgress[courseId] || { completedModules: [] };
                    const completedModulesCount = Array.isArray(courseProgress.completedModules) ? courseProgress.completedModules.length : 0;
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
            });
        });
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

        const announcementsRef = db.ref('announcements').orderByChild('timestamp'); // Order by time
        announcementsRef.on('value', (snapshot) => {
            const allAnnouncements = snapshot.val();
            let userAnnouncementsFound = false;
            if (allAnnouncements) {
                // Iterate in reverse to show newest first (since default is ascending)
                const announcementKeys = Object.keys(allAnnouncements).reverse();
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
        });
    }


    // Load Course Details page
    function loadCourseDetails(courseId, userId) {
        const courseTitleEl = document.getElementById('course-title');
        const courseSyllabusEl = document.getElementById('course-syllabus');
        const modulesListEl = document.getElementById('modules-list');
        const mainContent = mainContentPages.courseDetail;

        if (!courseTitleEl || !courseSyllabusEl || !modulesListEl || !mainContent) return;

        db.ref('courses/' + courseId).once('value', (courseSnapshot) => {
            const course = courseSnapshot.val();
            if (!course) {
                mainContent.innerHTML = '<p>Course not found.</p>';
                return;
            }

            courseTitleEl.textContent = course.title;
            courseSyllabusEl.textContent = course.description; // Using description as syllabus for simplicity

            modulesListEl.innerHTML = ''; // Clear previous modules

            // Get user's progress for this course
            db.ref(`users/${userId}/progress/${courseId}`).once('value', (progressSnapshot) => {
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
            });
        });

        // Simulate upload assignment button
        const uploadBtn = document.getElementById('upload-assignment-btn');
        if(uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                alert('Assignment upload simulation: This feature is not fully implemented.');
            });
        }
    }

    function markModuleComplete(userId, courseId, moduleId, button) {
        const progressRef = db.ref(`users/${userId}/progress/${courseId}/completedModules`);
        progressRef.once('value', (snapshot) => {
            let completedModules = snapshot.val() || [];
            if (!Array.isArray(completedModules)) completedModules = []; // Ensure it's an array

            if (!completedModules.includes(moduleId)) {
                completedModules.push(moduleId);
                progressRef.set(completedModules)
                    .then(() => {
                        console.log(`Module ${moduleId} for course ${courseId} marked as complete for user ${userId}.`);
                        if (button) {
                            button.textContent = 'Completed';
                            button.disabled = true;
                            const statusEl = button.parentElement.querySelector('.module-status');
                            if(statusEl) statusEl.textContent = 'Completed';
                        }
                        // Potentially update dashboard progress bar if on dashboard or trigger a refresh
                        if (window.location.pathname.endsWith('dashboard.html')) {
                             // Re-fetch user data to update dashboard view
                             const user = auth.currentUser;
                             if(user) loadUserData(user);
                        }
                    })
                    .catch(error => {
                        console.error("Error marking module complete:", error);
                        alert(`Error: ${error.message}`);
                    });
            }
        });
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
