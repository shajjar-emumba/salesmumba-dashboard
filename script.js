const bots = [
  {
    name: 'Quick Quote',
    description: 'Get quick and accurate quotes.',
    tags: ['quotes', 'quick', 'accurate'],
    firstMessage: 'Hello, I’m the Quick Quote specialist. How can I help you?',
  },
  {
    name: 'Smart Docs',
    description: 'Manage and access documents intelligently.',
    tags: ['documents', 'management', 'access'],
    firstMessage:
      'Hi, I’m here to assist you with your documents. How can I help?',
  },
  {
    name: 'Email Intel',
    description: 'Insights into your email interactions.',
    tags: ['email', 'insights', 'analytics'],
    firstMessage:
      'Hello, I’m the Email Intel bot. How can I help you analyze emails?',
  },
  {
    name: 'Call Insights',
    description: 'Analyze and gain insights from calls.',
    tags: ['calls', 'insights', 'analytics'],
    firstMessage:
      'Hi, I’m the Call Insights bot. How can I assist with call analysis?',
  },
];

const querybutton = document.getElementById('send-query-button');

const emailFilterModal = document.getElementById('email-filter-modal');
const cancelEmailFilter = document.getElementById('email-filter-cancel-button');
const cancelEmailFilterModalIcon = document.getElementById(
  'filter-modal-close-icon'
);

const emailFilterForm = document.getElementById('email-filter-form');

function selectBot(botName) {
  const selectedBot = bots.find((bot) => bot.name === botName);

  if (selectedBot) {
    document.querySelector('.header-title').textContent = botName;
    document.querySelector('.header-description').textContent =
      selectedBot.description;

    document.querySelector('.first-message').textContent =
      selectedBot.firstMessage;

    const tagsContainer = document.querySelector('.header-keywords');
    tagsContainer.innerHTML = '';
    selectedBot.tags.forEach((tag) => {
      const tagElement = document.createElement('span');
      tagElement.classList.add('keyword');
      tagElement.textContent = tag;
      tagsContainer.appendChild(tagElement);
    });

    document.querySelectorAll('.dynamic-message').forEach((message) => {
      message.remove();
    });
  }

  // Highlight the active button in the sidebar
  document.querySelectorAll('.nav-item').forEach((button) => {
    console.log('This works');
    button.classList.remove('active');
  });

  const button = Array.from(document.querySelectorAll('.nav-item')).find(
    (btn) => btn.textContent.trim() === botName
  );
  if (button) button.classList.add('active');
}

querybutton.addEventListener('click', function () {
  const userInput = document.getElementById('user-input').value;
  if (userInput.trim() === '') return;

  const chatBox = document.getElementById('chat-box');

  // Display user message
  const userMessage = document.createElement('div');
  userMessage.className = 'message user-message dynamic-message';
  userMessage.innerText = userInput;

  // Append the message container to the chat box
  chatBox.appendChild(userMessage);

  // Clear input field
  document.getElementById('user-input').value = '';

  // Scroll chat box to bottom
  chatBox.scrollTop = chatBox.scrollHeight;

  // Send user message to server

  // Display bot response
  const botMessage = document.createElement('div');
  botMessage.className = 'message system-message dynamic-message';

  // Create avatar element
  const botAvatar = document.createElement('img');
  botAvatar.src = 'img/ask_btn.png.png'; // Add the path to your bot avatar image
  botAvatar.className = 'avatar';

  botMessage.innerText = 'system';
  chatBox.appendChild(botMessage);

  // Scroll chat box to bottom
  chatBox.scrollTop = chatBox.scrollHeight;
});

function onFileUpload() {
  console.log('File Upload Selected');
}

function toggleEmailSyncDropdown() {
  const dropdown = document.getElementById('email-sync-dropdown');
  const icon = document.getElementById('dropdown-icon');

  const isDropdownOpen = dropdown.style.display === 'block';

  // Toggle dropdown display
  dropdown.style.display = isDropdownOpen ? 'none' : 'block';

  // Change icon based on dropdown state
  icon.classList.toggle('fa-chevron-down', isDropdownOpen);
  icon.classList.toggle('fa-chevron-up', !isDropdownOpen);
}

function onFetchAllEmails() {
  console.log('Fetch All Emails Selected');
}

function onApplyFilters() {
  console.log('Apply Filters Selected');
  emailFilterModal.style.display = 'flex'; // Show the modal

  emailFilterForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const email = document.getElementById('sender-email').value;

    console.log('Applied Filters' + startDate, endDate, email);

    emailFilterModal.style.display = 'none';
  });
}

cancelEmailFilter.addEventListener('click', function () {
  emailFilterModal.style.display = 'none'; // Hide the modal
});

cancelEmailFilterModalIcon.addEventListener('click', function () {
  emailFilterModal.style.display = 'none'; // Hide the modal
});
