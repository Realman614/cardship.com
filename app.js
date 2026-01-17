// Firebase Configuration (替换为你的Firebase配置)
const firebaseConfig = {
    apiKey: "AIzaSyABydYMKj-J8FXn6zXI0Nr8Y5iqOzovGx8",
    authDomain: "cardship-9e546.firebaseapp.com",
    projectId: "cardship-9e546",
    storageBucket: "cardship-9e546.firebasestorage.app",
    messagingSenderId: "606412101696",
    appId: "1:606412101696:web:ad303431c275c0fe1c67a5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// DOM Elements
const authSection = document.getElementById('auth-section');
const postFormContainer = document.getElementById('post-form-container');
const postContent = document.getElementById('post-content');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');
const imageUpload = document.getElementById('image-upload');
const imagePreviewText = document.getElementById('image-preview-text');
const submitPostBtn = document.getElementById('submit-post');
const postsFeed = document.getElementById('posts-feed');
const loginHint = document.querySelector('.login-hint');

// Buddy System Elements
const buddySection = document.getElementById('buddy-section');
const buddyUsernameInput = document.getElementById('buddy-username');
const addBuddyBtn = document.getElementById('add-buddy-btn');
const buddiesList = document.getElementById('buddies-list');

// Auth Modal Elements
const authModal = document.getElementById('auth-modal');
const modalTitle = document.getElementById('modal-title');
const usernameField = document.getElementById('username-field');
const schoolField = document.getElementById('school-field');
const emailField = document.getElementById('email-field');
const passwordField = document.getElementById('password-field');
const authForm = document.getElementById('auth-form');
const closeModalBtn = document.getElementById('close-modal');
const toast = document.getElementById('toast');
const formSwitchText = document.getElementById('form-switch-text');
const googleProfileSetup = document.getElementById('google-profile-setup');
const googleUsernameInput = document.getElementById('google-username');
const googleSchoolSelect = document.getElementById('google-school');
const completeProfileBtn = document.getElementById('complete-profile-btn');
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("auth-form");

    console.log("FORM FOUND:", form);

    if (!form) {
        console.error("❌ auth-form NOT FOUND");
        return;
    }

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        console.log("🔥 LOGIN SUBMIT FIRED");
        alert("LOGIN BUTTON WORKS");
    });
});


// Chat Elements
let currentChatBuddyId = null;
let currentChatBuddyName = null;
let chatMessagesUnsubscribe = null;
const chatWindow = document.getElementById('chat-window');
const chatFriendName = document.getElementById('chat-friend-name');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');
const closeChatBtn = document.getElementById('close-chat-btn');

// Global Variables
let selectedImage = null;
let currentAuthType = 'login';
let postsUnsubscribe = null;
let buddiesUnsubscribe = null;
let currentUser = null;

// --------------------------
// Utility Functions
// --------------------------
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.classList.remove('hidden', 'success', 'error');
    toast.classList.add(type);
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxSize = 800;
                let width = img.width;
                let height = img.height;
                
                if (width > height && width > maxSize) {
                    height = height * (maxSize / width);
                    width = maxSize;
                } else if (height > maxSize) {
                    width = width * (maxSize / height);
                    height = maxSize;
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: file.type }));
                }, file.type, 0.8);
            };
        };
    });
}

function sanitizeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function checkUserProfile(user) {
    if (!user) return false;
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists) return true;
    
    if (user.displayName && user.displayName !== user.email.split('@')[0]) {
        await db.collection('users').doc(user.uid).set({
            username: user.displayName,
            email: user.email,
            school: user.school || 'Not specified',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            buddies: []
        });
        return true;
    }
    
    return false;
}

// Chat Utils
function getChatSessionId(userId1, userId2) {
    return userId1 < userId2 ? `${userId1}_${userId2}` : `${userId2}_${userId1}`;
}

function formatMessageTime(timestamp) {
    return new Date(timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderChatMessage(message, isCurrentUser) {
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${isCurrentUser ? 'sent' : 'received'}`;
    
    messageEl.innerHTML = `
        <div>${message.content}</div>
        <div class="chat-message-time">${formatMessageTime(message.timestamp)}</div>
    `;
    
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --------------------------
// Authentication Functions
// --------------------------
function renderAuthSection(user) {
    currentUser = user;
    
    if (user) {
        // Logged in
        authSection.innerHTML = `
            <div class="profile-menu">
                <div class="profile-btn">
                    <span class="material-icons">account_circle</span>
                    <span>${user.displayName || user.email.split('@')[0]}</span>
                    <span class="material-icons">arrow_drop_down</span>
                </div>
                <div class="profile-dropdown hidden">
                    <div class="profile-dropdown-item" id="logout-btn">Logout</div>
                </div>
            </div>
        `;
        
        postFormContainer.classList.remove('hidden');
        buddySection.classList.remove('hidden');
        loginHint.classList.add('hidden');
        
        loadBuddies();
        
        // Logout listener
        document.getElementById('logout-btn').addEventListener('click', logout);
        
        // Profile dropdown
        const profileBtn = document.querySelector('.profile-btn');
        const profileDropdown = document.querySelector('.profile-dropdown');
        profileBtn.addEventListener('click', () => profileDropdown.classList.toggle('hidden'));
        document.addEventListener('click', (e) => {
            if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.add('hidden');
            }
        });
    } else {
        // Not logged in
        authSection.innerHTML = `
            <div class="auth-buttons">
                <button class="btn secondary-btn" id="login-btn">Login</button>
                <button class="btn primary-btn" id="register-btn">Register</button>
                <button class="btn google-btn" id="google-login-btn">
                    <span class="material-icons">account_circle</span>
                    Login with Google
                </button>
            </div>
        `;
        
        postFormContainer.classList.add('hidden');
        buddySection.classList.add('hidden');
        loginHint.classList.remove('hidden');
        
        // Auth listeners
        document.getElementById('login-btn').addEventListener('click', () => showAuthModal('login'));
        document.getElementById('register-btn').addEventListener('click', () => showAuthModal('register'));
        document.getElementById('google-login-btn').addEventListener('click', signInWithGoogle);
        
        if (buddiesUnsubscribe) {
            buddiesUnsubscribe();
            buddiesUnsubscribe = null;
        }
    }
}

function showAuthModal(type) {
    currentAuthType = type;
    authModal.classList.remove('hidden');
    googleProfileSetup.classList.add('hidden');
    authForm.classList.remove('hidden');
    authForm.reset();
    
    if (type === 'register') {
        modalTitle.textContent = 'Create Your Account';
        usernameField.classList.remove('hidden');
        schoolField.classList.remove('hidden');
        authForm.querySelector('.modal-submit-btn').textContent = 'Register';
        formSwitchText.textContent = 'Already have an account? Login';
    } else {
        modalTitle.textContent = 'Welcome Back';
        usernameField.classList.add('hidden');
        schoolField.classList.add('hidden');
        authForm.querySelector('.modal-submit-btn').textContent = 'Login';
        formSwitchText.textContent = "Don't have an account? Register";
    }
    
    formSwitchText.addEventListener('click', () => {
        showAuthModal(currentAuthType === 'login' ? 'register' : 'login');
    });
}

function showGoogleProfileSetup() {
    authForm.classList.add('hidden');
    googleProfileSetup.classList.remove('hidden');
    modalTitle.textContent = 'Complete Your Profile';
}

// Close modal
closeModalBtn.addEventListener('click', () => {
    authModal.classList.add('hidden');
});




// Auth form submit
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    alert("LOGIN BUTTON CLICKED");
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!email || !password) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        if (currentAuthType === 'register') {
            // Register flow
            const username = document.getElementById('username').value.trim();
            const school = document.getElementById('school').value;
            
            if (!username || !school) {
                showToast('Please fill in all fields including username and school', 'error');
                return;
            }
            
            if (password.length < 6) {
                showToast('Password must be at least 6 characters', 'error');
                return;
            }
            
            // Check username
            const usernameQuery = await db.collection('users')
                .where('username', '==', username)
                .get();
                
            if (!usernameQuery.empty) {
                showToast('Username already taken. Please choose another', 'error');
                return;
            }
            
            // Create user
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName: username });
            
            // Create profile
            await db.collection('users').doc(userCredential.user.uid).set({
                username: username,
                email: email,
                school: school,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                buddies: []
            });
            
            await userCredential.user.sendEmailVerification();
            showToast('Registration successful! Please verify your email', 'success');
            authModal.classList.add('hidden');
        } else {
            // Login flow (NO password length check)
            await auth.signInWithEmailAndPassword(email, password);
            showToast('Login successful!', 'success');
            authModal.classList.add('hidden');
        }
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
});

// Complete Google profile
completeProfileBtn.addEventListener('click', async () => {
    const username = googleUsernameInput.value.trim();
    const school = googleSchoolSelect.value;
    const user = auth.currentUser;
    
    if (!user) {
        showToast('No user found', 'error');
        return;
    }
    
    if (!username || !school) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const usernameQuery = await db.collection('users')
            .where('username', '==', username)
            .get();
            
        if (!usernameQuery.empty) {
            showToast('Username already taken. Please choose another', 'error');
            return;
        }
        
        await user.updateProfile({ displayName: username });
        await db.collection('users').doc(user.uid).set({
            username: username,
            email: user.email,
            school: school,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            buddies: []
        });
        
        showToast('Profile completed successfully!', 'success');
        authModal.classList.add('hidden');
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
});

async function signInWithGoogle() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        const hasProfile = await checkUserProfile(user);
        
        if (hasProfile) {
            showToast('Login with Google successful!', 'success');
        } else {
            showGoogleProfileSetup();
        }
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function logout() {
    try {
        await auth.signOut();
        showToast('Logout successful!', 'success');
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function addBuddy() {
    const buddyUsername = buddyUsernameInput.value.trim();
    const user = auth.currentUser;

    if (!user) {
        showToast('Please login first', 'error');
        return;
    }

    if (!buddyUsername) {
        showToast('Please enter a username to add', 'error');
        return;
    }

    if (buddyUsername === user.displayName) {
        showToast("You can't add yourself as a buddy", 'error');
        return;
    }

    try {
        // 查询目标用户
        const userQuery = await db.collection('users')
            .where('username', '==', buddyUsername)
            .get();

        if (userQuery.empty) {
            showToast('User not found', 'error');
            return;
        }

        const buddyData = userQuery.docs[0];
        const buddyId = buddyData.id;

        // 检查是否已添加过该好友
        const currentUserDoc = await db.collection('users').doc(user.uid).get();
        const currentUserData = currentUserDoc.data();
        if (currentUserData.buddies && currentUserData.buddies.includes(buddyId)) {
            showToast('This user is already your buddy', 'error');
            return;
        }

        // 互加好友（更新双方的buddies列表）
        await db.collection('users').doc(user.uid).update({
            buddies: firebase.firestore.FieldValue.arrayUnion(buddyId)
        });
        await db.collection('users').doc(buddyId).update({
            buddies: firebase.firestore.FieldValue.arrayUnion(user.uid)
        });

        showToast(`Successfully added ${buddyUsername} as a buddy!`, 'success');
        buddyUsernameInput.value = '';
    } catch (error) {
        showToast(`Error adding buddy: ${error.message}`, 'error');
    }
}

function loadBuddies() {
    const user = auth.currentUser;
    if (!user) return;
    
    if (buddiesUnsubscribe) {
        buddiesUnsubscribe();
    }
    
    buddiesUnsubscribe = db.collection('users').doc(user.uid)
        .onSnapshot(async (doc) => {
            if (!doc.exists || !doc.data().buddies || doc.data().buddies.length === 0) {
                buddiesList.innerHTML = '<div class="loading">No buddies yet. Add some!</div>';
                return;
            }
            
            const buddyIds = doc.data().buddies;
            let buddiesHTML = '';
            
            for (const buddyId of buddyIds) {
                const buddyDoc = await db.collection('users').doc(buddyId).get();
                if (buddyDoc.exists) {
                    const buddy = buddyDoc.data();
                    buddiesHTML += `
                        <div class="buddy-card">
                            <div class="buddy-info">
                                <span class="buddy-username">${buddy.username}</span>
                                <span class="buddy-school">${buddy.school}</span>
                            </div>
                            <button class="message-buddy-btn btn secondary-btn" 
                                    data-buddy-id="${buddyId}" 
                                    data-buddy-name="${buddy.username}">
                                <span class="material-icons">message</span> Message
                            </button>
                        </div>
                    `;
                }
            }
            
            buddiesList.innerHTML = buddiesHTML || '<div class="loading">No buddies yet. Add some!</div>';
            
            // Bind chat buttons
            document.querySelectorAll('.message-buddy-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const buddyId = e.target.closest('.message-buddy-btn').dataset.buddyId;
                    const buddyName = e.target.closest('.message-buddy-btn').dataset.buddyName;
                    openChatWindow(buddyId, buddyName);
                });
            });
        }, (error) => {
            showToast(`Error loading buddies: ${error.message}`, 'error');
            buddiesList.innerHTML = `<div class="loading">Error loading buddies</div>`;
        });
}

addBuddyBtn.addEventListener('click', addBuddy);

// --------------------------
// Chat System Functions
// --------------------------
async function openChatWindow(buddyId, buddyName) {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    currentChatBuddyId = buddyId;
    currentChatBuddyName = buddyName;
    
    chatFriendName.textContent = `Chat with ${buddyName}`;
    chatMessages.innerHTML = '';
    chatWindow.classList.remove('hidden');

    const sessionId = getChatSessionId(currentUser.uid, buddyId);
    
    if (chatMessagesUnsubscribe) {
        chatMessagesUnsubscribe();
    }

    chatMessagesUnsubscribe = db.collection('chats')
        .doc(sessionId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const message = change.doc.data();
                    const isCurrentUser = message.senderId === currentUser.uid;
                    renderChatMessage(message, isCurrentUser);
                }
            });
        }, (error) => {
            showToast(`Error loading messages: ${error.message}`, 'error');
        });
}

async function sendChatMessage() {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentChatBuddyId) return;

    const content = chatInput.value.trim();
    if (!content) return;

    try {
        const sessionId = getChatSessionId(currentUser.uid, currentChatBuddyId);
        const messageData = {
            senderId: currentUser.uid,
            senderName: currentUser.displayName || currentUser.email.split('@')[0],
            content: sanitizeHTML(content),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('chats')
            .doc(sessionId)
            .collection('messages')
            .add(messageData);

        chatInput.value = '';
    } catch (error) {
        showToast(`Failed to send message: ${error.message}`, 'error');
    }
}

function closeChatWindow() {
    chatWindow.classList.add('hidden');
    if (chatMessagesUnsubscribe) {
        chatMessagesUnsubscribe();
        chatMessagesUnsubscribe = null;
    }
    currentChatBuddyId = null;
    currentChatBuddyName = null;
}

// Chat event bindings
sendChatBtn.addEventListener('click', sendChatMessage);
closeChatBtn.addEventListener('click', closeChatWindow);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

chatWindow.addEventListener('click', (e) => {
    if (e.target === chatWindow) closeChatWindow();
});

// --------------------------
// Post Functions
// --------------------------
emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) {
        emojiPicker.classList.add('hidden');
    }
});

emojiPicker.addEventListener('emoji-click', (e) => {
    postContent.value += e.detail.unicode;
    emojiPicker.classList.add('hidden');
});

imageUpload.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
        selectedImage = e.target.files[0];
        imagePreviewText.classList.remove('hidden');
        imagePreviewText.textContent = `Selected: ${selectedImage.name} (Compressing...)`;
        
        selectedImage = await compressImage(selectedImage);
        imagePreviewText.textContent = `Selected: ${selectedImage.name} (Compressed)`;
    } else {
        selectedImage = null;
        imagePreviewText.classList.add('hidden');
    }
});

submitPostBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
        showToast('Please login to create a post', 'error');
        showAuthModal('login');
        return;
    }
    
    const content = postContent.value.trim();
    if (!content) {
        showToast('Please enter post content!', 'error');
        return;
    }
    
    try {
        const postData = {
            author: user.displayName || user.email.split('@')[0],
            authorId: user.uid,
            content: sanitizeHTML(content),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            imageUrl: null
        };
        
        if (selectedImage) {
            const imageRef = storage.ref(`posts/${user.uid}/${Date.now()}-${selectedImage.name}`);
            await imageRef.put(selectedImage);
            postData.imageUrl = await imageRef.getDownloadURL();
        }
        
        await db.collection('posts').add(postData);
        
        // Reset form
        postContent.value = '';
        selectedImage = null;
        imageUpload.value = '';
        imagePreviewText.classList.add('hidden');
        
        showToast('Post created successfully!', 'success');
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
});

async function deletePost(postId, imageUrl) {
    try {
        await db.collection('posts').doc(postId).delete();
        
        if (imageUrl) {
            const imageRef = storage.refFromURL(imageUrl);
            await imageRef.delete();
        }
        
        showToast('Post deleted successfully!', 'success');
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

function loadPosts() {
    postsFeed.innerHTML = '<div class="loading">Loading posts...</div>';
    
    if (postsUnsubscribe) {
        postsUnsubscribe();
    }
    
    postsUnsubscribe = db.collection('posts')
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            if (snapshot.empty) {
                postsFeed.innerHTML = '<div class="loading">No posts yet!</div>';
                return;
            }
            
            postsFeed.innerHTML = '';
            const currentUser = auth.currentUser;
            
            snapshot.forEach((doc) => {
                const post = doc.data();
                const timestamp = post.timestamp ? new Date(post.timestamp.toDate()).toLocaleString() : 'Just now';
                const isAuthor = currentUser && post.authorId === currentUser.uid;
                
                postsFeed.innerHTML += `
                    <div class="post" data-post-id="${doc.id}">
                        <div class="post-header">
                            <div class="post-author">${post.author}</div>
                            <div class="post-time">${timestamp}</div>
                            ${isAuthor ? `
                                <div class="post-actions">
                                    <button class="delete-post-btn" data-post-id="${doc.id}" data-image-url="${post.imageUrl || ''}">
                                        <span class="material-icons">delete</span> Delete
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                        <div class="post-content">${post.content}</div>
                        ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" alt="Post image">` : ''}
                    </div>
                `;
            });
            
            // Bind delete buttons
            document.querySelectorAll('.delete-post-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const postId = e.target.closest('.delete-post-btn').dataset.postId;
                    const imageUrl = e.target.closest('.delete-post-btn').dataset.imageUrl;
                    
                    if (confirm('Are you sure you want to delete this post?')) {
                        deletePost(postId, imageUrl);
                    }
                });
            });
        }, (error) => {
            postsFeed.innerHTML = `<div class="loading">Error: ${error.message}</div>`;
            showToast(`Error loading posts: ${error.message}`, 'error');
        });
}

// --------------------------
// Initial Setup
// --------------------------
auth.onAuthStateChanged(async (user) => {
    renderAuthSection(user);
    loadPosts();
    
    if (user && user.providerData[0].providerId === 'google.com') {
        const hasProfile = await checkUserProfile(user);
        if (!hasProfile && !authModal.classList.contains('hidden')) {
            showGoogleProfileSetup();
        }
    }
});

window.addEventListener('beforeunload', () => {
    if (postsUnsubscribe) postsUnsubscribe();
    if (buddiesUnsubscribe) buddiesUnsubscribe();
    if (chatMessagesUnsubscribe) chatMessagesUnsubscribe();
});
