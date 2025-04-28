// Load Firebase SDK
// These scripts are added globally and don't need to be in HTML
// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCZXHTj7Hgd7nFZURpq19YlC4lRBc9hqTI",
    authDomain: "livesolutions-d95f7.firebaseapp.com",
    projectId: "livesolutions-d95f7",
    storageBucket: "livesolutions-d95f7.firebasestorage.app",
    messagingSenderId: "245878851136",
    appId: "1:245878851136:web:8a1f66c90f11ab77cc41a5",
    measurementId: "G-8QGL3FRESK"
  };
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const storage = firebase.storage();
  
  // Rest of the chat.js code remains unchanged

// Chat state
let chatHistory = [];

// DOM elements
const openChatBtn = document.getElementById('open-chat');
const chatbox = document.getElementById('chatbox');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendMessageBtn = document.getElementById('send-message');
const downloadChatBtn = document.getElementById('download-chat');

// Toggle chatbox
openChatBtn.addEventListener('click', () => {
  chatbox.classList.toggle('hidden');
});

// Send message
sendMessageBtn.addEventListener('click', async () => {
  const message = chatInput.value.trim();
  if (!message) return;

  // Add user message to chat
  chatHistory.push({ role: 'user', content: message });
  appendMessage('Du', message);
  chatInput.value = '';

  // Query Firebase for relevant products/bills
  const products = await searchProducts(message);
  const bills = await searchBills(message);

  // Call OpenAI API
  const response = await fetch('/.netlify/functions/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      chatHistory,
      products,
      bills
    })
  });
  const { reply } = await response.json();

  // Add AI response
  chatHistory.push({ role: 'assistant', content: reply });
  appendMessage('LS Bot', reply);
});

// Download chat
downloadChatBtn.addEventListener('click', () => {
  const chatText = chatHistory.map(msg => `${msg.role === 'user' ? 'Du' : 'LS Bot'}: ${msg.content}`).join('\n');
  const blob = new Blob([chatText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ls-livesolutions-chat.txt';
  a.click();
  URL.revokeObjectURL(url);
});

// Append message to chat
function appendMessage(sender, message) {
  const div = document.createElement('div');
  div.textContent = `${sender}: ${message}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Search products in Firebase
async function searchProducts(query) {
  const snapshot = await db.collection('products').get();
  return snapshot.docs
    .map(doc => doc.data())
    .filter(product => product.name.toLowerCase().includes(query.toLowerCase()) || product.description.toLowerCase().includes(query.toLowerCase()));
}

// Search bills in Firebase Storage
async function searchBills(query) {
  const categories = ['office', 'auditorium', 'events'];
  const bills = [];
  for (const category of categories) {
    const ref = storage.ref(`bills/${category}`);
    const list = await ref.listAll();
    for (const item of list.items) {
      const metadata = await item.getMetadata();
      if (metadata.customMetadata.description?.toLowerCase().includes(query.toLowerCase())) {
        bills.push({ name: item.name, metadata });
      }
    }
  }
  return bills;
}