// Selectors
AWS.config.region = 'us-east-1'

AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-1:8a9b205f-2e8e-4bb4-91f5-5c9d5e993029' 
});

const s3 = new AWS.S3();


const querybutton = document.getElementById('send-query-button');
const BEDROCK_API_ENDPOINT = 'https://fbrbdt2hl5.execute-api.us-east-1.amazonaws.com/prod/chat';

const emailFilterModal = document.getElementById('email-filter-modal');
const cancelEmailFilter = document.getElementById('email-filter-cancel-button');
const cancelEmailFilterModalIcon = document.getElementById(
  'filter-modal-close-icon'
);

const emailFilterForm = document.getElementById('email-filter-form');

const pdfInput = document.getElementById('pdf-input');
const attachmentIcon = document.querySelector('.attachment-icon');

function showNotification(message, type = 'success') {
  // Remove any existing notifications
  const existingNotifications = document.querySelectorAll('.upload-notification');
  existingNotifications.forEach(notification => notification.remove());

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `upload-notification ${type}`;
  
  // Create file icon
  const fileIcon = document.createElement('i');
  fileIcon.className = type === 'success' 
      ? 'fas fa-file-pdf' 
      : 'fas fa-exclamation-circle';
  
  // Create message text
  const messageText = document.createElement('span');
  messageText.textContent = type === 'success' 
      ? `Uploaded: ${message}` 
      : message;
  
  // Create progress indicator (for uploads)
  if (type === 'uploading') {
      const loadingSpinner = document.createElement('div');
      loadingSpinner.className = 'upload-loading';
      notification.appendChild(loadingSpinner);
  }
  
  // Append elements
  notification.appendChild(fileIcon);
  notification.appendChild(messageText);
  document.body.appendChild(notification);
  
  // Add fade out animation before removing
  if (type !== 'uploading') {
      setTimeout(() => {
          notification.style.animation = 'fadeOut 0.3s ease-out forwards';
          setTimeout(() => {
              notification.remove();
          }, 300);
      }, 3000);
  }
  
  return notification; // Return the notification element for potential updates
}

// Update the upload handler to use the new notification system
pdfInput.addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (fileExtension !== 'pdf') {
          showNotification('Please upload a PDF file', 'error');
          return;
      }
      
      const newFileName = `${sessionId}.${fileExtension}`;
      const uploadingNotification = showNotification('Uploading...', 'uploading');
      
      
      const params = {
          Bucket: 'uploaded-template',
          Key: newFileName,
          Body: file,
          ContentType: file.type
      };
      
      s3.putObject(params, function(err, data) {
          if (err) {
              console.error('Error uploading file:', err);
              uploadingNotification.remove();
              showNotification('Error uploading file. Please try again.', 'error');
              attachmentIcon.style.color = '';
          } else {
              console.log('File uploaded successfully:', newFileName);
              uploadingNotification.remove();
              showNotification(file.name, 'success');
              
        }
      });
  }
});




sessionId = uuid.v4()

async function callBedrockAgent(message, sessionId) {
  try {
      const response = await fetch(BEDROCK_API_ENDPOINT, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              message: message,
              sessionId: sessionId
          }),
      });
      
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Raw API Response:', data);

      if (typeof data === 'object' && data.statusCode === 200) {
          let bodyContent;
          
          // Handle case where body is a string that needs parsing
          if (typeof data.body === 'string') {
              try {
                  bodyContent = JSON.parse(data.body);
              } catch (e) {
                  bodyContent = { message: data.body };
              }
          } else {
              bodyContent = data.body;
          }

          // Handle document generation response
          if (bodyContent.type === 'document') {
              return {
                  type: 'document',
                  message: bodyContent.message,
                  downloadUrl: bodyContent.download_url
              };
          }
          
          // Handle text response
          if (bodyContent.type === 'text') {
              return {
                  type: 'text',
                  message: bodyContent.message
              };
          }

          // If bodyContent has a direct message property
          if (bodyContent.message) {
              return {
                  type: 'text',
                  message: bodyContent.message
              };
          }

          console.warn('Unexpected response structure:', bodyContent);
          return {
              type: 'text',
              message: 'I received your message but encountered an unexpected response format. Please try again.'
          };
      }
      
      throw new Error('Invalid response structure from API');
  } catch (error) {
      console.error('Error in callBedrockAgent:', error);
      throw error;
  }
}

// Function to create and append a message to the chat
function appendMessage(content, isUser = false) {
  const chatBox = document.getElementById('chat-box');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user-message' : 'system-message'} dynamic-message`;
  
  if (typeof content === 'string') {
      messageDiv.innerText = content;
  } else {
      // For document responses, create formatted content
      const messageText = document.createElement('div');
      messageText.innerText = content.message;
      messageDiv.appendChild(messageText);

      if (content.downloadUrl) {
          const downloadLink = document.createElement('a');
          downloadLink.href = content.downloadUrl;
          downloadLink.target = '_blank';
          downloadLink.className = 'download-link';
          downloadLink.innerText = 'Download Document';
          messageDiv.appendChild(downloadLink);
      }
  }
  
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}


//Array of bot objects used to identify and manage active bots

const bots = [
  {
    name: 'Pricing Assistant',
    description: 'Generate pricing offers instantly',
    tags: ['Chatbot', 'Quick'],
    firstMessage:
      'Hello, I’m your pricing assistant specialized in pricing recommendations. How can I help you today?',
  },
  {
    name: 'Instant Proposals',
    description: 'Create proposals and quotes',
    tags: ['documents', 'management', 'access'],
    firstMessage:
      "Hello! I'm your AI Proposal Generator. I can help create professional proposals and quotes based on your templates. What would you like to draft today?",
  },
  {
    name: 'Email Insights',
    description: 'Chat with customer email data',
    tags: ['email', 'insights', 'analytics'],
    firstMessage:
      "Hi there! I'm your Email Insights Assistant. I can help you understand customer conversations and extract key insights. How can I assist you today?",
  },
  {
    name: 'Sales Call Analysis',
    description: 'Analyze sales calls to extract key insights',
    tags: ['calls', 'insights', 'analytics'],
    firstMessage:
      "Welcome! I'm your Sales Call Analysis Assistant. I can help analyze sales call recordings and update your CRM with insights. Which call recording would you like to analyze?",
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

querybutton.addEventListener('click', async function () {
  const userInput = document.getElementById('user-input').value;
  if (userInput.trim() === '') return;

  // Display user message
  appendMessage(userInput, true);

  // Clear input field
  document.getElementById('user-input').value = '';

  // Show loading state
  const loadingMessage = document.createElement('div');
  loadingMessage.className = 'message system-message dynamic-message';
  loadingMessage.innerText = 'Thinking...';
  document.getElementById('chat-box').appendChild(loadingMessage);

  try {
      const response = await callBedrockAgent(userInput, sessionId);
      
      // Remove loading message
      if (loadingMessage && loadingMessage.parentNode) {
          loadingMessage.remove();
      }

      // Handle the response based on its type
      if (response.type === 'document') {
          appendMessage({
              message: response.message,
              downloadUrl: response.downloadUrl
          });
      } else {
          appendMessage(response.message);
      }

  } catch (error) {
      console.error('Chat error:', error);
      
      // Remove loading message
      if (loadingMessage && loadingMessage.parentNode) {
          loadingMessage.remove();
      }

      // Display error message
      appendMessage('Sorry, I encountered an error. Please try again.');
  }
});

// Initialize session
window.addEventListener('load', function() {
  console.log('Chat session initialized with ID:', sessionId);
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

  console.log('Applied Filters' + startDate, endDate, email);

  emailFilterModal.style.display = 'none';
  emailFilterForm.reset();
});

cancelEmailFilter.addEventListener('click', function () {
  emailFilterModal.style.display = 'none'; // Hide the modal
});

cancelEmailFilterModalIcon.addEventListener('click', function () {
  emailFilterModal.style.display = 'none'; // Hide the modal
});

