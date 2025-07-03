/**
 * home.js - Xử lý logic cho trang chủ (index.html) - PHIÊN BẢN NÂNG CẤP
 *
 * Chức năng chính:
 * 1. Tải động danh sách bài viết từ GitHub API, không cần posts.json.
 * 2. Hiển thị 6 bài viết đầu tiên.
 * 3. Xử lý phân trang với nút "More Posts".
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    // !!! QUAN TRỌNG: Hãy thay đổi các giá trị này cho đúng với repo của bạn
    const GITHUB_USERNAME = 'YourUsername'; // Thay bằng tên người dùng GitHub của bạn
    const GITHUB_REPO = 'your-repo-name';   // Thay bằng tên repository của bạn

    // --- DOM ELEMENTS & STATE ---
    const blogGrid = document.getElementById('blog-grid');
    const loadingMessage = document.getElementById('loading-message');
    const paginationContainer = document.createElement('div');
    paginationContainer.id = 'pagination-container';
    if (blogGrid) {
        blogGrid.insertAdjacentElement('afterend', paginationContainer);
    }

    let allPosts = [];
    const POSTS_PER_PAGE = 6;

    /**
     * Hàm chính để tải và hiển thị bài viết, được viết lại để dùng GitHub API.
     */
    async function loadPosts() {
        try {
            loadingMessage.style.display = 'block';

            // Bước 1: Gọi GitHub API để lấy danh sách file trong thư mục 'posts'
            const api_url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/posts`;
            const response = await fetch(api_url);

            if (!response.ok) {
                throw new Error(`GitHub API error! status: ${response.status}. Check username/repo settings.`);
            }
            let allFiles = await response.json();

            // Lọc ra chỉ các file .md, phòng trường hợp có file khác trong thư mục
            const postFiles = allFiles.filter(file => file.type === 'file' && file.name.endsWith('.md'));

            if (postFiles.length === 0) {
                blogGrid.innerHTML = '<p>No posts found.</p>';
                return;
            }

            // Bước 2: Tải nội dung của tất cả các file .md một cách đồng thời
            const postsData = await Promise.all(
                postFiles.map(async (file) => {
                    try {
                        // API cung cấp 'download_url' để lấy nội dung thô của file
                        const postResponse = await fetch(file.download_url);
                        if (!postResponse.ok) return null;
                        
                        const markdown = await postResponse.text();
                        const frontMatter = parseFrontMatter(markdown);
                        
                        return {
                            ...frontMatter,
                            slug: file.name.replace('.md', '')
                        };
                    } catch (e) {
                        console.error(`Error fetching or parsing ${file.name}:`, e);
                        return null;
                    }
                })
            );

            // Bước 3: Lọc, sắp xếp và hiển thị (logic này không đổi)
            allPosts = postsData
                .filter(post => post && post.date)
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            displayPosts(allPosts.slice(0, POSTS_PER_PAGE));
            setupPagination();

        } catch (error) {
            console.error('Failed to load posts:', error);
            blogGrid.innerHTML = `<p>Sorry, something went wrong. ${error.message}</p>`;
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    /**
     * Hàm hiển thị các bài viết (Không thay đổi)
     * @param {Array} posts 
     */
    function displayPosts(posts) {
        const postsHtml = posts.map(post => createBlogCardHTML(post)).join('');
        if (blogGrid) {
            blogGrid.innerHTML += postsHtml;
        }
    }

    /**
     * Hàm thiết lập nút phân trang (Không thay đổi)
     */
    function setupPagination() {
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
        }
        const currentlyDisplayedCount = blogGrid ? blogGrid.children.length : 0;
        if (allPosts.length > currentlyDisplayedCount) {
            const moreButton = document.createElement('button');
            moreButton.textContent = 'More Posts';
            moreButton.classList.add('btn', 'btn-primary', 'more-button');
            moreButton.addEventListener('click', () => {
                const nextPosts = allPosts.slice(currentlyDisplayedCount, currentlyDisplayedCount + POSTS_PER_PAGE);
                displayPosts(nextPosts);
                setupPagination();
            });
            if (paginationContainer) {
                paginationContainer.appendChild(moreButton);
            }
        }
    }

    /**
     * Phân tích Front Matter (Không thay đổi)
     * @param {string} markdown
     * @returns {object}
     */
    function parseFrontMatter(markdown) {
        try {
            const match = /---\n([\s\S]+?)\n---/.exec(markdown);
            if (!match) return {};
            return jsyaml.load(match[1]);
        } catch (e) {
            console.error('Error parsing front matter:', e);
            return {};
        }
    }

    /**
     * Tạo HTML cho thẻ bài viết (Không thay đổi)
     * @param {object} post
     * @returns {string}
     */
    function createBlogCardHTML(post) {
        const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        const postUrl = `post.html?post=${post.slug}`;
        return `
            <article class="blog-card">
                <a href="${postUrl}" class="blog-card-image-link">
                    <img src="${post.cover_image}" alt="Cover image for ${post.title}">
                </a>
                <div class="blog-card-content">
                    <p class="blog-date">${formattedDate}</p>
                    <h3><a href="${postUrl}">${post.title}</a></h3>
                    <p class="blog-excerpt">${post.excerpt}</p>
                    <a href="${postUrl}" class="btn btn-secondary">Read</a>
                </div>
            </article>
        `;
    }

    // Bắt đầu quá trình
    loadPosts();
});
