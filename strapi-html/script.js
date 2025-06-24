// --- Configuration ---
const STRAPI_API_URL = 'https://api-mjcvy.strapidemo.com/api/articles';
const STRAPI_BASE_URL = 'https://api-mjcvy.strapidemo.com'; // Base URL for constructing image paths
const ITEMS_PER_PAGE = 6; // Number of items to display per page

// --- DOM Elements ---
const contentGrid = document.getElementById('contentGrid'); // Container for displaying content items
const paginationControls = document.getElementById('paginationControls'); // Container for pagination buttons
const errorMessageElement = document.getElementById('errorMessage'); // Element to display error messages
const loadingIndicator = document.getElementById('loadingIndicator'); // Loading indicator element

// Lightbox Modal Elements
const articleModal = document.getElementById('articleModal');
const closeModalButton = document.getElementById('closeModal');
const modalTitle = document.getElementById('modalTitle');
const modalImage = document.getElementById('modalImage');
const modalContent = document.getElementById('modalContent');

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

// --- Helper Function: Show/Hide Loading Indicator ---
/**
 * Shows the loading indicator and hides the content grid/pagination.
 */
function showLoadingIndicator() {
    if (loadingIndicator) {
        loadingIndicator.classList.remove('hidden');
    }
    if (contentGrid) {
        contentGrid.classList.add('hidden'); // Hide content grid while loading
    }
    if (paginationControls) {
        paginationControls.classList.add('hidden'); // Hide pagination while loading
    }
}

/**
 * Hides the loading indicator and shows the content grid/pagination.
 */
function hideLoadingIndicator() {
    if (loadingIndicator) {
        loadingIndicator.classList.add('hidden');
    }
    if (contentGrid) {
        contentGrid.classList.remove('hidden'); // Show content grid
    }
    if (paginationControls) {
        paginationControls.classList.remove('hidden'); // Show pagination
    }
}

// --- Helper Function: Render Strapi Rich Text Blocks to HTML ---
/**
 * Converts an array of Strapi rich text blocks into an HTML string.
 * This assumes the 'content' field in Strapi is configured as a Rich Text field
 * and returns data in the 'blocks' format (lexical editor output).
 * @param {Array<Object>} blocks - An array of content blocks from Strapi.
 * @returns {string} An HTML string representation of the content.
 */
function renderBlocksToHtml(blocks) {
    if (!blocks || !Array.isArray(blocks)) {
        return '<p>No detailed content available or content format is unexpected.</p>';
    }

    let html = '';
    let currentList = { type: null, items: [] }; // To group consecutive list-like paragraphs

    // Helper to render inline text with various formatting (bold, italic, etc.)
    const renderInlineText = (children) => {
        if (!children || !Array.isArray(children)) return '';

        return children.map(child => {
            // Ensure we only process text-like children, others are ignored or warned
            if (child.type === 'text') {
                let content = child.text || ''; // Ensure text is not null/undefined
                let formattedContent = content;

                // Apply text formatting based on boolean flags
                if (child.bold) formattedContent = `<strong>${formattedContent}</strong>`;
                if (child.italic) formattedContent = `<em>${formattedContent}</em>`;
                if (child.underline) formattedContent = `<u>${formattedContent}</u>`;
                if (child.strikethrough) formattedContent = `<s>${formattedContent}</s>`;
                if (child.code) formattedContent = `<code>${formattedContent}</code>`;

                // Handle links if they are inline children with 'type: 'link''
                // Note: Lexical often represents links as a text child with a 'url' property on the parent 'link' element.
                // This logic assumes the 'url' property might be directly on the text child if the link is flattened.
                // If your links are separate block.type: 'link', you'll need another case in the main switch.
                if (child.url) { // This might be for inline links that come as a text child with URL
                    formattedContent = `<a href="${child.url}" class="text-blue-600 hover:underline" target="_blank">${formattedContent}</a>`;
                }

                return formattedContent;
            } else if (child.type === 'link' && child.url && child.children) {
                // Handle a 'link' type child which has its own children (e.g., text)
                const linkText = renderInlineText(child.children); // Recursively render children of the link
                return `<a href="${child.url}" class="text-blue-600 hover:underline" target="_blank">${linkText}</a>`;
            } else {
                // Log and ignore unexpected child types within inline text rendering
                console.warn('Unknown or unhandled inline child type:', child.type, child);
                return ''; // Return empty string for unhandled child types
            }
        }).join('');
    };

    // Function to append the current list to HTML and reset
    const appendCurrentList = () => {
        if (currentList.type && currentList.items.length > 0) {
            const listTag = currentList.type === 'ordered' ? 'ol' : 'ul';
            html += `<${listTag} class="list-inside ${listTag === 'ol' ? 'list-decimal' : 'list-disc'} pl-5 mb-4">`; // Tailwind list styling
            html += currentList.items.join('');
            html += `</${listTag}>`;
            currentList = { type: null, items: [] }; // Reset list
        }
    };

    blocks.forEach(block => {
        // --- Enhanced List Handling for Paragraphs with Markers ---
        // This is the core fix for lists that appear as paragraphs starting with bullets/numbers.
        if (block.type === 'paragraph' && block.children && block.children.length > 0) {
            const firstChildText = block.children[0].text || '';
            const isUnorderedListItem = firstChildText.match(/^[\*\-\u2022]\s/); // Match *, -, •, and space
            const isOrderedListItem = firstChildText.match(/^\d+\.\s/); // Match digits, dot, and space

            if (isUnorderedListItem || isOrderedListItem) {
                const listItemType = isOrderedListItem ? 'ordered' : 'unordered';

                // If starting a new list or switching list type, append previous list
                if (currentList.type && currentList.type !== listItemType) {
                    appendCurrentList();
                }
                if (!currentList.type) {
                    currentList.type = listItemType;
                }

                // Remove the list marker from the text
                // Create a temporary child object for the first child with the marker removed
                const cleanFirstChild = { ...block.children[0], text: firstChildText.replace(/^([\*\-\u2022]|\d+\.)\s/, '') };
                // Render the entire content of the paragraph as a list item
                const listItemContent = renderInlineText([cleanFirstChild, ...block.children.slice(1)]);
                currentList.items.push(`<li class="mb-1">${listItemContent}</li>`); // Add Tailwind for list item margin
                return; // Skip standard paragraph handling as it's part of a list
            }
        }

        // --- Standard Block Type Handling ---
        // If we've reached here, it's either not a paragraph, or it's a paragraph that's not a list item.
        // Close any ongoing list before rendering a non-list block.
        appendCurrentList();

        switch (block.type) {
            case 'paragraph':
                html += `<p class="mb-4">${renderInlineText(block.children)}</p>`; // Tailwind paragraph margin
                break;
            case 'heading':
                // Ensure level is a valid heading number (1-6)
                const level = Math.max(1, Math.min(6, parseInt(block.level) || 1));
                const headingTag = `h${level}`;
                // Tailwind heading styling for appropriate size and margin
                const headingClasses = {
                    1: 'text-4xl', 2: 'text-3xl', 3: 'text-2xl',
                    4: 'text-xl', 5: 'text-lg', 6: 'text-base'
                }[level] + ' font-bold text-gray-800 mt-6 mb-3';
                html += `<${headingTag} class="${headingClasses}">${renderInlineText(block.children)}</${headingTag}>`;
                break;
            case 'list': // This case handles actual 'list' blocks if they appear (e.g., from older Strapi versions or specific exports)
                const listTag = block.format === 'ordered' ? 'ol' : 'ul';
                let listItemsHtml = '';
                block.children.forEach(listItem => {
                    if (listItem.type === 'list-item') {
                        listItemsHtml += `<li class="mb-1">${renderInlineText(listItem.children)}</li>`;
                    }
                });
                html += `<${listTag} class="list-inside ${listTag === 'ol' ? 'list-decimal' : 'list-disc'} pl-5 mb-4">${listItemsHtml}</${listTag}>`;
                break;
            case 'quote':
                html += `<blockquote class="border-l-4 border-blue-500 pl-4 py-2 my-4 text-gray-700 italic">${renderInlineText(block.children)}</blockquote>`;
                break;
            case 'code':
                const codeContent = block.children && block.children[0] ? block.children[0].text : '';
                html += `<pre class="bg-gray-100 p-4 rounded-md overflow-x-auto my-4"><code class="text-gray-800">${codeContent}</code></pre>`; // Basic code styling
                break;
            case 'image':
                if (block.image && block.image.url) {
                    const imageUrl = `${STRAPI_BASE_URL}${block.image.url}`;
                    html += `<img src="${imageUrl}" alt="${block.image.alt || ''}" class="w-full h-auto object-cover rounded-md my-4" onerror="this.onerror=null;this.src='https://placehold.co/600x400/cccccc/333333?text=Image+Not+Loaded';"/>`;
                }
                break;
            default:
                // Fallback for unknown block types, render as paragraph or just text
                console.warn('Unknown or unhandled Strapi block type:', block.type, block);
                if (block.children) {
                    html += `<p class="mb-4 text-red-500"><strong>Unhandled Content:</strong> ${renderInlineText(block.children)}</p>`;
                } else if (block.text) {
                    html += `<p class="mb-4 text-red-500"><strong>Unhandled Content:</strong> ${block.text}</p>`;
                } else {
                    html += `<p class="mb-4 text-red-500">DEBUG: Unhandled block type with no text content: ${JSON.stringify(block)}</p>`;
                }
                break;
        }
    });

    // Append any remaining list after the loop finishes
    appendCurrentList();
    return html;
}


// --- Lightbox Functions ---
/**
 * Shows the lightbox modal with article details.
 * @param {Object} article - The article object to display in the modal.
 */
function showArticleModal(article) {
    modalTitle.textContent = article.title || 'No Title';
    // Use the new renderBlocksToHtml function for the article content
    modalContent.innerHTML = renderBlocksToHtml(article.content);

    const imageUrl = article.image?.url
        ? `${STRAPI_BASE_URL}${article.image.url}`
        : ''; // No fallback image for modal, hide if none

    if (imageUrl) {
        modalImage.src = imageUrl;
        modalImage.alt = article.title || 'Article Image';
        modalImage.classList.remove('hidden'); // Show image
    } else {
        modalImage.classList.add('hidden'); // Hide image if no URL
    }

    articleModal.classList.remove('hidden'); // Show the modal
    document.body.classList.add('overflow-hidden'); // Prevent body scrolling
}

/**
 * Hides the lightbox modal.
 */
function hideArticleModal() {
    articleModal.classList.add('hidden'); // Hide the modal
    document.body.classList.remove('overflow-hidden'); // Re-enable body scrolling
}

// Attach event listener to the close button
closeModalButton.addEventListener('click', hideArticleModal);

// Close modal if clicked outside content (on overlay)
articleModal.addEventListener('click', (event) => {
    if (event.target === articleModal) {
        hideArticleModal();
    }
});


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
        const response = await fetch(`${STRAPI_API_URL}?pagination[page]=${page}&pagination[pageSize]=${pageSize}&populate=*`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (data && data.data && data.meta && data.meta.pagination) {
            return {
                items: data.data,
                total: data.meta.pagination.total,
                pageCount: data.meta.pagination.pageCount
            };
        } else {
            console.error('Error: Unexpected data structure from Strapi API', data);
            displayError('Failed to load content: Unexpected data format from API.');
            return { items: [], total: 0, pageCount: 0 };
        }
    } catch (error) {
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
        if (!item) {
            console.warn('Skipping malformed or empty item:', item);
            return; // Skip this item and continue to the next one
        }

        const itemElement = document.createElement('div');
        itemElement.classList.add('grid-item', 'bg-white', 'p-6', 'rounded-lg', 'shadow-md', 'flex', 'flex-col', 'items-start', 'text-left', 'hover:shadow-lg', 'transition-shadow', 'duration-300');

        const title = item.title || 'No Title Provided';
        const description = item.description || 'No description available for this item.';

        const imageUrl = item.image?.url
            ? `${STRAPI_BASE_URL}${item.image.url}`
            : 'https://placehold.co/400x250/cccccc/333333?text=No+Image'; // Placeholder image if no image URL

        itemElement.innerHTML = `
            ${imageUrl ? `<img src="${imageUrl}" alt="${title}" class="w-full h-48 object-cover rounded-md mb-4" onerror="this.onerror=null;this.src='https://placehold.co/400x250/cccccc/333333?text=Image+Load+Error';"/>` : ''}
            <h3 class="text-xl font-semibold text-gray-800 mb-2">${title}</h3>
            <p class="text-gray-600 text-sm flex-grow mb-4">${description.substring(0, 150)}...</p> <!-- Truncate description -->
            <button class="read-more-btn bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors duration-300 mt-auto">Read More</button>
        `;
        contentGrid.appendChild(itemElement);

        const readMoreButton = itemElement.querySelector('.read-more-btn');
        readMoreButton.addEventListener('click', () => {
            showArticleModal(item);
        });
    });
}

// --- Render Pagination Controls ---
/**
 * Renders the pagination buttons based on the total number of pages.
 * @param {number} totalPages - The total number of pages available.
 */
function renderPaginationControls(totalPages) {
    paginationControls.innerHTML = ''; // Clear previous pagination buttons

    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.classList.add('px-4', 'py-2', 'mx-1', 'bg-blue-500', 'text-white', 'rounded-md', 'hover:bg-blue-600', 'disabled:opacity-50', 'disabled:cursor-not-allowed', 'shadow');
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadContentForPage(currentPage);
        }
    });
    paginationControls.appendChild(prevButton);

    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.classList.add('px-4', 'py-2', 'mx-1', 'bg-gray-200', 'text-gray-700', 'rounded-md', 'hover:bg-gray-300', 'shadow');
        if (i === currentPage) {
            pageButton.classList.add('bg-blue-600', 'text-white', 'font-bold', 'hover:bg-blue-700', 'disabled:opacity-100');
            pageButton.disabled = true;
        }
        pageButton.addEventListener('click', () => {
            currentPage = i;
            loadContentForPage(currentPage);
        });
        paginationControls.appendChild(pageButton);
    }

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.classList.add('px-4', 'py-2', 'mx-1', 'bg-blue-500', 'text-white', 'rounded-md', 'hover:bg-blue-600', 'disabled:opacity-50', 'disabled:cursor-not-allowed', 'shadow');
    nextButton.disabled = currentPage === totalPages;
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
    showLoadingIndicator(); // Show loading indicator
    try {
        const { items, total, pageCount } = await fetchContent(page, ITEMS_PER_PAGE);
        totalItems = total;
        renderGridItems(items);
        renderPaginationControls(pageCount);
    } finally {
        hideLoadingIndicator(); // Hide loading indicator regardless of success or failure
    }
}

// --- Initialize on Document Load ---
document.addEventListener('DOMContentLoaded', () => {
    loadContentForPage(currentPage);
});
