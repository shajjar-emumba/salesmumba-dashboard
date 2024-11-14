// Selectors

const querybutton = document.getElementById('send-query-button');

const emailFilterModal = document.getElementById('email-filter-modal');
const cancelEmailFilter = document.getElementById('email-filter-cancel-button');
const cancelEmailFilterModalIcon = document.getElementById(
  'filter-modal-close-icon'
);

const emailFilterForm = document.getElementById('email-filter-form');
const feedbackMessage = document.getElementById('feedback-message');

//Array of bot objects used to identify and manage active bots

const bots = [
  {
    name: 'Pricing Assistant',
    description: 'Generate pricing offers instantly',
    tags: ['Chatbot', 'Quick'],
    firstMessage:
      'Hello, I’m your pricing assistant specialized in pricing recommendations. How can I help you today?',
    features: [
      "Customer's historical conversations",
      "Company's complex Pricing Document",
    ],
  },
  {
    name: 'Email Insights',
    description: 'Chat with customer email data',
    tags: ['email', 'insights', 'analytics'],
    firstMessage:
      "Hi there! I'm your Email Insights Assistant. I can help you understand customer conversations and extract key insights. How can I assist you today?",
    features: [
      'Advanced email analytics',
      'Sentiment and intent analysis',
      'Test 1',
      'Test 2',
    ],
  },
  {
    name: 'Sales Call Analysis',
    description: 'Analyze sales calls to extract key insights',
    tags: ['calls', 'insights', 'analytics'],
    firstMessage:
      "Welcome! I'm your Sales Call Analysis Assistant. I can help analyze sales call recordings and update your CRM with insights. Which call recording would you like to analyze?",
    features: ['Call sentiment analysis', 'Conversation summarization'],
  },
];

//Selects a bot by its name and updates the UI with the bot's details.

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

    const featuresListContainer = document.querySelector('.features-list');
    featuresListContainer.innerHTML = '';

    selectedBot.features.forEach((feature) => {
      const featureElement = document.createElement('div');
      const featureIcon = document.createElement('img');
      featureIcon.src = './assets/tick.svg';
      featureIcon.alt = 'tick icon';

      const featureText = document.createElement('p');
      featureText.textContent = feature;

      featureElement.appendChild(featureIcon);
      featureElement.appendChild(featureText);
      featuresListContainer.appendChild(featureElement);
    });

    document.querySelectorAll('.dynamic-message').forEach((message) => {
      message.remove();
    });
  }

  // Highlight the active button in the sidebar
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.remove('active');
  });

  const button = Array.from(document.querySelectorAll('.nav-item')).find(
    (btn) => btn.textContent.trim() === botName
  );
  if (button) button.classList.add('active');
}

// this method is responsible for the user message and bot response

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
  emailFilterModal.style.display = 'flex';
}

emailFilterForm.addEventListener('submit', function (e) {
  e.preventDefault();

  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  const email = document.getElementById('sender-email').value;

  if ((startDate && endDate) || email) {
    console.log('Applied Filters:', { startDate, endDate, email });

    emailFilterModal.style.display = 'none';
    emailFilterForm.reset();
    feedbackMessage.textContent = 'Please fill out all the fields.';
  } else {
    if (!startDate && !endDate && !email) {
      feedbackMessage.textContent =
        'Please enter either both dates or an email.';
    } else if ((startDate && !endDate) || (!startDate && endDate)) {
      feedbackMessage.textContent =
        'Please provide both start and end dates for date filtering.';
    } else if (!email) {
      feedbackMessage.textContent =
        'Please enter a valid email for email filtering.';
    }

    feedbackMessage.style.display = 'block';
  }
});

cancelEmailFilter.addEventListener('click', function () {
  emailFilterModal.style.display = 'none'; // Hide the modal
  emailFilterForm.reset();
});

cancelEmailFilterModalIcon.addEventListener('click', function () {
  emailFilterModal.style.display = 'none'; // Hide the modal
  emailFilterForm.reset();
});
