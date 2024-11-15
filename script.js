// Selectors
AWS.config.region = 'us-east-1';

AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: 'us-east-1:8a9b205f-2e8e-4bb4-91f5-5c9d5e993029',
});

const s3 = new AWS.S3();

const queryButton = document.getElementById('send-query-button');
const userInput = document.getElementById('user-input');
const BEDROCK_API_ENDPOINT =
  'https://fbrbdt2hl5.execute-api.us-east-1.amazonaws.com/prod/chat';

const emailFilterModal = document.getElementById('email-filter-modal');
const cancelEmailFilter = document.getElementById('email-filter-cancel-button');
const cancelEmailFilterModalIcon = document.getElementById(
  'filter-modal-close-icon'
);

const emailFilterForm = document.getElementById('email-filter-form');
const feedbackMessage = document.getElementById('feedback-message');
const pdfInput = document.getElementById('pdf-input');
const attachmentIcon = document.querySelector('.attachment-icon');

function showNotification(message, type = 'success') {
  // Remove any existing notifications
  const existingNotifications = document.querySelectorAll(
    '.upload-notification'
  );
  existingNotifications.forEach((notification) => notification.remove());

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `upload-notification ${type}`;

  // Create file icon
  const fileIcon = document.createElement('i');
  fileIcon.className =
    type === 'success' ? 'fas fa-file-pdf' : 'fas fa-exclamation-circle';

  // Create message text
  const messageText = document.createElement('span');
  messageText.textContent = type === 'success' ? `${message}` : message;

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
pdfInput.addEventListener('change', function (event) {
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
      ContentType: file.type,
    };

    s3.putObject(params, function (err, data) {
      if (err) {
        console.error('Error uploading file:', err);
        uploadingNotification.remove();
        showNotification('Error uploading file. Please try again.', 'error');
        attachmentIcon.style.color = '';
      } else {
        console.log('File uploaded successfully:', newFileName);
        uploadingNotification.remove();
        showNotification('File uploaded successfully', 'success');
      }
    });
  }
});

sessionId = uuid.v4();

async function callBedrockAgent(message, sessionId) {
  try {
    const response = await fetch(BEDROCK_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        sessionId: sessionId,
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
          downloadUrl: bodyContent.download_url,
        };
      }

      // Handle text response
      if (bodyContent.type === 'text') {
        return {
          type: 'text',
          message: bodyContent.message,
        };
      }

      // If bodyContent has a direct message property
      if (bodyContent.message) {
        return {
          type: 'text',
          message: bodyContent.message,
        };
      }

      console.warn('Unexpected response structure:', bodyContent);
      return {
        type: 'text',
        message:
          'I received your message but encountered an unexpected response format. Please try again.',
      };
    }

    throw new Error('Invalid response structure from API');
  } catch (error) {
    console.error('Error in callBedrockAgent:', error);
    throw error;
  }
}

async function fetchEmail(
  userId,
  startDate = null,
  endDate = null,
  senderEmail = null
) {
  const emailFetchUrl =
    'https://b4ioz7den9.execute-api.us-east-1.amazonaws.com/Outlookapp/EmailFetchAPI';

  const requestBody = {
    user_id: userId,
  };
  if (senderEmail) requestBody.sender_email = senderEmail;
  if (startDate) requestBody.start_date = startDate;
  if (endDate) requestBody.end_date = endDate;

  console.log('Fetching emails:', requestBody);

  try {
    const response = await fetch(emailFetchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Fetch Email API response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('Email fetch successful:', result);
      await startSync();
    } else {
      const errorText = await response.text();
      console.error(
        'Error fetching emails. Status:',
        response.status,
        'Details:',
        errorText
      );
    }
  } catch (error) {
    console.error('Error calling FetchEmail API:', error);
  }
}

async function startSync() {
  const syncUrl =
    'https://b4ioz7den9.execute-api.us-east-1.amazonaws.com/Outlookapp/LambdaTriggerAPI';

  try {
    const response = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    console.log('Sync request sent. Status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('Sync successful:', result);
      showNotification('Email sync started successfully.');
    } else {
      const errorText = await response.text();
      console.error(
        'Error syncing knowledge base. Status:',
        response.status,
        'Details:',
        errorText
      );
      showNotification(
        'Error starting email sync. Please try again later.',
        'error'
      );
    }
  } catch (error) {
    console.error('Error syncing knowledge base:', error);
    showNotification(
      'Error starting email sync. Please try again later.',
      'error'
    );
  }
}

async function fetchEmail(
  userId,
  startDate = null,
  endDate = null,
  senderEmail = null
) {
  const emailFetchUrl =
    'https://b4ioz7den9.execute-api.us-east-1.amazonaws.com/Outlookapp/EmailFetchAPI';
  const requestBody = {
    user_id: userId,
  };
  if (senderEmail) requestBody.sender_email = senderEmail;
  if (startDate) requestBody.start_date = startDate;
  if (endDate) requestBody.end_date = endDate;

  console.log('Fetching emails:', requestBody);

  try {
    const response = await fetch(emailFetchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Fetch Email API response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('Email fetch successful:', result);
      showNotification('Email fetch successful');
      await startSync();
    } else {
      const errorText = await response.text();
      console.error(
        'Error fetching emails. Status:',
        response.status,
        'Details:',
        errorText
      );
      showNotification(
        'Error fetching emails. Please try again later.',
        'error'
      );
    }
  } catch (error) {
    console.error('Error calling FetchEmail API:', error);
    showNotification('Error fetching emails. Please try again later.', 'error');
  }
}

function extractUserIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('user_id');
}

// Function to create and append a message to the chat
function appendMessage(content, isUser = false) {
  const chatBox = document.getElementById('chat-box');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${
    isUser ? 'user-message' : 'system-message'
  } dynamic-message`;

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
    tags: ['Chatbot'],
    firstMessage:
      "Hello, I'm your pricing assistant specialized in pricing recommendations. How can I help you today?",
    features: [
      'Converse with your emails',
      'Generate formatted PDF Quotation Letters',
      "Upload your company's header/footer to be incorporated in the generated letter",
      'Compare different pricing offers and discounts for each customer',
    ],
  },
  {
    name: 'Email Insights',
    description: 'Chat with customer email data',
    tags: ['email', 'insights', 'analytics'],
    firstMessage:
      "Hi there! I'm your Email Insights Assistant. I can help you understand customer conversations and extract key insights. How can I assist you today?",
    features: [
      'Key customer pain points',
      'Historical interaction summary',
      'Customer requirements and goals',
    ],
    titleText: 'Analyze customer email conversations',
    subtitleText:
      'Get quick insights from email threads to understand customer context and history.',
    featureIntro: 'The bot synthesizes email data to provide:',
  },
];

//Selects a bot by its name and updates the UI with the bot's details.

function selectBot(botName) {
  // Hide main-tools and display analytics
  document.getElementById('main-tools').style.display = 'flex';
  document.getElementById('analytics').style.display = 'none';

  const selectedBot = bots.find((bot) => bot.name === botName);

  if (selectedBot) {
    document.querySelector('.header-title').textContent = botName;
    document.querySelector('.header-description').textContent =
      selectedBot.description;

    document.querySelector('.first-message').textContent =
      selectedBot.firstMessage;

    const contentTitle = document.querySelector(
      '.right-column .header-title strong'
    );
    const featuresText = document.querySelectorAll('.features-text');

    contentTitle.textContent =
      selectedBot.titleText || 'Customize pricing offers for customers';
    featuresText[0].textContent =
      selectedBot.subtitleText ||
      'Tailor the pricing plan based on the needs and sentiments for each customer.';
    featuresText[1].textContent =
      selectedBot.featureIntro ||
      'The bot formulates a customized pricing plan by referring to:';

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

async function handleUserInput() {
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
        downloadUrl: response.downloadUrl,
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
}

queryButton.addEventListener('click', handleUserInput);

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

async function onFetchAllEmails() {
  console.log('Fetch All Emails Selected');
  const userId = extractUserIdFromUrl();
  showNotification('Sync Started');

  try {
    await fetchEmail(userId);
  } catch (error) {
    console.error('Error fetching emails:', error);
    showErrorMessage('Error fetching emails. Please try again later.');
  }
}

function onApplyFilters() {
  emailFilterModal.style.display = 'flex';
}

async function onFetchFilteredEmails() {
  const userId = extractUserIdFromUrl();
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  const senderEmail = document.getElementById('sender-email').value;
  showNotification('Sync Started');

  try {
    await fetchEmail(userId, startDate || null, endDate || null, senderEmail);
  } catch (error) {
    console.error('Error fetching filtered emails:', error);
    showErrorMessage('Error fetching emails. Please try again later.');
  }
}

emailFilterForm.addEventListener('submit', function (e) {
  e.preventDefault();

  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  const email = document.getElementById('sender-email').value;

  if ((startDate && endDate) || email) {
    console.log('Applied Filters:', { startDate, endDate, email });
    onFetchFilteredEmails();
    emailFilterModal.style.display = 'none';
    emailFilterForm.reset();
  } else {
    showEmailFilterError();
  }
});

function showEmailFilterError(message) {
  if (!startDate && !endDate && !email) {
    feedbackMessage.textContent = 'Please enter either both dates or an email.';
  } else if ((startDate && !endDate) || (!startDate && endDate)) {
    feedbackMessage.textContent =
      'Please provide both start and end dates for date filtering.';
  } else if (!email) {
    feedbackMessage.textContent =
      'Please enter a valid email for email filtering.';
  }
  feedbackMessage.style.display = 'block';
}

cancelEmailFilter.addEventListener('click', function () {
  emailFilterModal.style.display = 'none';
  emailFilterForm.reset();
});

cancelEmailFilterModalIcon.addEventListener('click', function () {
  emailFilterModal.style.display = 'none';
  emailFilterForm.reset();
});

document.addEventListener('DOMContentLoaded', function () {
  const sessionId = uuid.v4();
  console.log('Generated session ID:', sessionId);

  const userId = extractUserIdFromUrl();
  console.log('Extracted User ID:', userId);

  userInput.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
      handleUserInput();
    }
  });

  const syncButton = document.querySelector('.Sync-Button');
  if (syncButton) {
    syncButton.addEventListener('click', function () {
      showSyncOptionsPopup();
    });
  }

  const fetchAllButton = document.getElementById('fetch-all-emails');
  if (fetchAllButton) {
    fetchAllButton.addEventListener('click', async function () {
      hideSyncOptionsPopup();
      console.log('Fetching all emails with user ID:', userId);
      await fetchEmail(userId);
    });
  }

  const fetchFilteredButton = document.getElementById('fetch-filtered-emails');
  if (fetchFilteredButton) {
    fetchFilteredButton.addEventListener('click', function () {
      hideSyncOptionsPopup();
      showDatePopup();
    });
  }

  const submitFiltersButton = document.getElementById('submit-filters');
  if (submitFiltersButton) {
    submitFiltersButton.addEventListener('click', async function () {
      const startDate = document.getElementById('start-date').value;
      const endDate = document.getElementById('end-date').value;
      const senderEmail = document.getElementById('sender-email').value;
      hideDatePopup();

      console.log('Selected Start Date:', startDate);
      console.log('Selected End Date:', endDate);
      console.log('Sender Email:', senderEmail);

      await fetchEmail(userId, startDate || null, endDate || null, senderEmail);
    });
  }

  function showSyncOptionsPopup() {
    const syncOptionsPopup = document.getElementById('sync-options-popup');
    if (syncOptionsPopup) {
      syncOptionsPopup.classList.remove('hidden');
    }
  }

  function hideSyncOptionsPopup() {
    const syncOptionsPopup = document.getElementById('sync-options-popup');
    if (syncOptionsPopup) {
      syncOptionsPopup.classList.add('hidden');
    }
  }

  function showDatePopup() {
    const datePopup = document.getElementById('filter-popup');
    if (datePopup) {
      datePopup.classList.remove('hidden');
    }
  }

  function hideDatePopup() {
    const datePopup = document.getElementById('filter-popup');
    if (datePopup) {
      datePopup.classList.add('hidden');
    }
  }

  function extractUserIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('user_id');
  }
});

// Sales Analysis Bot script

let pollingInterval;
function onSalesAnaylisBot() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.remove('active');
  });

  document.querySelector('.nav-item-sales-analysis').classList.add('active');
  console.log('clicked on Sales Analysis Bot');

  // Hide main-tools and display analytics
  document.getElementById('main-tools').style.display = 'none';
  document.getElementById('analytics').style.display = 'block';
}

document.getElementById('audio-upload').addEventListener('change', function () {
  const fileName = this.files[0]?.name || 'No file selected';
  document.getElementById('file-name').textContent = fileName;

  // Show the "Extract Transcript" button if a file is selected
  const extractButton = document.getElementById('extract-button');

  if (fileName !== 'No file selected') {
    extractButton.style.display = 'flex';
  } else {
    extractButton.style.display = 'none';
  }
});

const uniqueAppID = generateUUID();
console.log('Unique App ID:', uniqueAppID);

async function handleExtractButtonClick(event) {
  event.preventDefault();
  const fileInput = document.getElementById('audio-upload');
  const file = fileInput.files[0];

  if (!file) {
    alert('Please select a file first.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const base64Content = e.target.result.split(',')[1];
    const requestData = {
      fileName: file.name,
      fileContent: base64Content,
      unique_id: uniqueAppID,
    };

    console.log('Request Body:', requestData);

    try {
      document.getElementById('extract-button').textContent = 'Extracting...';

      fetch(
        'https://sss6gqwb4j.execute-api.us-east-1.amazonaws.com/prod/upload',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        }
      );

      pollForData();
    } catch (e) {
      console.error('Something went wrong in HandleExtractButton', e);
    }
  };

  reader.readAsDataURL(file);
}

async function pollForData() {
  const getFileDataUrl = `https://5k4ktv6516.execute-api.us-east-1.amazonaws.com/prod/getfiledata?file_key=${uniqueAppID}`;
  console.log('Polling GET API:', getFileDataUrl);

  pollingInterval = setInterval(async function () {
    try {
      const getFileDataResponse = await fetch(getFileDataUrl);
      const getFileDataResult = await getFileDataResponse.json();
      console.log('GET API Response:', getFileDataResult);

      // Check if data is available and display it
      if (getFileDataResult && getFileDataResult.data) {
        const data = getFileDataResult.data;

        document.getElementById('user-interaction').style = 'display: none';
        document.getElementById('extracted-data').style = 'display: block';

        const extractedDataDiv = document.getElementById('extracted-data');

        // Update Transcription Text
        extractedDataDiv.querySelector('p:nth-of-type(1)').textContent =
          data.transcription_text.S;

        // Update Summary
        extractedDataDiv.querySelector('p:nth-of-type(2)').textContent =
          data.summary.S;

        // Update Action Items
        extractedDataDiv.querySelector('p:nth-of-type(3)').textContent =
          data.action_items.S;

        // Update Customer Data
        extractedDataDiv.querySelector('p:nth-of-type(4)').textContent =
          data.customer_data.S;

        clearInterval(pollingInterval);
      }
    } catch (error) {
      console.error('Error fetching GET API data:', error);
    }
  }, 5000); // Poll every 5 seconds
}

//This is method to fake the api response
// async function pollForData() {
//   const maxRetries = 1; // Number of retries before returning the fake data response
//   let attemptCount = 0; // Counter to track attempts

//   pollingInterval = setInterval(async function () {
//     try {
//       console.log('Polling for data...');

//       await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network delay

//       let getFileDataResult;

//       // For the first few attempts, simulate an error response
//       if (attemptCount < maxRetries) {
//         getFileDataResult = { error: 'Item not found' };
//         console.log('GET API Response:', getFileDataResult);
//       } else {
//         getFileDataResult = fakeResponse;
//         console.log('GET API Response:', getFileDataResult);

//         clearInterval(pollingInterval);
//       }

//       attemptCount++;

//       // Check if data is available and display it
//       if (getFileDataResult && getFileDataResult.data) {
//         const data = getFileDataResult.data;

//         // console.log(data.transcription_text.S);
//         // console.log(data.summary.S);
//         // console.log(data.action_items.S);
//         // console.log(data.customer_data.S);

//         document.getElementById('user-interaction').style = 'display: none';
//         document.getElementById('extracted-data').style = 'display: block';

//         const extractedDataDiv = document.getElementById('extracted-data');

//         // Update Transcription Text
//         extractedDataDiv.querySelector('p:nth-of-type(1)').textContent =
//           data.transcription_text.S;

//         // Update Summary
//         extractedDataDiv.querySelector('p:nth-of-type(2)').textContent =
//           data.summary.S;

//         // Update Action Items
//         extractedDataDiv.querySelector('p:nth-of-type(3)').textContent =
//           data.action_items.S;

//         // Update Customer Data
//         extractedDataDiv.querySelector('p:nth-of-type(4)').textContent =
//           data.customer_data.S;
//       }
//     } catch (error) {
//       console.error('Error fetching GET API data:', error);
//     }
//   }, 5000); // Poll every 5 seconds
// }

document
  .getElementById('upload-to-zoho')
  .addEventListener('click', async function () {
    const zohoApiUrl = `https://q1byn9qsjb.execute-api.us-east-1.amazonaws.com/prod/create-lead?file_key=${uniqueAppID}`;
    console.log('Calling Zoho API:', zohoApiUrl);

    try {
      const zohoResponse = await fetch(zohoApiUrl, {
        method: 'GET',
      });
      const zohoResult = await zohoResponse.json();
      console.log(zohoResult);

      if (zohoResult.status === 'needs_auth') {
        // Open the auth URL in a popup window
        const popupWidth = 600;
        const popupHeight = 700;
        const left = window.screen.width / 2 - popupWidth / 2;
        const top = window.screen.height / 2 - popupHeight / 2;

        const popup = window.open(
          zohoResult.auth_url,
          'ZohoAuth',
          `width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable,scrollbars`
        );

        if (!popup) {
          alert('Popup blocked! Please allow popups for this site.');
        }

        // Add message listener for the popup callback
        window.addEventListener('message', function (event) {
          if (event.data === 'zoho_auth_success') {
            popup.close();
            // Retry creating the lead after successful authentication
            createZohoLead();
          }
        });
      } else if (zohoResponse.ok) {
        alert('Data uploaded to Zoho successfully!');
      } else {
        alert(`Failed to upload data to Zoho: ${zohoResult.message}`);
      }
    } catch (error) {
      console.error('Error uploading data to Zoho:', error);
      alert(`Error uploading data to Zoho: ${error.message}`);
    }
  });

// Add this helper function to handle lead creation
async function createZohoLead() {
  const zohoApiUrl = `https://q1byn9qsjb.execute-api.us-east-1.amazonaws.com/prod/create-lead?file_key=${uniqueAppID}`;
  try {
    const zohoResponse = await fetch(zohoApiUrl, { method: 'GET' });
    const zohoResult = await zohoResponse.json();

    if (zohoResponse.ok && !zohoResult.status) {
      alert('Data uploaded to Zoho successfully!');
    } else {
      alert(`Failed to upload data to Zoho: ${zohoResult.message}`);
    }
  } catch (error) {
    console.error('Error uploading data to Zoho:', error);
    alert(`Error uploading data to Zoho: ${error.message}`);
  }
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// const fakeResponse = {
//   data: {
//     summary: {
//       S: "Marcos Paul is a 21 year old interested in pursuing an associate's degree in electronics/computer science. He currently holds a GED and is not affiliated with the military. Marcos is undecided on the exact program he wants to study but is interested in computers. He is available to be contacted and lives in the Central time zone.",
//     },
//     customer_data: {
//       S: 'First Name: Marcos\nLast Name: Paul\nEmail: marco@yahoo.com  \nPhone: Unknown\nCity: Unknown\nState: Oklahoma\nZip Code: 74447\nCountry: USA  \nLead Source: Website Form\nCompany: Unknown',
//     },
//     zoho_crm_data: {
//       S: '{"data": [{"Last_Name": "Paul", "First_Name": "Marcos", "Company": "Unknown", "Email": "marco@yahoo.com", "Phone": "Unknown", "City": "Unknown", "Country": "USA", "Lead Source": "Website Form", "Zip_Code": "74447", "Summary": "Marcos Paul is a 21 year old interested in pursuing an associate\'s degree in electronics/computer science. He currently holds a GED and is not affiliated with the military. Marcos is undecided on the exact program he wants to study but is interested in computers. He is available to be contacted and lives in the Central time zone.", "Action_Items": " - Send information on associate\'s degree programs related to electronics/computer science - Have enrollment counselors contact Marcos to further discuss academic interests and program options - Provide details on financial aid opportunities - Follow up with Marcos on enrollment status"}]}',
//     },
//     transcription_text: {
//       S: "Name is James again and I'm calling on behalf of education experts from a quality monitored line. And well, I see that you recently filled a form on the internet expressing an interest in earning a degree, sir. Is this correct? Ok. All right. So that's great. I'll just need only a few moments of your time so I can match you with the most appropriate schools. Are you at least 18 years of age? Yes. Ok. Do you currently have a high school diploma or a gedaged? May I ask if we can find a school for you that meets your needs? Would you be interested in furthering your education in the next six? Ok. So that's great. Name is James again and I'm calling on behalf of education experts from a quality monitored line . And well , I see that you recently filled a form on the internet expressing an interest in earning a degree , sir . Is this correct ? Ok . All right . So that's great . I'll just need only a few moments of your time so I can match you with the most appropriate schools . Are you at least 18 years of age ? Yes . Ok . Do you currently have a high school diploma or a gedaged ? May I ask if we can find a school for you that meets your needs ? Would you be interested in furthering your education in the next six ? Ok . So that's great . So let me first verify the information I already got for you, Mr Pal. Uh I got your first name. Uh So Marcos last name is Paul. Alright. Now kindly verify for me your address, please. 1331 East Randolph. All right. Now this time, kindly verify for me your city state and your zip code, please. Ok. Oklahoma. Mhm. 74447. Thank you, sir. Lastly kindly verify for me your email address please. Marco at yahoo.com. Alright, thank you for that, sir. So let me first verify the information I already got for you , Mr Pal . Uh I got your first name . Uh So Marcos last name is Paul . Alright . Now kindly verify for me your address , please . 1331 East Randolph . All right . Now this time , kindly verify for me your city state and your zip code , please . Ok . Oklahoma . Mhm . 74447 . Thank you , sir . Lastly kindly verify for me your email address please . Marco at yahoo.com . Alright , thank you for that , sir . Now, may I ask what area of interest you're looking to further education career in or what course would you like to? Oh, ok. Uh what course would you like to take up in college, sir? Um Really right now I'm really unders shattered. Uh, if I had a few options I would wanna look into right now, kind of undecided on that. Ok. All right, no problem there. But so in the future, if there's any course that you would like to take up, would you like me to match it right now? So that you have information in your hand? Would that be fine? Now , may I ask what area of interest you're looking to further education career in or what course would you like to ? Oh , ok . Uh what course would you like to take up in college , sir ? Um Really right now I'm really unders shattered . Uh , if I had a few options I would wanna look into right now , kind of undecided on that . Ok . All right , no problem there . But so in the future , if there's any course that you would like to take up , would you like me to match it right now ? So that you have information in your hand ? Would that be fine ? Uh uh electronics, would that be computer on your computer? Ok. Alright. And what degree are looking to obtain? Would it be just simply an associate or a bachelor's degree, associate associate? All this won't take long and I'm just simply going to match it with schools here. Alright, sir. Now, may I ask, uh, how old are you please? Uh, 21. Ok. Uh ok. Alright. Just one second here. Uh Would you be interested in information system? Information system? Uh Can you tell me what does that vary on? Mm. Ok. Uh uh electronics , would that be computer on your computer ? Ok . Alright . And what degree are looking to obtain ? Would it be just simply an associate or a bachelor's degree , associate associate ? All this won't take long and I'm just simply going to match it with schools here . Alright , sir . Now , may I ask , uh , how old are you please ? Uh , 21 . Ok . Uh ok . Alright . Just one second here . Uh Would you be interested in information system ? Information system ? Uh Can you tell me what does that vary on ? Mm . Ok . I'm not sure I'm not, I don't have the full details here, but certainly it will be involved. It will certainly involve computers. I don't know. Excuse me, sir. Go ahead please. I think it is a 57 game. Ok. Well, I'm not, I don't have the details about information system, but definitely it will involve computers. But, uh, once I match with this school enrollment counselors will try to contact you and they can further explain what this is all about. Will that be fine with you? Ok. May I ask, are you associated with the United States military? No. Ok. I'm not sure I'm not , I don't have the full details here , but certainly it will be involved . It will certainly involve computers . I don't know . Excuse me , sir . Go ahead please . I think it is a 57 game . Ok . Well , I'm not , I don't have the details about information system , but definitely it will involve computers . But , uh , once I match with this school enrollment counselors will try to contact you and they can further explain what this is all about . Will that be fine with you ? Ok . May I ask , are you associated with the United States military ? No . Ok . All right. Ok. One second here. Excuse me? Ok. Uh, is your GED your highest level of education or are we able to take up some colleges? That's high? Ah. Ok. Ok. And what is your time zone there? What your time zone, what time zone are you in? What, what is it again, please? Central time. Is that right? Is it central time? Yes, sir. All right . Ok . One second here . Excuse me ? Ok . Uh , is your GED your highest level of education or are we able to take up some colleges ? That's high ? Ah . Ok . Ok . And what is your time zone there ? What your time zone , what time zone are you in ? What , what is it again , please ? Central time . Is that right ? Is it central time ? Yes , sir . Ok. That's good. So I was able to match with school already and it's all right. So I would like to thank you for your time and the school, the call. So we will contact you in the near future. Alright. Thank you, Mr Paul. You have a nice day, sir. I'm sorry, from education experts from a quality monitor line, but I'm trying to ask you. Ok . That's good . So I was able to match with school already and it's all right . So I would like to thank you for your time and the school , the call . So we will contact you in the near future . Alright . Thank you , Mr Paul . You have a nice day , sir . I'm sorry , from education experts from a quality monitor line , but I'm trying to ask you .",
//     },
//     action_items: {
//       S: "- Send information on associate's degree programs related to electronics/computer science\n- Have enrollment counselors contact Marcos to further discuss academic interests and program options\n- Provide details on financial aid opportunities \n- Follow up with Marcos on enrollment status",
//     },
//     file_key: {
//       S: 'd989d0ab-b701-4c7f-a13c-2fa5e2440937',
//     },
//   },
// };
