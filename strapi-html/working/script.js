// --- Configuration ---
const STRAPI_API_URL = 'https://api-mjcvy.strapidemo.com/api/articles';
const STRAPI_BASE_URL = 'https://api-mjcvy.strapidemo.com'; // Base URL for constructing image paths
const ITEMS_PER_PAGE = 6; // Number of items to display per page

// --- DOM Elements ---
const contentGrid = document.getElementById('contentGrid'); // Container for displaying content items
const paginationControls = document.getElementById('paginationControls'); // Container for pagination buttons
const errorMessageElement = document.getElementById('errorMessage'); // Element to display error messages

// --- State Variables ---
let currentPage = 1; // Tracks the current page number
let totalItems = 0; // Stores the total number of items available from the API

// --- Utility Function: Display Error Message ---
/**
 * Displays an error message on the page.
 * @param {string} message - The error message to display.
 */
function displayError(message) {
    if (errorMessageElement) {
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block'; // Make sure the error message is visible
    }
    // Also log to console for debugging
    console.error('Error:', message);
}

// --- Utility Function: Clear Error Message ---
/**
 * Clears any displayed error messages.
 */
function clearError() {
    if (errorMessageElement) {
        errorMessageElement.textContent = '';
        errorMessageElement.style.display = 'none'; // Hide the error message
    }
}

// --- Fetch Content from Strapi API ---
/**
 * Fetches content from the Strapi API with pagination and population.
 * @param {number} page - The page number to fetch.
 * @param {number} pageSize - The number of items per page.
 * @returns {Promise<Object>} An object containing items, total count, and page count.
 */
async function fetchContent(page = 1, pageSize = ITEMS_PER_PAGE) {
    clearError(); // Clear previous errors before a new fetch
    try {
        // Construct the API URL with pagination and populate parameters
        const response = await fetch(`${STRAPI_API_URL}?pagination[page]=${page}&pagination[pageSize]=${pageSize}&populate=*`);

        // Check if the network response was OK (status 200-299)
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Validate the structure of the API response
        // Even if attributes are not present on the item itself, the overall response should still
        // contain data and meta.pagination.
        if (data && data.data && data.meta && data.meta.pagination) {
            return {
                items: data.data,
                total: data.meta.pagination.total,
                pageCount: data.meta.pagination.pageCount
            };
        } else {
            // Log unexpected data structure for debugging
            console.error('Error: Unexpected data structure from Strapi API', data);
            displayError('Failed to load content: Unexpected data format from API.');
            return { items: [], total: 0, pageCount: 0 };
        }
    } catch (error) {
        // Catch network errors or errors from the response parsing
        console.error('Error fetching content from Strapi:', error);
        displayError(`Failed to fetch content: ${error.message}. Please check your network or API endpoint.`);
        return { items: [], total: 0, pageCount: 0 };
    }
}

// --- Render Content Grid Items ---
/**
 * Renders the fetched content items into the content grid.
 * @param {Array<Object>} items - An array of content item objects from the Strapi API.
 */
function renderGridItems(items) {
    contentGrid.innerHTML = ''; // Clear previous items from the grid

    if (items.length === 0) {
        contentGrid.innerHTML = '<p class="text-center text-gray-600">No content available. Please ensure articles are published in Strapi.</p>';
        return;
    }

    items.forEach(item => {
        // --- Defensive Check ---
        // Basic check to ensure 'item' exists before processing.
        // The previous 'item.attributes' check is removed as the structure is flat.
        if (!item) {
            console.warn('Skipping malformed or empty item:', item);
            return; // Skip this item and continue to the next one
        }

        const itemElement = document.createElement('div');
        // Add Tailwind CSS classes for basic styling and responsiveness
        itemElement.classList.add('grid-item', 'bg-white', 'p-6', 'rounded-lg', 'shadow-md', 'flex', 'flex-col', 'items-start', 'text-left');

        // --- CORRECTED: Accessing fields directly from 'item' ---
        // Extract data, safely providing fallbacks if fields are missing
        const title = item.title || 'No Title Provided';
        const description = item.description || 'No description available for this item.';

        // --- CORRECTED: Constructing image URL directly from 'item.image.url' ---
        // Optional chaining (?.) is used to safely access nested properties,
        // preventing errors if image or url are undefined.
        const imageUrl = item.image?.url
            ? `${STRAPI_BASE_URL}${item.image.url}`
            : 'https://placehold.co/400x250/cccccc/333333?text=No+Image'; // Placeholder image if no image URL

        itemElement.innerHTML = `
            ${imageUrl ? `<img src="${imageUrl}" alt="${title}" class="w-full h-48 object-cover rounded-md mb-4" onerror="this.onerror=null;this.src='https://placehold.co/400x250/cccccc/333333?text=Image+Load+Error';"/>` : ''}
            <h3 class="text-xl font-semibold text-gray-800 mb-2">${title}</h3>
            <p class="text-gray-600 text-sm flex-grow">${description}</p>
        `;
        contentGrid.appendChild(itemElement);
    });
}

// --- Render Pagination Controls ---
/**
 * Renders the pagination buttons based on the total number of pages.
 * @param {number} totalPages - The total number of pages available.
 */
function renderPaginationControls(totalPages) {
    paginationControls.innerHTML = ''; // Clear previous pagination buttons

    // Create and append the 'Previous' button
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.classList.add('px-4', 'py-2', 'mx-1', 'bg-blue-500', 'text-white', 'rounded-md', 'hover:bg-blue-600', 'disabled:opacity-50', 'disabled:cursor-not-allowed', 'shadow');
    prevButton.disabled = currentPage === 1; // Disable if on the first page
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadContentForPage(currentPage);
        }
    });
    paginationControls.appendChild(prevButton);

    // Create and append buttons for each page number
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.classList.add('px-4', 'py-2', 'mx-1', 'bg-gray-200', 'text-gray-700', 'rounded-md', 'hover:bg-gray-300', 'shadow');
        if (i === currentPage) {
            pageButton.classList.add('bg-blue-600', 'text-white', 'font-bold', 'hover:bg-blue-700', 'disabled:opacity-100'); // Highlight active page
            pageButton.disabled = true; // Disable the current page button
        }
        pageButton.addEventListener('click', () => {
            currentPage = i;
            loadContentForPage(currentPage);
        });
        paginationControls.appendChild(pageButton);
    }

    // Create and append the 'Next' button
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.classList.add('px-4', 'py-2', 'mx-1', 'bg-blue-500', 'text-white', 'rounded-md', 'hover:bg-blue-600', 'disabled:opacity-50', 'disabled:cursor-not-allowed', 'shadow');
    nextButton.disabled = currentPage === totalPages; // Disable if on the last page
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadContentForPage(currentPage);
        }
    });
    paginationControls.appendChild(nextButton);
}

// --- Main Function to Load Content for a Page ---
/**
 * Orchestrates fetching content and updating the UI for a given page.
 * @param {number} page - The page number to load.
 */
async function loadContentForPage(page) {
    const { items, total, pageCount } = await fetchContent(page, ITEMS_PER_PAGE);
    totalItems = total; // Update total items count
    renderGridItems(items); // Render content items
    renderPaginationControls(pageCount); // Render pagination controls
}

// --- Initialize on Document Load ---
// This ensures that the DOM is fully loaded before trying to access elements
// or making API calls.
document.addEventListener('DOMContentLoaded', () => {
    loadContentForPage(currentPage); // Load the first page of content
});
