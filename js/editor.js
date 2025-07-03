/**
 * editor.js - Logic cho trang Editor - PHIÊN BẢN NÂNG CẤP
 *
 * Chức năng:
 * 1. Giữ lại giao diện soạn thảo Markdown và xem trước.
 * 2. Cho phép người dùng tạo và tải về file .md để sử dụng sau.
 * 3. Tải và hiển thị bài viết gần đây nhất một cách động từ GitHub API.
 * 4. LOẠI BỎ chức năng tạo và cập nhật file posts.json đã lỗi thời.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    // !!! QUAN TRỌNG: Hãy thay đổi các giá trị này cho đúng với repo của bạn
    const GITHUB_USERNAME = 'quanpl86'; // Thay bằng tên người dùng GitHub của bạn
    const GITHUB_REPO = 'MyBlog';   // Thay bằng tên repository của bạn

    // --- DOM ELEMENTS ---
    const editorForm = document.getElementById('editorForm');
    const coverImageWrapper = document.getElementById('coverImageWrapper');
    const uploadCoverBtn = document.getElementById('cover-upload-btn');
    const markdownContentInput = document.getElementById('markdownContent');
    const htmlPreview = document.getElementById('htmlPreview');
    const uploadImgBtn = document.getElementById('uploadImgBtn');
    const recentPostContainer = document.getElementById('recentPostContainer');
    const loadingRecentPost = document.getElementById('loadingRecentPost');

    let coverImageUrl = '';

    // --- EDITOR LOGIC (Không thay đổi nhiều) ---

    uploadCoverBtn.addEventListener('click', () => {
        const imageUrl = prompt("Please enter the cover image URL:");
        if (imageUrl && imageUrl.trim() !== '') {
            coverImageUrl = imageUrl.trim();
            coverImageWrapper.style.backgroundImage = `url(${coverImageUrl})`;
            coverImageWrapper.classList.add('has-image');
        }
    });

    uploadImgBtn.addEventListener('click', () => {
        const imageUrl = prompt("Please enter the image URL to insert:");
        if (imageUrl && imageUrl.trim() !== '') {
            const markdownImg = `\n![Image alt text](${imageUrl.trim()})\n`;
            insertTextAtCursor(markdownContentInput, markdownImg);
            updatePreview();
        }
    });

    function insertTextAtCursor(textarea, text) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        textarea.value = value.substring(0, start) + text + value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
    }

    function updatePreview() {
        const markdownText = markdownContentInput.value;
        htmlPreview.innerHTML = marked.parse(markdownText);
    }
    markdownContentInput.addEventListener('input', updatePreview);

    // --- LOGIC PUBLISH (ĐÃ ĐƠN GIẢN HÓA) ---
    editorForm.addEventListener('submit', (event) => {
        event.preventDefault();
        
        const fullContent = markdownContentInput.value;
        const lines = fullContent.split('\n');
        
        const title = lines.shift().trim();
        const markdownContent = lines.join('\n').trim();

        const excerpt = markdownContent.substring(0, 150).replace(/<[^>]*>/g, '').replace(/(\r\n|\n|\r)/gm, " ") + '...';
        const currentDate = new Date().toISOString(); // Sử dụng ISO string để tương thích với Netlify CMS

        if (!title || !coverImageUrl || !markdownContent) {
            alert('Please provide a title (first line), a cover image, and some content.');
            return;
        }

        const fileName = createSlug(title) + '.md';
        const fileContent = createFileContent(title, currentDate, coverImageUrl, excerpt, markdownContent);
        
        // Chỉ tải xuống file .md
        downloadFile(fileName, fileContent);
        
        // Alert đã được cập nhật, không còn nhắc đến posts.json
        alert(`Successfully generated!\n\nFile: ${fileName}\n\nYou can now upload this file via the Netlify CMS admin page.`);
    });
    
    function createFileContent(title, date, cover_image, excerpt, markdown) {
        return `---
title: "${title}"
date: ${date}
cover_image: "${cover_image}"
excerpt: "${excerpt}"
---

${markdown}`;
    }

    function createSlug(title) {
        return title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    }
    
    function downloadFile(filename, content) {
        const element = document.createElement('a');
        const file = new Blob([content], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    // --- LOGIC HIỂN THỊ BÀI VIẾT GẦN ĐÂY (ĐÃ NÂNG CẤP) ---
    async function loadRecentPost() {
        loadingRecentPost.style.display = 'block';
        try {
            const api_url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/posts`;
            const response = await fetch(api_url);
            if (!response.ok) throw new Error('Could not fetch posts list from GitHub API.');
            
            const allFiles = await response.json();
            const postFiles = allFiles.filter(file => file.type === 'file' && file.name.endsWith('.md'));

            if (postFiles.length === 0) {
                recentPostContainer.innerHTML = '<p>No posts available.</p>';
                return;
            }

            // Để tìm bài mới nhất, chúng ta cần fetch nội dung và sắp xếp theo ngày
            const postsData = await Promise.all(
                postFiles.map(async file => {
                    const postResponse = await fetch(file.download_url);
                    if (!postResponse.ok) return null;
                    const markdown = await postResponse.text();
                    const frontMatter = jsyaml.load(/---\n([\s\S]+?)\n---/.exec(markdown)[1]);
                    return { ...frontMatter, slug: file.name.replace('.md', '') };
                })
            );

            // Sắp xếp để tìm bài mới nhất
            const sortedPosts = postsData
                .filter(p => p && p.date)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            
            if (sortedPosts.length > 0) {
                const latestPost = sortedPosts[0];
                recentPostContainer.innerHTML = createBlogCardHTML(latestPost);
            } else {
                 recentPostContainer.innerHTML = '<p>No valid posts found.</p>';
            }

        } catch (error) {
            console.error('Failed to load recent post:', error);
            recentPostContainer.innerHTML = '<p>Could not load recent post.</p>';
        } finally {
            loadingRecentPost.style.display = 'none';
        }
    }

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
    loadRecentPost();
    updatePreview(); 
});
