Strapi Content Grid with Pagination and Lightbox
This is a simple, client-side web application that demonstrates how to fetch and display content from a Strapi CMS API, complete with pagination for easy navigation and a lightbox modal to view full article details.

✨ Features
Content Fetching: Dynamically pulls articles from a Strapi API endpoint.

Pagination: Implements "Previous," "Next," and numbered page buttons to navigate through content.

Responsive Grid Layout: Displays articles in an adaptable grid format suitable for various screen sizes.

Article Lightbox: Clicking "Read More" opens a full article view in a modern, overlaying modal.

Rich Text Rendering: Properly formats and displays rich text content (paragraphs, headings, lists) from Strapi's Lexical editor output.

Loading Indicator: Shows a visual loading spinner while content is being fetched from the API.

Error Handling: Displays user-friendly messages for API errors or unexpected data.

🚀 Technologies Used
HTML5: Structure of the web page.

CSS3: Styling (custom CSS for animations and core layout, complemented by Tailwind CSS for utility-first styling).

JavaScript (ES6+): Core logic for fetching data, rendering UI, and handling interactions.

Strapi CMS: Used as the headless content management system providing the article data via its API.

🛠️ Setup and How to Run
To get this project running locally, follow these steps:

Clone the Repository:

git clone https://github.com/YourUsername/your-repo-name.git
cd your-repo-name

(Remember to replace YourUsername and your-repo-name with your actual GitHub details.)

Strapi Backend:

Ensure your Strapi instance is running and accessible at https://api-mjcvy.strapidemo.com/.

Make sure you have a Collection Type named Article (or articles in plural API endpoint) with fields like title, description, content (as a Rich Text field), and image (as a Media field).

Crucially, ensure your articles are PUBLISHED in the Strapi admin panel and that the Public role has find and findOne permissions enabled for the Article collection type.

Run the Frontend:

This project is purely client-side HTML, CSS, and JavaScript.

Simply open the index.html file in your web browser. You can do this by double-clicking the file or dragging it into your browser.

The application will automatically fetch content from your configured Strapi API URL and display it.

💡 Usage
Browse Articles: Use the pagination controls at the bottom to navigate through different pages of articles.

Read More: Click the "Read More" button on any article card to open a lightbox modal with the full content and details of that article.

Close Lightbox: Click the "×" button or anywhere outside the modal content to close the lightbox.

🤝 Contributing
Feel free to fork this repository
