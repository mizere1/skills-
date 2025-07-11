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
document.addEventListener('DOMContentLoaded', async () => {
    if (!auth || !db) {
        console.error("Firebase auth or db service not available. Check firebase-config.js.");
        const mainContent = document.querySelector('main');
        if (mainContent) {
            const errorDiv = document.createElement('div');
            errorDiv.textContent = 'Error: Firebase services are not configured correctly. Please check firebase-config.js.';
            errorDiv.style.color = 'red';
            errorDiv.style.textAlign = 'center';
            errorDiv.style.padding = '20px';
            mainContent.prepend(errorDiv);
        }
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const buttons = form.querySelectorAll('button');
            buttons.forEach(button => button.disabled = true);
        });
        return;
    }

    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const logoutButton = document.getElementById('logout-button');
    const loginLogoutNav = document.getElementById('login-logout');
    const authSection = document.getElementById('auth-section');
    const authError = document.getElementById('auth-error');
    const welcomeMessage = document.getElementById('welcome-message');
    const mainContentPages = {
        home: document.getElementById('home-page'),
        dashboard: document.getElementById('dashboard-page'),
        courseDetail: document.getElementById('course-detail-page'),
        profile: document.getElementById('profile-page'),
        admin: document.getElementById('admin-page') // Added for admin page logic
    };

    const storage = getStorage(auth.app);

    // --- AUTHENTICATION & USER CREATION ---

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
            throw error;
        }
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(authError) authError.textContent = '';

            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const dob = document.getElementById('signup-dob').value;
            const gender = document.getElementById('signup-gender').value;
            const phone = document.getElementById('signup-phone').value;
            const addressStreet = document.getElementById('signup-address-street').value;
            const addressCity = document.getElementById('signup-address-city').value;
            const addressState = document.getElementById('signup-address-state').value;
            const addressZip = document.getElementById('signup-address-zip').value;
            const addressCountry = document.getElementById('signup-address-country').value;
            const prevEducation = document.getElementById('signup-prev-education').value;
            const transcriptsFile = document.getElementById('signup-transcripts').files[0];
            const degree = document.getElementById('signup-degree').value;
            const major = document.getElementById('signup-major').value;
            const minor = document.getElementById('signup-minor').value;
            const emergencyName = document.getElementById('signup-emergency-name').value;
            const emergencyRelationship = document.getElementById('signup-emergency-relationship').value;
            const emergencyPhone = document.getElementById('signup-emergency-phone').value;
            const profilePictureFile = document.getElementById('signup-profile-picture').files[0];
            const termsAccepted = document.getElementById('signup-terms').checked;

            if (!termsAccepted) {
                if(authError) authError.textContent = "You must accept the Terms and Conditions.";
                return;
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                let profilePictureURL = null;
                if (profilePictureFile) {
                    profilePictureURL = await uploadFileToStorage(profilePictureFile, `profilePictures/${user.uid}/${profilePictureFile.name}`);
                }

                let transcriptsURL = null;
                if (transcriptsFile) {
                    transcriptsURL = await uploadFileToStorage(transcriptsFile, `transcripts/${user.uid}/${transcriptsFile.name}`);
                }

                const userData = {
                    displayName: name, email: email, role: 'student', profilePictureURL: profilePictureURL,
                    personalDetails: { dateOfBirth: dob, gender: gender },
                    contactInfo: { phone: phone, address: { street: addressStreet, city: addressCity, state: addressState, zip: addressZip, country: addressCountry }},
                    academicBackground: { previousEducation: prevEducation, transcriptsURL: transcriptsURL },
                    programSelection: { degree: degree, major: major, minor: minor },
                    emergencyContact: { name: emergencyName, relationship: emergencyRelationship, phone: emergencyPhone },
                    termsAccepted: termsAccepted, createdAt: Date.now(),
                    feesBalance: { amount: 27500, currency: "MWK" },
                    enrolledCourses: [], progress: {}
                };

                const userDbRef = ref(db, 'users/' + user.uid);
                try {
                    await set(userDbRef, userData);
                    console.log('User signed up and all data stored in Realtime Database for UID:', user.uid);
                    signupForm.reset();
                } catch (dbSetError) {
                    console.error('FATAL: Failed to save user data to Realtime Database after signup and file uploads for UID:', user.uid, dbSetError);
                    if(authError) authError.textContent = `Signup successful, but failed to save profile data: ${dbSetError.message}. Please contact support.`;
                }
            } catch (error) {
                console.error('Signup process error (Auth or File Upload):', error);
                if(authError) authError.textContent = `Signup Error: ${error.message}`;
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // ... (login logic remains the same) ...
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            signInWithEmailAndPassword(auth, email, password)
                .then(userCredential => {
                    console.log('User logged in:', userCredential.user.uid);
                    loginForm.reset();
                    if(authError) authError.textContent = '';
                })
                .catch(error => {
                    console.error('Login error:', error);
                    if(authError) authError.textContent = `Login Error: ${error.message}`;
                });
        });
    }

    function handleLogout() {
        signOut(auth).then(() => {
            console.log('User logged out');
            window.location.href = 'index.html';
        }).catch(error => console.error('Logout error:', error));
    }

    if (logoutButton) logoutButton.addEventListener('click', handleLogout);

    onAuthStateChanged(auth, user => {
        if (user) {
            console.log('onAuthStateChanged - User:', user);
            console.log('onAuthStateChanged - User UID:', user.uid);
            updateUIForLoggedInUser(user);
            loadUserData(user);
        } else {
            console.log('User is signed out.');
            updateUIForLoggedOutUser();
        }
    });

    function updateUIForLoggedInUser(user) {
        // ... (UI update logic for login/logout nav, auth section visibility) ...
        if (loginLogoutNav) {
            loginLogoutNav.textContent = 'Logout';
            loginLogoutNav.removeEventListener('click', showAuthSection);
            loginLogoutNav.addEventListener('click', (e) => {
                e.preventDefault();
                handleLogout();
            });
        }
        if (authSection) authSection.classList.add('hidden');

        const currentPage = window.location.pathname.split("/").pop();
        if (currentPage === 'index.html' || currentPage === '') {
            if(mainContentPages.home) mainContentPages.home.classList.remove('hidden');
            if(welcomeMessage) welcomeMessage.classList.remove('hidden');
            loadAllCourses(user.uid);
        } else if (currentPage === 'dashboard.html') {
            if(mainContentPages.dashboard) mainContentPages.dashboard.classList.remove('hidden');
        } else if (currentPage === 'profile.html') {
             if(mainContentPages.profile) mainContentPages.profile.classList.remove('hidden');
        } else if (currentPage === 'course.html') {
            // Access control for course.html is now handled within loadCourseDetailsWithAccessCheck
            // if(mainContentPages.courseDetail) mainContentPages.courseDetail.classList.remove('hidden');
        } else if (currentPage === 'admin.html') {
            if(mainContentPages.admin) mainContentPages.admin.classList.remove('hidden');
        }
    }

    function showAuthSection(e){
        // ... (showAuthSection logic remains the same) ...
        if(e) e.preventDefault();
        if (authSection) authSection.classList.remove('hidden');
        if (welcomeMessage) welcomeMessage.classList.add('hidden');
        if (mainContentPages.home && (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/'))) {
            const coursesContainer = document.getElementById('courses-container');
            if (coursesContainer) coursesContainer.innerHTML = '';
        }
    }

    function updateUIForLoggedOutUser() {
        // ... (UI update logic for logged out user remains largely the same) ...
        if (loginLogoutNav) {
            loginLogoutNav.textContent = 'Login';
            loginLogoutNav.removeEventListener('click', handleLogout);
            loginLogoutNav.addEventListener('click', showAuthSection);
        }
        const adminNavLink = document.getElementById('admin-nav-link');
        if(adminNavLink) adminNavLink.classList.add('hidden');


        const currentPage = window.location.pathname.split("/").pop();
        if (currentPage === 'dashboard.html' || currentPage === 'profile.html' || currentPage === 'course.html' || currentPage === 'admin.html') {
            window.location.href = 'index.html';
        } else if (currentPage === 'index.html' || currentPage === '') {
            if (authSection) authSection.classList.remove('hidden');
            if (welcomeMessage) welcomeMessage.classList.add('hidden');
            const coursesContainer = document.getElementById('courses-container');
            if (coursesContainer) coursesContainer.innerHTML = '<p>Please log in or sign up to see courses.</p>';
        }

        if (window.location.pathname.endsWith('profile.html')) {
            clearProfilePageData();
        }
        if (document.getElementById('enrolled-courses-list')) document.getElementById('enrolled-courses-list').innerHTML = '';
        if (document.getElementById('announcements-list')) document.getElementById('announcements-list').innerHTML = '<li>No new announcements.</li>';
    }

    // --- USER DATA HANDLING ---

    function clearProfilePageData() {
        // ... (clearProfilePageData logic remains the same) ...
        const profileFieldsIds = [
            'user-name', 'user-email', 'user-role', 'user-dob', 'user-gender',
            'user-phone', 'user-address-street', 'user-address-city', 'user-address-state',
            'user-address-zip', 'user-address-country', 'user-prev-education',
            'user-degree', 'user-major', 'user-minor', 'user-emergency-name',
            'user-emergency-relationship', 'user-emergency-phone', 'user-terms-accepted',
            'user-fees-balance' // Added fees balance
        ];
        profileFieldsIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = 'N/A';
        });
        const profilePicEl = document.getElementById('profile-picture');
        if (profilePicEl) {
            profilePicEl.src = '#';
            profilePicEl.style.display = 'block';
        }

        const transcriptsLink = document.getElementById('user-transcripts-link');
        const transcriptsNA = document.getElementById('user-transcripts-na');
        if (transcriptsLink && transcriptsNA) {
            transcriptsLink.classList.add('hidden');
            transcriptsNA.classList.remove('hidden');
            transcriptsNA.textContent = 'N/A';
        }
    }

    function loadUserData(user) {
        // ... (loadUserData logic with detailed logging and profile population remains the same) ...
        console.log("--- loadUserData: CALLED for UID: " + user.uid + " ---");
        console.log("loadUserData: User object passed:", user);

        const userDbRef = ref(db, 'users/' + user.uid);
        console.log("loadUserData: ABOUT TO CALL get() for path: " + userDbRef.toString());

        get(userDbRef).then((snapshot) => {
            console.log('loadUserData - Raw snapshot value for UID ' + user.uid + ':', snapshot.val());
            const userData = snapshot.val();
            const adminNavLink = document.getElementById('admin-nav-link');

            if (userData) {
                console.log('loadUserData - userData object:', JSON.stringify(userData, null, 2));
                console.log('loadUserData - displayName:', userData.displayName);
                console.log('loadUserData - profilePictureURL:', userData.profilePictureURL);
                console.log('loadUserData - personalDetails:', userData.personalDetails);
                console.log('loadUserData - contactInfo address city:', userData.contactInfo?.address?.city);

                const userNameEl = document.getElementById('user-name');
                const userEmailEl = document.getElementById('user-email');
                if (userNameEl) userNameEl.textContent = userData.displayName || 'N/A';
                if (userEmailEl) userEmailEl.textContent = userData.email || 'N/A';

                if (adminNavLink) {
                    if (userData.role === 'admin' || userData.role === 'faculty') {
                        adminNavLink.classList.remove('hidden');
                    } else {
                        adminNavLink.classList.add('hidden');
                    }
                }

                if (window.location.pathname.endsWith('profile.html')) {
                    const userRoleEl = document.getElementById('user-role');
                    if (userRoleEl) userRoleEl.textContent = userData.role || 'N/A';

                    const profilePicEl = document.getElementById('profile-picture');
                    if (profilePicEl) {
                        if (userData.profilePictureURL) {
                            profilePicEl.src = userData.profilePictureURL;
                            profilePicEl.style.display = 'block';
                        } else {
                            profilePicEl.src = '#';
                            profilePicEl.style.display = 'block';
                        }
                    }

                    const setText = (id, value) => {
                        const el = document.getElementById(id);
                        if (el) el.textContent = value || 'N/A'; else console.warn(`Element with ID ${id} not found for profile page.`);
                    };

                    setText('user-dob', userData.personalDetails?.dateOfBirth);
                    setText('user-gender', userData.personalDetails?.gender);
                    setText('user-phone', userData.contactInfo?.phone);
                    setText('user-address-street', userData.contactInfo?.address?.street);
                    setText('user-address-city', userData.contactInfo?.address?.city);
                    setText('user-address-state', userData.contactInfo?.address?.state);
                    setText('user-address-zip', userData.contactInfo?.address?.zip);
                    setText('user-address-country', userData.contactInfo?.address?.country);
                    setText('user-prev-education', userData.academicBackground?.previousEducation);

                    const transcriptsLink = document.getElementById('user-transcripts-link');
                    const transcriptsNA = document.getElementById('user-transcripts-na');
                    if (transcriptsLink && transcriptsNA) {
                        if (userData.academicBackground?.transcriptsURL) {
                            transcriptsLink.href = userData.academicBackground.transcriptsURL;
                            transcriptsLink.classList.remove('hidden');
                            transcriptsNA.classList.add('hidden');
                        } else {
                            transcriptsLink.classList.add('hidden');
                            transcriptsNA.classList.remove('hidden');
                            transcriptsNA.textContent = 'N/A';
                        }
                    } else {
                         console.warn("Transcript link or NA elements not found on profile page.");
                    }

                    setText('user-degree', userData.programSelection?.degree);
                    setText('user-major', userData.programSelection?.major);
                    setText('user-minor', userData.programSelection?.minor);
                    setText('user-emergency-name', userData.emergencyContact?.name);
                    setText('user-emergency-relationship', userData.emergencyContact?.relationship);
                    setText('user-emergency-phone', userData.emergencyContact?.phone);
                    setText('user-terms-accepted', userData.termsAccepted ? 'Yes' : 'No');

                    const feesBalanceEl = document.getElementById('user-fees-balance');
                    if (feesBalanceEl) {
                        if (userData.feesBalance) {
                            feesBalanceEl.textContent = `${userData.feesBalance.currency} ${userData.feesBalance.amount.toLocaleString()}`;
                        } else {
                            feesBalanceEl.textContent = 'N/A';
                        }
                    }
                }

                if (window.location.pathname.endsWith('dashboard.html')) {
                    const enrolledCoursesList = userData.enrolledCourses || [];
                    loadEnrolledCourses(user.uid, enrolledCoursesList, userData.progress || {});
                    loadAnnouncements(enrolledCoursesList);
                    loadAcademicProgress(user.uid);
                }
            } else {
                console.error('loadUserData - userData is null or undefined for UID:', user.uid);
                if (window.location.pathname.endsWith('profile.html')) {
                    clearProfilePageData();
                }
                if (adminNavLink) {
                    adminNavLink.classList.add('hidden');
                }
            }
        }).catch((error) => {
            console.error('loadUserData - Firebase get() error for UID:', user.uid, error);
            if (window.location.pathname.endsWith('profile.html')) {
                clearProfilePageData();
            }
            const adminNavLink = document.getElementById('admin-nav-link');
            if (adminNavLink) {
                adminNavLink.classList.add('hidden');
            }
        });

        // If on course detail page, load its details
        if (window.location.pathname.endsWith('course.html')) {
           loadCourseDetailsWithAccessCheck(user); // Changed to new access check function
        }
    }

    async function loadAcademicProgress(userId) {
        // ... (loadAcademicProgress logic remains the same) ...
        const coursesInProgressEl = document.getElementById('courses-in-progress');
        const assignmentsDueEl = document.getElementById('assignments-due');
        const upcomingExamsEl = document.getElementById('upcoming-exams');

        if (!coursesInProgressEl || !assignmentsDueEl || !upcomingExamsEl) {
            return;
        }

        try {
            const enrolledCoursesSnapshot = await get(ref(db, `users/${userId}/enrolledCourses`));
            const enrolledCourses = enrolledCoursesSnapshot.val() || [];

            coursesInProgressEl.textContent = enrolledCourses.length;

            let assignmentsDueCount = 0;
            let upcomingExamsCount = 0;
            const now = Date.now();

            for (const courseEnrollment of enrolledCourses) {
                const courseId = typeof courseEnrollment === 'object' && courseEnrollment !== null ? courseEnrollment.courseId : null;
                if (!courseId) continue;

                const assignmentsSnapshot = await get(ref(db, `courses/${courseId}/assignments`));
                const assignments = assignmentsSnapshot.val();
                if (assignments) {
                    Object.values(assignments).forEach(assignment => {
                        if (assignment.dueDate > now) {
                            assignmentsDueCount++;
                        }
                    });
                }

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

    async function loadAllCourses(currentUserId) {
        // ... (loadAllCourses logic remains the same) ...
        const coursesDbRef = ref(db, 'courses');
        const coursesContainer = document.getElementById('courses-container');
        if (!coursesContainer) return;

        try {
            const coursesSnapshot = await get(coursesDbRef);
            coursesContainer.innerHTML = '';
            const courses = coursesSnapshot.val();

            if (courses) {
                const userEnrolledCoursesRef = ref(db, 'users/' + currentUserId + '/enrolledCourses');
                const enrolledSnapshot = await get(userEnrolledCoursesRef);
                const enrolledCourseObjects = enrolledSnapshot.val() || [];

                for (const courseId in courses) {
                    const course = courses[courseId];
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

    async function enrollInCourse(userId, courseId, button) {
        // ... (enrollInCourse logic remains the same - sets currentStatus to 'pending_approval') ...
        const userCoursesDbRef = ref(db, 'users/' + userId + '/enrolledCourses');
        try {
            const snapshot = await get(userCoursesDbRef);
            let enrolledCoursesArray = snapshot.val() || [];
            if (!Array.isArray(enrolledCoursesArray)) enrolledCoursesArray = [];

            const isAlreadyEnrolled = enrolledCoursesArray.some(enrollment => enrollment.courseId === courseId);

            if (!isAlreadyEnrolled) {
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
                    title: course.title || "Untitled Course",
                    currentStatus: 'pending_approval',
                    lastAccessed: Date.now()
                };

                enrolledCoursesArray.push(enrollmentData);
                await set(userCoursesDbRef, enrolledCoursesArray);

                console.log(`User ${userId} enrolled in course ${courseId}`);
                alert(`Successfully enrolled in ${course.title || "the course"}! Status: Pending Approval.`);

                if (button) {
                    button.textContent = 'Enrollment Pending'; // Changed text
                    button.disabled = true;
                    button.classList.add('btn-secondary');
                }

                const userProgressDbRef = ref(db, `users/${userId}/progress/${courseId}`);
                await set(userProgressDbRef, {
                    completedModules: [],
                    lastActivity: Date.now(),
                    totalModules: course.modules ? course.modules.length : 0,
                    assignmentsSubmitted: 0
                });
            } else {
                // If already enrolled, check current status to update button text if needed
                const existingEnrollment = enrolledCoursesArray.find(enrollment => enrollment.courseId === courseId);
                if (button) {
                    if (existingEnrollment && existingEnrollment.currentStatus === 'pending_approval') {
                        button.textContent = 'Enrollment Pending';
                    } else {
                        button.textContent = 'Enrolled';
                    }
                    button.disabled = true;
                    button.classList.add('btn-secondary');
                }
                 alert('You are already enrolled in this course or your enrollment is pending.');
            }
        } catch (error) {
            console.error("Error enrolling in course:", error);
            alert(`Error enrolling: ${error.message}`);
        }
    }

    async function loadEnrolledCourses(userId, enrolledCoursesData, userProgress) {
        const enrolledCoursesList = document.getElementById('enrolled-courses-list');
        if (!enrolledCoursesList) return;
        enrolledCoursesList.innerHTML = '';

        if (!enrolledCoursesData || enrolledCoursesData.length === 0) {
            enrolledCoursesList.innerHTML = '<p>You are not enrolled in any courses yet. <a href="index.html">Browse courses</a>.</p>';
            return;
        }

        for (const enrollment of enrolledCoursesData) {
            const courseId = enrollment.courseId;
            if (!courseId) continue;

            try {
                const courseSnapshot = await get(ref(db, 'courses/' + courseId));
                const course = courseSnapshot.val();
                if (course) {
                    const courseProg = userProgress[courseId] || { completedModules: [], totalModules: course.modules ? course.modules.length : 0 };
                    const completedModulesCount = Array.isArray(courseProg.completedModules) ? courseProg.completedModules.length : 0;
                    const totalModules = course.modules ? course.modules.length : 0;
                    const progressPercent = totalModules > 0 ? (completedModulesCount / totalModules) * 100 : 0;

                    let statusTextHtml = '';
                    let viewButtonHtml = `<a href="course.html?id=${courseId}" class="btn">View Course</a>`;

                    if (enrollment.currentStatus === 'pending_approval') {
                        statusTextHtml = '<p style="color: orange; font-weight: bold;">Status: Pending Approval</p>';
                        viewButtonHtml = `<button class="btn btn-secondary" disabled title="Your enrollment is pending approval">View Course</button>`;
                    } else if (enrollment.currentStatus === 'active') {
                        statusTextHtml = '<p style="color: green; font-weight: bold;">Status: Active</p>';
                    } else if (enrollment.currentStatus) { // Handle other potential statuses
                         statusTextHtml = `<p style="font-weight: bold;">Status: ${enrollment.currentStatus.replace('_', ' ')}</p>`;
                    }


                    const courseCard = document.createElement('div');
                    courseCard.classList.add('course-card');
                    courseCard.innerHTML = `
                        <h3>${enrollment.title || course.title}</h3>
                        ${statusTextHtml}
                        <p>${course.description ? course.description.substring(0,100) + '...' : 'No description.'}</p>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${progressPercent.toFixed(0)}%;">${progressPercent.toFixed(0)}%</div>
                        </div>
                        <p>Modules: ${completedModulesCount} / ${totalModules} completed</p>
                        ${viewButtonHtml}
                    `;
                    enrolledCoursesList.appendChild(courseCard);
                }
            } catch (error) {
                console.error(`Error loading details for enrolled course ${courseId}:`, error);
            }
        }
    }

    function loadAnnouncements(enrolledCoursesData) {
        // ... (loadAnnouncements logic remains the same) ...
        const announcementsList = document.getElementById('announcements-list');
        if (!announcementsList) return;
        announcementsList.innerHTML = '';

        if (!enrolledCoursesData || enrolledCoursesData.length === 0) {
            announcementsList.innerHTML = '<li>No announcements for your courses.</li>';
            return;
        }

        const enrolledCourseIds = enrolledCoursesData.map(enrollment => enrollment.courseId);

        const announcementsDbRef = query(ref(db, 'announcements'), orderByChild('timestamp'));
        onValue(announcementsDbRef, (snapshot) => {
            const allAnnouncements = snapshot.val();
            let userAnnouncementsFound = false;
            announcementsList.innerHTML = '';
            if (allAnnouncements) {
                const announcementKeys = Object.keys(allAnnouncements).sort((a,b) => allAnnouncements[b].timestamp - allAnnouncements[a].timestamp);

                announcementKeys.forEach(key => {
                    const announcement = allAnnouncements[key];
                    if (enrolledCourseIds.includes(announcement.courseId)) {
                        const listItem = document.createElement('li');
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

    // New function to check access before loading course details
    async function loadCourseDetailsWithAccessCheck(user) {
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('id');
        const mainContent = mainContentPages.courseDetail;

        if (!mainContent) return; // Should not happen if on course.html

        if (!courseId) {
            mainContent.innerHTML = '<p>Course ID not found in URL.</p>';
            return;
        }

        if (!user) { // Should be caught by onAuthStateChanged redirect, but good for robustness
            mainContent.innerHTML = '<p>You must be logged in to view course details.</p>';
            return;
        }

        try {
            const userEnrollmentsRef = ref(db, `users/${user.uid}/enrolledCourses`);
            const enrollmentsSnapshot = await get(userEnrollmentsRef);
            const enrolledCourses = enrollmentsSnapshot.val() || [];

            const currentEnrollment = enrolledCourses.find(ec => ec.courseId === courseId);

            if (currentEnrollment && currentEnrollment.currentStatus === 'active') {
                if(mainContentPages.courseDetail) mainContentPages.courseDetail.classList.remove('hidden'); // Show content area
                loadCourseDetails(courseId, user.uid); // Proceed to load full details
            } else if (currentEnrollment && currentEnrollment.currentStatus === 'pending_approval') {
                mainContent.innerHTML = `<h1>${currentEnrollment.title || 'Course'}</h1><p style="color: orange; font-weight: bold;">Your enrollment for this course is pending approval. You cannot access course materials yet.</p><p><a href="dashboard.html">Go to Dashboard</a></p>`;
                if(mainContentPages.courseDetail) mainContentPages.courseDetail.classList.remove('hidden'); // Show message area
            } else {
                // Not enrolled or status is not active/pending (e.g. dropped, completed and archived etc.)
                mainContent.innerHTML = `<p>You are not actively enrolled in this course or your enrollment is not approved. <a href="index.html">Browse courses</a> or check your <a href="dashboard.html">dashboard</a>.</p>`;
                if(mainContentPages.courseDetail) mainContentPages.courseDetail.classList.remove('hidden');
            }
        } catch (error) {
            console.error("Error checking course enrollment status:", error);
            mainContent.innerHTML = "<p>Error checking your enrollment status. Please try again.</p>";
            if(mainContentPages.courseDetail) mainContentPages.courseDetail.classList.remove('hidden');
        }
    }


    async function loadCourseDetails(courseId, userId) { // This is the original function, now called by loadCourseDetailsWithAccessCheck
        // ... (loadCourseDetails logic remains the same) ...
        const courseTitleEl = document.getElementById('course-title');
        const courseSyllabusEl = document.getElementById('course-syllabus');
        const modulesListEl = document.getElementById('modules-list');
        const courseCodeEl = document.getElementById('course-code-display');
        const courseCreditsEl = document.getElementById('course-credits-display');
        const mainContent = mainContentPages.courseDetail; // Keep for error messages inside

        // No need to check mainContentPages.courseDetail here as loadCourseDetailsWithAccessCheck does it.
        // if (!courseTitleEl || !courseSyllabusEl || !modulesListEl || !mainContent) return; // Redundant

        try {
            const courseSnapshot = await get(ref(db, 'courses/' + courseId));
            const course = courseSnapshot.val();
            if (!course) {
                // This case should ideally be caught by enrollment check, but as a fallback:
                if(mainContent) mainContent.innerHTML = '<p>Course data not found.</p>';
                return;
            }

            courseTitleEl.textContent = course.title || 'N/A';
            if(courseCodeEl) courseCodeEl.textContent = course.code || 'N/A';
            if(courseCreditsEl) courseCreditsEl.textContent = course.creditHours !== undefined ? course.creditHours : 'N/A';
            courseSyllabusEl.textContent = course.description || 'No syllabus provided.';
            modulesListEl.innerHTML = '';

            const progressSnapshot = await get(ref(db, `users/${userId}/progress/${courseId}`));
            const courseProgress = progressSnapshot.val() || { completedModules: [] };
            const completedModules = Array.isArray(courseProgress.completedModules) ? courseProgress.completedModules : [];

            if (course.modules && course.modules.length > 0) {
                course.modules.forEach((module, index) => {
                    const moduleId = module.moduleId || `module-${index}`;
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

                document.querySelectorAll('.mark-complete-btn').forEach(button => {
                    button.addEventListener('click', () => {
                        markModuleComplete(userId, button.dataset.courseId, button.dataset.moduleId, button);
                    });
                });

            } else {
                modulesListEl.innerHTML = '<p>No modules available for this course.</p>';
            }

            await loadCourseAssessments(courseId, userId);

        } catch (error) {
            console.error("Error loading course details content:", error);
            if(mainContent) mainContent.innerHTML = '<p>Error loading course details content.</p>';
        }

        const uploadBtn = document.getElementById('upload-assignment-btn');
        if(uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                alert('Assignment upload simulation: This feature is not fully implemented.');
            });
        }
    }

    async function loadCourseAssessments(courseId, userId) {
        // ... (loadCourseAssessments logic remains the same) ...
        const examsListEl = document.getElementById('exams-list');
        const assignmentsListEl = document.getElementById('assignments-list');

        if (!examsListEl || !assignmentsListEl) {
            console.warn("Assessment list elements not found on this page.");
            return;
        }

        try {
            const examsSnapshot = await get(ref(db, `courses/${courseId}/exams`));
            const exams = examsSnapshot.val();

            examsListEl.innerHTML = '';
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

            const assignmentsSnapshot = await get(ref(db, `courses/${courseId}/assignments`));
            const assignments = assignmentsSnapshot.val();

            assignmentsListEl.innerHTML = '';
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
        // ... (markModuleComplete logic remains the same) ...
        const progressDbRef = ref(db, `users/${userId}/progress/${courseId}/completedModules`);
        try {
            const snapshot = await get(progressDbRef);
            let completedModules = snapshot.val() || [];
            if (!Array.isArray(completedModules)) completedModules = [];

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
                     const currentUser = auth.currentUser;
                     if(currentUser) loadUserData(currentUser);
                }
            }
        } catch (error) {
            console.error("Error marking module complete:", error);
            alert(`Error: ${error.message}`);
        }
    }

    // --- Admin Page Specific Logic (within initializeAdminPage) ---
    function initializeAdminPage() {
        // ... (initializeAdminPage with createCourseForm listener remains the same) ...
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
                    content: ""
                }));

                const coursesRefPath = ref(db, 'courses');
                const newCourseRef = push(coursesRefPath);

                const newCourseData = {
                    title: title, code: code, description: description, creditHours: creditHours,
                    modules: modules, instructor: "", department: "", level: "", term: "",
                    exams: {}, assignments: {}, createdAt: Date.now(),
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

        const adminUserSelect = document.getElementById('admin-user-select');
        const adminSelectedUserDetailsDiv = document.getElementById('admin-selected-user-details');
        const adminSelectedUserNameEl = document.getElementById('admin-selected-user-name');
        const adminSelectedUserFeesEl = document.getElementById('admin-selected-user-fees');
        const adminNewFeesAmountInput = document.getElementById('admin-new-fees-amount');
        const adminNewFeesCurrencyInput = document.getElementById('admin-new-fees-currency');
        const adminUpdateFeesBtn = document.getElementById('admin-update-fees-btn');
        const adminUpdateFeesMessageEl = document.getElementById('admin-update-fees-message');
        const adminPendingEnrollmentsDiv = document.getElementById('admin-pending-enrollments');
        let allUsersData = {};

        async function loadAllUsersForAdmin() {
            // ... (loadAllUsersForAdmin logic remains the same) ...
            if (!adminUserSelect) return;
            adminUserSelect.innerHTML = '<option value="">Loading users...</option>';
            try {
                const usersSnapshot = await get(ref(db, 'users'));
                allUsersData = usersSnapshot.val();
                adminUserSelect.innerHTML = '<option value="">-- Select a User --</option>';
                if (allUsersData) {
                    for (const userId in allUsersData) {
                        const userData = allUsersData[userId];
                        const option = document.createElement('option');
                        option.value = userId;
                        option.textContent = `${userData.displayName} (${userData.email})`;
                        adminUserSelect.appendChild(option);
                    }
                } else {
                    adminUserSelect.innerHTML = '<option value="">No users found.</option>';
                }
            } catch (error) {
                console.error("Error loading users for admin:", error);
                adminUserSelect.innerHTML = '<option value="">Error loading users.</option>';
            }
        }

        async function displayUserDetailsForAdmin(userId) {
            // ... (displayUserDetailsForAdmin logic for fees and enrollments remains the same) ...
            if (!adminSelectedUserDetailsDiv || !userId || !allUsersData[userId]) {
                if(adminSelectedUserDetailsDiv) adminSelectedUserDetailsDiv.classList.add('hidden');
                return;
            }
            const userData = allUsersData[userId];

            if(adminSelectedUserNameEl) adminSelectedUserNameEl.textContent = `Managing: ${userData.displayName}`;
            if(adminSelectedUserFeesEl) {
                if (userData.feesBalance) {
                    adminSelectedUserFeesEl.textContent = `${userData.feesBalance.currency} ${userData.feesBalance.amount.toLocaleString()}`;
                } else {
                    adminSelectedUserFeesEl.textContent = 'N/A (Default MWK 27,500 will be set if updated)';
                }
            }
            if(adminNewFeesAmountInput && userData.feesBalance) adminNewFeesAmountInput.value = userData.feesBalance.amount;
            else if(adminNewFeesAmountInput) adminNewFeesAmountInput.value = '';
            if(adminNewFeesCurrencyInput && userData.feesBalance) adminNewFeesCurrencyInput.value = userData.feesBalance.currency;
            else if(adminNewFeesCurrencyInput) adminNewFeesCurrencyInput.value = 'MWK';


            if(adminPendingEnrollmentsDiv) {
                adminPendingEnrollmentsDiv.innerHTML = '<p>Loading pending enrollments...</p>';
                const enrolledCourses = userData.enrolledCourses || [];
                const pendingEnrollments = enrolledCourses.filter(ec => ec.currentStatus === 'pending_approval');

                if (pendingEnrollments.length > 0) {
                    adminPendingEnrollmentsDiv.innerHTML = '<h5>Pending Course Approvals:</h5>';
                    const ul = document.createElement('ul');
                    ul.style.listStyleType = 'none';
                    ul.style.paddingLeft = '0';
                    pendingEnrollments.forEach(enrollment => {
                        const li = document.createElement('li');
                        li.style.marginBottom = '10px';
                        li.innerHTML = `
                            <span>${enrollment.title || enrollment.courseId}</span>
                            <button class="btn btn-secondary btn-sm approve-enrollment-btn" data-course-id="${enrollment.courseId}" style="margin-left: 10px; padding: 5px 10px; font-size: 0.8em;">Approve</button>
                        `;
                        ul.appendChild(li);
                    });
                    adminPendingEnrollmentsDiv.appendChild(ul);

                    document.querySelectorAll('.approve-enrollment-btn').forEach(button => {
                        button.addEventListener('click', async () => {
                            const courseIdToApprove = button.dataset.courseId;
                            await approveCourseEnrollment(userId, courseIdToApprove);
                            displayUserDetailsForAdmin(userId);
                        });
                    });

                } else {
                    adminPendingEnrollmentsDiv.innerHTML = '<p>No pending course enrollments for this user.</p>';
                }
            }
            if(adminSelectedUserDetailsDiv) adminSelectedUserDetailsDiv.classList.remove('hidden');
        }

        if(adminUserSelect) {
            adminUserSelect.addEventListener('change', () => {
                const selectedUserId = adminUserSelect.value;
                if (selectedUserId) {
                    displayUserDetailsForAdmin(selectedUserId);
                } else {
                    if(adminSelectedUserDetailsDiv) adminSelectedUserDetailsDiv.classList.add('hidden');
                }
            });
        }

        if(adminUpdateFeesBtn) {
            adminUpdateFeesBtn.addEventListener('click', async () => {
                // ... (update fees button logic remains the same) ...
                const selectedUserId = adminUserSelect.value;
                if (!selectedUserId) {
                    if(adminUpdateFeesMessageEl) adminUpdateFeesMessageEl.textContent = "Please select a user first.";
                    return;
                }
                const newAmount = parseFloat(adminNewFeesAmountInput.value);
                const newCurrency = adminNewFeesCurrencyInput.value || "MWK";

                if (isNaN(newAmount)) {
                    if(adminUpdateFeesMessageEl) adminUpdateFeesMessageEl.textContent = "Please enter a valid amount.";
                    return;
                }
                try {
                    const feesRef = ref(db, `users/${selectedUserId}/feesBalance`);
                    await set(feesRef, { amount: newAmount, currency: newCurrency });
                    if(adminUpdateFeesMessageEl) {
                        adminUpdateFeesMessageEl.textContent = "Fees updated successfully!";
                        adminUpdateFeesMessageEl.style.color = 'green';
                    }
                    if(adminSelectedUserFeesEl) adminSelectedUserFeesEl.textContent = `${newCurrency} ${newAmount.toLocaleString()}`;
                    if(allUsersData[selectedUserId]) allUsersData[selectedUserId].feesBalance = { amount: newAmount, currency: newCurrency };

                } catch (error) {
                    console.error("Error updating fees:", error);
                     if(adminUpdateFeesMessageEl) {
                        adminUpdateFeesMessageEl.textContent = `Error updating fees: ${error.message}`;
                        adminUpdateFeesMessageEl.style.color = 'var(--mit-red)';
                    }
                }
            });
        }

        loadAllUsersForAdmin();
    }

    async function approveCourseEnrollment(userId, courseIdToApprove) {
        // ... (approveCourseEnrollment logic remains the same) ...
        const userEnrollmentsRef = ref(db, `users/${userId}/enrolledCourses`);
        try {
            const snapshot = await get(userEnrollmentsRef);
            let enrolledCourses = snapshot.val() || [];
            if (!Array.isArray(enrolledCourses)) enrolledCourses = [];

            const courseIndex = enrolledCourses.findIndex(ec => ec.courseId === courseIdToApprove && ec.currentStatus === 'pending_approval');

            if (courseIndex > -1) {
                enrolledCourses[courseIndex].currentStatus = 'active';
                enrolledCourses[courseIndex].lastAccessed = Date.now();
                await set(userEnrollmentsRef, enrolledCourses);
                console.log(`Enrollment for course ${courseIdToApprove} approved for user ${userId}.`);
                alert(`Enrollment for course ${courseIdToApprove} approved.`);
            } else {
                console.warn(`Could not find pending enrollment for course ${courseIdToApprove} for user ${userId}.`);
                alert(`Could not find pending enrollment for course ${courseIdToApprove}. It might have been already approved or does not exist.`);
            }
        } catch (error) {
            console.error("Error approving enrollment:", error);
            alert(`Error approving enrollment: ${error.message}`);
        }
    }

    async function ensureSampleDataIsPopulated() {
        // ... (ensureSampleDataIsPopulated logic remains the same) ...
        try {
            const coursesSnapshot = await get(ref(db, 'courses'));
            if (!coursesSnapshot.exists() || !coursesSnapshot.val()) {
                console.info("No existing course data found. Populating sample data...");
                await addSampleCourses();
                await addSampleAnnouncements();
                console.info("Sample data automatically populated.");
            } else {
                console.info("Sample data check: Course data already exists.");
            }
        } catch (error) {
            console.error("Error during sample data check/population:", error);
        }
    }

    // Initial Page Load Logic
    if (window.location.pathname.endsWith('admin.html')) {
        onAuthStateChanged(auth, user => {
            if (user) {
                const userDbRef = ref(db, 'users/' + user.uid);
                get(userDbRef).then(snapshot => {
                    const userData = snapshot.val();
                    if (!userData || (userData.role !== 'admin' && userData.role !== 'faculty')) {
                        window.location.href = 'index.html';
                    } else {
                        initializeAdminPage();
                    }
                }).catch(() => window.location.href = 'index.html');
            } else {
                window.location.href = 'index.html';
            }
        });
    } else if (window.location.pathname.endsWith('course.html')) {
        onAuthStateChanged(auth, user => {
            if(user) {
                loadCourseDetailsWithAccessCheck(user);
            } else {
                // if not logged in and trying to access course page, redirect
                const mainContent = mainContentPages.courseDetail;
                if(mainContent) mainContent.innerHTML = '<p>You must be logged in to view course details. Redirecting...</p>';
                setTimeout(() => window.location.href = 'index.html', 2000);
            }
        });
    } else { // For index.html, dashboard.html, profile.html
         onAuthStateChanged(auth, user => { // This will trigger loadUserData if user is present
            // Handled by the main onAuthStateChanged listener
         });
    }


    if (auth && db) {
        await ensureSampleDataIsPopulated();
    }

}); // End DOMContentLoaded
