// Get references to HTML elements
const chatArea = document.getElementById("chat-area");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const teachInput = document.getElementById("teach-input");
const teachButton = document.getElementById("teach-button");
const logoutButton = document.getElementById("logout-button");
const chatgptButton = document.getElementById("chat-gpt-button");
const feedbackInput = document.getElementById("feedback-input");
const feedbackButton = document.getElementById("feedback-button");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const searchResultsList = document.getElementById("search-results");
const draggableElement = document.querySelector('.draggable');
const saveButton = document.getElementById("save-button");


let isApiActive = false; // Flag to track API activation status
let previousUserMessage = ""; // Store the previous user message
let awaitingTeaching = false; // Flag to track if the chatbot is waiting for teaching
let isDragging = false;
let chatHistory = []; // Initialize an empty array to store chat history

teachInput.style.display = "none";
teachButton.style.display = "none";

chatgptButton.addEventListener("click", toggleApiActivation);
sendButton.addEventListener("click", sendMessage);
feedbackButton.addEventListener("click", submitFeedback);
searchButton.addEventListener("click", searchOnRapidAPI);
teachButton.addEventListener("click", teachChatbot);
saveButton.addEventListener("click", saveChatHistory);
window.addEventListener('load', centerDraggableElement);
window.addEventListener('resize', centerDraggableElement);


draggableElement.addEventListener('mousedown', (e) => {
    isDragging = true;


    const offsetX = e.clientX - draggableElement.getBoundingClientRect().left;
    const offsetY = e.clientY - draggableElement.getBoundingClientRect().top;


    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);


    function onMouseMove(e) {
        if (!isDragging) return;

        const newX = e.clientX - offsetX;
        const newY = e.clientY - offsetY;

        draggableElement.style.left = `${newX}px`;
        draggableElement.style.top = `${newY}px`;
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
});

// Add an event listener for the "keypress" event on the user input field
teachInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        teachChatbot(event);
    }
});

// Add an event listener for the "keypress" event on the user input field
userInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        sendMessage();
    }
});

// Add an event listener for the "keypress" event on the search input field
searchInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        searchOnRapidAPI();
    }
});

// Add an event listener for the "keypress" event on the feedback input field
feedbackInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        submitFeedback();
    }
});


function centerDraggableElement() {
    const draggableElement = document.querySelector('.draggable');
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const draggableWidth = draggableElement.offsetWidth;
    const draggableHeight = draggableElement.offsetHeight;

    const newX = (windowWidth - draggableWidth) / 2;
    const newY = (windowHeight - draggableHeight) / 2;

    draggableElement.style.left = `${newX}px`;
    draggableElement.style.top = `${newY}px`;
}

function searchOnRapidAPI() {
    const searchTerm = searchInput.value.trim();
    if (searchTerm !== "") {
        const rapidAPISearchURL = `https://rapidapi.com/search/${encodeURIComponent(searchTerm)}`;
        window.open(rapidAPISearchURL, '_blank'); // Open in a new tab
    }
}

function submitFeedback() {
    const feedbackInput = document.querySelector('#feedback-input');
    if (feedbackInput) {
        const feedback = feedbackInput.value;
        sendFeedback(feedback);
    } else {
        console.error("Feedback input element not found.");
    }
}

function sendFeedback(feedback) {
    // Send the feedback to the backend using fetch API
    fetch('https://ai-v1.herokuapp.com/submit_feedback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feedback: feedback }),
    })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
            // Clear the feedback input after submission
            document.querySelector('#feedback-input').value = '';
        })
        .catch(error => {
            console.error('Fetch Error:', error);
        });
}

function displayErrorMessage(message) {
    const errorContainer = document.getElementById('error-message');
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
}

function toggleApiActivation() {
    isApiActive = !isApiActive; // Toggle the flag

    if (isApiActive) {
        // Activate API key
        chatgptButton.textContent = "Deactivate Chat GPT"; // Update button text

        toggleApi(); // Call the toggleApi function
    } else {
        // Deactivate API key
        chatgptButton.textContent = "Activate Chat GPT"; // Update button text

        toggleApi(); // Call the toggleApi function
    }
}

function toggleApi() {
    // Send a request to toggle the API activation status
    fetch('https://ai-v1.herokuapp.com/toggle_api', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
    })
        .then(response => response.json())
        .then(data => {
            console.log(data.activated);
        })
        .catch(error => {
            console.error('Fetch Error:', error);
        });
}

function sendMessage() {
    const userMessage = userInput.value;
    if (userMessage.trim() !== "") {
        previousUserMessage = userMessage; // Store the current user message
        displayMessage(userMessage, "user");

        // Send the user message to the backend using fetch API
        fetch('https://ai-v1.herokuapp.com/get_response', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: userMessage }),
        })
            .then(response => response.json())
            .then(data => {
                const chatbotResponse = data.response;
                displayMessage(chatbotResponse, "chatbot");

                // Check if chatbot is asking for teaching
                if (chatbotResponse.includes("teach")) {
                    showTeachInputAndButton();
                } else {
                    hideTeachInputAndButton();
                }
            })
            .catch(error => {
                console.error('Fetch Error:', error);
            });

        userInput.value = "";
    }
}

function showTeachInputAndButton() {
    teachInput.style.display = "block";
    teachButton.style.display = "block";
    awaitingTeaching = true;
}

function hideTeachInputAndButton() {
    teachInput.style.display = "none";
    teachButton.style.display = "none";
    awaitingTeaching = false;
}

function teachChatbot(event) {
    if (event) {
        event.preventDefault(); // Prevent the form submission from refreshing the page
    }
    const chatbotResponse = teachInput.value;

    // Send the user message and chatbot response to the backend using fetch API
    fetch('https://ai-v1.herokuapp.com/teach', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: previousUserMessage, response: chatbotResponse }),
    })
        .then(response => response.json())
        .then(data => {
            const teachMessage = data.message;
            displayMessage(teachMessage, "chatbot");
            hideTeachInputAndButton();
        })
        .catch(error => {
            console.error('Fetch Error:', error);
        });

    teachInput.value = "";
}

function saveChatHistory() {
    const chatText = chatHistory.map(entry => `[${entry.sender}] ${entry.message}`).join('\n');
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat_history.txt';
    a.click();

    URL.revokeObjectURL(url);
}

function displayMessage(message, sender) {
    const messageContainer = document.createElement("div");
    messageContainer.className = `message-container ${sender}`;

    const avatarImage = document.createElement("img");
    avatarImage.src = sender === "user" ? "Images/user.png" : "Images/ai.png";
    avatarImage.alt = sender === "user" ? "User Avatar" : "Chatbot Avatar";

    const messageElement = document.createElement("div");
    messageElement.className = sender === "user" ? "message-user" : "message-chatbot";
    messageElement.innerHTML = message;

    // Format and display the message
    const formattedLines = message.split('\n');
    const formattedMessage = formattedLines.map(line => `<p class="message-line">${line}</p>`).join('');
    messageElement.innerHTML = formattedMessage;

    if (sender === "user") {
        messageContainer.appendChild(messageElement);
        messageContainer.appendChild(avatarImage);
    } else {
        messageContainer.appendChild(avatarImage);
        messageContainer.appendChild(messageElement);
    }

    chatArea.appendChild(messageContainer);
    chatArea.scrollTop = chatArea.scrollHeight; // Auto-scroll to the latest message

    // Store the message in the chat history
    chatHistory.push({ message, sender });

    chatArea.appendChild(messageContainer);
    chatArea.scrollTop = chatArea.scrollHeight; // Auto-scroll to the latest message
}