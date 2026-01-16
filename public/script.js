const socket = io();
let currentUser = null;
let currentRole = 'user';

// --- Login System ---
async function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
    });
    const data = await res.json();

    if (data.success) {
        currentUser = u;
        currentRole = data.role;
        
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('display-name').innerText = currentUser;

        if (currentRole === 'admin') {
            document.getElementById('admin-btn').classList.remove('hidden');
            document.getElementById('mod-queue').classList.remove('hidden');
        }
    } else {
        alert("Invalid credentials!");
    }
}

// --- Navigation ---
function showPage(pageId) {
    // 1. Hide all pages
    document.getElementById('home-page').classList.add('hidden');
    document.getElementById('content-grid').classList.add('hidden');
    document.getElementById('chat-page').classList.add('hidden');
    
    // 2. Reset Sidebar active state
    document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));

    // 3. Show selected page
    document.getElementById('page-title').innerText = pageId.toUpperCase();
    
    if (pageId === 'home') {
        document.getElementById('home-page').classList.remove('hidden');
    } else if (pageId === 'chat') {
        document.getElementById('chat-page').classList.remove('hidden');
    } else if (pageId === 'admin') {
        document.getElementById('content-grid').classList.remove('hidden');
        loadAdminRequests();
    } else {
        document.getElementById('content-grid').classList.remove('hidden');
        loadContent(pageId); // notes, books, video
    }
}

// --- Content Loading ---
async function loadContent(type) {
    const res = await fetch(`/api/content/${type}`);
    const data = await res.json();
    const grid = document.getElementById('content-grid');
    grid.innerHTML = data.map(item => `
        <div class="content-card">
            <h3>${item.title}</h3>
            <p style="color: #888; font-size: 0.8rem;">Type: ${item.type}</p>
            <a href="${item.link}" target="_blank" style="color: var(--primary);">Open Resource</a>
        </div>
    `).join('');
}

// --- Upload System ---
function openUploadModal() { document.getElementById('upload-modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('upload-modal').classList.add('hidden'); }

async function submitUpload() {
    const title = document.getElementById('up-title').value;
    const link = document.getElementById('up-link').value;
    const type = document.getElementById('up-type').value;

    await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, link, role: currentRole })
    });

    alert(currentRole === 'admin' ? "Uploaded Successfully" : "Request sent to Admin!");
    closeModal();
}

// --- Admin Functions ---
async function loadAdminRequests() {
    const res = await fetch('/api/admin/requests');
    const data = await res.json();
    const grid = document.getElementById('content-grid');
    grid.innerHTML = data.length ? data.map(item => `
        <div class="content-card">
            <h3>Request: ${item.title}</h3>
            <p>${item.type}</p>
            <button onclick="approve('${item._id}')">Approve</button>
        </div>
    `).join('') : '<p>No pending requests.</p>';
}

async function approve(id) {
    await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    loadAdminRequests();
}

// --- Chat System ---
function sendMessage() {
    const input = document.getElementById('msg-input');
    if(input.value) {
        socket.emit('chatMessage', { user: currentUser, text: input.value });
        input.value = '';
    }
}

// Handle Image Upload
document.getElementById('img-upload').addEventListener('change', function() {
    const reader = new FileReader();
    reader.onload = function() {
        // Send to server for moderation
        socket.emit('uploadImage', { user: currentUser, img: reader.result });
        alert("Image sent for moderation!");
    };
    reader.readAsDataURL(this.files[0]);
});

// Socket Listeners
socket.on('message', (data) => {
    const box = document.getElementById('chat-messages');
    box.innerHTML += `<div class="message"><strong>${data.user}:</strong> ${data.text}</div>`;
    box.scrollTop = box.scrollHeight;
});

socket.on('reviewImage', (data) => {
    if(currentRole === 'admin') {
        const queue = document.getElementById('mod-list');
        const div = document.createElement('div');
        div.innerHTML = `
            <p>From ${data.user}</p>
            <img src="${data.img}" width="100"><br>
            <button onclick="confirmImg(this, '${data.user}', '${data.img}')">Approve</button>
        `;
        queue.append(div);
    }
});

function confirmImg(btn, user, img) {
    socket.emit('approveImage', { user, img });
    btn.parentElement.remove();
}

socket.on('showImage', (data) => {
    const box = document.getElementById('chat-messages');
    box.innerHTML += `<div class="message"><strong>${data.user}:</strong><br><img src="${data.img}" class="chat-image"></div>`;
    box.scrollTop = box.scrollHeight;
});