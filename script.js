          // Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyB2Jnp6NzVxiy_OBUXmzkzjdmt68Wb7X-w",
            authDomain: "streamplay-pro.firebaseapp.com",
            databaseURL: "https://streamplay-pro-default-rtdb.firebaseio.com",
            projectId: "streamplay-pro",
            storageBucket: "streamplay-pro.firebasestorage.app",
            messagingSenderId: "188069541745",
            appId: "1:188069541745:web:6347e0bc4c0144e1c1a8d0",
            measurementId: "G-PQXNRQSEYR"
        };

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const database = firebase.database();

        // Admin state - Direct access, no login required
        let currentAdmin = { username: 'Super Admin', role: 'superadmin' };
        let currentPage = 'admin-dashboard';
        let users = {};
        let videoFiles = [];
        let messages = [];
        let logs = [];
        let allComments = [];
        let viewsChart = null;
        let likesChart = null;
        let editingUserEmail = null;

        // Real-time listeners
        let usersListener = null;
        let videosListener = null;
        let messagesListener = null;
        let logsListener = null;

        // DOM elements
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const menuList = document.getElementById('menuList');
        const sidebarTitle = document.getElementById('sidebarTitle');
        const sidebarSubtitle = document.getElementById('sidebarSubtitle');
        const sidebarLogout = document.getElementById('sidebarLogout');
        const userProfile = document.getElementById('userProfile');
        const darkModeToggle = document.getElementById('darkModeToggle');

        // Admin elements
        const adminStats = document.getElementById('adminStats');
        const usersList = document.getElementById('usersList');
        const videosAdminList = document.getElementById('videosAdminList');
        const messagesAdminList = document.getElementById('messagesAdminList');
        const commentsAdminList = document.getElementById('commentsAdminList');
        const userCount = document.getElementById('userCount');
        const videoCount = document.getElementById('videoCount');
        const messageCount = document.getElementById('messageCount');
        const commentCount = document.getElementById('commentCount');
        const logCount = document.getElementById('logCount');
        const userSearch = document.getElementById('userSearch');
        const videoSearch = document.getElementById('videoSearch');
        const messageSearch = document.getElementById('messageSearch');
        const commentSearch = document.getElementById('commentSearch');
        const logSearch = document.getElementById('logSearch');
        const logsList = document.getElementById('logsList');
        const topVideosList = document.getElementById('topVideosList');
        const backupBtn = document.getElementById('backupBtn');
        const restoreFile = document.getElementById('restoreFile');
        const restoreBtn = document.getElementById('restoreBtn');
        const adminSettingsForm = document.getElementById('adminSettingsForm');

        // Modal elements
        const userModal = document.getElementById('userModal');
        const viewDetails = document.getElementById('viewDetails');
        const editUserForm = document.getElementById('editUserForm');
        const modalTitle = document.getElementById('modalTitle');
        const editBtn = document.getElementById('editBtn');
        const closeModal = document.querySelector('.close');

        // Helper function to sanitize Firebase keys for emails
        function sanitizeKey(key) {
            return btoa(encodeURIComponent(key));
        }

        // Helper function to unsanitize Firebase keys
        function unsanitizeKey(key) {
            return decodeURIComponent(atob(key));
        }

        // Process users data
        function processUsers(rawData) {
            const data = rawData || {};
            const unsanitized = Object.fromEntries(
                Object.entries(data).map(([skey, value]) => [unsanitizeKey(skey), value])
            );
            Object.keys(unsanitized).forEach(email => {
                let user = unsanitized[email];
                if (user.isAdmin !== undefined && !user.role) {
                    user.role = user.isAdmin ? 'admin' : 'user';
                    delete user.isAdmin;
                } else if (!user.role) {
                    user.role = 'user';
                }
                user.sessionLikes = user.sessionLikes || [];
                user.sessionGlobalLikes = user.sessionGlobalLikes || [];
            });
            return unsanitized;
        }

        function computeAllComments() {
            allComments = [];
            videoFiles.forEach(video => {
                if (video.comments) {
                    video.comments.forEach(comment => {
                        allComments.push({
                            ...comment,
                            videoId: video.id,
                            videoTitle: video.title
                        });
                    });
                }
            });
        }

        // Start real-time listeners
        function startRealTimeListeners() {
            if (usersListener) database.ref('users').off('value', usersListener);
            usersListener = (snapshot) => {
                users = processUsers(snapshot.val() || {});
                if (currentPage === 'admin-users') renderAdminUsers(userSearch.value || '');
                if (currentPage === 'admin-dashboard') renderAdminDashboard();
            };
            database.ref('users').on('value', usersListener);

            if (videosListener) database.ref('videos').off('value', videosListener);
            videosListener = (snapshot) => {
                const data = snapshot.val() || [];
                videoFiles = data.map(v => ({
                    ...v,
                    comments: v.comments || []
                }));
                computeAllComments();
                if (currentPage === 'admin-videos') renderAdminVideos(videoSearch.value || '');
                if (currentPage === 'admin-comments') renderAdminComments(commentSearch.value || '');
                if (currentPage === 'admin-analytics') renderAdminAnalytics();
                if (currentPage === 'admin-dashboard') renderAdminDashboard();
            };
            database.ref('videos').on('value', videosListener);

            if (messagesListener) database.ref('messages').off('value', messagesListener);
            messagesListener = (snapshot) => {
                messages = snapshot.val() || [];
                if (currentPage === 'admin-messages') renderAdminMessages(messageSearch.value || '');
                if (currentPage === 'admin-dashboard') renderAdminDashboard();
            };
            database.ref('messages').on('value', messagesListener);

            if (logsListener) database.ref('logs').off('value', logsListener);
            logsListener = (snapshot) => {
                const data = snapshot.val() || {};
                logs = Object.values(data);
                if (currentPage === 'admin-logs') renderAdminLogs(logSearch.value || '');
                if (currentPage === 'admin-dashboard') renderAdminDashboard();
            };
            database.ref('logs').on('value', logsListener);
        }

        function stopRealTimeListeners() {
            if (usersListener) {
                database.ref('users').off('value', usersListener);
                usersListener = null;
            }
            if (videosListener) {
                database.ref('videos').off('value', videosListener);
                videosListener = null;
            }
            if (messagesListener) {
                database.ref('messages').off('value', messagesListener);
                messagesListener = null;
            }
            if (logsListener) {
                database.ref('logs').off('value', logsListener);
                logsListener = null;
            }
        }

        // Save data to Firebase
        function saveUsers(usersData) {
            const sanitizedUsers = Object.fromEntries(
                Object.entries(usersData).map(([key, value]) => [sanitizeKey(key), value])
            );
            database.ref('users').set(sanitizedUsers);
        }

        function saveVideos(v) {
            database.ref('videos').set(v);
        }

        function saveMessages(msgs) {
            database.ref('messages').set(msgs);
        }

        function saveLogs(logEntries) {
            database.ref('logs').set(Object.fromEntries(logEntries.map((l, i) => [i.toString(), l])));
        }

        function logAdminAction(action, details) {
            const log = {
                action,
                details,
                timestamp: new Date().toISOString(),
                admin: currentAdmin.username
            };
            logs.push(log);
            saveLogs(logs);
        }

        // Dark mode toggle
        function toggleDarkMode() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
            const icon = darkModeToggle.querySelector('i');
            icon.classList.toggle('fa-moon');
            icon.classList.toggle('fa-sun');
            darkModeToggle.innerHTML = `<i class="${icon.className}"></i> ${isDark ? 'Light' : 'Dark'} Mode`;
            showNotification(isDark ? 'Dark mode enabled' : 'Light mode enabled');
        }

        // Load dark mode preference
        function loadDarkMode() {
            const isDark = localStorage.getItem('darkMode') === 'true';
            if (isDark) {
                document.body.classList.add('dark-mode');
                const icon = darkModeToggle.querySelector('i');
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
                darkModeToggle.innerHTML = `<i class="fas fa-sun"></i> Light Mode`;
            }
        }

        // Toggle Sidebar
        function toggleSidebar() {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
            menuToggle.setAttribute('aria-expanded', sidebar.classList.contains('active'));
        }

        // Close Sidebar
        function closeSidebar() {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            const icon = menuToggle.querySelector('i');
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-times');
            menuToggle.setAttribute('aria-expanded', 'false');
        }

        // Update menu - Role-based access
        function updateMenu() {
            sidebarTitle.textContent = `Admin: ${currentAdmin.username}`;
            sidebarSubtitle.textContent = `Role: ${currentAdmin.role}`;
            const fullMenu = [
                { page: 'admin-dashboard', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
                { page: 'admin-users', icon: 'fas fa-users', label: 'User Management' },
                { page: 'admin-videos', icon: 'fas fa-video', label: 'Video Management' },
                { page: 'admin-messages', icon: 'fas fa-envelope-open', label: 'Contact Messages' },
                { page: 'admin-comments', icon: 'fas fa-comments', label: 'Comment Moderation' },
                { page: 'admin-analytics', icon: 'fas fa-chart-bar', label: 'Analytics' },
                { page: 'admin-settings', icon: 'fas fa-cog', label: 'System Settings' },
                { page: 'admin-logs', icon: 'fas fa-file-alt', label: 'Activity Logs' },
                { page: 'admin-backup', icon: 'fas fa-download', label: 'Data Backup' }
            ];

            let allowedMenu = fullMenu;
            if (currentAdmin.role === 'moderator') {
                allowedMenu = fullMenu.filter(item => 
                    item.page === 'admin-dashboard' || 
                    item.page === 'admin-users' || 
                    item.page === 'admin-messages'
                );
            }

            menuList.innerHTML = allowedMenu.map(item => `
                <li><a href="#" class="menu-item ${currentPage === item.page ? 'active' : ''}" data-page="${item.page}" role="menuitem">
                    <i class="${item.icon}"></i> ${item.label}
                </a></li>
            `).join('');
            sidebarLogout.style.display = 'block';
            userProfile.innerHTML = `<i class="fas fa-shield-alt"></i><span>${currentAdmin.username} (${currentAdmin.role})</span>`;
            menuToggle.classList.add('active');
            setupMenuListeners();
        }

        // Setup menu listeners
        function setupMenuListeners() {
            menuList.querySelectorAll('.menu-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const page = item.getAttribute('data-page');
                    navigateTo(page);
                    menuList.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    createRippleEffect(e, item);
                    closeSidebar();
                });
            });
        }

        // Create ripple effect
        function createRippleEffect(event, element) {
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            const rect = element.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${event.clientX - rect.left - size/2}px`;
            ripple.style.top = `${event.clientY - rect.top - size/2}px`;
            element.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        }

        // Navigate to page
        function navigateTo(page) {
            currentPage = page;
            showPage(page);
            updateMenu();
        }

        // Show page
        function showPage(page) {
            document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
            const targetSection = document.getElementById(page);
            if (targetSection) {
                targetSection.classList.add('active');
                if (page === 'admin-dashboard') renderAdminDashboard();
                else if (page === 'admin-users') renderAdminUsers(userSearch.value || '');
                else if (page === 'admin-videos') renderAdminVideos(videoSearch.value || '');
                else if (page === 'admin-messages') renderAdminMessages(messageSearch.value || '');
                else if (page === 'admin-comments') renderAdminComments(commentSearch.value || '');
                else if (page === 'admin-analytics') renderAdminAnalytics();
                else if (page === 'admin-settings') loadAdminSettings();
                else if (page === 'admin-logs') renderAdminLogs(logSearch.value || '');
                else if (page === 'admin-backup') {};
            }
        }

        // Render functions
        function renderAdminDashboard() {
            const totalViews = videoFiles.reduce((sum, video) => sum + (video.views || 0), 0);
            const totalLikes = videoFiles.reduce((sum, video) => sum + (video.likes || 0), 0);
            const totalComments = allComments.length;
            adminStats.innerHTML = `
                <div class="stat-item">
                    <div class="stat-value">${Object.keys(users).length}</div>
                    <div class="stat-label">Total Users</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${videoFiles.length}</div>
                    <div class="stat-label">Total Videos</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${messages.length}</div>
                    <div class="stat-label">Total Messages</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${totalComments}</div>
                    <div class="stat-label">Total Comments</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${totalViews}</div>
                    <div class="stat-label">Total Views</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${totalLikes}</div>
                    <div class="stat-label">Total Likes</div>
                </div>
            `;
        }

        function renderAdminUsers(filter = '') {
            userCount.textContent = Object.keys(users).length;
            let filteredUsers = Object.entries(users).filter(([email]) => 
                email.toLowerCase().includes(filter.toLowerCase()) || (users[email].username || '').toLowerCase().includes(filter.toLowerCase())
            );
            const isModerator = currentAdmin.role === 'moderator';
            usersList.innerHTML = filteredUsers.map(([email, user]) => {
                const actions = isModerator ? '' : `
                    <div class="admin-actions">
                        <button class="admin-btn view" onclick="viewUserDetails('${email.replace(/'/g, "\\'")}')">View Details</button>
                        <button class="admin-btn delete" onclick="deleteAdminUser('${email.replace(/'/g, "\\'")}')">Delete</button>
                    </div>
                `;
                return `
                    <div class="admin-item">
                        <div>
                            <strong>${user.username || 'N/A'}</strong> (${email})<br>
                            <small>ID: ${user.uid || 'N/A'} | Logins: ${user.logins?.length || 0} | Videos: ${user.videos?.length || 0} | Role: ${user.role || 'user'}</small>
                        </div>
                        ${actions}
                    </div>
                `;
            }).join('');
        }

        function viewUserDetails(email) {
            editingUserEmail = email;
            const user = users[email];
            if (user) {
                modalTitle.textContent = `User Details - ${user.username || 'N/A'}`;
                viewDetails.textContent = JSON.stringify(user, null, 2);
                document.getElementById('editUsername').value = user.username || '';
                document.getElementById('editPassword').value = user.password || '';
                const roleSelect = document.getElementById('editRole');
                const currentRole = user.role || 'user';
                roleSelect.value = currentRole;
                // Restrict role options based on current admin role
                roleSelect.innerHTML = `
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                `;
                if (currentAdmin.role !== 'superadmin') {
                    const superOption = roleSelect.querySelector('option[value="superadmin"]');
                    if (superOption) superOption.remove();
                }
                if (currentAdmin.role === 'moderator') {
                    roleSelect.disabled = true;
                    roleSelect.style.backgroundColor = '#ddd';
                } else {
                    roleSelect.disabled = false;
                    roleSelect.style.backgroundColor = '';
                }
                document.getElementById('editEmail').value = email;
                editUserForm.classList.remove('active');
                viewDetails.classList.remove('hidden');
                userModal.style.display = 'block';
            }
        }

        function startEdit() {
            if (currentAdmin.role === 'moderator') {
                showNotification('Moderators cannot edit users');
                return;
            }
            viewDetails.classList.add('hidden');
            editUserForm.classList.add('active');
        }

        function cancelEdit() {
            viewDetails.classList.remove('hidden');
            editUserForm.classList.remove('active');
        }

        function saveUserEdit() {
            const email = document.getElementById('editEmail').value;
            const newUsername = document.getElementById('editUsername').value.trim();
            const newPassword = document.getElementById('editPassword').value.trim();
            const newRole = document.getElementById('editRole').value;

            const user = users[email];
            if (!user) {
                showNotification('User not found');
                return;
            }

            const oldUsername = user.username || '';
            const oldRole = user.role || 'user';

            const updatedUsers = { ...users };

            let changes = {};
            let action = 'edit user';

            if (newUsername && newUsername !== oldUsername) {
                changes.username = { from: oldUsername, to: newUsername };
                updatedUsers[email].username = newUsername;
            }

            if (newPassword) {
                changes.password = true;
                updatedUsers[email].password = newPassword;
                if (action !== 'change user role') {
                    action = 'update user password';
                }
            }

            if (newRole !== oldRole) {
                changes.role = { from: oldRole, to: newRole };
                updatedUsers[email].role = newRole;
                action = 'change user role';
            }

            delete updatedUsers[email].isAdmin; // Clean up old field

            if (Object.keys(changes).length === 0) {
                showNotification('No changes made');
                return;
            }

            saveUsers(updatedUsers);
            logAdminAction(action, { email, changes });
            renderAdminUsers(userSearch.value || '');
            showNotification('User updated');
            userModal.style.display = 'none';
        }

        function deleteAdminUser(email) {
            if (currentAdmin.role === 'moderator') {
                showNotification('Moderators cannot delete users');
                return;
            }
            if (confirm(`Delete user ${email}? This action cannot be undone.`)) {
                const updatedUsers = {...users};
                delete updatedUsers[email];
                saveUsers(updatedUsers);
                logAdminAction('delete user', {email});
                renderAdminUsers(userSearch.value || '');
                showNotification('User deleted successfully');
            }
        }

        function renderAdminVideos(filter = '') {
            videoCount.textContent = videoFiles.length;
            let filteredVideos = videoFiles.filter(video => 
                (video.title || '').toLowerCase().includes(filter.toLowerCase()) || (video.author || '').toLowerCase().includes(filter.toLowerCase())
            );
            videosAdminList.innerHTML = filteredVideos.map(video => `
                <div class="admin-item">
                    <div>
                        <strong>${video.title || 'N/A'}</strong> by ${video.author || 'N/A'}<br>
                        <small>Views: ${video.views || 0} | Likes: ${video.likes || 0} | ${video.date || 'N/A'}</small>
                    </div>
                    <div class="admin-actions">
                        <button class="admin-btn delete" onclick="deleteAdminVideo(${video.id})">Delete</button>
                    </div>
                </div>
            `).join('');
        }

        function deleteAdminVideo(id) {
            if (confirm('Delete this video? This action cannot be undone.')) {
                const updatedVideos = videoFiles.filter(v => v.id !== id);
                saveVideos(updatedVideos);
                logAdminAction('delete video', {id});
                renderAdminVideos(videoSearch.value || '');
                showNotification('Video deleted successfully');
            }
        }

        function renderAdminMessages(filter = '') {
            messageCount.textContent = messages.length;
            let filteredMessages = messages.filter(msg => 
                (msg && msg.name || '').toLowerCase().includes(filter.toLowerCase()) || (msg && msg.email || '').toLowerCase().includes(filter.toLowerCase())
            );
            messagesAdminList.innerHTML = filteredMessages.map(msg => {
                if (!msg) return '';
                const replied = msg.replied || false;
                return `
                    <div class="admin-item ${replied ? 'replied' : ''}">
                        <div>
                            <strong>${msg.name || 'N/A'}</strong> &lt;${msg.email || 'N/A'}&gt;<br>
                            <small>${new Date(msg.date || Date.now()).toLocaleString()}</small><br>
                            <p>${msg.message || ''}</p>
                            ${replied ? `<small><strong>Reply:</strong> ${msg.reply} (by ${msg.repliedBy} on ${new Date(msg.repliedAt).toLocaleString()})</small>` : ''}
                        </div>
                        <div class="admin-actions">
                            ${!replied ? `
                                <button class="admin-btn reply" onclick="toggleReplyForm(${msg.id})">Reply</button>
                                <form class="reply-form" id="replyForm-${msg.id}">
                                    <textarea class="reply-textarea" placeholder="Type your reply..."></textarea>
                                    <button type="submit" class="admin-btn reply">Send Reply</button>
                                </form>
                            ` : ''}
                            <button class="admin-btn delete" onclick="deleteAdminMessage(${msg.id})">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
            filteredMessages.forEach(msg => {
                if (!msg || msg.replied) return;
                const form = document.getElementById(`replyForm-${msg.id}`);
                if (form) {
                    const handleSubmit = (e) => {
                        e.preventDefault();
                        const reply = form.querySelector('.reply-textarea').value.trim();
                        if (reply) {
                            const msgIndex = messages.findIndex(m => m.id === msg.id);
                            if (msgIndex > -1) {
                                messages[msgIndex].reply = reply;
                                messages[msgIndex].replied = true;
                                messages[msgIndex].repliedBy = currentAdmin.username;
                                messages[msgIndex].repliedAt = new Date().toISOString();
                                saveMessages(messages);
                                logAdminAction('reply message', {id: msg.id});
                                showNotification('Reply sent successfully');
                            }
                        }
                    };
                    if (form._submitHandler) form.removeEventListener('submit', form._submitHandler);
                    form._submitHandler = handleSubmit;
                    form.addEventListener('submit', handleSubmit);
                }
            });
        }

        function toggleReplyForm(id) {
            const form = document.getElementById(`replyForm-${id}`);
            if (form) form.classList.toggle('active');
        }

        function deleteAdminMessage(id) {
            if (confirm('Delete this message? This action cannot be undone.')) {
                const updatedMessages = messages.filter(m => m && m.id !== id);
                saveMessages(updatedMessages);
                logAdminAction('delete message', {id});
                renderAdminMessages(messageSearch.value || '');
                showNotification('Message deleted successfully');
            }
        }

        function renderAdminComments(filter = '') {
            commentCount.textContent = allComments.length;
            let filteredComments = allComments.filter(comment => 
                (comment && comment.text || '').toLowerCase().includes(filter.toLowerCase()) || (comment && comment.username || '').toLowerCase().includes(filter.toLowerCase())
            );
            commentsAdminList.innerHTML = filteredComments.map(comment => {
                if (!comment) return '';
                return `
                    <div class="admin-item">
                        <div>
                            <strong>${comment.username || 'N/A'}</strong> on <em>${comment.videoTitle || 'N/A'}</em><br>
                            <small>${new Date(comment.timestamp || Date.now()).toLocaleString()}</small><br>
                            <p>${comment.text || ''}</p>
                        </div>
                        <div class="admin-actions">
                            <button class="admin-btn delete" onclick="deleteAdminComment(${comment.videoId}, '${(comment.timestamp || '').replace(/'/g, "\\'")}')">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function deleteAdminComment(videoId, timestamp) {
            if (confirm('Delete this comment? This action cannot be undone.')) {
                const updatedVideos = [...videoFiles];
                const videoIndex = updatedVideos.findIndex(v => v.id === videoId);
                if (videoIndex > -1 && updatedVideos[videoIndex].comments) {
                    updatedVideos[videoIndex].comments = updatedVideos[videoIndex].comments.filter(c => c.timestamp !== timestamp);
                    saveVideos(updatedVideos);
                    logAdminAction('delete comment', {videoId, timestamp});
                    computeAllComments();
                    renderAdminComments(commentSearch.value || '');
                    showNotification('Comment deleted successfully');
                }
            }
        }

        function renderAdminAnalytics() {
            const topVideos = [...videoFiles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
            topVideosList.innerHTML = topVideos.map(video => `
                <div style="display: flex; justify-content: space-between; padding: 5px; border-bottom: 1px solid #ddd;">
                    <span>${video.title || 'N/A'}</span>
                    <span>${video.views || 0} views</span>
                </div>
            `).join('');

            const ctxViews = document.getElementById('viewsChart').getContext('2d');
            if (viewsChart) viewsChart.destroy();
            viewsChart = new Chart(ctxViews, {
                type: 'bar',
                data: {
                    labels: topVideos.map(v => (v.title || 'N/A').substring(0, 10)),
                    datasets: [{
                        label: 'Views',
                        data: topVideos.map(v => v.views || 0),
                        backgroundColor: 'rgba(231, 60, 126, 0.6)',
                        borderColor: 'rgba(231, 60, 126, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });

            const topLikes = [...videoFiles].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 5);
            const ctxLikes = document.getElementById('likesChart').getContext('2d');
            if (likesChart) likesChart.destroy();
            likesChart = new Chart(ctxLikes, {
                type: 'line',
                data: {
                    labels: topLikes.map(v => (v.title || 'N/A').substring(0, 10)),
                    datasets: [{
                        label: 'Likes',
                        data: topLikes.map(v => v.likes || 0),
                        backgroundColor: 'rgba(35, 214, 171, 0.2)',
                        borderColor: 'rgba(35, 214, 171, 1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        function loadAdminSettings() {
            database.ref('settings').once('value').then((snapshot) => {
                const settings = snapshot.val() || {};
                document.getElementById('appTitle').value = settings.title || 'StreamPlay Pro';
                document.getElementById('maxVideos').value = settings.maxVideos || 10;
            });
        }

        adminSettingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newSettings = {
                title: document.getElementById('appTitle').value,
                maxVideos: parseInt(document.getElementById('maxVideos').value)
            };
            database.ref('settings').set(newSettings);
            logAdminAction('update settings', newSettings);
            showNotification('Settings updated successfully');
        });

        function renderAdminLogs(filter = '') {
            logCount.textContent = logs.length;
            let filteredLogs = logs.filter(log => 
                (log.action || '').toLowerCase().includes(filter.toLowerCase()) || (log.admin || '').toLowerCase().includes(filter.toLowerCase())
            );
            logsList.innerHTML = filteredLogs.slice(-50).reverse().map(log => `
                <div class="log-item">
                    <strong>${log.action || 'N/A'}</strong> by ${log.admin || 'N/A'}<br>
                    <small>${new Date(log.timestamp || Date.now()).toLocaleString()}</small>
                    ${log.details ? `<br><em>Details: ${JSON.stringify(log.details)}</em>` : ''}
                </div>
            `).join('');
        }

        backupBtn.addEventListener('click', () => {
            const data = { users, videos: videoFiles, messages, logs };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `streamplay-admin-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            logAdminAction('backup data', {});
            showNotification('Full backup downloaded successfully');
        });

        restoreBtn.addEventListener('click', () => {
            const file = restoreFile.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (data.users) saveUsers(data.users);
                        if (data.videos) saveVideos(data.videos);
                        if (data.messages) saveMessages(data.messages);
                        if (data.logs) saveLogs(data.logs);
                        logAdminAction('restore data', {});
                        showNotification('Data restored successfully');
                        // Refresh current page
                        setTimeout(() => showPage(currentPage), 1000);
                    } catch (err) {
                        console.error('Restore error:', err);
                        showNotification('Invalid backup file');
                    }
                };
                reader.readAsText(file);
            } else {
                showNotification('Please select a file to restore');
            }
        });

        // Search listeners
        userSearch.addEventListener('input', (e) => renderAdminUsers(e.target.value));
        videoSearch.addEventListener('input', (e) => renderAdminVideos(e.target.value));
        messageSearch.addEventListener('input', (e) => renderAdminMessages(e.target.value));
        commentSearch.addEventListener('input', (e) => renderAdminComments(e.target.value));
        logSearch.addEventListener('input', (e) => renderAdminLogs(e.target.value));

        // Modal handlers
        closeModal.addEventListener('click', () => {
            userModal.style.display = 'none';
            cancelEdit();
        });

        editBtn.addEventListener('click', startEdit);

        editUserForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveUserEdit();
        });

        window.addEventListener('click', (e) => {
            if (e.target === userModal) {
                userModal.style.display = 'none';
                cancelEdit();
            }
        });

        // Logout - Reset to initial state (though no real logout since no auth)
        function logout() {
            if (confirm('Are you sure you want to logout?')) {
                stopRealTimeListeners();
                currentAdmin = null;
                updateMenu();
                navigateTo('admin-dashboard');
                showNotification('Logged out successfully');
                startRealTimeListeners();
                currentAdmin = { username: 'Super Admin', role: 'superadmin' };
                updateMenu();
            }
        }

        // Show notification
        function showNotification(message) {
            notificationText.textContent = message;
            notification.classList.add('show');
            setTimeout(() => notification.classList.remove('show'), 3000);
        }

        // Event listeners
        menuToggle.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', closeSidebar);
        darkModeToggle.addEventListener('click', toggleDarkMode);

        // Init - Direct access
        loadDarkMode();
        startRealTimeListeners();
        updateMenu();
        navigateTo('admin-dashboard');
    