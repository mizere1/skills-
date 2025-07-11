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
    push,
    orderByChild,
    query
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import {
    getStorage,
    ref as storageRef,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

// Import functions to populate sample data
import { addSampleCourses, addSampleAnnouncements } from './sample-data.js';


// Wait for the DOM to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', async () => { // Made async for await ensureSampleData
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

    const storage = getStorage(auth.app); // Get storage instance from the same app

    // --- AUTHENTICATION & USER CREATION ---

    // Helper function to upload a file and get its download URL
    async function uploadFileToStorage(file, path) {
        if (!file) return null;
        const fileRef = storageRef(storage, path);
        try {
            const snapshot = await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            console.log('File uploaded to:', downloadURL);
            return downloadURL;
        } catch (error) {
            console.error(`Error uploading file to ${path}:`, error);
            throw error; // Re-throw to be caught by the signup handler
        }
    }

    // Signup
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(authError) authError.textContent = ''; // Clear previous errors

            // Basic Info
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;

            // Personal Details
            const dob = document.getElementById('signup-dob').value;
            const gender = document.getElementById('signup-gender').value;

            // Contact Info
            const phone = document.getElementById('signup-phone').value;
            const addressStreet = document.getElementById('signup-address-street').value;
            const addressCity = document.getElementById('signup-address-city').value;
            const addressState = document.getElementById('signup-address-state').value;
            const addressZip = document.getElementById('signup-address-zip').value;
            const addressCountry = document.getElementById('signup-address-country').value;

            // Academic Background
            const prevEducation = document.getElementById('signup-prev-education').value;
            const transcriptsFile = document.getElementById('signup-transcripts').files[0];

            // Program Selection
            const degree = document.getElementById('signup-degree').value;
            const major = document.getElementById('signup-major').value;
            const minor = document.getElementById('signup-minor').value;

            // Emergency Contact
            const emergencyName = document.getElementById('signup-emergency-name').value;
            const emergencyRelationship = document.getElementById('signup-emergency-relationship').value;
            const emergencyPhone = document.getElementById('signup-emergency-phone').value;

            // Profile Picture
            const profilePictureFile = document.getElementById('signup-profile-picture').files[0];

            // Terms
            const termsAccepted = document.getElementById('signup-terms').checked;

            if (!termsAccepted) {
                if(authError) authError.textContent = "You must accept the Terms and Conditions.";
                return;
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Upload files if they exist
                let profilePictureURL = null;
                if (profilePictureFile) {
                    profilePictureURL = await uploadFileToStorage(profilePictureFile, `profilePictures/${user.uid}/${profilePictureFile.name}`);
                }

                let transcriptsURL = null;
                if (transcriptsFile) {
                    transcriptsURL = await uploadFileToStorage(transcriptsFile, `transcripts/${user.uid}/${transcriptsFile.name}`);
                }

                // Construct user data object
                const userData = {
                    displayName: name,
                    email: email,
                    role: 'student',
                    profilePictureURL: profilePictureURL,
                    personalDetails: {
                        dateOfBirth: dob,
                        gender: gender
                    },
                    contactInfo: {
                        phone: phone,
                        address: {
                            street: addressStreet,
                            city: addressCity,
                            state: addressState,
                            zip: addressZip,
                            country: addressCountry
                        }
                    },
                    academicBackground: {
                        previousEducation: prevEducation,
                        transcriptsURL: transcriptsURL
                    },
                    programSelection: {
                        degree: degree,
                        major: major,
                        minor: minor
                    },
                    emergencyContact: {
                        name: emergencyName,
                        relationship: emergencyRelationship,
                        phone: emergencyPhone
                    },
                    termsAccepted: termsAccepted,
                    createdAt: Date.now(),
                    enrolledCourses: [],
                    progress: {}
                };

                const userDbRef = ref(db, 'users/' + user.uid);
                await set(userDbRef, userData);

                console.log('User signed up and all data stored:', user.uid);
                signupForm.reset();
                // onAuthStateChanged will handle UI updates

            } catch (error) {
                console.error('Signup process error:', error);
                if(authError) authError.textContent = `Signup Error: ${error.message}`;
            }
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

    function clearProfilePageData() {
        const profileFieldsIds = [
            'user-name', 'user-email', 'user-role', 'user-dob', 'user-gender',
            'user-phone', 'user-address-street', 'user-address-city', 'user-address-state',
            'user-address-zip', 'user-address-country', 'user-prev-education',
            'user-degree', 'user-major', 'user-minor', 'user-emergency-name',
            'user-emergency-relationship', 'user-emergency-phone', 'user-terms-accepted'
        ];
        profileFieldsIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = 'N/A';
        });
        const profilePicEl = document.getElementById('profile-picture');
        if (profilePicEl) profilePicEl.src = 'https://via.placeholder.com/150';

        const transcriptsLink = document.getElementById('user-transcripts-link');
        const transcriptsNA = document.getElementById('user-transcripts-na');
        if (transcriptsLink) transcriptsLink.classList.add('hidden');
        if (transcriptsNA) {
            transcriptsNA.classList.remove('hidden');
            transcriptsNA.textContent = 'N/A';
        }
    }

    function loadUserData(user) {
        const userDbRef = ref(db, 'users/' + user.uid);
        onValue(userDbRef, (snapshot) => {
            const userData = snapshot.val();
            const adminNavLink = document.getElementById('admin-nav-link'); // Get admin link once

            if (userData) {
                // Populate general user info (potentially for nav header or common areas)
                const userNameEl = document.getElementById('user-name'); // Could be in nav or profile
                const userEmailEl = document.getElementById('user-email'); // Could be in nav or profile
                if (userNameEl) userNameEl.textContent = userData.displayName || 'N/A';
                if (userEmailEl) userEmailEl.textContent = userData.email || 'N/A';

                // Show/Hide Admin Nav Link based on role
                if (adminNavLink) {
                    if (userData.role === 'admin' || userData.role === 'faculty') {
                        adminNavLink.classList.remove('hidden');
                    } else {
                        adminNavLink.classList.add('hidden');
                    }
                }

                // Profile page specific elements
                if (window.location.pathname.endsWith('profile.html')) {
                    const profilePicEl = document.getElementById('profile-picture');
                    if (profilePicEl && userData.profilePictureURL) {
                        profilePicEl.src = userData.profilePictureURL;
                    } else if (profilePicEl) {
                        profilePicEl.src = 'https://via.placeholder.com/150'; // Default if no URL
                    }

                    // Personal Details
                    document.getElementById('user-dob').textContent = userData.personalDetails?.dateOfBirth || 'N/A';
                    document.getElementById('user-gender').textContent = userData.personalDetails?.gender || 'N/A';

                    // Contact Info
                    document.getElementById('user-phone').textContent = userData.contactInfo?.phone || 'N/A';
                    document.getElementById('user-address-street').textContent = userData.contactInfo?.address?.street || 'N/A';
                    document.getElementById('user-address-city').textContent = userData.contactInfo?.address?.city || 'N/A';
                    document.getElementById('user-address-state').textContent = userData.contactInfo?.address?.state || 'N/A';
                    document.getElementById('user-address-zip').textContent = userData.contactInfo?.address?.zip || 'N/A';
                    document.getElementById('user-address-country').textContent = userData.contactInfo?.address?.country || 'N/A';

                    // Academic Background
                    document.getElementById('user-prev-education').textContent = userData.academicBackground?.previousEducation || 'N/A';
                    const transcriptsLink = document.getElementById('user-transcripts-link');
                    const transcriptsNA = document.getElementById('user-transcripts-na');
                    if (userData.academicBackground?.transcriptsURL) {
                        transcriptsLink.href = userData.academicBackground.transcriptsURL;
                        transcriptsLink.classList.remove('hidden');
                        transcriptsNA.classList.add('hidden');
                    } else {
                        transcriptsLink.classList.add('hidden');
                        transcriptsNA.classList.remove('hidden');
                        transcriptsNA.textContent = 'N/A';
                    }

                    // Program Selection
                    document.getElementById('user-degree').textContent = userData.programSelection?.degree || 'N/A';
                    document.getElementById('user-major').textContent = userData.programSelection?.major || 'N/A';
                    document.getElementById('user-minor').textContent = userData.programSelection?.minor || 'N/A';

                    // Emergency Contact
                    document.getElementById('user-emergency-name').textContent = userData.emergencyContact?.name || 'N/A';
                    document.getElementById('user-emergency-relationship').textContent = userData.emergencyContact?.relationship || 'N/A';
                    document.getElementById('user-emergency-phone').textContent = userData.emergencyContact?.phone || 'N/A';

                    document.getElementById('user-terms-accepted').textContent = userData.termsAccepted ? 'Yes' : 'No';
                }

                // If on dashboard, load data
                if (window.location.pathname.endsWith('dashboard.html')) {
                    const enrolledCoursesList = userData.enrolledCourses || [];
                    loadEnrolledCourses(user.uid, enrolledCoursesList, userData.progress || {});
                    loadAnnouncements(enrolledCoursesList);
                    loadAcademicProgress(user.uid); // Call new dashboard function
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

    // Add to app.js
    async function loadAcademicProgress(userId) {
        const coursesInProgressEl = document.getElementById('courses-in-progress');
        const assignmentsDueEl = document.getElementById('assignments-due');
        const upcomingExamsEl = document.getElementById('upcoming-exams');

        // Ensure elements exist (this function might be called from loadUserData on any page)
        if (!coursesInProgressEl || !assignmentsDueEl || !upcomingExamsEl) {
            // console.log("Academic progress elements not found on this page.");
            return;
        }

        try {
            // Get user's enrolled courses
            const enrolledCoursesSnapshot = await get(ref(db, `users/${userId}/enrolledCourses`));
            const enrolledCourses = enrolledCoursesSnapshot.val() || [];

            coursesInProgressEl.textContent = enrolledCourses.length;

            let assignmentsDueCount = 0;
            let upcomingExamsCount = 0;
            const now = Date.now();

            for (const courseEnrollment of enrolledCourses) {
                // Ensure courseEnrollment is an object and has courseId, otherwise skip
                const courseId = typeof courseEnrollment === 'object' && courseEnrollment !== null ? courseEnrollment.courseId : null;
                if (!courseId) continue;

                // Get assignments
                const assignmentsSnapshot = await get(ref(db, `courses/${courseId}/assignments`));
                const assignments = assignmentsSnapshot.val();
                if (assignments) {
                    Object.values(assignments).forEach(assignment => {
                        if (assignment.dueDate > now) {
                            assignmentsDueCount++;
                        }
                    });
                }

                // Get exams
                const examsSnapshot = await get(ref(db, `courses/${courseId}/exams`));
                const exams = examsSnapshot.val();
                if (exams) {
                    Object.values(exams).forEach(exam => {
                        if (exam.date > now) {
                            upcomingExamsCount++;
                        }
                    });
                }
            }

            assignmentsDueEl.textContent = assignmentsDueCount;
            upcomingExamsEl.textContent = upcomingExamsCount;

        } catch (error) {
            console.error("Error loading academic progress:", error);
            coursesInProgressEl.textContent = 'N/A';
            assignmentsDueEl.textContent = 'N/A';
            upcomingExamsEl.textContent = 'N/A';
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
                const enrolledCourseObjects = enrolledSnapshot.val() || []; // This is now an array of objects

                for (const courseId in courses) {
                    const course = courses[courseId];
                    // Check if user is enrolled by looking for courseId in the array of enrollment objects
                    const isEnrolled = enrolledCourseObjects.some(ec => ec.courseId === courseId);

                    const courseCard = document.createElement('div');
                    courseCard.classList.add('course-card');
                    courseCard.innerHTML = `
                        <h3>${course.title}</h3>
                        <p><strong>Code:</strong> ${course.code || 'N/A'}</p>
                        <p><strong>Credits:</strong> ${course.creditHours || 'N/A'}</p>
                        <p>${course.description ? course.description.substring(0,150) + '...' : 'No description available.'}</p>
                        <button class="btn enroll-btn" data-course-id="${courseId}" ${isEnrolled ? 'disabled' : ''}>
                            ${isEnrolled ? 'Enrolled' : 'Enroll'}
                        </button>
                    `;
                    coursesContainer.appendChild(courseCard);
                }
                // Add event listeners to new enroll buttons
                document.querySelectorAll('.enroll-btn:not([disabled])').forEach(button => {
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
            let enrolledCoursesArray = snapshot.val() || [];
            if (!Array.isArray(enrolledCoursesArray)) enrolledCoursesArray = [];

            // Check if already enrolled by courseId
            const isAlreadyEnrolled = enrolledCoursesArray.some(enrollment => enrollment.courseId === courseId);

            if (!isAlreadyEnrolled) {
                // Get course details to store enrollment date and other metadata
                const courseSnapshot = await get(ref(db, 'courses/' + courseId));
                const course = courseSnapshot.val();

                if (!course) {
                    alert("Error: Course details not found. Cannot enroll.");
                    console.error("Course details not found for courseId:", courseId);
                    return;
                }

                const enrollmentData = {
                    courseId: courseId,
                    enrollmentDate: Date.now(),
                    title: course.title || "Untitled Course", // Fallback for title
                    currentStatus: 'active',
                    lastAccessed: Date.now()
                };

                enrolledCoursesArray.push(enrollmentData);
                await set(userCoursesDbRef, enrolledCoursesArray);

                console.log(`User ${userId} enrolled in course ${courseId}`);
                alert(`Successfully enrolled in ${course.title || "the course"}!`);

                if (button) {
                    button.textContent = 'Enrolled';
                    button.disabled = true;
                    button.classList.add('btn-secondary'); // As per new CSS
                }

                // Initialize progress with more details
                const userProgressDbRef = ref(db, `users/${userId}/progress/${courseId}`);
                await set(userProgressDbRef, {
                    completedModules: [],
                    lastActivity: Date.now(),
                    totalModules: course.modules ? course.modules.length : 0,
                    assignmentsSubmitted: 0
                });
            } else {
                alert('You are already enrolled in this course.');
                if (button) {
                    button.textContent = 'Enrolled';
                    button.disabled = true;
                    button.classList.add('btn-secondary'); // As per new CSS
                }
            }
        } catch (error) {
            console.error("Error enrolling in course:", error);
            alert(`Error enrolling: ${error.message}`);
        }
    }

    // Load enrolled courses on the Dashboard
    async function loadEnrolledCourses(userId, enrolledCoursesData, userProgress) { // enrolledCoursesData is now an array of objects
        const enrolledCoursesList = document.getElementById('enrolled-courses-list');
        if (!enrolledCoursesList) return;
        enrolledCoursesList.innerHTML = ''; // Clear previous list

        if (!enrolledCoursesData || enrolledCoursesData.length === 0) {
            enrolledCoursesList.innerHTML = '<p>You are not enrolled in any courses yet. <a href="index.html">Browse courses</a>.</p>';
            return;
        }

        for (const enrollment of enrolledCoursesData) {
            const courseId = enrollment.courseId; // Get courseId from the enrollment object
            if (!courseId) continue; // Skip if no courseId

            try {
                const courseSnapshot = await get(ref(db, 'courses/' + courseId));
                const course = courseSnapshot.val();
                if (course) {
                    const courseProg = userProgress[courseId] || { completedModules: [], totalModules: course.modules ? course.modules.length : 0 };
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
    function loadAnnouncements(enrolledCoursesData) { // enrolledCoursesData is an array of enrollment objects
        const announcementsList = document.getElementById('announcements-list');
        if (!announcementsList) return;
        announcementsList.innerHTML = ''; // Clear old announcements

        if (!enrolledCoursesData || enrolledCoursesData.length === 0) {
            announcementsList.innerHTML = '<li>No announcements for your courses.</li>';
            return;
        }

        // Extract courseIds from the enrollment data
        const enrolledCourseIds = enrolledCoursesData.map(enrollment => enrollment.courseId);

        const announcementsDbRef = query(ref(db, 'announcements'), orderByChild('timestamp'));
        onValue(announcementsDbRef, (snapshot) => {
            const allAnnouncements = snapshot.val();
            let userAnnouncementsFound = false;
            announcementsList.innerHTML = ''; // Clear before re-populating
            if (allAnnouncements) {
                const announcementKeys = Object.keys(allAnnouncements).sort((a,b) => allAnnouncements[b].timestamp - allAnnouncements[a].timestamp); // Sort newest first

                announcementKeys.forEach(key => {
                    const announcement = allAnnouncements[key];
                    // Check if the announcement's courseId is in the user's list of enrolled courseIds
                    if (enrolledCourseIds.includes(announcement.courseId)) {
                        const listItem = document.createElement('li');
                        // Optionally, find the course title from enrolledCoursesData for better display
                        const enrolledCourseInfo = enrolledCoursesData.find(ec => ec.courseId === announcement.courseId);
                        const courseTitle = enrolledCourseInfo ? enrolledCourseInfo.title : `Course ID: ${announcement.courseId}`;

                        listItem.innerHTML = `
                            <strong>${new Date(announcement.timestamp).toLocaleDateString()} - ${courseTitle}</strong>:
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
        const courseCodeEl = document.getElementById('course-code-display'); // Assuming you add this span
        const courseCreditsEl = document.getElementById('course-credits-display'); // Assuming you add this span
        const mainContent = mainContentPages.courseDetail;

        if (!courseTitleEl || !courseSyllabusEl || !modulesListEl || !mainContent) return;

        try {
            const courseSnapshot = await get(ref(db, 'courses/' + courseId));
            const course = courseSnapshot.val();
            if (!course) {
                mainContent.innerHTML = '<p>Course not found.</p>';
                return;
            }

            courseTitleEl.textContent = course.title || 'N/A';
            if(courseCodeEl) courseCodeEl.textContent = course.code || 'N/A';
            if(courseCreditsEl) courseCreditsEl.textContent = course.creditHours !== undefined ? course.creditHours : 'N/A';
            courseSyllabusEl.textContent = course.description || 'No syllabus provided.'; // Using description as syllabus for simplicity
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

            // Load assessments
            await loadCourseAssessments(courseId, userId);

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

    // Add this function to load exams and assignments
    async function loadCourseAssessments(courseId, userId) {
        const examsListEl = document.getElementById('exams-list');
        const assignmentsListEl = document.getElementById('assignments-list');

        if (!examsListEl || !assignmentsListEl) {
            console.warn("Assessment list elements not found on this page.");
            return;
        }

        try {
            // Load exams data
            const examsSnapshot = await get(ref(db, `courses/${courseId}/exams`));
            const exams = examsSnapshot.val();

            examsListEl.innerHTML = ''; // Clear previous
            if (exams) {
                const examsHeader = document.createElement('h3');
                examsHeader.textContent = 'Exams';
                examsListEl.appendChild(examsHeader);
                Object.keys(exams).forEach(examId => {
                    const exam = exams[examId];
                    const examItem = document.createElement('div');
                    examItem.classList.add('assessment-item');
                    examItem.innerHTML = `
                        <h4>${exam.title}</h4>
                        <p><strong>Date:</strong> ${new Date(exam.date).toLocaleDateString()}</p>
                        <p><strong>Duration:</strong> ${exam.duration} minutes</p>
                        <p><strong>Weight:</strong> ${exam.weight}% of final grade</p>
                        <button class="btn exam-btn" data-exam-id="${examId}">View Exam Details</button>
                    `;
                    examsListEl.appendChild(examItem);
                });
            } else {
                examsListEl.innerHTML = '<h3>Exams</h3><p>No exams scheduled for this course.</p>';
            }

            // Load assignments
            const assignmentsSnapshot = await get(ref(db, `courses/${courseId}/assignments`));
            const assignments = assignmentsSnapshot.val();

            assignmentsListEl.innerHTML = ''; // Clear previous
            if (assignments) {
                const assignmentsHeader = document.createElement('h3');
                assignmentsHeader.textContent = 'Assignments';
                assignmentsListEl.appendChild(assignmentsHeader);
                Object.keys(assignments).forEach(assignmentId => {
                    const assignment = assignments[assignmentId];
                    const assignmentItem = document.createElement('div');
                    assignmentItem.classList.add('assessment-item');
                    assignmentItem.innerHTML = `
                        <h4>${assignment.title}</h4>
                        <p><strong>Due:</strong> ${new Date(assignment.dueDate).toLocaleDateString()}</p>
                        <p><strong>Status:</strong> ${assignment.status || 'Not submitted'}</p>
                        <button class="btn assignment-btn" data-assignment-id="${assignmentId}">
                            ${assignment.submitted ? 'View Submission' : 'Submit Assignment'}
                        </button>
                    `;
                    assignmentsListEl.appendChild(assignmentItem);
                });
            } else {
                assignmentsListEl.innerHTML = '<h3>Assignments</h3><p>No assignments for this course yet.</p>';
            }
        } catch (error) {
            console.error("Error loading assessments:", error);
            if(examsListEl) examsListEl.innerHTML = '<h3>Exams</h3><p>Error loading exams.</p>';
            if(assignmentsListEl) assignmentsListEl.innerHTML = '<h3>Assignments</h3><p>Error loading assignments.</p>';
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

    // --- Admin Page Specific Logic ---
    if (window.location.pathname.endsWith('admin.html')) {
        // Protect admin page
        onAuthStateChanged(auth, user => {
            if (user) {
                const userDbRef = ref(db, 'users/' + user.uid);
                get(userDbRef).then(snapshot => {
                    const userData = snapshot.val();
                    if (!userData || (userData.role !== 'admin' && userData.role !== 'faculty')) {
                        console.warn('User is not admin/faculty. Redirecting.');
                        window.location.href = 'index.html';
                    } else {
                        // User is admin/faculty, allow access
                        console.log('Admin/Faculty user accessed admin page.');
                        initializeAdminPage();
                    }
                }).catch(error => {
                    console.error("Error fetching user role for admin page:", error);
                    window.location.href = 'index.html';
                });
            } else {
                // Not logged in
                console.warn('User not logged in. Redirecting from admin page.');
                window.location.href = 'index.html';
            }
        });
    }

    function initializeAdminPage() {
        const createCourseForm = document.getElementById('create-course-form');
        const createCourseMessageEl = document.getElementById('create-course-message');

        if (createCourseForm) {
            createCourseForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if(createCourseMessageEl) createCourseMessageEl.textContent = '';

                const title = document.getElementById('course-title-input').value;
                const code = document.getElementById('course-code-input').value;
                const description = document.getElementById('course-description-input').value;
                const creditHours = parseFloat(document.getElementById('course-credits-input').value);
                const moduleTitlesRaw = document.getElementById('course-modules-input').value;

                if (!title || !code || !description || isNaN(creditHours)) {
                    if(createCourseMessageEl) createCourseMessageEl.textContent = 'Please fill all required fields correctly.';
                    if(createCourseMessageEl) createCourseMessageEl.style.color = 'var(--mit-red)';
                    return;
                }

                const moduleTitles = moduleTitlesRaw.split('\n').filter(t => t.trim() !== '').map(t => t.trim());
                const modules = moduleTitles.map((title, index) => ({
                    moduleId: `module-${index}`,
                    title: title,
                    content: "" // Content will be added later
                }));

                const coursesRef = ref(db, 'courses');
                const newCourseRef = push(coursesRef); // Generates a unique key/ID for the course

                const newCourseData = {
                    title: title,
                    code: code,
                    description: description,
                    creditHours: creditHours,
                    modules: modules,
                    // Initialize other fields from the full course structure as needed, or leave them for later update
                    instructor: "",
                    department: "",
                    level: "",
                    term: "",
                    exams: {},
                    assignments: {},
                    createdAt: Date.now(),
                    // createdBy: auth.currentUser.uid // Optional: track creator
                };

                try {
                    await set(newCourseRef, newCourseData);
                    if(createCourseMessageEl) {
                        createCourseMessageEl.textContent = 'Course created successfully!';
                        createCourseMessageEl.style.color = 'green';
                    }
                    createCourseForm.reset();
                } catch (error) {
                    console.error("Error creating course:", error);
                    if(createCourseMessageEl) {
                        createCourseMessageEl.textContent = `Error creating course: ${error.message}`;
                        createCourseMessageEl.style.color = 'var(--mit-red)';
                    }
                }
            });
        }
    }

    // Update loadAllCourses to handle new enrolledCourses structure if user is logged in
    // The existing loadAllCourses already fetches enrolled courses to disable buttons.
    // It needs to be robust if `enrolledSnapshot.val()` is an array of objects or an array of strings (old format).
    // For now, `enrollInCourse` was changed to store objects, so `loadAllCourses` needs to check `courseId` within those objects.
    // The part in `loadAllCourses` that reads enrolled courses:
    // `db.ref('users/' + currentUserId + '/enrolledCourses').once('value', (enrolledSnapshot) => { ... })`
    // should be changed to:
    // `get(ref(db, 'users/' + currentUserId + '/enrolledCourses')).then((enrolledSnapshot) => { ... })`
    // and the logic inside to check `enrolledCourseIds.includes(courseId)` needs to be
    // `enrolledCourseObjects.some(ec => ec.courseId === courseId)` if `enrolledCourseObjects` is the array of enrollment objects.
    // This change is done in the `loadAllCourses` function.
    // The `enrollInCourse` function was also updated to correctly check if already enrolled based on the new object structure.

    // Function to check and populate sample data if DB is empty
    async function ensureSampleDataIsPopulated() {
        try {
            const coursesSnapshot = await get(ref(db, 'courses'));
            if (!coursesSnapshot.exists() || !coursesSnapshot.val()) {
                console.info("No existing course data found. Populating sample data...");
                await addSampleCourses();
                await addSampleAnnouncements(); // Also populate announcements if courses are populated
                console.info("Sample data automatically populated.");
            } else {
                console.info("Sample data check: Course data already exists.");
            }
        } catch (error) {
            console.error("Error during sample data check/population:", error);
        }
    }

    // Call this once after Firebase services are confirmed and DOM is loaded.
    // This ensures it runs only once per page load after everything is set up.
    if (auth && db) { // Ensure Firebase services are available before trying
        await ensureSampleDataIsPopulated();
    }

}); // End DOMContentLoaded
