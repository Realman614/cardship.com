// 🔥 FIREBASE CONFIG (REPLACE WITH YOURS)
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let currentUser = null;
let currentChatId = null;


// ============================
// DOM
// ============================
const authSection = document.getElementById("auth-section");
const authModal = document.getElementById("auth-modal");
const authSubmit = document.getElementById("auth-submit");
const switchAuth = document.getElementById("switch-auth");

const email = document.getElementById("email");
const password = document.getElementById("password");
const username = document.getElementById("username");

const postBox = document.getElementById("post-box");
const postInput = document.getElementById("post-input");
const postBtn = document.getElementById("post-btn");
const feed = document.getElementById("feed");
const imageInput = document.getElementById("image-input");

const buddyInput = document.getElementById("buddy-input");
const addBuddyBtn = document.getElementById("add-buddy-btn");
const buddyList = document.getElementById("buddy-list");

const chatWindow = document.getElementById("chat-window");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendChat = document.getElementById("send-chat");

const toast = document.getElementById("toast");

// Pages
const homePage = document.getElementById("home-page");
const profilePage = document.getElementById("profile-page");
const buddyPage = document.getElementById("buddy-page");

// ============================
// UTIL
// ============================
function showToast(msg) {
  toast.innerText = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2000);
}

// ============================
// AUTH
// ============================
let isLogin = true;

function renderAuth(user) {
  if (user) {
    authSection.innerHTML = `
      ${user.email}
      <button id="logout">Logout</button>
    `;
    postBox.classList.remove("hidden");
    loadPosts();
    loadBuddies();
  } else {
    authSection.innerHTML = `
      <button id="loginBtn">Login</button>
      <button id="registerBtn">Register</button>
    `;

    document.getElementById("loginBtn").onclick = () => openModal(true);
    document.getElementById("registerBtn").onclick = () => openModal(false);
  }

  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) logoutBtn.onclick = () => auth.signOut();
}

function openModal(loginMode) {
  isLogin = loginMode;
  authModal.classList.remove("hidden");

  username.classList.toggle("hidden", loginMode);
}

switchAuth.onclick = () => openModal(!isLogin);

authSubmit.onclick = async () => {
  try {
    if (isLogin) {
      await auth.signInWithEmailAndPassword(email.value, password.value);
    } else {
      const res = await auth.createUserWithEmailAndPassword(email.value, password.value);

      await db.collection("users").doc(res.user.uid).set({
        username: username.value,
        email: email.value,
        buddies: []
      });
    }

    authModal.classList.add("hidden");
  } catch (e) {
    showToast(e.message);
  }
};

auth.onAuthStateChanged(user => {
  currentUser = user;
  renderAuth(user);

  if (user) {
    loadMyProfile();
  }
});

// ============================
// POSTS
// ============================
postBtn.onclick = async () => {
  if (!currentUser) return;

  let imageUrl = null;

  if (imageInput.files[0]) {
    const file = imageInput.files[0];
    const ref = storage.ref("posts/" + Date.now());
    await ref.put(file);
    imageUrl = await ref.getDownloadURL();
  }

  await db.collection("posts").add({
    text: postInput.value,
    uid: currentUser.uid,
    email: currentUser.email,
    imageUrl,
    time: Date.now()
  });

  postInput.value = "";
};

function loadPosts() {
  db.collection("posts").orderBy("time", "desc")
    .onSnapshot(snapshot => {
      feed.innerHTML = "";

      snapshot.forEach(doc => {
        const p = doc.data();

        feed.innerHTML += `
          <div class="post">
            <b>${p.email}</b>
            <p>${p.text}</p>
            ${p.imageUrl ? `<img src="${p.imageUrl}">` : ""}
          </div>
        `;
      });
    });
}

// ============================
// PROFILE
// ============================
function loadMyProfile() {
  db.collection("users").doc(currentUser.uid)
    .get()
    .then(doc => {
      const data = doc.data();
      document.getElementById("profile-username").innerText = data.username;
      document.getElementById("profile-email").innerText = data.email;
    });
}

// ============================
// BUDDIES
// ============================
addBuddyBtn.onclick = async () => {
  const name = buddyInput.value;

  const q = await db.collection("users")
    .where("username", "==", name)
    .get();

  if (q.empty) {
    showToast("User not found");
    return;
  }

  const buddyId = q.docs[0].id;

  await db.collection("users").doc(currentUser.uid).update({
    buddies: firebase.firestore.FieldValue.arrayUnion(buddyId)
  });

  showToast("Buddy added");
};

function loadBuddies() {
  db.collection("users").doc(currentUser.uid)
    .onSnapshot(doc => {
      const data = doc.data();

      buddyList.innerHTML = "";

      data.buddies.forEach(async id => {
        const userDoc = await db.collection("users").doc(id).get();
        const u = userDoc.data();

        buddyList.innerHTML += `
          <div>
            ${u.username}
            <button onclick="openChat('${id}','${u.username}')">Chat</button>
          </div>
        `;
      });
    });
}

// ============================
// CHAT
// ============================
function openChat(id, name) {
  chatWindow.classList.remove("hidden");
  currentChatId = [currentUser.uid, id].sort().join("_");

  chatMessages.innerHTML = "";

  db.collection("chats")
    .doc(currentChatId)
    .collection("messages")
    .orderBy("time")
    .onSnapshot(snap => {
      chatMessages.innerHTML = "";

      snap.forEach(doc => {
        const m = doc.data();
        chatMessages.innerHTML += `<div>${m.text}</div>`;
      });
    });
}

sendChat.onclick = async () => {
  if (!chatInput.value) return;

  await db.collection("chats")
    .doc(currentChatId)
    .collection("messages")
    .add({
      text: chatInput.value,
      uid: currentUser.uid,
      time: Date.now()
    });

  chatInput.value = "";
};

// ============================
// NAVIGATION
// ============================
document.getElementById("nav-home").onclick = () => showPage(homePage);
document.getElementById("nav-profile").onclick = () => showPage(profilePage);
document.getElementById("nav-buddies").onclick = () => showPage(buddyPage);

function showPage(page) {
  homePage.classList.add("hidden");
  profilePage.classList.add("hidden");
  buddyPage.classList.add("hidden");

  page.classList.remove("hidden");
}
