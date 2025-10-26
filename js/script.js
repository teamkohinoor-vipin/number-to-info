// API Endpoints Configuration
const API_ENDPOINTS = {
    mobile: 'https://ox.taitaninfo.workers.dev/?mobile=',
    aadhar: 'https://ox.taitaninfo.workers.dev/?aadhar=',
    vehicle: 'https://ox.taitaninfo.workers.dev/?vehicle=',
    family: 'https://ox.taitaninfo.workers.dev/?family=',
    ifsc: 'https://ifsc.taitaninfo.workers.dev/?code='
};

// Search type configurations
const SEARCH_TYPES = {
    mobile: {
        icon: '📱',
        placeholder: 'Enter mobile number (e.g., 9876543210)',
        hint: 'Enter 10-digit mobile number',
        maxLength: 10,
        pattern: /^\d{10}$/
    },
    aadhar: {
        icon: '🆔',
        placeholder: 'Enter Aadhaar number (e.g., 123456789012)',
        hint: 'Enter 12-digit Aadhaar number',
        maxLength: 12,
        pattern: /^\d{12}$/
    },
    vehicle: {
        icon: '🚗',
        placeholder: 'Enter vehicle number (e.g., UP15AB1234)',
        hint: 'Enter vehicle registration number',
        maxLength: 20,
        pattern: /^[A-Z]{2}\d{1,2}[A-Z]{1,2}\d{1,4}$/i
    },
    family: {
        icon: '👨‍👩‍👧‍👦',
        placeholder: 'Enter family name or identifier',
        hint: 'Enter family name or identifier',
        maxLength: 50,
        pattern: /^.+$/
    },
    ifsc: {
        icon: '🏦',
        placeholder: 'Enter IFSC code (e.g., SBIN0000001)',
        hint: 'Enter 11-character IFSC code',
        maxLength: 11,
        pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/
    }
};

// Global variables
let currentSearchType = 'mobile';
let map = null;
let currentAadhaarNumber = null;
let currentMarker = null;

// DOM Elements
const elements = {
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    inputHint: document.getElementById('inputHint'),
    errorMessage: document.getElementById('errorMessage'),
    loadingSteps: document.getElementById('loadingSteps'),
    resultsContainer: document.getElementById('resultsContainer'),
    resultsGrid: document.getElementById('resultsGrid'),
    resultsTitle: document.getElementById('resultsTitle'),
    resultsType: document.getElementById('resultsType'),
    resultsIcon: document.getElementById('resultsIcon'),
    fetchAadhaarBtn: document.getElementById('fetchAadhaarBtn'),
    newSearchBtn: document.getElementById('newSearchBtn'),
    errorModal: document.getElementById('errorModal'),
    tryAgainBtn: document.getElementById('tryAgainBtn'),
    mapContainer: document.getElementById('map')
};

// Initialize the application
function init() {
    setupEventListeners();
    updateSearchUI();
    initializeMap();
    console.log('InfoFinder initialized successfully');
}

// Setup event listeners
function setupEventListeners() {
    // Search type selection
    document.querySelectorAll('.search-type').forEach(type => {
        type.addEventListener('click', handleSearchTypeChange);
    });

    // Search functionality
    elements.searchBtn.addEventListener('click', performSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // Action buttons
    elements.fetchAadhaarBtn.addEventListener('click', fetchAadhaarDetails);
    elements.newSearchBtn.addEventListener('click', resetSearch);
    elements.tryAgainBtn.addEventListener('click', hideErrorModal);

    // Input validation on change
    elements.searchInput.addEventListener('input', handleInputChange);
}

// Handle search type change
function handleSearchTypeChange(e) {
    document.querySelectorAll('.search-type').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    currentSearchType = e.target.dataset.type;
    updateSearchUI();
}

// Handle input change for real-time validation
function handleInputChange() {
    hideError();
}

// Update search UI based on selected type
function updateSearchUI() {
    const config = SEARCH_TYPES[currentSearchType];
    elements.searchInput.placeholder = config.placeholder;
    elements.inputHint.textContent = config.hint;
    elements.searchInput.maxLength = config.maxLength;
    
    // Clear previous input and errors
    elements.searchInput.value = '';
    hideError();
    elements.fetchAadhaarBtn.style.display = 'none';
}

// Validate input
function validateInput() {
    const value = elements.searchInput.value.trim();
    const config = SEARCH_TYPES[currentSearchType];
    
    if (!value) {
        showError('Please enter a value');
        return false;
    }
    
    if (config.pattern && !config.pattern.test(value)) {
        showError(`Please enter a valid ${currentSearchType} ${currentSearchType === 'ifsc' ? 'code' : 'number'}`);
        return false;
    }
    
    hideError();
    return true;
}

// Show error message
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
}

// Hide error message
function hideError() {
    elements.errorMessage.style.display = 'none';
}

// Show loading animation
function showLoading() {
    elements.loadingSteps.style.display = 'block';
    elements.resultsContainer.style.display = 'none';
    elements.mapContainer.style.display = 'none';
    
    const steps = document.querySelectorAll('.step');
    steps.forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    let currentStep = 0;
    const interval = setInterval(() => {
        if (currentStep > 0) {
            steps[currentStep - 1].classList.remove('active');
            steps[currentStep - 1].classList.add('completed');
        }
        
        if (currentStep < steps.length) {
            steps[currentStep].classList.add('active');
            currentStep++;
        } else {
            clearInterval(interval);
        }
    }, 600);
}

// Hide loading animation
function hideLoading() {
    elements.loadingSteps.style.display = 'none';
}

// Perform search
async function performSearch() {
    if (!validateInput()) return;
    
    const searchValue = elements.searchInput.value.trim();
    showLoading();
    disableSearchButton();
    
    try {
        const apiUrl = `${API_ENDPOINTS[currentSearchType]}${encodeURIComponent(searchValue)}`;
        console.log('Fetching from:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'InfoFinder/1.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        if (!data || (Array.isArray(data) && data.length === 0) || 
            (data.data && Array.isArray(data.data) && data.data.length === 0)) {
            throw new Error('No data found for the provided input');
        }
        
        // Process and display results
        processResults(data, searchValue);
        
    } catch (error) {
        console.error('Search error:', error);
        showErrorModal(error.message);
    } finally {
        hideLoading();
        enableSearchButton();
    }
}

// Process and display results
function processResults(data, searchValue) {
    const config = SEARCH_TYPES[currentSearchType];
    elements.resultsIcon.textContent = config.icon;
    elements.resultsType.textContent = config.placeholder.split(' ').slice(1, -1).join(' ');
    
    // Clear previous results
    elements.resultsGrid.innerHTML = '';
    
    // Handle different response formats
    let results = data;
    if (Array.isArray(data)) {
        results = data[0] || data;
    } else if (data.data && Array.isArray(data.data)) {
        results = data.data[0] || data.data;
    } else if (data.data && !Array.isArray(data.data)) {
        results = data.data;
    }
    
    // Store Aadhaar number if available in mobile search
    if (currentSearchType === 'mobile' && results.id) {
        currentAadhaarNumber = results.id;
        elements.fetchAadhaarBtn.style.display = 'flex';
    } else {
        elements.fetchAadhaarBtn.style.display = 'none';
    }
    
    // Create info cards based on search type
    createInfoCards(results, searchValue);
    
    // Show location on map if address data is available
    if (results.address) {
        showLocationOnMap(results.address);
    }
    
    // Display results with animation
    elements.resultsContainer.style.display = 'block';
    elements.resultsContainer.classList.add('fade-in');
}

// Create information cards
function createInfoCards(data, searchValue) {
    const cards = [];
    
    // Personal Information Card
    const personalInfo = [];
    if (data.name || data.fname || data.mobile || data.id) {
        if (data.name) personalInfo.push(createInfoItem('Name', data.name));
        if (data.fname) personalInfo.push(createInfoItem('Father\'s Name', data.fname));
        if (data.mobile) personalInfo.push(createInfoItem('Mobile Number', data.mobile));
        if (data.id) personalInfo.push(createInfoItem('Aadhaar ID', data.id));
        if (searchValue && currentSearchType !== 'mobile') {
            personalInfo.push(createInfoItem('Search Value', searchValue));
        }
        
        if (personalInfo.length > 0) {
            cards.push(createInfoCard('👤 Personal Information', personalInfo.join('')));
        }
    }
    
    // Location Information Card
    const locationInfo = [];
    if (data.address || data.circle || data.city || data.state) {
        if (data.circle) locationInfo.push(createInfoItem('Service Circle', data.circle));
        if (data.address) locationInfo.push(createInfoItem('Address', formatAddress(data.address)));
        if (data.city) locationInfo.push(createInfoItem('City', data.city));
        if (data.state) locationInfo.push(createInfoItem('State', data.state));
        
        if (locationInfo.length > 0) {
            cards.push(createInfoCard('📍 Location Details', locationInfo.join('')));
        }
    }
    
    // Additional Information Card
    const additionalInfo = [];
    const excludedKeys = ['name', 'fname', 'mobile', 'id', 'address', 'circle', 'city', 'state'];
    
    Object.entries(data).forEach(([key, value]) => {
        if (!excludedKeys.includes(key) && value && value !== 'null' && value !== 'undefined') {
            additionalInfo.push(createInfoItem(formatKey(key), value));
        }
    });
    
    if (additionalInfo.length > 0) {
        cards.push(createInfoCard('📊 Additional Information', additionalInfo.join('')));
    }
    
    // If no specific cards were created, create a generic card
    if (cards.length === 0) {
        cards.push(createInfoCard('📄 Information', 
            Object.entries(data).map(([key, value]) => 
                createInfoItem(formatKey(key), value)
            ).join('')
        ));
    }
    
    elements.resultsGrid.innerHTML = cards.join('');
}

// Create info item HTML
function createInfoItem(label, value) {
    return `
        <div class="info-item">
            <span class="info-label">${label}:</span>
            <span class="info-value">${value || '-'}</span>
        </div>
    `;
}

// Create info card HTML
function createInfoCard(title, content) {
    return `
        <div class="info-card">
            <h3>${title}</h3>
            ${content}
        </div>
    `;
}

// Format address
function formatAddress(address) {
    if (!address) return '-';
    return address.replace(/!/g, ', ').replace(/\s+/g, ' ').trim();
}

// Format object key for display
function formatKey(key) {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

// Fetch Aadhaar details
async function fetchAadhaarDetails() {
    if (!currentAadhaarNumber) {
        showError('No Aadhaar number available to fetch');
        return;
    }
    
    showLoading();
    disableSearchButton();
    
    try {
        const apiUrl = `${API_ENDPOINTS.aadhar}${encodeURIComponent(currentAadhaarNumber)}`;
        console.log('Fetching Aadhaar from:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'InfoFinder/1.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Aadhaar API request failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Aadhaar API Response:', data);
        
        if (!data || (Array.isArray(data) && data.length === 0) || 
            (data.data && Array.isArray(data.data) && data.data.length === 0)) {
            throw new Error('No Aadhaar data found for the provided ID');
        }
        
        // Process Aadhaar results
        processAadhaarResults(data);
        
    } catch (error) {
        console.error('Aadhaar fetch error:', error);
        showError('Failed to fetch Aadhaar details: ' + error.message);
    } finally {
        hideLoading();
        enableSearchButton();
    }
}

// Process Aadhaar results
function processAadhaarResults(data) {
    let aadhaarData = data;
    if (Array.isArray(data)) {
        aadhaarData = data[0] || data;
    } else if (data.data && Array.isArray(data.data)) {
        aadhaarData = data.data[0] || data.data;
    } else if (data.data && !Array.isArray(data.data)) {
        aadhaarData = data.data;
    }
    
    // Add Aadhaar information card
    const aadhaarInfo = [];
    aadhaarInfo.push(createInfoItem('Aadhaar Number', currentAadhaarNumber));
    if (aadhaarData.name) aadhaarInfo.push(createInfoItem('Name', aadhaarData.name));
    if (aadhaarData.fname) aadhaarInfo.push(createInfoItem('Father\'s Name', aadhaarData.fname));
    if (aadhaarData.address) aadhaarInfo.push(createInfoItem('Address', formatAddress(aadhaarData.address)));
    if (aadhaarData.dob) aadhaarInfo.push(createInfoItem('Date of Birth', aadhaarData.dob));
    if (aadhaarData.gender) aadhaarInfo.push(createInfoItem('Gender', aadhaarData.gender));
    
    const aadhaarCard = createInfoCard('🆔 Aadhaar Details', aadhaarInfo.join(''));
    elements.resultsGrid.innerHTML += aadhaarCard;
    elements.fetchAadhaarBtn.style.display = 'none';
}

// Initialize map
function initializeMap() {
    if (!elements.mapContainer) return;
    
    map = L.map('map').setView([20.5937, 78.9629], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
    
    console.log('Map initialized');
}

// Show location on map
function showLocationOnMap(address) {
    if (!map) return;
    
    elements.mapContainer.style.display = 'block';
    
    // Clear previous markers
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }
    
    // For demo purposes, we'll use a random location in India
    // In a real application, you would geocode the address
    const indiaBounds = [
        [6.0, 68.0], // Southwest coordinates
        [36.0, 98.0]  // Northeast coordinates
    ];
    
    const lat = 20.5937 + (Math.random() - 0.5) * 8;
    const lng = 78.9629 + (Math.random() - 0.5) * 8;
    
    // Ensure the coordinates are within India bounds
    const boundedLat = Math.max(indiaBounds[0][0], Math.min(indiaBounds[1][0], lat));
    const boundedLng = Math.max(indiaBounds[0][1], Math.min(indiaBounds[1][1], lng));
    
    currentMarker = L.marker([boundedLat, boundedLng])
        .addTo(map)
        .bindPopup(`
            <div style="text-align: center;">
                <strong>📍 Approximate Location</strong><br>
                ${formatAddress(address)}
            </div>
        `)
        .openPopup();
    
    map.setView([boundedLat, boundedLng], 10);
}

// Reset search
function resetSearch() {
    elements.resultsContainer.style.display = 'none';
    elements.mapContainer.style.display = 'none';
    elements.searchInput.value = '';
    elements.searchInput.focus();
    currentAadhaarNumber = null;
    elements.fetchAadhaarBtn.style.display = 'none';
    hideError();
    
    // Reset map view
    if (map) {
        map.setView([20.5937, 78.9629], 5);
        if (currentMarker) {
            map.removeLayer(currentMarker);
            currentMarker = null;
        }
    }
}

// Show error modal
function showErrorModal(message = 'The requested information was not found in our database. Please verify the input and try again.') {
    const modalText = elements.errorModal.querySelector('.modal-text');
    if (modalText) {
        modalText.textContent = message;
    }
    elements.errorModal.style.display = 'flex';
}

// Hide error modal
function hideErrorModal() {
    elements.errorModal.style.display = 'none';
}

// Disable search button
function disableSearchButton() {
    elements.searchBtn.disabled = true;
    elements.searchBtn.querySelector('.btn-text').textContent = 'Searching...';
    elements.searchBtn.querySelector('.loading-spinner').style.display = 'inline';
}

// Enable search button
function enableSearchButton() {
    elements.searchBtn.disabled = false;
    elements.searchBtn.querySelector('.btn-text').textContent = 'Search';
    elements.searchBtn.querySelector('.loading-spinner').style.display = 'none';
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Export functions for potential module use (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateInput,
        formatAddress,
        formatKey
    };
      }
