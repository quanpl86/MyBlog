/**
 * post.js - Logic cho trang chi tiết bài viết (post.html) - PHIÊN BẢN NÂNG CẤP
 *
 * Chức năng:
 * 1. Tải và hiển thị bài viết chính từ file .md.
 * 2. Tải và hiển thị các bài viết liên quan một cách động từ GitHub API.
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    // !!! QUAN TRỌNG: Hãy thay đổi các giá trị này cho đúng với repo của bạn
    const GITHUB_USERNAME = 'quanpl86'; // Thay bằng tên người dùng GitHub của bạn
    const GITHUB_REPO = 'MyBlog';   // Thay bằng tên repository của bạn

    // --- DOM ELEMENTS ---
    const postHeader = document.getElementById('post-header');
    const postTitle = document.getElementById('post-title');
    const postDate = document.getElementById('post-date');
    const postBody = document.getElementById('post-body');
    const relatedPostsGrid = document.getElementById('related-posts-grid');

    // --- MAIN LOGIC ---

    function getPostSlugFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('post');
    }

    /**
     * Hàm tải và hiển thị bài viết chính.
     * (Không thay đổi, vì nó đã hoạt động tốt bằng cách fetch file trực tiếp)
     */
    async function loadPost() {
        const slug = getPostSlugFromURL();

        if (!slug) {
            postBody.innerHTML = '<p>Error: Post not found. No post identifier provided in the URL.</p>';
            return;
        }

        try {
            // Fetch tương đối này hoạt động tốt trên cả Netlify và GitHub Pages
            const response = await fetch(`posts/${slug}.md`);
            if (!response.ok) {
                throw new Error(`Could not find post: ${slug}.md`);
            }
            const markdown = await response.text();
            
            const { attributes, body } = parseFrontMatterAndBody(markdown);

            document.title = attributes.title;
            postHeader.style.backgroundImage = `url(${attributes.cover_image})`;
            postTitle.textContent = attributes.title;
            postDate.textContent = `Published on: ${new Date(attributes.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
            
            postBody.innerHTML = marked.parse(body);
            
            // Tải các bài viết liên quan (hàm này đã được nâng cấp)
            loadRelatedPosts(slug);

        } catch (error) {
            console.error('Error loading post:', error);
            postBody.innerHTML = `<p>Sorry, we couldn't load this post. It might have been moved or deleted.</p>`;
        }
    }

    /**
     * Tải và hiển thị các bài viết liên quan bằng GitHub API (ĐÃ NÂNG CẤP)
     */
    async function loadRelatedPosts(currentSlug) {
        if (!relatedPostsGrid) return;
        
        try {
            // Bước 1: Gọi GitHub API để lấy danh sách file
            const api_url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/posts`;
            const response = await fetch(api_url);
            if (!response.ok) return;

            let allFiles = await response.json();
            
            // Bước 2: Lọc ra 3 bài viết khác để làm bài viết liên quan
            const relatedPostFiles = allFiles
                .filter(file => file.type === 'file' && file.name.endsWith('.md') && file.name !== `${currentSlug}.md`)
                .slice(0, 3); // Chỉ lấy 3 bài

            if (relatedPostFiles.length === 0) return;

            // Bước 3: Tải nội dung của các bài viết liên quan
            const postsData = await Promise.all(
                relatedPostFiles.map(async file => {
                    try {
                        const postResponse = await fetch(file.download_url); // Dùng download_url từ API
                        if (!postResponse.ok) return null;
                        
                        const markdown = await postResponse.text();
                        const { attributes } = parseFrontMatterAndBody(markdown);
                        
                        return {
                            ...attributes,
                            slug: file.name.replace('.md', '')
                        };
                    } catch (e) {
                        return null;
                    }
                })
            );
            
            const validPosts = postsData.filter(p => p);
            relatedPostsGrid.innerHTML = validPosts.map(createBlogCardHTML).join('');

        } catch (error) {
            console.error('Error loading related posts:', error);
        }
    }

    /**
     * Hàm phân tích Front Matter và Body (Không thay đổi)
     */
    function parseFrontMatterAndBody(markdown) {
        try {
            const match = /---\n([\s\S]+?)\n---/.exec(markdown);
            if (!match) return { attributes: {}, body: markdown };
            
            const frontMatter = match[1];
            const body = markdown.slice(match[0].length);
            const attributes = jsyaml.load(frontMatter);
            
            return { attributes, body };
        } catch (e) {
            console.error("Error parsing Front Matter", e);
            return { attributes: {}, body: markdown };
        }
    }

    /**
     * Hàm tạo HTML cho thẻ bài viết (Không thay đổi)
     */
    function createBlogCardHTML(post) {
        const postUrl = `post.html?post=${post.slug}`;
        const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        return `
            <article class="blog-card">
                <a href="${postUrl}" class="blog-card-image-link">
                    <img src="${post.cover_image}" alt="Cover for ${post.title}">
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

    // --- INITIALIZATION ---
    loadPost();
});
