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

// Chat state
let chatHistory = [];
let orderSent = false;
let userName = ''; // Store the user's name

// DOM elements
const chatbox = document.getElementById('chatbox');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const downloadChatBtn = document.getElementById('download-chat');

// Send welcome message on page load
window.addEventListener('load', async () => {
  if (chatHistory.length === 0) {
    try {
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'welcome',
          chatHistory: [],
          products: [],
          bills: [],
        }),
      });
      const { reply } = await response.json();
      chatHistory.push({ role: 'assistant', content: reply });
      appendMessage('LS Bot', reply);
    } catch (error) {
      console.error('Error sending welcome message:', error);
      appendMessage('LS Bot', 'Hei! Jeg er LS Bot. Trenger du hjelp med kontorutstyr eller musikkarrangement?');
    }
  }
});

// Send message on Enter key
chatInput.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message to chat
    chatHistory.push({ role: 'user', content: message });
    appendMessage('Du', message);
    chatInput.value = '';

    // If an order has already been sent, respond without calling OpenAI
    if (orderSent) {
      appendMessage('LS Bot', `Takk, ${userName || 'du'}! Tilbudet er allerede sendt til din e-postadresse. Er det noe annet jeg kan hjelpe deg med? 😊`);
      return;
    }

    // Query Firebase for relevant products/bills
    const products = await searchProducts(message);
    const bills = await searchBills(message);

    // Call OpenAI API
    try {
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          chatHistory,
          products,
          bills,
        }),
      });

      if (!response.ok) {
        console.error('Fetch error:', response.status, response.statusText);
        appendMessage('LS Bot', 'Beklager, jeg kunne ikke koble til serveren. Prøv igjen senere.');
        return;
      }

      const { reply } = await response.json();

      // Add AI response
      chatHistory.push({ role: 'assistant', content: reply });
      appendMessage('LS Bot', reply);

      // Check if the bot is asking for contact details and if the user provided them
      const isAskingForContact = reply.match(/navn, e-postadresse og telefonnummer/i);
      const hasContactInfo = message.match(/(navn|e-post|telefon)/i) && message.match(/\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/i);

      if (isAskingForContact && hasContactInfo && !orderSent) {
        // Extract user name from message (simple extraction for now)
        const nameMatch = message.match(/Navn:\s*([A-Za-z\s]+)/i);
        userName = nameMatch ? nameMatch[1].trim() : 'du';

        const orderDetails = {
          userMessage: message,
          products: products.map(p => p.name),
          bills: bills.map(b => b.name),
          timestamp: new Date().toISOString(),
        };
        await saveOrder(orderDetails);
        orderSent = true;
      }
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      appendMessage('LS Bot', 'Beklager, noe gikk galt. Prøv igjen senere.');
    }
  }
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

// Append message to chat with fade-in effect
function appendMessage(sender, message) {
  const div = document.createElement('div');
  div.textContent = `${sender}: ${message}`;
  div.style.opacity = '0';
  div.style.transition = 'opacity 0.5s ease-in';
  chatMessages.appendChild(div);
  setTimeout(() => {
    div.style.opacity = '1';
  }, 10);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to save orders to Firestore
async function saveOrder(orderDetails) {
  try {
    await db.collection('orders').add({
      ...orderDetails,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });
    appendMessage('LS Bot', 'Takk! Bestillingen din er mottatt. Vi kontakter deg snart.');
  } catch (error) {
    console.error('Error saving order:', error);
    appendMessage('LS Bot', 'Beklager, kunne ikke lagre bestillingen. Prøv igjen senere.');
  }
}

// Search products in Firebase
async function searchProducts(query) {
  try {
    const snapshot = await db.collection('products').get();
    return snapshot.docs
      .map(doc => doc.data())
      .filter(product => {
        const name = product.name && typeof product.name === 'string' ? product.name.toLowerCase() : '';
        const description = product.description && typeof product.description === 'string' ? product.description.toLowerCase() : '';
        return name.includes(query.toLowerCase()) || description.includes(query.toLowerCase());
      });
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
}

// Search bills in Firebase Storage
async function searchBills(query) {
  const billFolders = ['bills/office', 'bills/auditorium', 'bills/events'];
  let matchingBills = [];
  for (const folder of billFolders) {
    const folderRef = storage.ref(folder);
    const fileList = await folderRef.listAll();
    for (const fileRef of fileList.items) {
      try {
        const metadata = await fileRef.getMetadata();
        const description = metadata.customMetadata?.description || '';
        if (description && description.toLowerCase().includes(query.toLowerCase())) {
          matchingBills.push({ name: fileRef.name, description });
        }
      } catch (error) {
        console.error(`Error fetching metadata for ${fileRef.name}:`, error);
      }
    }
  }
  return matchingBills;
}
