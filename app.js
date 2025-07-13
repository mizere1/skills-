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
    query,
    limitToLast,
    onChildAdded
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import {
    getStorage,
    ref as storageRef,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

// Import functions to populate sample data
import { addSampleCourses, addSampleAnnouncements, addSampleAcademicTerms } from './sample-data.js';

// --- Global DOM Element variables ---
let loginForm, signupForm, logoutButton, loginLogoutNav, authSection, authError, welcomeMessage;
let mainContentPages = {};
let storage;

// --- CORE HELPER & AUTH FUNCTIONS ---
function handleLogout() {
    console.log("handleLogout: CALLED");
    signOut(auth).then(() => {
        console.log('User logged out successfully via handleLogout');
    }).catch(error => {
        console.error('Logout error in handleLogout:', error);
        alert(`Logout failed: ${error.message}`);
    });
}

async function uploadFileToStorage(file, path) {
    if (!file || !storage) {
        console.warn("uploadFileToStorage: File or storage service not available.", {filePresent: !!file, storageExists: !!storage});
        return null;
    }
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

function showAuthSection(e){
    console.log("showAuthSection: CALLED");
    if(e) e.preventDefault();
    if (authSection) authSection.classList.remove('hidden');
    if (welcomeMessage) welcomeMessage.classList.add('hidden');
    if (mainContentPages.home && (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/'))) {
        const coursesContainer = document.getElementById('courses-container');
        if (coursesContainer) coursesContainer.innerHTML = '';
    }
}

function clearProfilePageData() {
    console.log("clearProfilePageData: CALLED");
    const profileFieldsIds = [
        'user-name', 'user-email', 'user-role', 'user-dob', 'user-gender',
        'user-phone', 'user-address-street', 'user-address-city', 'user-address-state',
        'user-address-zip', 'user-address-country', 'user-prev-education',
        'user-degree', 'user-major', 'user-minor', 'user-emergency-name',
        'user-emergency-relationship', 'user-emergency-phone', 'user-terms-accepted',
        'user-fees-balance'
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

// --- UI Update Functions (General) ---
function updateUIForLoggedInUser(user) {
    console.log("--- updateUIForLoggedInUser: ENTERED for user:", user?.uid);
    if (loginLogoutNav) {
        loginLogoutNav.textContent = 'Logout';
        loginLogoutNav.removeEventListener('click', showAuthSection);
        loginLogoutNav.addEventListener('click', (e) => {
            console.log("Logout link in NAV clicked");
            e.preventDefault();
            handleLogout();
        });
    }
    if (authSection) authSection.classList.add('hidden');

    if (welcomeMessage && (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/'))) {
        welcomeMessage.classList.remove('hidden');
        const h1 = welcomeMessage.querySelector('h1');
        if(h1 && user.displayName) h1.textContent = `Welcome, ${user.displayName}!`;
        else if(h1) h1.textContent = `Welcome!`;
    }

    Object.values(mainContentPages).forEach(pageEl => {
        if (pageEl) pageEl.classList.add('hidden');
    });
    const currentPage = window.location.pathname.split("/").pop();
    const pageKey = currentPage.split('.')[0];
    if (mainContentPages[pageKey] && mainContentPages[pageKey] !== null) {
         mainContentPages[pageKey].classList.remove('hidden');
    } else if (currentPage === '' || currentPage === 'index.html') {
         if(mainContentPages.home) mainContentPages.home.classList.remove('hidden');
    }
    const profileNavLink = document.getElementById('profile-nav-link');
    if(profileNavLink) profileNavLink.classList.remove('hidden');
}

function updateUIForLoggedOutUser() {
    console.log("updateUIForLoggedOutUser: CALLED");
    if (loginLogoutNav) {
        loginLogoutNav.textContent = 'Login';
        loginLogoutNav.removeEventListener('click', handleLogout);
        if (typeof showAuthSection === 'function') {
            loginLogoutNav.addEventListener('click', showAuthSection);
        } else {
            console.error("showAuthSection is not defined when trying to attach to loginLogoutNav in updateUIForLoggedOutUser");
        }
    }
    Object.values(mainContentPages).forEach(pageEl => {
        if (pageEl) pageEl.classList.add('hidden');
    });
    const adminNavLink = document.getElementById('admin-nav-link');
    if(adminNavLink) adminNavLink.classList.add('hidden');
    const studentChatNavLink = document.getElementById('student-chat-nav-link');
    if(studentChatNavLink) studentChatNavLink.classList.add('hidden');
    const profileNavLink = document.getElementById('profile-nav-link');
    if(profileNavLink) profileNavLink.classList.add('hidden');

    const currentPage = window.location.pathname.split("/").pop();
    const protectedPages = ['dashboard.html', 'profile.html', 'course.html', 'admin.html', 'chat.html'];

    if (protectedPages.includes(currentPage)) {
        console.log(`updateUIForLoggedOutUser: On protected page ${currentPage}, redirecting to index.html`);
        window.location.href = 'index.html';
    } else if (currentPage === 'index.html' || currentPage === '') {
        if (authSection) authSection.classList.remove('hidden');
        if (welcomeMessage) welcomeMessage.classList.add('hidden');
        if (mainContentPages.home) mainContentPages.home.classList.remove('hidden');
        const coursesContainer = document.getElementById('courses-container');
        if (coursesContainer) coursesContainer.innerHTML = '<p>Please log in or sign up to see courses.</p>';
    }
    if (window.location.pathname.endsWith('profile.html')) clearProfilePageData();
    if (document.getElementById('enrolled-courses-list')) document.getElementById('enrolled-courses-list').innerHTML = '';
    if (document.getElementById('announcements-list')) document.getElementById('announcements-list').innerHTML = '<li>No new announcements.</li>';
    if (document.getElementById('platform-news-list')) document.getElementById('platform-news-list').innerHTML = '<li>No platform news.</li>';
    if (document.getElementById('chat-messages-area')) {
        const chatArea = document.getElementById('chat-messages-area');
        if(chatArea) chatArea.innerHTML = '<p>Please log in to chat.</p>';
    }
}

// --- Page Specific Initializers ---
function initializeAdminPageLogic(adminUser, adminUserData) {
    console.log("Initializing Admin Page Logic for user:", adminUser.uid);
    const createCourseForm = document.getElementById('create-course-form');
    const createCourseMessageEl = document.getElementById('create-course-message');
    const courseCreationTermSelectEl = document.getElementById('course-creation-term-select');

    if (createCourseForm) {
        createCourseForm.addEventListener('submit', async (ev) => {
            ev.preventDefault(); if(createCourseMessageEl) createCourseMessageEl.textContent = '';
            const data = {
                title: document.getElementById('course-title-input').value,
                code: document.getElementById('course-code-input').value,
                description: document.getElementById('course-description-input').value,
                creditHours: parseFloat(document.getElementById('course-credits-input').value),
                moduleTitlesRaw: document.getElementById('course-modules-input').value,
                academicTermId: courseCreationTermSelectEl.value
            };
            if (!data.title || !data.code || !data.description || isNaN(data.creditHours) || !data.academicTermId) {
                if(createCourseMessageEl) { createCourseMessageEl.textContent = 'All fields including Academic Term are required.'; createCourseMessageEl.style.color = 'var(--mit-red)';}
                return;
            }
            const modules = data.moduleTitlesRaw.split('\n').filter(t => t.trim() !== '').map((title, i) => ({ moduleId: `module-${i}`, title: title, content: "" }));
            const newCourseRef = push(ref(db, 'courses'));
            const newCourseData = {
                title: data.title, code: data.code, description: data.description, creditHours: data.creditHours, modules: modules, academicTermId: data.academicTermId,
                instructor: "", department: "", level: "", term: "", exams: {}, assignments: {}, createdAt: Date.now(), createdBy: adminUser.uid
            };
            delete newCourseData.moduleTitlesRaw;
            try {
                await set(newCourseRef, newCourseData);
                if(createCourseMessageEl) { createCourseMessageEl.textContent = 'Course created!'; createCourseMessageEl.style.color = 'green';}
                createCourseForm.reset();
            } catch (err) { console.error("Error creating course:", err); if(createCourseMessageEl){createCourseMessageEl.textContent = `Error: ${err.message}`; createCourseMessageEl.style.color = 'var(--mit-red)';}}
        });
    }

    const createTermForm = document.getElementById('create-term-form');
    const termCreateStatusEl = document.getElementById('term-create-status');
    const existingTermsListEl = document.getElementById('existing-terms-list');

    async function displayExistingTerms() {
        if (!existingTermsListEl || !courseCreationTermSelectEl) {
            console.warn("displayExistingTerms: Term list or select element not found.");
            return;
        }
        existingTermsListEl.innerHTML = '<li>Loading terms...</li>';
        courseCreationTermSelectEl.innerHTML = '<option value="">Loading Terms...</option>';

        try {
            const termsSnapshot = await get(query(ref(db, 'academicTerms'), orderByChild('startDate')));
            existingTermsListEl.innerHTML = '';
            courseCreationTermSelectEl.innerHTML = '<option value="">-- Select Term --</option>';

            if (termsSnapshot.exists()) {
                termsSnapshot.forEach(termSnap => {
                    const termId = termSnap.key;
                    const term = termSnap.val();
                    const li = document.createElement('li');
                    li.textContent = `${term.name} (${term.type}): ${term.startDate} to ${term.endDate}`;
                    existingTermsListEl.appendChild(li);

                    const option = document.createElement('option');
                    option.value = termId;
                    option.textContent = term.name;
                    courseCreationTermSelectEl.appendChild(option);
                });
            } else {
                existingTermsListEl.innerHTML = '<li>No academic terms created yet.</li>';
                courseCreationTermSelectEl.innerHTML = '<option value="">No terms available</option>';
            }
        } catch (error) {
            console.error("Error loading academic terms:", error);
            existingTermsListEl.innerHTML = '<li>Error loading terms.</li>';
            courseCreationTermSelectEl.innerHTML = '<option value="">Error loading terms</option>';
        }
    }

    if (createTermForm) {
        createTermForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(termCreateStatusEl) termCreateStatusEl.textContent = '';
            const termName = document.getElementById('term-name').value;
            const termYear = parseInt(document.getElementById('term-year').value);
            const termType = document.getElementById('term-type').value;
            const termStartDate = document.getElementById('term-start-date').value;
            const termEndDate = document.getElementById('term-end-date').value;

            if (!termName || isNaN(termYear) || !termType || !termStartDate || !termEndDate) {
                if(termCreateStatusEl) {termCreateStatusEl.textContent = "All fields are required."; termCreateStatusEl.style.color = 'var(--mit-red)';}
                return;
            }
            if (new Date(termEndDate) < new Date(termStartDate)) {
                if(termCreateStatusEl) {termCreateStatusEl.textContent = "End date cannot be before start date."; termCreateStatusEl.style.color = 'var(--mit-red)';}
                return;
            }
            const termData = {
                name: termName, year: termYear, type: termType, startDate: termStartDate, endDate: termEndDate,
                createdBy: adminUser.uid, createdAt: Date.now()
            };
            try {
                await push(ref(db, 'academicTerms'), termData);
                if(termCreateStatusEl) {termCreateStatusEl.textContent = "Academic term created successfully!"; termCreateStatusEl.style.color = 'green';}
                createTermForm.reset();
                displayExistingTerms();
            } catch (error) {
                console.error("Error creating academic term:", error);
                if(termCreateStatusEl) {termCreateStatusEl.textContent = `Error: ${error.message}`; termCreateStatusEl.style.color = 'var(--mit-red)';}
            }
        });
    }
    if(existingTermsListEl && courseCreationTermSelectEl) displayExistingTerms();

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
        if (!adminUserSelect) return;
        adminUserSelect.innerHTML = '<option value="">Loading...</option>';
        try {
            const usersSnapshot = await get(ref(db, 'users'));
            allUsersData = usersSnapshot.val();
            adminUserSelect.innerHTML = '<option value="">-- Select User --</option>';
            if (allUsersData) for (const userId_iter in allUsersData) {
                const u = allUsersData[userId_iter];
                const opt = document.createElement('option'); opt.value = userId_iter;
                opt.textContent = `${u.displayName} (${u.email})`; adminUserSelect.appendChild(opt);
            } else adminUserSelect.innerHTML = '<option value="">No users.</option>';
        } catch (e) { console.error("Error loading users for admin:", e); adminUserSelect.innerHTML = '<option value="">Error.</option>';}
    }
    async function displayUserDetailsForAdmin(userId) {
        if (!adminSelectedUserDetailsDiv || !userId || !allUsersData[userId]) {
            if(adminSelectedUserDetailsDiv) adminSelectedUserDetailsDiv.classList.add('hidden'); return;
        }
        const selectedUserData = allUsersData[userId];
        if(adminSelectedUserNameEl) adminSelectedUserNameEl.textContent = `Managing: ${selectedUserData.displayName}`;
        if(adminSelectedUserFeesEl) adminSelectedUserFeesEl.textContent = selectedUserData.feesBalance ? `${selectedUserData.feesBalance.currency} ${selectedUserData.feesBalance.amount.toLocaleString()}` : 'N/A';
        if(adminNewFeesAmountInput) adminNewFeesAmountInput.value = selectedUserData.feesBalance?.amount || '';
        if(adminNewFeesCurrencyInput) adminNewFeesCurrencyInput.value = selectedUserData.feesBalance?.currency || 'MWK';

        if(adminPendingEnrollmentsDiv) {
            adminPendingEnrollmentsDiv.innerHTML = '<p>Loading enrollments...</p>';
            const enrolled = selectedUserData.enrolledCourses || [];
            const pending = enrolled.filter(ec => ec.currentStatus === 'pending_approval');
            if (pending.length > 0) {
                adminPendingEnrollmentsDiv.innerHTML = '<h5>Pending Approvals:</h5>'; const ul = document.createElement('ul'); ul.style.cssText = 'list-style:none;padding:0;';
                pending.forEach(enr => {
                    const li = document.createElement('li'); li.style.marginBottom='10px';
                    li.innerHTML = `<span>${enr.title || enr.courseId}</span> <button class="btn btn-sm approve-enrollment-btn" data-course-id="${enr.courseId}" style="margin-left:10px;padding:5px 10px;font-size:0.8em;">Approve</button>`;
                    ul.appendChild(li);
                });
                adminPendingEnrollmentsDiv.appendChild(ul);
                adminPendingEnrollmentsDiv.querySelectorAll('.approve-enrollment-btn').forEach(b => b.addEventListener('click', async () => {
                    await approveCourseEnrollment(userId, b.dataset.courseId); displayUserDetailsForAdmin(userId);
                }));
            } else adminPendingEnrollmentsDiv.innerHTML = '<p>No pending enrollments.</p>';
        }
        if(adminSelectedUserDetailsDiv) adminSelectedUserDetailsDiv.classList.remove('hidden');
    }
    if(adminUserSelect) adminUserSelect.addEventListener('change', () => {
        const uid = adminUserSelect.value; uid ? displayUserDetailsForAdmin(uid) : adminSelectedUserDetailsDiv.classList.add('hidden');
    });
    if(adminUpdateFeesBtn) adminUpdateFeesBtn.addEventListener('click', async () => {
        const uid = adminUserSelect.value; if (!uid) { if(adminUpdateFeesMessageEl) adminUpdateFeesMessageEl.textContent = "Select user."; return; }
        const amt = parseFloat(adminNewFeesAmountInput.value); const cur = adminNewFeesCurrencyInput.value || "MWK";
        if (isNaN(amt)) { if(adminUpdateFeesMessageEl) adminUpdateFeesMessageEl.textContent = "Valid amount needed."; return; }
        try {
            await set(ref(db, `users/${uid}/feesBalance`), { amount: amt, currency: cur });
            if(adminUpdateFeesMessageEl) { adminUpdateFeesMessageEl.textContent = "Fees updated!"; adminUpdateFeesMessageEl.style.color = 'green';}
            if(adminSelectedUserFeesEl) adminSelectedUserFeesEl.textContent = `${cur} ${amt.toLocaleString()}`;
            if(allUsersData[uid]) allUsersData[uid].feesBalance = { amount: amt, currency: cur };
        } catch (e) { console.error("Error updating fees:", e); if(adminUpdateFeesMessageEl){ adminUpdateFeesMessageEl.textContent = `Error: ${e.message}`; adminUpdateFeesMessageEl.style.color = 'var(--mit-red)';}}
    });

    const platformUpdateForm = document.getElementById('platform-update-form');
    const platformUpdateMessageInput = document.getElementById('platform-update-message');
    const platformUpdateStatusEl = document.getElementById('platform-update-status');
    if (platformUpdateForm && platformUpdateMessageInput && platformUpdateStatusEl) {
        platformUpdateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = platformUpdateMessageInput.value.trim();
            if (!message) { platformUpdateStatusEl.textContent = "Message empty."; platformUpdateStatusEl.style.color = 'var(--mit-red)'; return; }
            const currentUser = auth.currentUser;
            if (!currentUser) { platformUpdateStatusEl.textContent = "Not authenticated."; platformUpdateStatusEl.style.color = 'var(--mit-red)'; return; }
            let authorDisplayName = adminUserData?.displayName || "Admin";
            const announcementData = { message, timestamp: Date.now(), postedBy: currentUser.uid, authorName: authorDisplayName };
            try {
                await push(ref(db, 'platformAnnouncements'), announcementData);
                platformUpdateStatusEl.textContent = "Update posted!"; platformUpdateStatusEl.style.color = 'green';
                platformUpdateMessageInput.value = '';
            } catch (error) { console.error("Error posting platform update:", error); platformUpdateStatusEl.textContent = `Error: ${error.message}`; platformUpdateStatusEl.style.color = 'var(--mit-red)';}
        });
    }
    loadAllUsersForAdmin();

    // --- Course Content Management Logic ---
    const adminCourseSelect = document.getElementById('admin-course-select');
    const courseContentEditor = document.getElementById('course-content-editor');
    const editingCourseTitleEl = document.getElementById('editing-course-title');
    const courseSectionsContainer = document.getElementById('course-sections-container');
    const addSectionForm = document.getElementById('add-section-form');
    const newSectionTitleInput = document.getElementById('new-section-title');
    const deleteCourseBtn = document.getElementById('delete-course-btn');

    let allCoursesData = {};
    let selectedCourseId = null;

    async function loadAllCoursesForAdmin() {
        if (!adminCourseSelect) return;
        adminCourseSelect.innerHTML = '<option value="">Loading Courses...</option>';
        try {
            const coursesSnapshot = await get(ref(db, 'courses'));
            allCoursesData = coursesSnapshot.val();
            adminCourseSelect.innerHTML = '<option value="">-- Select a Course --</option>';
            if (allCoursesData) {
                for (const courseId in allCoursesData) {
                    const course = allCoursesData[courseId];
                    const option = document.createElement('option');
                    option.value = courseId;
                    option.textContent = `${course.title} (${course.code || 'No Code'})`;
                    adminCourseSelect.appendChild(option);
                }
            } else {
                adminCourseSelect.innerHTML = '<option value="">No courses available</option>';
            }
        } catch (error) {
            console.error("Error loading courses for admin select:", error);
            adminCourseSelect.innerHTML = '<option value="">Error loading courses</option>';
        }
    }

    function renderCourseSections(courseId) {
        if (!courseId || !allCoursesData[courseId]) {
            courseSectionsContainer.innerHTML = '<p>Could not load sections for this course.</p>';
            return;
        }
        const course = allCoursesData[courseId];
        const sections = course.sections || [];
        courseSectionsContainer.innerHTML = '<h4>Existing Sections</h4>';

        if (sections.length === 0) {
            courseSectionsContainer.innerHTML += '<p>No sections created yet for this course.</p>';
        } else {
            const sectionsList = document.createElement('div');
            sections.forEach((section, index) => {
                const sectionEl = document.createElement('div');
                sectionEl.classList.add('admin-section-container');
                sectionEl.style.cssText = 'background-color: #fff; padding: 15px; border: 1px solid #ddd; margin-bottom: 15px; border-radius: 4px;';

                const sectionTitle = document.createElement('h5');
                sectionTitle.textContent = section.title;
                sectionEl.appendChild(sectionTitle);

                // Display existing content
                const contentList = document.createElement('ul');
                contentList.style.cssText = 'list-style-type: disc; padding-left: 20px;';
                const sectionContent = section.content || [];
                if (sectionContent.length > 0) {
                    sectionContent.forEach(item => {
                        const contentLi = document.createElement('li');
                        contentLi.textContent = `[${item.type}] ${item.title}`;
                        contentList.appendChild(contentLi);
                    });
                } else {
                    const noContentLi = document.createElement('li');
                    noContentLi.textContent = 'No content in this section yet.';
                    noContentLi.style.fontStyle = 'italic';
                    contentList.appendChild(noContentLi);
                }
                sectionEl.appendChild(contentList);

                // Add content forms
                const contentFormsContainer = document.createElement('div');
                contentFormsContainer.classList.add('content-forms-container');
                contentFormsContainer.style.marginTop = '15px';

                const videoForm = document.getElementById('add-video-form-template').cloneNode(true);
                const pdfForm = document.getElementById('add-pdf-form-template').cloneNode(true);
                const moduleForm = document.getElementById('add-module-form-template').cloneNode(true);

                contentFormsContainer.appendChild(videoForm);
                contentFormsContainer.appendChild(pdfForm);
                contentFormsContainer.appendChild(moduleForm);

                sectionEl.appendChild(contentFormsContainer);

                sectionsList.appendChild(sectionEl);
            });
            courseSectionsContainer.appendChild(sectionsList);

            // Add event listeners to the new buttons
            document.querySelectorAll('.add-content-btn').forEach(button => {
                button.addEventListener('click', handleAddNewContent);
            });

            document.querySelectorAll('.delete-content-btn').forEach(button => {
                button.addEventListener('click', handleDeleteContent);
            });
        }
    }

    async function handleAddNewContent(e) {
        const button = e.target;
        const form = button.closest('.add-content-form');
        const contentType = button.dataset.type;
        const sectionEl = form.closest('.admin-section-container');

        // Find the index of the section
        const sectionsInDOM = Array.from(courseSectionsContainer.querySelectorAll('.admin-section-container'));
        const sectionIndex = sectionsInDOM.indexOf(sectionEl);

        if (sectionIndex === -1) {
            console.error("Could not find the section index.");
            return;
        }

        const title = form.querySelector('.content-title-input').value.trim();
        if (!title) {
            alert("Title is required.");
            return;
        }

        let newContentItem = {
            type: contentType,
            title: title,
            id: `content_${Date.now()}`,
            order: (allCoursesData[selectedCourseId].sections[sectionIndex].content?.length || 0) + 1
        };

        if (contentType === 'video' || contentType === 'pdf') {
            const url = form.querySelector('.content-url-input').value.trim();
            if (!url) {
                alert("URL is required for video or PDF.");
                return;
            }
            newContentItem.url = url;
        } else if (contentType === 'module') {
            const text = form.querySelector('.content-text-input').value.trim();
            newContentItem.content = text;
        }

        const courseRef = ref(db, `courses/${selectedCourseId}`);
        try {
            const snapshot = await get(courseRef);
            const courseData = snapshot.val();
            const sections = courseData.sections || [];

            if (!sections[sectionIndex].content) {
                sections[sectionIndex].content = [];
            }
            sections[sectionIndex].content.push(newContentItem);

            await update(courseRef, { sections: sections });

            // Update local cache and re-render
            allCoursesData[selectedCourseId].sections = sections;
            renderCourseSections(selectedCourseId);

        } catch (error) {
            console.error("Error adding new content:", error);
            alert(`Failed to add content: ${error.message}`);
        }
    }

    async function handleDeleteContent(e) {
        const button = e.target;
        const form = button.closest('.add-content-form');
        const contentType = button.dataset.type;
        const sectionEl = form.closest('.admin-section-container');
        const title = form.querySelector('.content-title-input').value.trim();

        if (!title) {
            alert("Please provide the title of the content to delete.");
            return;
        }

        const sectionsInDOM = Array.from(courseSectionsContainer.querySelectorAll('.admin-section-container'));
        const sectionIndex = sectionsInDOM.indexOf(sectionEl);

        if (sectionIndex === -1) {
            console.error("Could not find the section index.");
            return;
        }

        const courseRef = ref(db, `courses/${selectedCourseId}`);
        try {
            const snapshot = await get(courseRef);
            const courseData = snapshot.val();
            const sections = courseData.sections || [];
            const content = sections[sectionIndex].content || [];

            const contentIndex = content.findIndex(item => item.title === title && item.type === contentType);

            if (contentIndex === -1) {
                alert("Content not found.");
                return;
            }

            content.splice(contentIndex, 1);
            sections[sectionIndex].content = content;

            await update(courseRef, { sections: sections });

            allCoursesData[selectedCourseId].sections = sections;
            renderCourseSections(selectedCourseId);
        } catch (error) {
            console.error("Error deleting content:", error);
            alert(`Failed to delete content: ${error.message}`);
        }
    }

    if (adminCourseSelect) {
        adminCourseSelect.addEventListener('change', () => {
            selectedCourseId = adminCourseSelect.value;
            if (selectedCourseId && allCoursesData[selectedCourseId]) {
                const course = allCoursesData[selectedCourseId];
                editingCourseTitleEl.textContent = `Editing: ${course.title}`;
                courseContentEditor.classList.remove('hidden');
                renderCourseSections(selectedCourseId);
            } else {
                courseContentEditor.classList.add('hidden');
            }
        });
    }

    if (deleteCourseBtn) {
        deleteCourseBtn.addEventListener('click', async () => {
            if (!selectedCourseId) {
                alert("Please select a course to delete.");
                return;
            }
            const courseTitle = allCoursesData[selectedCourseId]?.title || "this course";
            const isConfirmed = confirm(`Are you sure you want to permanently delete "${courseTitle}"?\nThis action cannot be undone.`);

            if (isConfirmed) {
                const courseRef = ref(db, `courses/${selectedCourseId}`);
                try {
                    await set(courseRef, null); // In RTDB, setting to null deletes the data
                    alert(`Course "${courseTitle}" has been deleted.`);

                    // Reset UI
                    courseContentEditor.classList.add('hidden');
                    selectedCourseId = null;
                    await loadAllCoursesForAdmin(); // Refresh the dropdown list

                } catch (error) {
                    console.error("Error deleting course:", error);
                    alert(`Failed to delete course: ${error.message}`);
                }
            }
        });
    }

    if (addSectionForm) {
        addSectionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newTitle = newSectionTitleInput.value.trim();
            if (!newTitle || !selectedCourseId) {
                alert("Please select a course and enter a section title.");
                return;
            }

            const courseRef = ref(db, `courses/${selectedCourseId}`);
            try {
                const snapshot = await get(courseRef);
                const courseData = snapshot.val();
                const sections = courseData.sections || [];
                const newSection = {
                    sectionId: `sec_${Date.now()}`,
                    title: newTitle,
                    order: sections.length + 1,
                    content: []
                };
                sections.push(newSection);

                await update(courseRef, { sections: sections });

                // Update local cache and re-render
                allCoursesData[selectedCourseId].sections = sections;
                renderCourseSections(selectedCourseId);
                newSectionTitleInput.value = '';

            } catch (error) {
                console.error("Error adding new section:", error);
                alert(`Failed to add section: ${error.message}`);
            }
        });
    }

    loadAllCoursesForAdmin();
    initializeAccordion();
}

function initializeAccordion() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    // Remove the active class and set maxHeight to null for all sections initially
    accordionHeaders.forEach(header => {
        const content = header.nextElementSibling;
        header.classList.remove('active');
        content.classList.remove('active');
        content.style.maxHeight = null;
    });

    // Set the first section to be open by default
    const firstHeader = accordionHeaders[0];
    if (firstHeader) {
        firstHeader.classList.add('active');
        const firstContent = firstHeader.nextElementSibling;
        firstContent.classList.add('active');
        firstContent.style.maxHeight = firstContent.scrollHeight + "px";
    }

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const currentlyActiveHeader = document.querySelector('.accordion-header.active');

            // If the clicked header is not the currently active one, close the active one
            if (currentlyActiveHeader && currentlyActiveHeader !== header) {
                currentlyActiveHeader.classList.remove('active');
                const activeContent = currentlyActiveHeader.nextElementSibling;
                activeContent.style.maxHeight = null;
                activeContent.classList.remove('active');
            }

            // Toggle the clicked header
            header.classList.toggle('active');
            const content = header.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null; // Close it
                content.classList.remove('active');
            } else {
                content.style.maxHeight = content.scrollHeight + "px"; // Open it
                content.classList.add('active');
            }
        });
    });
}

function initializeLearningPage(user, userData) {
    console.log("Initializing Learning Page for user:", user.uid);
    const courseId = new URLSearchParams(window.location.search).get('id');
    const courseTitleEl = document.getElementById('learning-course-title');
    const sectionsAreaEl = document.getElementById('learning-sections-area');

    if (!courseId) {
        courseTitleEl.textContent = "Error";
        sectionsAreaEl.innerHTML = "<p>No course ID provided in the URL.</p>";
        return;
    }

    // Access Check
    const enrollment = userData.enrolledCourses?.find(ec => ec.courseId === courseId);
    if (!enrollment || enrollment.currentStatus !== 'active') {
        courseTitleEl.textContent = "Access Denied";
        sectionsAreaEl.innerHTML = `<p>You do not have active enrollment for this course. Please check your dashboard.</p><a href="dashboard.html" class="btn">Go to Dashboard</a>`;
        return;
    }

    const courseRef = ref(db, `courses/${courseId}`);
    get(courseRef).then(snapshot => {
        if (!snapshot.exists()) {
            courseTitleEl.textContent = "Course Not Found";
            sectionsAreaEl.innerHTML = "<p>The requested course does not exist.</p>";
            return;
        }

        const courseData = snapshot.val();
        courseTitleEl.textContent = courseData.title;
        sectionsAreaEl.innerHTML = ''; // Clear "Loading..." message

        const sections = courseData.sections || [];
        if (sections.length === 0) {
            sectionsAreaEl.innerHTML = '<p>The instructor has not added any content to this course yet.</p>';
            return;
        }

        // Sort sections by order if `order` property exists
        sections.sort((a, b) => (a.order || 0) - (b.order || 0));

        sections.forEach(section => {
            const sectionWrapper = document.createElement('div');
            sectionWrapper.classList.add('course-section');

            const sectionTitle = document.createElement('h2');
            sectionTitle.textContent = section.title;
            sectionWrapper.appendChild(sectionTitle);

            const contentItems = section.content || [];
            if (contentItems.length === 0) {
                const noContent = document.createElement('p');
                noContent.textContent = 'No materials in this section yet.';
                sectionWrapper.appendChild(noContent);
            } else {
                // Sort content items by order if `order` property exists
                contentItems.sort((a, b) => (a.order || 0) - (b.order || 0));

                contentItems.forEach(item => {
                    const itemWrapper = document.createElement('div');
                    itemWrapper.classList.add('content-item');

                    let contentHtml = `<h4>${item.title}</h4>`;
                    switch (item.type) {
                        case 'module':
                            contentHtml += `<p>${item.content.replace(/\n/g, '<br>')}</p>`;
                            break;
                        case 'video':
                            const videoId = parseYoutubeUrl(item.url);
                            if (videoId) {
                                contentHtml += `<div class="content-item-video-embed">
                                    <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                                </div>`;
                            } else {
                                contentHtml += `<p><a href="${item.url}" target="_blank" class="btn">Watch Video</a> (Could not embed)</p>`;
                            }
                            break;
                        case 'pdf':
                            contentHtml += `<p><a href="${item.url}" target="_blank" class="btn">Open PDF</a></p>`;
                            break;
                        // Cases for assignment/exam can be added here
                        default:
                            contentHtml += `<p>Unsupported content type.</p>`;
                    }
                    itemWrapper.innerHTML = contentHtml;
                    sectionWrapper.appendChild(itemWrapper);
                });
            }
            sectionsAreaEl.appendChild(sectionWrapper);
        });

    }).catch(error => {
        console.error("Error fetching course content for learning page:", error);
        courseTitleEl.textContent = "Error";
        sectionsAreaEl.innerHTML = `<p>There was an error loading the course content. Please try again later.</p>`;
    });
}

function parseYoutubeUrl(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function initializeChatPage(currentUser) {
    console.log("Attempting to initialize Chat Page for user:", currentUser.uid);
    const messagesArea = document.getElementById('chat-messages-area');
    const messageInput = document.getElementById('chat-message-input');
    const sendButton = document.getElementById('send-chat-message-btn');
    if (!messagesArea || !messageInput || !sendButton) { console.error("Chat UI elements not found."); return; }
    messagesArea.innerHTML = '';
    sendButton.addEventListener('click', async () => {
        const text = messageInput.value.trim();
        if (text === '') return;
        let userDisplayName = "Anonymous";
        if (currentUser.displayName) {
            userDisplayName = currentUser.displayName;
        } else {
            try {
                const userSnap = await get(ref(db, `users/${currentUser.uid}/displayName`));
                if (userSnap.exists()) userDisplayName = userSnap.val();
            } catch (e) { console.warn("Could not fetch display name for chat user", e); }
        }
        const messageData = { userId: currentUser.uid, displayName: userDisplayName, text: text, timestamp: Date.now() };
        try {
            await push(ref(db, 'studentChatMessages'), messageData);
            messageInput.value = '';
        } catch (error) { console.error("Error sending chat message:", error); alert("Could not send message."); }
    });
    const chatMessagesQuery = query(ref(db, 'studentChatMessages'), orderByChild('timestamp'), limitToLast(100));
    onChildAdded(chatMessagesQuery, (snapshot) => {
        const message = snapshot.val();
        if (message) {
            const messageDiv = document.createElement('div'); messageDiv.classList.add('chat-message');
            const strong = document.createElement('strong'); strong.textContent = message.displayName + ": ";
            const time = document.createElement('span'); time.classList.add('timestamp'); time.textContent = `(${new Date(message.timestamp).toLocaleTimeString()})`;
            messageDiv.appendChild(strong); messageDiv.appendChild(document.createTextNode(message.text)); messageDiv.appendChild(time);
            messagesArea.appendChild(messageDiv);
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    });
}

// --- Main User Data Loading and Page Routing Logic ---
function loadUserData(user) {
    console.log("--- loadUserData: CALLED for UID: " + user.uid + " (Full Functionality Enabled) ---");
    console.log("loadUserData: User auth object passed:", JSON.stringify(user, null, 2));

    const userDbRef = ref(db, 'users/' + user.uid);
    console.log("loadUserData: ABOUT TO CALL get() for path: " + userDbRef.toString());

    get(userDbRef).then((snapshot) => {
        console.log('loadUserData - Raw snapshot value for UID ' + user.uid + ':', snapshot.val());
        const userData = snapshot.val();
        const adminNavLink = document.getElementById('admin-nav-link');
        const studentChatNavLink = document.getElementById('student-chat-nav-link');
        const profileNavLink = document.getElementById('profile-nav-link');

        if(profileNavLink) profileNavLink.classList.remove('hidden');
        if(studentChatNavLink) studentChatNavLink.classList.remove('hidden');

        if (userData) {
            console.log('loadUserData - userData object:', JSON.stringify(userData, null, 2));
            const userNameEl = document.getElementById('user-name');
            const userEmailEl = document.getElementById('user-email');
            if (userNameEl) userNameEl.textContent = userData.displayName || 'N/A';
            if (userEmailEl) userEmailEl.textContent = userData.email || 'N/A';

            if (welcomeMessage && (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/'))) {
                const h1 = welcomeMessage.querySelector('h1');
                if(h1) h1.textContent = `Welcome, ${userData.displayName || user.displayName || 'User'}!`;
            }

            if (adminNavLink) {
                if (userData.role === 'admin' || userData.role === 'faculty') {
                    adminNavLink.classList.remove('hidden');
                } else {
                    adminNavLink.classList.add('hidden');
                }
            }

            const currentPage = window.location.pathname.split("/").pop();
            if (currentPage === 'admin.html') {
                if (userData.role === 'admin' || userData.role === 'faculty') {
                    initializeAdminPageLogic(user, userData);
                } else {
                    console.warn("User is not admin/faculty. Redirecting from admin page attempt.");
                    window.location.href = 'index.html';
                }
            } else if (currentPage === 'course.html') {
                loadCourseDetailsWithAccessCheck(user, userData);
            } else if (currentPage === 'learning.html') {
                initializeLearningPage(user, userData);
            } else if (currentPage === 'chat.html') {
                initializeChatPage(user);
            }

            if (window.location.pathname.endsWith('profile.html')) {
                const userRoleEl = document.getElementById('user-role');
                if (userRoleEl) userRoleEl.textContent = userData.role || 'N/A';
                const profilePicEl = document.getElementById('profile-picture');
                if (profilePicEl) {
                    profilePicEl.src = userData.profilePictureURL || '#';
                    profilePicEl.style.display = 'block';
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
                } else { console.warn("Transcript link or NA elements not found on profile page.");}
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
                    } else { feesBalanceEl.textContent = 'N/A'; }
                }
            }

            if (window.location.pathname.endsWith('dashboard.html')) {
                const enrolledCoursesList = userData.enrolledCourses || [];
                loadEnrolledCourses(user.uid, enrolledCoursesList, userData.progress || {});
                loadAnnouncements(enrolledCoursesList);
                loadAcademicProgress(user.uid);
                loadPlatformNews();
            }
            if ((window.location.pathname.endsWith('index.html') || window.location.pathname === '/') && auth.currentUser) {
                  loadAllCourses(user.uid); // This is the one we are watching
            }

        } else {
            console.error('loadUserData - userData is null or undefined for UID:', user.uid, "(User record likely missing from Realtime Database)");
            if (window.location.pathname.endsWith('profile.html')) clearProfilePageData();
            if (adminNavLink) adminNavLink.classList.add('hidden');

            const currentPage = window.location.pathname.split("/").pop();
            if(currentPage === 'admin.html'){ // Redirect from admin if no userData to confirm role
                console.warn("User authenticated but no database record; cannot verify admin role. Redirecting from admin page.");
                window.location.href = 'index.html';
            } else if (currentPage !== 'index.html' && currentPage !== '') { // For other protected pages, show generic message or rely on clearProfilePageData
                console.warn("User authenticated but no database record for " + currentPage + ". Page might appear empty or with default values.");
            }
        }
    }).catch((error) => {
        console.error('loadUserData - Firebase get() FAILED for UID:', user.uid, error);
        if (window.location.pathname.endsWith('profile.html')) clearProfilePageData();
        const adminNavLink = document.getElementById('admin-nav-link');
        if (adminNavLink) adminNavLink.classList.add('hidden');
        const studentChatNavLink = document.getElementById('student-chat-nav-link');
        if(studentChatNavLink) studentChatNavLink.classList.add('hidden');
        const profileNavLink = document.getElementById('profile-nav-link');
        if(profileNavLink) profileNavLink.classList.add('hidden');
    });
}

// --- Other Functions (Academic Progress, Course Loaders, etc.) ---
async function loadAcademicProgress(userId) {
    const coursesInProgressEl = document.getElementById('courses-in-progress');
    const assignmentsDueEl = document.getElementById('assignments-due');
    const upcomingExamsEl = document.getElementById('upcoming-exams');
    if (!coursesInProgressEl || !assignmentsDueEl || !upcomingExamsEl) return;
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
            if (assignments) Object.values(assignments).forEach(a => { if (a.dueDate > now) assignmentsDueCount++; });
            const examsSnapshot = await get(ref(db, `courses/${courseId}/exams`));
            const exams = examsSnapshot.val();
            if (exams) Object.values(exams).forEach(ex => { if (ex.date > now) upcomingExamsCount++; });
        }
        assignmentsDueEl.textContent = assignmentsDueCount;
        upcomingExamsEl.textContent = upcomingExamsCount;
    } catch (error) {
        console.error("Error loading academic progress:", error);
        coursesInProgressEl.textContent = 'N/A'; assignmentsDueEl.textContent = 'N/A'; upcomingExamsEl.textContent = 'N/A';
    }
}
// Definition of loadAllCourses
async function loadAllCourses(currentUserId) {
    const coursesDbRef = ref(db, 'courses');
    const coursesContainer = document.getElementById('courses-container');
    if (!coursesContainer && (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/'))) {
        console.warn("loadAllCourses: coursesContainer not found on index/home page.");
        return;
    }
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
                const enrollmentInfo = enrolledCourseObjects.find(ec => ec.courseId === courseId);
                let buttonHtml;
                if (isEnrolled) {
                    if (enrollmentInfo?.currentStatus === 'active') {
                        buttonHtml = `<a href="learning.html?id=${courseId}" class="btn">Start Learning</a>`;
                    } else { // pending_approval or other statuses
                        buttonHtml = `<button class="btn btn-secondary" disabled>Enrollment Pending</button>`;
                    }
                } else {
                    buttonHtml = `<button class="btn enroll-btn" data-course-id="${courseId}">Enroll</button>`;
                }

                const courseCard = document.createElement('div');
                courseCard.classList.add('course-card');
                courseCard.innerHTML = `
                    <h3>${course.title}</h3>
                    <p><strong>Code:</strong> ${course.code || 'N/A'}</p>
                    <p><strong>Credits:</strong> ${course.creditHours || 'N/A'}</p>
                    <p>${course.description ? course.description.substring(0,150) + '...' : 'No description available.'}</p>
                    ${buttonHtml}`;
                coursesContainer.appendChild(courseCard);
            }
            document.querySelectorAll('.enroll-btn:not([disabled])').forEach(button => {
                button.addEventListener('click', () => enrollInCourse(currentUserId, button.dataset.courseId, button));
            });
        } else { coursesContainer.innerHTML = '<p>No courses available at the moment.</p>'; }
    } catch (error) {
        console.error("Error loading courses:", error);
        if(coursesContainer) coursesContainer.innerHTML = '<p>Error loading courses. Please try again later.</p>';
    }
}
async function enrollInCourse(userId, courseId, button) {
    const userCoursesDbRef = ref(db, 'users/' + userId + '/enrolledCourses');
    try {
        const snapshot = await get(userCoursesDbRef);
        let enrolledCoursesArray = snapshot.val() || [];
        if (!Array.isArray(enrolledCoursesArray)) enrolledCoursesArray = [];
        const isAlreadyEnrolled = enrolledCoursesArray.some(enrollment => enrollment.courseId === courseId);
        if (!isAlreadyEnrolled) {
            const courseSnapshot = await get(ref(db, 'courses/' + courseId));
            const course = courseSnapshot.val();
            if (!course) { alert("Error: Course details not found."); return; }
            const enrollmentData = {
                courseId: courseId, enrollmentDate: Date.now(), title: course.title || "Untitled Course",
                currentStatus: 'pending_approval', lastAccessed: Date.now()
            };
            enrolledCoursesArray.push(enrollmentData);
            await set(userCoursesDbRef, enrolledCoursesArray);
            alert(`Successfully enrolled in ${course.title || "the course"}! Your request is pending approval. Please check your financial balance on your Profile page to ensure there are no delays in starting your course.`);
            if (button) { button.textContent = 'Enrollment Pending'; button.disabled = true; button.classList.add('btn-secondary'); }
            const userProgressDbRef = ref(db, `users/${userId}/progress/${courseId}`);
            await set(userProgressDbRef, { completedModules: [], lastActivity: Date.now(), totalModules: course.modules ? course.modules.length : 0, assignmentsSubmitted: 0 });
        } else {
            const existingEnrollment = enrolledCoursesArray.find(enrollment => enrollment.courseId === courseId);
            if (button) {
                button.textContent = existingEnrollment?.currentStatus === 'pending_approval' ? 'Enrollment Pending' : 'Enrolled';
                button.disabled = true; button.classList.add('btn-secondary');
            }
             alert('You are already enrolled or enrollment is pending.');
        }
    } catch (e) { console.error("Error enrolling:", e); alert(`Error enrolling: ${e.message}`); }
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
                const courseProg = userProgress[courseId] || { completedModules: [], totalModules: course.modules?.length || 0 };
                const completedCount = courseProg.completedModules?.length || 0;
                const totalModules = courseProg.totalModules || (course.modules?.length || 0);
                const progressPercent = totalModules > 0 ? (completedCount / totalModules) * 100 : 0;
                let statusHtml = '';
                let btnHtml = '';

                if (enrollment.currentStatus === 'active') {
                    statusHtml = '<p style="color: var(--contrast-dark-green); font-weight: bold;">Status: Active</p>';
                    btnHtml = `<a href="learning.html?id=${courseId}" class="btn">Start Learning</a>`;
                } else if (enrollment.currentStatus === 'pending_approval') {
                    statusHtml = '<p style="color: var(--accent-gold); font-weight: bold;">Status: Pending Approval</p>';
                    btnHtml = `<button class="btn btn-secondary" disabled title="Enrollment pending approval">Pending</button>`;
                } else {
                     statusHtml = `<p style="font-weight: bold;">Status: ${enrollment.currentStatus.replace('_', ' ')}</p>`;
                     btnHtml = `<a href="course.html?id=${courseId}" class="btn btn-secondary">View Details</a>`;
                }

                const card = document.createElement('div');
                card.classList.add('course-card');
                card.innerHTML = `
                    <h3>${enrollment.title || course.title}</h3>
                    ${statusHtml}
                    <p>${course.description?.substring(0,100) + '...' || 'No description.'}</p>
                    <div class="progress-bar-container"><div class="progress-bar" style="width: ${progressPercent.toFixed(0)}%;">${progressPercent.toFixed(0)}%</div></div>
                    <p>Progress: ${completedCount} / ${totalModules} items completed</p>
                    ${btnHtml}`;
                enrolledCoursesList.appendChild(card);
            }
        } catch (error) { console.error(`Error loading enrolled course ${courseId}:`, error); }
    }
}
function loadAnnouncements(enrolledCoursesData) {
    const announcementsList = document.getElementById('announcements-list');
    if (!announcementsList) return;
    announcementsList.innerHTML = '';
    if (!enrolledCoursesData || enrolledCoursesData.length === 0) {
        announcementsList.innerHTML = '<li>No announcements for your courses.</li>'; return;
    }
    const enrolledCourseIds = enrolledCoursesData.map(e => e.courseId);
    const announcementsDbRef = query(ref(db, 'announcements'), orderByChild('timestamp'));
    onValue(announcementsDbRef, (snapshot) => {
        announcementsList.innerHTML = '';
        let found = false;
        if (snapshot.exists()) {
            const all = []; snapshot.forEach(s => all.push({id:s.key, ...s.val()}));
            all.sort((a,b) => b.timestamp - a.timestamp).forEach(a => {
                if (enrolledCourseIds.includes(a.courseId)) {
                    const li = document.createElement('li');
                    const courseInfo = enrolledCoursesData.find(ec => ec.courseId === a.courseId);
                    li.innerHTML = `<strong>${new Date(a.timestamp).toLocaleDateString()} - ${courseInfo?.title || a.courseId}</strong>: ${a.message}`;
                    announcementsList.appendChild(li);
                    found = true;
                }
            });
        }
        if (!found) announcementsList.innerHTML = '<li>No new announcements for your courses.</li>';
    }, (err) => { console.error("Error loading announcements:", err); announcementsList.innerHTML = '<li>Error loading.</li>';});
}
async function loadCourseDetailsWithAccessCheck(currentUser, currentUserData) {
    console.log("loadCourseDetailsWithAccessCheck: CALLED");
    const courseId = new URLSearchParams(window.location.search).get('id');
    const courseDetailContent = document.getElementById('course-detail-content');
    if (!courseDetailContent) { console.error("Course detail content area not found."); return; }
    if (!courseId) { courseDetailContent.innerHTML = '<p>No course ID provided.</p>'; return; }

    const enrollment = currentUserData.enrolledCourses?.find(ec => ec.courseId === courseId);
    if (!enrollment) {
        courseDetailContent.innerHTML = '<p>You are not enrolled in this course. Please enroll first from the Home page.</p>';
        return;
    }
    if (enrollment.currentStatus !== 'active') {
        courseDetailContent.innerHTML = `<p>Your enrollment for this course is currently <strong>${enrollment.currentStatus.replace('_', ' ')}</strong>. Course content is not accessible until enrollment is active.</p><p><a href="dashboard.html" class="btn">Back to Dashboard</a></p>`;
        return;
    }

    try {
        const courseSnapshot = await get(ref(db, 'courses/' + courseId));
        const course = courseSnapshot.val();
        const userProgressSnapshot = await get(ref(db, `users/${currentUser.uid}/progress/${courseId}`));
        const userProg = userProgressSnapshot.val() || { completedModules: [] };

        if (course) {
            let termName = "N/A";
            if (course.academicTermId) {
                try {
                    const termSnap = await get(ref(db, `academicTerms/${course.academicTermId}`));
                    if (termSnap.exists()) termName = termSnap.val().name;
                } catch (termErr) { console.warn("Could not fetch academic term name:", termErr); }
            }

            let modulesHtml = '<h4>Modules</h4><ul>';
            if (course.modules && course.modules.length > 0) {
                course.modules.forEach((module, index) => {
                    const isCompleted = userProg.completedModules?.includes(module.moduleId);
                    modulesHtml += `
                        <li>
                            <h5>${module.title}</h5>
                            <p>${module.content || 'No content for this module yet.'}</p>
                            <span class="module-status">${isCompleted ? 'Completed' : 'Incomplete'}</span>
                            <button class="btn mark-complete-btn" data-module-id="${module.moduleId}" ${isCompleted ? 'disabled' : ''}>
                                ${isCompleted ? 'Completed' : 'Mark as Complete'}
                            </button>
                        </li>`;
                });
            } else { modulesHtml += '<li>No modules available for this course.</li>'; }
            modulesHtml += '</ul>';

            courseDetailContent.innerHTML = `
                <h2>${course.title}</h2>
                <p><strong>Code:</strong> ${course.code || 'N/A'}</p>
                <p><strong>Academic Term:</strong> ${termName}</p>
                <p><strong>Description:</strong> ${course.description || 'No description available.'}</p>
                <p><strong>Syllabus:</strong> ${course.syllabus || 'No syllabus uploaded yet.'}</p>
                ${modulesHtml}
                <div id="course-assessments">
                    <div id="exams-list"><h3>Exams</h3><p>Loading...</p></div>
                    <div id="assignments-list"><h3>Assignments</h3><p>Loading...</p></div>
                </div>
                <button id="upload-assignment-btn" class="btn">Upload Assignment (Simulated)</button>`;

            document.querySelectorAll('.mark-complete-btn').forEach(button => {
                button.addEventListener('click', () => markModuleComplete(currentUser.uid, courseId, button.dataset.moduleId, button));
            });
            document.getElementById('upload-assignment-btn').addEventListener('click', () => alert('Assignment upload is simulated. No actual file upload.'));
            loadCourseAssessments(courseId, currentUser.uid);
        } else { courseDetailContent.innerHTML = '<p>Course details not found.</p>'; }
    } catch (error) { console.error("Error loading course details:", error); courseDetailContent.innerHTML = '<p>Error loading course details.</p>'; }
}
async function loadCourseAssessments(courseId, userId) {
    const examsListEl = document.getElementById('exams-list');
    const assignmentsListEl = document.getElementById('assignments-list');
    if (!examsListEl || !assignmentsListEl) { console.warn("Assessment elements missing."); return; }
    try {
        const examsSnap = await get(ref(db, `courses/${courseId}/exams`));
        const exams = examsSnap.val();
        examsListEl.innerHTML = '<h3>Exams</h3>';
        if (exams && Object.keys(exams).length > 0) Object.keys(exams).forEach(id => {
            const ex = exams[id]; const item = document.createElement('div'); item.classList.add('assessment-item');
            item.innerHTML = `<h4>${ex.title}</h4><p><strong>Date:</strong> ${new Date(ex.date).toLocaleDateString()}</p><p><strong>Duration:</strong> ${ex.duration} mins</p><p><strong>Weight:</strong> ${ex.weight}%</p><button class="btn exam-btn" data-exam-id="${id}">Details</button>`;
            examsListEl.appendChild(item);
        }); else examsListEl.innerHTML += '<p>No exams scheduled for this course yet.</p>';

        const assignSnap = await get(ref(db, `courses/${courseId}/assignments`));
        const assigns = assignSnap.val();
        assignmentsListEl.innerHTML = '<h3>Assignments</h3>';
        if (assigns && Object.keys(assigns).length > 0) Object.keys(assigns).forEach(id => {
            const as = assigns[id]; const item = document.createElement('div'); item.classList.add('assessment-item');
            item.innerHTML = `<h4>${as.title}</h4><p><strong>Due:</strong> ${new Date(as.dueDate).toLocaleDateString()}</p><p><strong>Status:</strong> ${as.status||'Not submitted'}</p><button class="btn" data-id="${id}">${as.submitted?'View Submission':'Submit Assignment'}</button>`;
            assignmentsListEl.appendChild(item);
        }); else assignmentsListEl.innerHTML += '<p>No assignments posted for this course yet.</p>';
    } catch (e) { console.error("Error loading assessments:", e); examsListEl.innerHTML+='<p>Error loading exams.</p>'; assignmentsListEl.innerHTML+='<p>Error loading assignments.</p>';}
}
async function markModuleComplete(userId, courseId, moduleId, button) {
    const progRef = ref(db, `users/${userId}/progress/${courseId}/completedModules`);
    try {
        const snap = await get(progRef); let completed = snap.val() || [];
        if (!Array.isArray(completed)) completed = [];
        if (!completed.includes(moduleId)) {
            completed.push(moduleId); await set(progRef, completed);
            if (button) { button.textContent = 'Completed'; button.disabled = true;
                          const statusEl = button.closest('li').querySelector('.module-status');
                          if(statusEl) statusEl.textContent = 'Completed';
                        }
            // Potentially update dashboard if on course page and then navigating back,
            // but direct refresh of dashboard data is better handled by its own load function.
        }
    } catch (e) { console.error("Error marking module complete:", e); alert(`Error: ${e.message}`); }
}
async function approveCourseEnrollment(userId, courseIdToApprove) {
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
            alert(`Enrollment for ${enrolledCourses[courseIndex].title || courseIdToApprove} approved.`);
        } else { alert(`Could not find pending enrollment for ${courseIdToApprove}.`); }
    } catch (e) { console.error("Error approving enrollment:", e); alert(`Error: ${e.message}`); }
}
async function loadPlatformNews() {
    const el = document.getElementById('platform-news-list'); if (!el) return;
    el.innerHTML = '<li>Loading...</li>';
    try {
        const newsQuery = query(ref(db, 'platformAnnouncements'), orderByChild('timestamp'), limitToLast(10));
        onValue(newsQuery, (snap) => {
            el.innerHTML = '';
            if (snap.exists()) {
                const items = []; snap.forEach(s => items.push({ id:s.key, ...s.val() }));
                items.reverse().forEach(item => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${item.authorName || 'Admin'}</strong> (${new Date(item.timestamp).toLocaleString()}):<br>${item.message.replace(/\n/g, '<br>')}`;
                    el.appendChild(li);
                });
            } else el.innerHTML = '<li>No platform news.</li>';
        }, (err) => { console.error("Error loading platform news:", err); el.innerHTML = '<li>Error loading.</li>';});
    } catch (e) { console.error("Error setting up news listener:", e); el.innerHTML = '<li>Error.</li>';}
}
async function ensureSampleDataIsPopulated() {
    try {
        const coursesSnapshot = await get(ref(db, 'courses'));
        const termsSnapshot = await get(ref(db, 'academicTerms'));
        const announcementsSnapshot = await get(ref(db, 'announcements'));
        let populatedSomething = false;
        if (!coursesSnapshot.exists() || !Object.keys(coursesSnapshot.val() || {}).length) {
            console.info("No existing course data. Populating sample courses...");
            await addSampleCourses();
            populatedSomething = true;
        }
        if (!announcementsSnapshot.exists() || !Object.keys(announcementsSnapshot.val() || {}).length) {
            console.info("No existing course announcements. Populating sample announcements...");
            await addSampleAnnouncements();
            populatedSomething = true;
        }
        if(!termsSnapshot.exists() || !Object.keys(termsSnapshot.val() || {}).length){
            console.info("No existing academic terms. Populating sample terms...");
            await addSampleAcademicTerms();
            populatedSomething = true;
        }
        if (populatedSomething) {
             console.info("Sample data population process completed for missing items.");
        } else {
            console.info("Sample data check: All required sample data categories already exist.");
        }
    } catch (e) { console.error("Error during sample data check/population:", e); }
}

// --- DOMContentLoaded Initial Setup ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded: START");
    loginForm = document.getElementById('login-form');
    signupForm = document.getElementById('signup-form');
    logoutButton = document.getElementById('logout-button');
    loginLogoutNav = document.getElementById('login-logout');
    authSection = document.getElementById('auth-section');
    authError = document.getElementById('auth-error');
    welcomeMessage = document.getElementById('welcome-message');
    mainContentPages = {
        home: document.getElementById('home-page'),
        dashboard: document.getElementById('dashboard-page'),
        courseDetail: document.getElementById('course-detail-page'), // Corresponds to course.html
        profile: document.getElementById('profile-page'),
        admin: document.getElementById('admin-page'),
        chat: document.querySelector('.chat-container') // Corresponds to chat.html
    };

    if (!auth || !db) {
        console.error("Firebase auth or db service not available on DOMContentLoaded. Check firebase-config.js.");
        return;
    }
    storage = getStorage(auth.app);

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
            if (!termsAccepted) { if(authError) authError.textContent = "You must accept the Terms and Conditions."; return; }
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                let profilePictureURL = null;
                if (profilePictureFile) profilePictureURL = await uploadFileToStorage(profilePictureFile, `profilePictures/${user.uid}/${profilePictureFile.name}`);
                let transcriptsURL = null;
                if (transcriptsFile) transcriptsURL = await uploadFileToStorage(transcriptsFile, `transcripts/${user.uid}/${transcriptsFile.name}`);
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
                    console.error('FATAL: Failed to save user data to Realtime Database for UID:', user.uid, dbSetError);
                    if(authError) authError.textContent = `Signup successful, but failed to save profile data: ${dbSetError.message}.`;
                }
            } catch (error) {
                console.error('Signup process error (Auth or File Upload):', error);
                if(authError) authError.textContent = `Signup Error: ${error.message}`;
            }
        });
    }
    if (loginForm) {
        console.log("Login form event listener ATTACHMENT attempted.");
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log("Login form SUBMITTED by user.");
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            console.log("Attempting Firebase login for email:", email);
            signInWithEmailAndPassword(auth, email, password)
                .then(userCredential => {
                    console.log('Firebase signInWithEmailAndPassword successful for UID:', userCredential.user.uid);
                    loginForm.reset();
                    if(authError) authError.textContent = '';
                })
                .catch(error => {
                    console.error('Firebase signInWithEmailAndPassword FAILED:', error);
                    if(authError) authError.textContent = `Login Error: ${error.message}`;
                });
        });
    }
    if (logoutButton) {
        console.log("Attaching logout listener to profile page button");
        logoutButton.addEventListener('click', handleLogout);
    }

    onAuthStateChanged(auth, (user) => {
        console.log("onAuthStateChanged: Event FIRED. User object:", user);
        if (user) {
            console.log("onAuthStateChanged: User IS logged in. UID:", user.uid);
            updateUIForLoggedInUser(user);
            loadUserData(user);
        } else {
            console.log("onAuthStateChanged: User is NOT logged in.");
            updateUIForLoggedOutUser();
        }
    });

    await ensureSampleDataIsPopulated(); // Ensure sample data exists on initial load.
    console.log("DOMContentLoaded: END");
});
